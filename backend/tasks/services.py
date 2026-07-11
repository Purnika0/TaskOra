from django.utils import timezone

from .models import Task


def mark_overdue_tasks():
    """
    Marks all pending tasks whose assignment due date has passed, and
    notifies each affected student. Returns the number of updated tasks.
    """
    # Imported locally rather than at module level, matching the app's
    # existing convention of deferring notifications.services imports to
    # call time (this specific import didn't test as circular, but keeping
    # the pattern consistent with the rest of the codebase).
    from notifications.services import notify_overdue

    today = timezone.localdate()

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