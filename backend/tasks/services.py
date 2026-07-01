from django.utils import timezone

from .models import Task


def mark_overdue_tasks():
    """
    Marks all pending tasks whose assignment due date has passed.
    Returns the number of updated tasks.
    """

    today = timezone.now().date()

    updated = Task.objects.filter(
        status=Task.Status.PENDING,
        assignment__due_date__lt=today
    ).update(
        status=Task.Status.OVERDUE
    )

    return updated