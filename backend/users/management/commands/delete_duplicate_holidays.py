"""
PKMC BIT — Delete Duplicate Holidays Command
==============================================
Run with:
    python manage.py delete_duplicate_holidays

What it does:
    - Finds holidays sharing the same date
    - Keeps the first one (earliest pk), deletes the rest
    - Prints a report of what was deleted
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Delete duplicate holiday entries that share the same date."

    @transaction.atomic
    def handle(self, *args, **options):
        from holidays.models import Holiday

        self.stdout.write("\nScanning for duplicate holidays...")
        self.stdout.write("=" * 60)

        all_holidays = Holiday.objects.order_by("date", "pk")
        seen_dates = {}
        duplicates = []

        for holiday in all_holidays:
            date_key = holiday.date
            if date_key in seen_dates:
                duplicates.append(holiday)
                self.stdout.write(
                    f"  ✗ DUPLICATE  [{holiday.date}]  {holiday.title}  (pk={holiday.pk})"
                    f"  →  keeping '{seen_dates[date_key].title}' (pk={seen_dates[date_key].pk})"
                )
            else:
                seen_dates[date_key] = holiday

        if not duplicates:
            self.stdout.write(self.style.SUCCESS("\n  No duplicate holidays found. Database is clean!"))
            return

        self.stdout.write(f"\n  Found {len(duplicates)} duplicate(s). Deleting...")
        for dup in duplicates:
            dup.delete()

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Deleted {len(duplicates)} duplicate holiday(s)."
        ))
        self.stdout.write(f"  Remaining holidays in DB: {Holiday.objects.count()}")
        self.stdout.write("=" * 60 + "\n")