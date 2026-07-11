from django.utils import timezone
from holidays.models import Holiday


class HolidayCountCache:
    """
    Per-request cache for holiday counts.

    priority_score is now recomputed live on every read (instead of being
    trusted as a stale value stored at task-creation time), which means the
    holiday-count query in _base_score would otherwise run once per task.
    Since many tasks in a single request share the same assignment (and
    therefore the same due_date), this cache makes sure each distinct
    due_date is only queried once per request.

    Usage: create one instance per request/view, pass it through to
    calculate_priority_score(assignment, cache), and it's shared across
    every task being serialized in that response.
    """

    def __init__(self):
        self._counts = {}
        self._today = timezone.localdate()

    def count_for(self, due_date):
        if not due_date:
            return 0
        if due_date not in self._counts:
            self._counts[due_date] = Holiday.objects.filter(
                date__gte=self._today, date__lte=due_date
            ).count()
        return self._counts[due_date]


def _base_score(due_date, priority, estimated_hours, holiday_count):
    today = timezone.localdate()
    days_left = (due_date - today).days if due_date else 7

    # Urgency ramps up linearly over the last 30 days before a task is due,
    # hitting 1.0 the moment it's overdue (days_left <= 0).
    urgency = 1.0 if days_left <= 0 else max(0.0, 1.0 - (days_left / 30))
    
    # PriorityLevel is 1..5 — normalize to 0..1 so it's comparable to the
    # other components before weighting.
    priority_norm = (priority - 1) / 4
    
    # Heavier tasks nudge priority up too, capped at 10 hours so a single
    # very long task can't dominate the score on workload alone.
    workload_norm = min(estimated_hours / 10, 1.0)
    
    # Small nudge upward if public holidays fall between now and the due
    # date, since those days effectively aren't available to work on it.
    # Capped at 0.2 so it's a tiebreaker, not a dominant factor.
    holiday_bump = min(holiday_count * 0.05, 0.2)

    # Weighted sum: urgency matters most, then teacher-assigned priority,
    # then workload, with the holiday bump added on top (uncapped weight,
    # but the bump itself is already capped at 0.2 above).
    score = (
        urgency       * 0.50 +
        priority_norm * 0.30 +
        workload_norm * 0.20 +
        holiday_bump
    )
    return round(min(score, 1.0), 4)


def calculate_priority_score(assignment, cache=None):
    """
    Live urgency score for a teacher-assigned task.

    `cache` is an optional HolidayCountCache shared across a request. If
    omitted, a one-off Holiday query is run (fine for single-object reads
    like a submit/review action; always pass a cache when serializing a
    list of tasks to avoid N+1 queries).
    """
    holiday_count = (
        cache.count_for(assignment.due_date) if cache is not None
        else HolidayCountCache().count_for(assignment.due_date)
    )
    return _base_score(
        assignment.due_date, assignment.priority, assignment.estimated_hours, holiday_count
    )