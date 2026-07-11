"""
Run with:
    python manage.py delete_test_users
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

KEEP_USERNAMES = {"Sanchita", "Sanchita123", "Admin"}


class Command(BaseCommand):
    help = "Delete test teachers and test students, keeping real accounts."

    def handle(self, *args, **options):
        to_delete = User.objects.exclude(username__in=KEEP_USERNAMES)

        usernames = list(to_delete.values_list("username", flat=True))
        count = to_delete.count()

        if count == 0:
            self.stdout.write(self.style.WARNING("No test users found to delete."))
            return

        self.stdout.write(f"About to delete {count} users:")
        for u in usernames:
            self.stdout.write(f"  - {u}")

        to_delete.delete()
        self.stdout.write(self.style.SUCCESS(f"\n✓ Deleted {count} test users successfully."))
        self.stdout.write(f"  Kept: {', '.join(KEEP_USERNAMES)}")