# tasks/management/commands/reset_task_progress.py
"""
Reverts a percentage of "completed"/"submitted" tasks back to "pending" —
useful when seed data has drifted toward looking too finished (e.g. after
refresh_due_dates pushes assignments into the future, but most tasks are
still marked as done from when they were seeded as overdue/past history).

Only touches tasks whose assignment is due today or later — reverting a
task tied to a past-due assignment back to "pending" would just have it
flip straight back to "overdue" the next time OverdueSyncMiddleware runs
(or the next `mark_overdue` call), which defeats the purpose.

Clears the submission fields (file, text, submitted_at, teacher_feedback,
completed_at) on any task it reverts, so the task genuinely looks
untouched again rather than "pending" with leftover submission data.

Safe to rerun: each run only samples from tasks that are currently
completed/submitted, so running it twice in a row compounds rather than
double-reverting the same tasks.
"""
import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from tasks.models import Task


class Command(BaseCommand):
    help = "Reverts a percentage of completed/submitted tasks (on future-due assignments) back to pending."

    def add_arguments(self, parser):
        parser.add_argument(
            "--percent", type=float, default=40,
            help="Percentage of eligible completed/submitted tasks to revert (default: 40).",
        )
        parser.add_argument(
            "--seed", type=int, default=None,
            help="Random seed, for reproducible runs.",
        )
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Show what would change without writing anything.",
        )

    def handle(self, *args, **options):
        percent = options["percent"]
        if not 0 < percent <= 100:
            self.stderr.write(self.style.ERROR("--percent must be between 0 and 100."))
            return

        if options["seed"] is not None:
            random.seed(options["seed"])

        today = timezone.localdate()

        eligible = list(
            Task.objects.filter(
                status__in=[Task.Status.COMPLETED, Task.Status.SUBMITTED],
                assignment__due_date__gte=today,
            )
        )

        if not eligible:
            self.stdout.write(self.style.WARNING(
                "No eligible completed/submitted tasks (on future-due assignments) found — nothing to do."
            ))
            return

        sample_size = round(len(eligible) * percent / 100)
        sample = random.sample(eligible, sample_size)

        before_completed = sum(1 for t in eligible if t.status == Task.Status.COMPLETED)
        before_submitted = sum(1 for t in eligible if t.status == Task.Status.SUBMITTED)

        self.stdout.write(
            f"Eligible tasks: {len(eligible)} "
            f"({before_completed} completed, {before_submitted} submitted) "
            f"on assignments due today or later."
        )
        self.stdout.write(f"Reverting {sample_size} ({percent}%) to pending.")

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("Dry run — no changes written."))
            return

        for t in sample:
            t.status = Task.Status.PENDING
            t.submission_file = None
            t.submission_text = ""
            t.submitted_at = None
            t.teacher_feedback = ""
            t.completed_at = None

        Task.objects.bulk_update(
            sample,
            ["status", "submission_file", "submission_text", "submitted_at", "teacher_feedback", "completed_at"],
        )

        self.stdout.write(self.style.SUCCESS(f"Reverted {sample_size} task(s) to pending."))