"""
PKMC BIT — Enrollments Seed Command
=====================================
Place this file at:
    any_app/management/commands/seed_enrollments.py

Run with:
    python manage.py seed_enrollments           # enroll students
    python manage.py seed_enrollments --clear   # delete seeded enrollments and re-create

Prerequisites:
    - seed_teachers_courses must have been run first
    - seed_students must have been run first
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

# ---------------------------------------------------------------------------
# Enrollment map
# Each entry: (batch_suffix, semester, [course_codes])
# ---------------------------------------------------------------------------
ENROLLMENT_MAP = [
    ("79", 7, ["BIT401", "BIT402", "BIT403", "BIT408"]),
    ("80", 5, ["BIT301", "BIT302", "BIT303", "BIT304", "ENG305"]),
    ("81", 3, ["BIT201", "BIT202", "BIT203", "BIT204", "MGT205"]),
    ("82", 1, ["BIT101", "BIT102", "BIT103", "SCO105"]),
]


class Command(BaseCommand):
    help = "Enroll PKMC BIT students into their current active semester courses."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all seeded enrollments before re-creating.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from courses.models import Course, Enrollment

        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing seeded enrollments..."))
            deleted = 0
            for suffix, _, _ in ENROLLMENT_MAP:
                qs = Enrollment.objects.filter(
                    student__username__endswith=f".{suffix}",
                )
                deleted += qs.count()
                qs.delete()
            self.stdout.write(self.style.SUCCESS(f"  Deleted {deleted} enrollments.\n"))

        self.stdout.write("\nEnrolling students into courses...")
        self.stdout.write("=" * 60)

        total_created = 0
        total_skipped = 0
        total_errors = 0

        for suffix, semester, course_codes in ENROLLMENT_MAP:
            self.stdout.write(f"\n  Batch .{suffix}  —  Semester {semester}")
            self.stdout.write("  " + "-" * 50)

            # Get all students in this batch
            students = User.objects.filter(
                username__endswith=f".{suffix}",
                role=User.Role.STUDENT,
            )

            if not students.exists():
                self.stdout.write(
                    self.style.WARNING(f"    ⚠ No students found for batch .{suffix} — skipping.")
                )
                total_errors += 1
                continue

            batch_created = 0
            batch_skipped = 0

            for code in course_codes:
                # Course titles are stored as "BIT401 — Advanced Java Programming (...)"
                course = Course.objects.filter(title__startswith=code).first()

                if not course:
                    self.stdout.write(
                        self.style.WARNING(f"    ⚠ Course {code} not found in DB — skipping.")
                    )
                    total_errors += 1
                    continue

                course_created = 0
                course_skipped = 0

                for student in students:
                    enrollment, created = Enrollment.objects.get_or_create(
                        student=student,
                        course=course,
                    )
                    if created:
                        course_created += 1
                        batch_created += 1
                        total_created += 1
                    else:
                        course_skipped += 1
                        batch_skipped += 1
                        total_skipped += 1

                self.stdout.write(
                    f"    ✓ {code} — {course.title.split('—')[1].strip().split('(')[0].strip()}"
                    f"  →  {course_created} enrolled, {course_skipped} already existed"
                )

            self.stdout.write(
                f"\n    Batch total — Created: {batch_created}  |  Already existed: {batch_skipped}"
            )

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Total enrolled : {total_created}")
        self.stdout.write(f"  Already existed: {total_skipped}")
        self.stdout.write(f"  Errors/skipped : {total_errors}")
        self.stdout.write(f"  Grand total    : {total_created + total_skipped}")
        self.stdout.write("=" * 60 + "\n")