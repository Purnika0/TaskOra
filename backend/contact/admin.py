from django.contrib import admin
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display   = ['full_name', 'email', 'subject', 'submitted_at']
    list_filter    = ['submitted_at']
    search_fields  = ['full_name', 'email', 'subject', 'message']
    readonly_fields = ['full_name', 'email', 'subject', 'message', 'submitted_at']
    ordering       = ['-submitted_at']

    def has_add_permission(self, request):
        return False  # messages should only come through the API form