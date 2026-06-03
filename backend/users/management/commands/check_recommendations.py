"""
Check Recommendation Coverage
================================
Place this file at:
    any_app/management/commands/check_recommendations.py

Run with:
    python manage.py check_recommendations
"""

from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = "Check how many students are getting ML recommendations."

    def handle(self, *args, **options):
        from ml.recommendations import get_task_recommendations

        students = User.objects.filter(role='student')
        total    = students.count()

        self.stdout.write(f"\nChecking recommendations for {total} students...")
        self.stdout.write("=" * 60)

        has_recs    = []
        no_recs     = []
        rec_counts  = {}

        for student in students:
            recs  = get_task_recommendations(student)
            count = len(recs)
            rec_counts[student.username] = count

            if count > 0:
                has_recs.append((student.username, count))
            else:
                no_recs.append(student.username)

        # Students WITH recommendations
        self.stdout.write(f"\n✓ Students WITH recommendations: {len(has_recs)}/{total}")
        self.stdout.write("-" * 40)
        for username, count in sorted(has_recs, key=lambda x: -x[1]):
            self.stdout.write(f"  {username:<35} {count} recommendation(s)")

        # Students WITHOUT recommendations
        self.stdout.write(f"\n✗ Students with ZERO recommendations: {len(no_recs)}/{total}")
        self.stdout.write("-" * 40)
        for username in no_recs:
            self.stdout.write(f"  {username}")

        # Summary
        counts = list(rec_counts.values())
        avg    = round(sum(counts) / len(counts), 1) if counts else 0

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Total students          : {total}")
        self.stdout.write(f"  Getting recommendations : {len(has_recs)} ({round(len(has_recs)/total*100, 1)}%)")
        self.stdout.write(f"  Zero recommendations    : {len(no_recs)} ({round(len(no_recs)/total*100, 1)}%)")
        self.stdout.write(f"  Average per student     : {avg}")
        self.stdout.write(f"  Max recommendations     : {max(counts) if counts else 0}")
        self.stdout.write(f"  Min recommendations     : {min(counts) if counts else 0}")
        self.stdout.write("=" * 60 + "\n")