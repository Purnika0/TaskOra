"""
Delete Non-Seeded Test Users
===============================
Place this file at:
    any_app/management/commands/delete_non_seeded_users.py

Run with:
    python manage.py delete_non_seeded_users           # preview + delete
    python manage.py delete_non_seeded_users --dry-run  # preview only, no deletion

What it does:
    Deletes any user that does NOT match the official seeded data:
        - Teachers: must be in the 19 known PKMC teacher usernames
        - Students: username must end in .79, .80, .81, or .82
        - Keeps all admin accounts untouched (never deletes admins)
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User

SEEDED_TEACHER_USERNAMES = [
    'subash.siwa', 'arjun.lamichhane', 'kumar.prasun', 'bishnu.bhusal',
    'ramesh.saud', 'mohan.ayer', 'sudarshan.sharma', 'niraj.panta',
    'sagar.kc', 'santosh.dhungana', 'bhim.rawat', 'kishor.luitel',
    'shrilata.wagle', 'saraswoti.katwal', 'yograj.joshi', 'anil.lamichhane',
    'bimal.acharya', 'janak.joshi', 'rakesh.bachhan',
]

SEEDED_STUDENT_SUFFIXES = ('.79', '.80', '.81', '.82')


class Command(BaseCommand):
    help = "Delete any users that don't match the official seeded teacher/student data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only show what would be deleted, without actually deleting.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Non-seeded teachers
        bad_teachers = User.objects.filter(role='teacher').exclude(
            username__in=SEEDED_TEACHER_USERNAMES
        )

        # Non-seeded students (username doesn't end in a known batch suffix)
        bad_students = User.objects.filter(role='student')
        for suffix in SEEDED_STUDENT_SUFFIXES:
            bad_students = bad_students.exclude(username__endswith=suffix)

        # Admins are NEVER touched by this command
        admin_count = User.objects.filter(role='admin').count()

        bad_teacher_list = list(bad_teachers.values_list('username', flat=True))
        bad_student_list = list(bad_students.values_list('username', flat=True))
        total_to_delete   = len(bad_teacher_list) + len(bad_student_list)

        self.stdout.write("\nScanning for non-seeded users...")
        self.stdout.write("=" * 60)

        self.stdout.write(f"\nNon-seeded teachers ({len(bad_teacher_list)}):")
        for u in bad_teacher_list:
            self.stdout.write(f"  - {u}")

        self.stdout.write(f"\nNon-seeded students ({len(bad_student_list)}):")
        for u in bad_student_list:
            self.stdout.write(f"  - {u}")

        self.stdout.write(f"\nAdmin accounts (always kept): {admin_count}")

        if total_to_delete == 0:
            self.stdout.write(self.style.SUCCESS("\nNo non-seeded users found. Database is clean!"))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"\n[DRY RUN] Would delete {total_to_delete} user(s). No changes made."
            ))
            return

        with transaction.atomic():
            deleted_teachers, _ = bad_teachers.delete()
            deleted_students, _ = bad_students.delete()

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Deleted {len(bad_teacher_list)} non-seeded teacher(s) "
            f"and {len(bad_student_list)} non-seeded student(s)."
        ))
        self.stdout.write(f"  Remaining users: {User.objects.count()}")
        self.stdout.write("=" * 60 + "\n")