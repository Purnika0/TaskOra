"""
PKMC BIT — Holidays Seed Command
===================================
Run with:
    python manage.py seed_holidays           # seed holidays
    python manage.py seed_holidays --clear   # delete all holidays and re-seed

Holiday list source: Official Nepal public holiday calendar 2025–2026/2027
Duplicates are automatically skipped (one entry per unique date).
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date


# ---------------------------------------------------------------------------
# Holiday data
# Format: (title, AD date, BS date string, holiday_type)
# holiday_type choices: 'public', 'festival', 'regional', 'restricted'
# Duplicates (same date) are skipped — first entry per date wins.
# ---------------------------------------------------------------------------

HOLIDAYS = [
    # 2025
    ("Nepali New Year",                         date(2025, 4, 14),  "2082-01-01", "public"),
    ("International Labour Day",                date(2025, 5, 1),   "2082-01-18", "public"),
    ("Buddha Jayanti / Ubhauli Parva",          date(2025, 5, 12),  "2082-01-29", "festival"),
    ("Republic Day",                            date(2025, 5, 29),  "2082-02-15", "public"),
    ("Raksha Bandhan / Janai Purnima",          date(2025, 8, 9),   "2082-04-24", "festival"),
    ("Gai Jatra",                               date(2025, 8, 10),  "2082-04-25", "festival"),
    ("Krishna Janmashtami",                     date(2025, 8, 16),  "2082-04-31", "festival"),
    ("Haritalika Teej",                         date(2025, 8, 26),  "2082-05-10", "restricted"),
    ("Gaura Parva",                             date(2025, 8, 31),  "2082-05-15", "regional"),
    ("Indra Jatra",                             date(2025, 9, 6),   "2082-05-21", "regional"),
    ("Jitiya Parva",                            date(2025, 9, 15),  "2082-05-30", "restricted"),
    ("Constitution Day",                        date(2025, 9, 19),  "2082-06-03", "public"),
    ("Ghatasthapana",                           date(2025, 9, 22),  "2082-06-06", "festival"),
    ("Fulpati",                                 date(2025, 9, 29),  "2082-06-13", "festival"),
    ("Maha Ashtami",                            date(2025, 9, 30),  "2082-06-14", "festival"),
    ("Maha Nawami",                             date(2025, 10, 1),  "2082-06-15", "festival"),
    ("Bijaya Dashami",                          date(2025, 10, 2),  "2082-06-16", "festival"),
    ("Dashain Holiday",                         date(2025, 10, 3),  "2082-06-17", "festival"),
    ("Dashain Holiday",                         date(2025, 10, 4),  "2082-06-18", "festival"),
    ("Laxmi Pooja / Kukur Tihar",               date(2025, 10, 20), "2082-07-03", "festival"),
    ("Tihar Holiday",                           date(2025, 10, 21), "2082-07-04", "festival"),
    ("Gobardhan Pooja / Nepal Sambat 1146",     date(2025, 10, 22), "2082-07-05", "festival"),
    ("Bhai Tika",                               date(2025, 10, 23), "2082-07-06", "festival"),
    ("Tihar Holiday",                           date(2025, 10, 24), "2082-07-07", "festival"),
    ("Chhath Parva",                            date(2025, 10, 27), "2082-07-10", "festival"),
    ("Christmas Day",                           date(2025, 12, 25), "2082-09-10", "public"),
    ("Maghe Sankranti",                         date(2026, 1, 15),  "2082-10-01", "festival"),
    ("Sahid Diwas",                             date(2026, 1, 30),  "2082-10-16", "public"),
    ("Maha Shivaratri",                         date(2026, 2, 15),  "2082-11-03", "festival"),
    ("Prajatantra Diwas",                       date(2026, 2, 19),  "2082-11-07", "public"),
    ("Fagu Purnima / Holi",                     date(2026, 3, 2),   "2082-11-18", "festival"),
    ("Holi (Terai)",                            date(2026, 3, 3),   "2082-11-19", "festival"),
    ("International Women's Day",               date(2026, 3, 8),   "2082-11-24", "restricted"),
    # 2026
    ("Nepali New Year",                         date(2026, 4, 14),  "2083-01-01", "public"),
    ("World Labour Day / Buddha Jayanti",       date(2026, 5, 1),   "2083-01-18", "public"),
    ("Republic Day",                            date(2026, 5, 29),  "2083-02-15", "public"),
    ("Raksha Bandhan / Janai Purnima",          date(2026, 8, 28),  "2083-05-12", "festival"),
    ("Gai Jatra",                               date(2026, 8, 29),  "2083-05-13", "festival"),
    ("Shri Krishna Janmashtami / Gaura Parva",  date(2026, 9, 4),   "2083-05-19", "festival"),
    ("Haritalika Teej",                         date(2026, 9, 14),  "2083-05-29", "restricted"),
    ("Constitution Day",                        date(2026, 9, 19),  "2083-06-03", "public"),
    ("Indra Jatra",                             date(2026, 9, 25),  "2083-06-09", "regional"),
    ("Jitiya Parva",                            date(2026, 10, 4),  "2083-06-18", "restricted"),
    ("Ghatasthapana",                           date(2026, 10, 11), "2083-06-25", "festival"),
    ("Dashain Holiday – Fulpati",               date(2026, 10, 17), "2083-07-01", "festival"),
    ("Dashain Holiday – Maha Ashtami",          date(2026, 10, 18), "2083-07-02", "festival"),
    ("Dashain Holiday – Maha Navami",           date(2026, 10, 20), "2083-07-04", "festival"),
    ("Dashain Holiday – Vijaya Dashami",        date(2026, 10, 21), "2083-07-05", "festival"),
    ("Dashain Holiday – Additional",            date(2026, 10, 22), "2083-07-06", "festival"),
    ("Tihar Holiday – Kukur Tihar / Laxmi Pooja", date(2026, 11, 8),  "2083-07-23", "festival"),
    ("Tihar Holiday – Govardhan Pooja / Nepal Sambat 1147", date(2026, 11, 10), "2083-07-25", "festival"),
    ("Tihar Holiday – Bhai Tika",               date(2026, 11, 11), "2083-07-26", "festival"),
    ("Chhath Parva",                            date(2026, 11, 15), "2083-07-30", "festival"),
    ("International Day of Persons with Disabilities", date(2026, 12, 3),  "2083-08-18", "restricted"),
    ("Yomari Punhi / Udhauli / Dhanya Purnima", date(2026, 12, 24), "2083-09-09", "festival"),
    ("Christmas Day",                           date(2026, 12, 25), "2083-09-10", "public"),
    ("Tamu Lhosar",                             date(2026, 12, 30), "2083-09-15", "festival"),
    # 2027
    ("Prithvi Jayanti / National Unity Day",    date(2027, 1, 11),  "2083-09-27", "public"),
    ("Makar Sankranti",                         date(2027, 1, 15),  "2083-10-02", "festival"),
    ("Sahid Diwas",                             date(2027, 1, 30),  "2083-10-17", "public"),
    ("Sonam Lhosar",                            date(2027, 2, 7),   "2083-10-25", "festival"),
    ("Prajatantra Diwas",                       date(2027, 2, 19),  "2083-11-07", "public"),
    ("Maha Shivaratri",                         date(2027, 3, 6),   "2083-11-22", "festival"),
    ("International Women's Day",               date(2027, 3, 8),   "2083-11-24", "restricted"),
    ("Gyalpo Lhosar",                           date(2027, 3, 9),   "2083-11-25", "festival"),
    ("Fagu Purnima / Holi",                     date(2027, 3, 21),  "2083-12-07", "festival"),
    ("Fagu Purnima / Holi – Terai",             date(2027, 3, 22),  "2083-12-08", "festival"),
    ("Ghode Jatra",                             date(2027, 4, 6),   "2083-12-23", "regional"),
]


class Command(BaseCommand):
    help = "Seed Nepali public holidays (2025–2027) into the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing holidays before re-seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from holidays.models import Holiday

        if options["clear"]:
            deleted, _ = Holiday.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"  Cleared {deleted} existing holidays.\n"))

        self.stdout.write("\nSeeding holidays...")
        self.stdout.write("=" * 60)

        created_count = 0
        skipped_date = 0
        skipped_exists = 0
        seen_dates = set()

        # Pre-load existing dates from DB to avoid duplicates on re-run
        existing_dates = set(Holiday.objects.values_list("date", flat=True))

        for title, ad_date, bs_date, h_type in HOLIDAYS:
            # Skip if we've already processed this date in this run
            if ad_date in seen_dates:
                self.stdout.write(
                    f"  ~ SKIP (dup in list) [{ad_date}]  {title}"
                )
                skipped_date += 1
                continue

            # Skip if already in DB
            if ad_date in existing_dates:
                self.stdout.write(
                    f"  ~ EXISTS      [{ad_date}]  {title}"
                )
                skipped_exists += 1
                seen_dates.add(ad_date)
                continue

            Holiday.objects.create(
                title=title,
                date=ad_date,
                holiday_type=h_type,
                description=f"{title} — {bs_date} (BS)",
            )
            self.stdout.write(
                f"  ✓ [{ad_date}]  {bs_date}  {title}"
            )
            seen_dates.add(ad_date)
            existing_dates.add(ad_date)
            created_count += 1

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Created          : {created_count}")
        self.stdout.write(f"  Skipped (dup)    : {skipped_date}")
        self.stdout.write(f"  Skipped (exists) : {skipped_exists}")
        self.stdout.write(f"  Total in DB      : {Holiday.objects.count()}")
        self.stdout.write("=" * 60 + "\n")