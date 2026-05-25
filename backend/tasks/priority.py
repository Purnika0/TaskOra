from django.utils import timezone
from holidays.models import Holiday


def _base_score(due_date, priority, estimated_hours):
    today = timezone.now().date()
    days_left = (due_date - today).days if due_date else 7

    holiday_count = Holiday.objects.filter(
        date__gte=today, date__lte=due_date
    ).count() if due_date else 0

    urgency = 1.0 if days_left <= 0 else max(0.0, 1.0 - (days_left / 30))
    priority_norm = (priority - 1) / 4
    workload_norm = min(estimated_hours / 10, 1.0)
    holiday_bump = min(holiday_count * 0.05, 0.2)

    score = (
        urgency       * 0.50 +
        priority_norm * 0.30 +
        workload_norm * 0.20 +
        holiday_bump
    )
    return round(min(score, 1.0), 4)


def calculate_priority_score(assignment):
    """For teacher-assigned tasks."""
    return _base_score(assignment.due_date, assignment.priority, assignment.estimated_hours)


def calculate_priority_score_personal(task):
    """For student personal tasks."""
    return _base_score(task.due_date, task.priority, task.estimated_hours)