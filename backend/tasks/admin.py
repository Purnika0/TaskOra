from django.contrib import admin
from .models import Assignment, Task


class TaskInline(admin.TabularInline):
    model          = Task
    extra          = 0
    readonly_fields = ['student', 'priority_score', 'status', 'submitted_at', 'completed_at']
    fields          = ['student', 'status', 'priority_score', 'submitted_at', 'completed_at']


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display   = ['title', 'course', 'created_by', 'task_type', 'due_date', 'priority', 'task_count']
    list_filter    = ['task_type', 'priority', 'course']
    search_fields  = ['title', 'course__title', 'created_by__username']
    readonly_fields = ['created_at']
    inlines        = [TaskInline]

    def task_count(self, obj):
        return obj.tasks.count()
    task_count.short_description = 'Students Assigned'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display   = ['get_title', 'student', 'status', 'priority_score', 'due_date']
    list_filter    = ['status', 'assignment__task_type']
    search_fields  = ['student__username', 'assignment__title']
    readonly_fields = ['priority_score', 'submitted_at', 'completed_at', 'created_at']

    def get_title(self, obj):
        return obj.get_title()
    get_title.short_description = 'Title'

    def due_date(self, obj):
        return obj.assignment.due_date
    due_date.short_description = 'Due Date'