"""
PKMC BIT — Tasks Seed Command (Updated)
=========================================
Place this file at:
    any_app/management/commands/seed_tasks.py

Run with:
    python manage.py seed_tasks           # create tasks
    python manage.py seed_tasks --clear   # delete all assignment-based tasks and re-create

What it does:
    - Loops through all assignments in the DB
    - For each assignment, finds all enrolled students in that course
    - Creates a Task for each student that doesn't already have one
    - Assigns each student a consistent persona (excellent/fast/average/slow/struggling)
    - Simulates realistic status distribution:

    PAST DUE assignments:
        Excellent   (10%) → ~95% completed, ~3% submitted, ~2% overdue
        Fast        (20%) → ~80% completed, ~12% submitted, ~8% overdue
        Average     (40%) → ~55% completed, ~20% submitted, ~25% overdue
        Slow        (20%) → ~30% completed, ~15% submitted, ~55% overdue
        Struggling  (10%) → ~10% completed, ~10% submitted, ~80% overdue

    FUTURE DUE assignments:
        Excellent   → 25% submitted, 75% pending
        Fast        → 15% submitted, 85% pending
        Average     →  5% submitted, 95% pending
        Slow        →  0% submitted, 100% pending
        Struggling  →  0% submitted, 100% pending

Prerequisites:
    - seed_teachers_courses
    - seed_students
    - seed_enrollments
    - seed_assignments
"""

import random
from datetime import date, datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

User = get_user_model()

# ---------------------------------------------------------------------------
# Persona config
# ---------------------------------------------------------------------------
PERSONA_WEIGHTS = ["excellent", "fast", "average", "slow", "struggling"]
PERSONA_PROBS   = [0.10,         0.20,   0.40,      0.20,   0.10]

# (completed_prob, submitted_prob) for past due tasks
# remaining probability → overdue (handled explicitly)
PAST_STATUS_RATES = {
    "excellent":  (0.95, 0.03),   # ~98% done, ~2% overdue
    "fast":       (0.80, 0.12),   # ~92% done, ~8% overdue
    "average":    (0.55, 0.20),   # ~75% done, ~25% overdue
    "slow":       (0.30, 0.15),   # ~45% done, ~55% overdue
    "struggling": (0.10, 0.10),   # ~20% done, ~80% overdue
}

# (submitted_prob,) for future due tasks — rest are pending
FUTURE_STATUS_RATES = {
    "excellent":  0.25,
    "fast":       0.15,
    "average":    0.05,
    "slow":       0.00,
    "struggling": 0.00,
}

# Days before due date the student completed — varies by persona
COMPLETION_OFFSET = {
    "excellent":  (3, 10),   # finishes very early
    "fast":       (2, 7),    # finishes well ahead of time
    "average":    (0, 3),    # finishes around the due date
    "slow":       (-2, 1),   # sometimes just in time or slightly late
    "struggling": (-3, 0),   # when they do finish, it's last-minute
}

# Days before due date the student submitted (before teacher reviews)
SUBMISSION_OFFSET = {
    "excellent":  (2, 6),
    "fast":       (1, 5),
    "average":    (0, 2),
    "slow":       (0, 1),
    "struggling": (-1, 1),
}


def make_aware_dt(d):
    """Convert a date to a timezone-aware datetime at midnight."""
    return timezone.make_aware(datetime.combine(d, datetime.min.time()))


def pick_status_past(persona):
    """Return a status string for a past-due task based on persona."""
    completed_prob, submitted_prob = PAST_STATUS_RATES[persona]
    roll = random.random()
    if roll < completed_prob:
        return "completed"
    elif roll < completed_prob + submitted_prob:
        return "submitted"
    else:
        return "overdue"


def pick_status_future(persona):
    """Return a status string for a future-due task based on persona."""
    submitted_prob = FUTURE_STATUS_RATES[persona]
    return "submitted" if random.random() < submitted_prob else "pending"


class Command(BaseCommand):
    help = "Backfill Tasks for all enrolled students across all existing assignments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all assignment-based tasks before re-creating.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from tasks.models import Assignment, Task
        from tasks.priority import calculate_priority_score
        from courses.models import Enrollment

        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing assignment-based tasks..."))
            deleted, _ = Task.objects.filter(assignment__isnull=False).delete()
            self.stdout.write(self.style.SUCCESS(f"  Deleted {deleted} tasks.\n"))

        self.stdout.write("\nSeeding tasks for all enrolled students...")
        self.stdout.write("=" * 60)

        assignments    = Assignment.objects.select_related("course", "created_by").all()
        today          = date.today()
        total_created  = 0
        total_skipped  = 0
        total_courses  = 0
        prev_course_id = None

        # Consistent persona per student across all courses
        student_personas = {}

        for assignment in assignments.order_by("course_id", "due_date"):

            if assignment.course_id != prev_course_id:
                self.stdout.write(
                    f"\n  {assignment.course.title.split('(')[0].strip()}"
                )
                self.stdout.write("  " + "-" * 50)
                prev_course_id = assignment.course_id
                total_courses += 1

            enrollments    = Enrollment.objects.filter(
                course=assignment.course
            ).select_related("student")
            is_past_due    = assignment.due_date < today
            priority_score = calculate_priority_score(assignment)
            created_count  = 0
            skipped_count  = 0

            for enrollment in enrollments:
                student = enrollment.student

                # Skip if task already exists
                if Task.objects.filter(
                    student=student, assignment=assignment
                ).exists():
                    skipped_count += 1
                    total_skipped += 1
                    continue

                # Assign consistent persona
                if student.pk not in student_personas:
                    student_personas[student.pk] = random.choices(
                        PERSONA_WEIGHTS, weights=PERSONA_PROBS
                    )[0]
                persona = student_personas[student.pk]

                # Determine status
                if is_past_due:
                    task_status = pick_status_past(persona)
                else:
                    task_status = pick_status_future(persona)

                # Determine timestamps based on status
                submitted_at = None
                completed_at = None

                if task_status == "completed":
                    min_off, max_off = COMPLETION_OFFSET[persona]
                    offset       = random.randint(min_off, max_off)
                    completed_at = make_aware_dt(
                        assignment.due_date - timedelta(days=offset)
                    )
                    # submitted_at slightly before completed_at
                    submitted_at = make_aware_dt(
                        assignment.due_date - timedelta(days=offset + random.randint(0, 1))
                    )

                elif task_status == "submitted":
                    min_off, max_off = SUBMISSION_OFFSET[persona]
                    offset       = random.randint(min_off, max_off)
                    submitted_at = make_aware_dt(
                        assignment.due_date - timedelta(days=offset)
                    )

                Task.objects.create(
                    student        = student,
                    assignment     = assignment,
                    priority_score = priority_score,
                    status         = task_status,
                    submitted_at   = submitted_at,
                    completed_at   = completed_at,
                )
                created_count += 1
                total_created += 1

            self.stdout.write(
                f"    [{assignment.due_date} {'PAST' if is_past_due else 'UPCOMING'}]"
                f"  {assignment.title[:52]}"
                f"  →  +{created_count} tasks"
                + (f"  ({skipped_count} skipped)" if skipped_count else "")
            )

        # Persona distribution summary
        persona_counts = {"excellent": 0, "fast": 0, "average": 0, "slow": 0, "struggling": 0}
        for p in student_personas.values():
            persona_counts[p] += 1

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Courses processed  : {total_courses}")
        self.stdout.write(f"  Tasks created      : {total_created}")
        self.stdout.write(f"  Already existed    : {total_skipped}")
        self.stdout.write(f"  Grand total        : {total_created + total_skipped}")
        self.stdout.write(f"\n  Student personas assigned:")
        self.stdout.write(f"    Excellent  : {persona_counts['excellent']} students")
        self.stdout.write(f"    Fast       : {persona_counts['fast']} students")
        self.stdout.write(f"    Average    : {persona_counts['average']} students")
        self.stdout.write(f"    Slow       : {persona_counts['slow']} students")
        self.stdout.write(f"    Struggling : {persona_counts['struggling']} students")
        self.stdout.write("=" * 60 + "\n")