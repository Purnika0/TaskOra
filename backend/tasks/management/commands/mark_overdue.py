# tasks/management/commands/mark_overdue.py
from django.core.management.base import BaseCommand
from tasks.services import mark_overdue_tasks

class Command(BaseCommand):
    help = "Marks all pending tasks past their due date as overdue."

    def handle(self, *args, **options):
        updated = mark_overdue_tasks()
        self.stdout.write(
            self.style.SUCCESS(f"{updated} task(s) marked as overdue."))