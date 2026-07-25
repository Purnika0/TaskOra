# tasks/management/commands/refresh_due_dates.py
"""
Fixes stale seed/demo data: due dates that have drifted into the past as
real time moves on.

Two modes:

  Flat shift (default) — pushes every assignment's due_date forward by a
  fixed number of days (--days, default 7), preserving the exact spacing
  between assignments. This is the mode to reach for on repeated runs: run
  it once a week (say) and everything just moves forward with it.

  Rescale (--rescale) — the original one-off mode for recovering from
  wildly stale data (e.g. right after a fresh seed with months of
  backdated history). Proportionally stretches all due dates onto a new
  range from --past-days ago to --future-days from now.

Either way, this command doesn't touch real submissions — it only moves
Assignment.due_date, and reverts any Task that is "overdue" purely because
of the old dates (i.e. the student never actually submitted) back to
"pending", for assignments whose new due date is in the future. Tasks with
status completed/submitted/rejected are left untouched — those represent
actual recorded student actions.

Safe to rerun any time.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from tasks.models import Assignment, Task


class Command(BaseCommand):
    help = "Pushes assignment due dates forward (flat shift by default) to fix stale seed/demo data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days", type=int, default=7,
            help="Flat-shift mode: number of days to push every due date forward by (default: 7).",
        )
        parser.add_argument(
            "--rescale", action="store_true",
            help="Use the old proportional rescale mode instead of a flat shift.",
        )
        parser.add_argument(
            "--past-days", type=int, default=10,
            help="Rescale mode only: how many days before today the earliest due date should land (default: 10).",
        )
        parser.add_argument(
            "--future-days", type=int, default=60,
            help="Rescale mode only: how many days after today the latest due date should land (default: 60).",
        )
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Show what would change without writing anything.",
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        assignments = list(Assignment.objects.all().order_by("due_date"))

        if not assignments:
            self.stdout.write(self.style.WARNING("No assignments found — nothing to do."))
            return

        if options["rescale"]:
            updates = self._compute_rescale(assignments, today, options)
        else:
            updates = self._compute_flat_shift(assignments, options["days"])

        if options["dry_run"]:
            for a, old_due, new_due in updates[:10]:
                self.stdout.write(f"  [{a.id}] {a.title[:40]:40s} {old_due} → {new_due}")
            if len(updates) > 10:
                self.stdout.write(f"  ... and {len(updates) - 10} more")
            self.stdout.write(self.style.WARNING("Dry run — no changes written."))
            return

        for a, _, new_due in updates:
            a.due_date = new_due
        Assignment.objects.bulk_update([a for a, _, _ in updates], ["due_date"])

        # Revert tasks that are only "overdue" because of the old dates —
        # their assignment is now due in the future again, so a student who
        # hasn't submitted should show as pending, not overdue.
        reverted = Task.objects.filter(
            status=Task.Status.OVERDUE,
            assignment__due_date__gte=today,
        ).update(status=Task.Status.PENDING)

        self.stdout.write(self.style.SUCCESS(
            f"Updated {len(updates)} assignment due date(s). "
            f"Reverted {reverted} task(s) from overdue back to pending."
        ))

    def _compute_flat_shift(self, assignments, days):
        self.stdout.write(f"Flat-shifting {len(assignments)} assignment due dates forward by {days} day(s).")
        delta = timedelta(days=days)
        return [(a, a.due_date, a.due_date + delta) for a in assignments]

    def _compute_rescale(self, assignments, today, options):
        old_min = assignments[0].due_date
        old_max = assignments[-1].due_date
        old_span = (old_max - old_min).days

        new_min = today - timedelta(days=options["past_days"])
        new_max = today + timedelta(days=options["future_days"])
        new_span = (new_max - new_min).days

        self.stdout.write(f"Rescaling {len(assignments)} assignment due dates:")
        self.stdout.write(f"  old range: {old_min} → {old_max}")
        self.stdout.write(f"  new range: {new_min} → {new_max}")

        updates = []
        for a in assignments:
            proportion = 0.5 if old_span == 0 else (a.due_date - old_min).days / old_span
            new_due = new_min + timedelta(days=round(proportion * new_span))
            if new_due != a.due_date:
                updates.append((a, a.due_date, new_due))
        return updates