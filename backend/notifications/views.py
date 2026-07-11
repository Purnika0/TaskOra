"""In-app notification inbox: list, unread count (for the bell badge), mark read/unread, and delete/clear."""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Every user (student or teacher) only ever sees their own notifications —
    role-based scoping happens naturally because notifications are created
    with a specific `recipient`.

    Optional query params:
        ?unread=true   → only unread notifications
        ?limit=50      → cap the number returned (default 50, max 100)
    """
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).select_related(
            'actor', 'course', 'assignment', 'task'
        )
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)

        try:
            limit = min(int(self.request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            limit = 50
        return qs[:limit]


class UnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — used by the bell badge polling loop."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})


class MarkNotificationReadView(APIView):
    """PATCH /api/notifications/<pk>/read/ — marks a single notification as read."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notification).data)


class MarkAllNotificationsReadView(APIView):
    """POST /api/notifications/mark-all-read/ — marks every unread notification as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({'detail': f'{updated} notification(s) marked as read.'})


class NotificationDetailView(APIView):
    """DELETE /api/notifications/<pk>/ — removes a single notification."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClearReadNotificationsView(APIView):
    """DELETE /api/notifications/clear-read/ — bulk-removes already-read notifications."""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        deleted, _ = Notification.objects.filter(recipient=request.user, is_read=True).delete()
        return Response({'detail': f'{deleted} notification(s) cleared.'})
