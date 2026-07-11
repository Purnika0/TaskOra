"""
Keeps Task.status in sync with due dates without requiring an external
scheduler (no Celery/cron is configured in this project).

mark_overdue_tasks() previously only ran from the admin-only
POST /api/tasks/mark-overdue/ endpoint or a manually-invoked management
command, so a task's status stayed 'pending' past its due date until a
human triggered one of those. This middleware calls the same service
function opportunistically on incoming requests, throttled in-process so
it runs the update query at most once per interval rather than on every
request.
"""
import time

from .services import mark_overdue_tasks

SYNC_INTERVAL_SECONDS = 60
_last_synced_at = 0.0


class OverdueSyncMiddleware:
    """Runs mark_overdue_tasks() at most once every SYNC_INTERVAL_SECONDS."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        global _last_synced_at
        now = time.monotonic()
        if now - _last_synced_at > SYNC_INTERVAL_SECONDS:
            _last_synced_at = now
            mark_overdue_tasks()
        return self.get_response(request)
