from django.contrib import admin
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display   = ['full_name', 'email', 'subject', 'status', 'submitted_at']
    list_filter    = ['status', 'submitted_at']
    search_fields  = ['full_name', 'email', 'subject', 'message']
    readonly_fields = ['full_name', 'email', 'subject', 'message', 'submitted_at']
    ordering       = ['-submitted_at']

    def has_add_permission(self, request):
        # Contact messages only ever come from the public form — admins
        # shouldn't be able to fabricate one from the Django admin.
        return False