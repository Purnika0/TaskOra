"""
PKMC BIT — Students Seed Command
==================================
Run with:
    python manage.py seed_students           # create students
    python manage.py seed_students --clear   # delete seeded students and re-create
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

# ---------------------------------------------------------------------------
# Student data
# Format per batch: (full_name, semester, suffix)
# Username: firstname.lastname.suffix  (e.g. sanchita.karki.79)
# Email:    firstname.lastname.suffix@student.pkmc.edu.np
# ---------------------------------------------------------------------------

BATCH_79_SEM7 = [
    "Sanchita Karki",
    "Sneha Praween",
    "Sudhikshya Shakya",
    "Ajuna Rai",
    "Dilisha Karki",
    "Nancy Shrestha",
    "Rabina Adhikari",
    "Minnie Chaulagain",
    "Aakriti Simkhada",
    "Dipisha Lama",
    "Samanta K.C.",
    "Poojana Shrestha",
    "Prashidhi Pokharel",
    "Binita Ghale",
    "Prativa Thapa",
    "Mitrata Bhandari",
    "Binita Gautam",
    "Sharon Timilsina",
    "Purnika Adhikari",
    "Junu Prajapati",
    "Satishna Shakya",
    "Garima Koirala",
    "Preja Budhathoki",
    "Nandini Dahal",
    "Unisha Gurung",
    "Sarishma Zimba",
    "Renu Sedai",
    "Prakriti Bhujel",
    "Akriti Khanal",
    "Iori Nishihama",
    "Xenon Saud",
    "Rakshya Neupane",
]

BATCH_80_SEM5 = [
    "Anjali Sharma",
    "Priya Thapa",
    "Kritika Pandey",
    "Sunita Tamang",
    "Menuka Shrestha",
    "Sabina Rai",
    "Rojina Karki",
    "Nisha Maharjan",
    "Swastika Poudel",
    "Barsha Adhikari",
    "Manisha Gurung",
    "Sujata Basnet",
    "Kabita Lama",
    "Puja Magar",
    "Sangita Bhattarai",
    "Babita Koirala",
    "Smriti Dahal",
    "Rekha Silwal",
    "Shruti Joshi",
    "Anita Dhakal",
    "Sapana Ghimire",
    "Roshani Budhathoki",
    "Nirmala Subedi",
    "Kopila Bista",
    "Astha Neupane",
    "Diksha Khadka",
    "Namrata Upreti",
    "Sima Rajbhandari",
    "Pallavi Acharya",
    "Bindu Shrestha",
]

BATCH_81_SEM3 = [
    "Asmita Prajapati",
    "Rachana Timilsina",
    "Pratima Yadav",
    "Roshni Bajracharya",
    "Dipti Chaudhary",
    "Nitu Maharjan",
    "Kamana Shrestha",
    "Saru Tamang",
    "Sushmita Karki",
    "Pabitra Rai",
    "Elina Thapa",
    "Nisha Gurung",
    "Samjhana Lama",
    "Susmita Adhikari",
    "Kalpana Pandey",
    "Sarita Bhattarai",
    "Gita Dhakal",
    "Muna Silwal",
    "Binita Basnet",
    "Sushila Magar",
    "Laxmi Dahal",
    "Champa Budhathoki",
    "Rupa Neupane",
    "Sona Joshi",
    "Dipa Koirala",
    "Ambika Upreti",
    "Sunita Poudel",
    "Nirmala Ghimire",
    "Kopila Subedi",
    "Prativa Bista",
    "Diksha Khadka",
    "Namrata Rajbhandari",
    "Sima Acharya",
]

BATCH_82_SEM1 = [
    "Aarati Shrestha",
    "Bimala Tamang",
    "Chanda Rai",
    "Deepa Karki",
    "Ekta Sharma",
    "Falguni Thapa",
    "Ganga Maharjan",
    "Hira Gurung",
    "Isha Poudel",
    "Jyoti Bhattarai",
    "Kamala Lama",
    "Lila Magar",
    "Mina Adhikari",
    "Nisha Dahal",
    "Oshin Basnet",
    "Pramila Koirala",
    "Qinara Rai",
    "Rita Neupane",
    "Sita Joshi",
    "Tara Silwal",
    "Uma Budhathoki",
    "Vanisha Pandey",
    "Wangmo Tamang",
    "Xina Shrestha",
    "Yamuna Upreti",
    "Zara Bhandari",
    "Anushka Prajapati",
    "Bishala Bajracharya",
    "Chhaya Chaudhary",
    "Drishya Timilsina",
    "Esha Subedi",
    "Falak Khadka",
    "Gargi Acharya",
    "Hansika Ghimire",
    "Ishika Bista",
    "Janaki Rajbhandari",
]

# Batch registry: (student_list, semester_number, batch_suffix)
BATCHES = [
    (BATCH_79_SEM7, 7, "79"),
    (BATCH_80_SEM5, 5, "80"),
    (BATCH_81_SEM3, 3, "81"),
    (BATCH_82_SEM1, 1, "82"),
]


def make_username(full_name, suffix):
    """Convert 'Sanchita Karki' + '79' → 'sanchita.karki.79'"""
    parts = full_name.strip().split()
    first = parts[0].lower()
    last = parts[-1].lower().replace(".", "").replace(" ", "")
    return f"{first}.{last}.{suffix}"


class Command(BaseCommand):
    help = "Seed PKMC BIT student accounts for all 4 active batches."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all seeded students before re-creating.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing seeded students..."))
            suffixes = ["79", "80", "81", "82"]
            deleted = 0
            for suffix in suffixes:
                qs = User.objects.filter(
                    username__endswith=f".{suffix}",
                    role=User.Role.STUDENT,
                )
                deleted += qs.count()
                qs.delete()
            self.stdout.write(self.style.SUCCESS(f"  Deleted {deleted} students.\n"))

        self._seed_students()

    def _seed_students(self):
        self.stdout.write("\nCreating student accounts...")
        self.stdout.write("=" * 60)

        total_created = 0
        total_skipped = 0

        for student_list, semester, suffix in BATCHES:
            self.stdout.write(f"\n  Batch .{suffix}  —  Semester {semester}  ({len(student_list)} students)")
            self.stdout.write("  " + "-" * 50)
            created_count = 0
            skipped_count = 0

            for full_name in student_list:
                username = make_username(full_name, suffix)
                email = f"{username}@student.pkmc.edu.np"

                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "email": email,
                        "full_name": full_name,
                        "role": User.Role.STUDENT,
                    },
                )
                if created:
                    user.set_password("Student@123")
                    user.save()
                    self.stdout.write(f"    ✓ Created  — {full_name} ({username})")
                    created_count += 1
                else:
                    self.stdout.write(f"    ~ Exists   — {full_name} ({username})")
                    skipped_count += 1

            self.stdout.write(
                f"\n    Created: {created_count}  |  Already existed: {skipped_count}"
            )
            total_created += created_count
            total_skipped += skipped_count

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Total created  : {total_created}")
        self.stdout.write(f"  Already existed: {total_skipped}")
        self.stdout.write(f"  Grand total    : {total_created + total_skipped}")
        self.stdout.write("\n  Default student password: Student@123")
        self.stdout.write("=" * 60 + "\n")