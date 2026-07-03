from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ('id', 'recipient', 'notif_type', 'title', 'is_read', 'created_at')
    list_filter   = ('notif_type', 'is_read', 'created_at')
    search_fields = ('recipient__username', 'title', 'message')
    autocomplete_fields = ('recipient', 'actor', 'course', 'assignment', 'task')
