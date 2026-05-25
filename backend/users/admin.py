from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'full_name', 'email', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'full_name', 'email']
    ordering = ['-date_joined']

    fieldsets = UserAdmin.fieldsets + (
        ('StudyFlow Info', {
            'fields': ('role', 'full_name')
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('StudyFlow Info', {
            'fields': ('full_name', 'email', 'role')
        }),
    )