# notifications/management/commands/send_deadline_reminders.py
"""
Sends a "deadline approaching" notification to students whose assignment is
due within the next N hours (default 24) and who haven't submitted yet.

Intended to run periodically (e.g. every 30-60 minutes) via cron / Windows
Task Scheduler / a hosting platform's scheduled-job feature, the same way
`mark_overdue` is already run:

    python manage.py send_deadline_reminders
    python manage.py send_deadline_reminders --hours 24

The command is idempotent — notifications/services.notify_deadline_reminder()
checks whether a reminder was already created for a given task before
inserting a new one, so running this command frequently is safe and will
never spam a student with duplicate reminders for the same assignment.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from tasks.models import Task
from notifications.services import notify_deadline_reminder


class Command(BaseCommand):
    help = "Send deadline-reminder notifications for assignments due within the next N hours."

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours', type=int, default=24,
            help='How many hours before the due date to send the reminder (default: 24).'
        )

    def handle(self, *args, **options):
        window_hours = options['hours']
        now = timezone.now()
        cutoff_date = (now + timedelta(hours=window_hours)).date()

        # Pending tasks whose assignment is due today or within the reminder
        # window, and not already overdue.
        candidates = Task.objects.filter(
            status=Task.Status.PENDING,
            assignment__due_date__gte=now.date(),
            assignment__due_date__lte=cutoff_date,
        ).select_related('assignment__course', 'student')

        sent = 0
        for task in candidates:
            if notify_deadline_reminder(task):
                sent += 1

        self.stdout.write(self.style.SUCCESS(
            f"Checked {candidates.count()} pending task(s) due within {window_hours}h — "
            f"sent {sent} new reminder(s)."
        ))
