from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Read serializer — used for the bell dropdown and the notifications page."""

    actor_name      = serializers.SerializerMethodField()
    course_name     = serializers.SerializerMethodField()
    assignment_title = serializers.SerializerMethodField()
    # Where the frontend should navigate to when the notification is clicked.
    link            = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notif_type', 'title', 'message',
            'is_read', 'read_at', 'created_at',
            'actor', 'actor_name',
            'course', 'course_name',
            'assignment', 'assignment_title',
            'task', 'link',
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        return obj.actor.full_name or obj.actor.username

    def get_course_name(self, obj):
        return obj.course.title if obj.course else None

    def get_assignment_title(self, obj):
        return obj.assignment.title if obj.assignment else None

    def get_link(self, obj):
        # Teacher-facing notification → submissions view; student-facing → assignments view.
        if obj.notif_type == Notification.Type.NEW_SUBMISSION:
            return '/app/submissions'
        return '/app/assignments'
