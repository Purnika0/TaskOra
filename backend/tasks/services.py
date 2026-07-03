from django.utils import timezone

from .models import Task


def mark_overdue_tasks():
    """
    Marks all pending tasks whose assignment due date has passed, and
    notifies each affected student. Returns the number of updated tasks.
    """
    from notifications.services import notify_overdue

    today = timezone.now().date()

    newly_overdue = list(
        Task.objects.filter(
            status=Task.Status.PENDING,
            assignment__due_date__lt=today
        ).select_related('assignment__course', 'student')
    )

    if not newly_overdue:
        return 0

    Task.objects.filter(
        pk__in=[t.pk for t in newly_overdue]
    ).update(status=Task.Status.OVERDUE)

    for task in newly_overdue:
        notify_overdue(task)

    return len(newly_overdue)