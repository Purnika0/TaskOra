from django.contrib import admin
from .models import Assignment, Task, SubTask


class SubTaskInline(admin.TabularInline):
    model = SubTask
    extra = 0


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0
    readonly_fields = ['student', 'priority_score', 'completed_at']
    fields = ['student', 'is_completed', 'priority_score', 'completed_at']


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'created_by', 'task_type', 'due_date', 'priority', 'task_count']
    list_filter = ['task_type', 'priority', 'course']
    search_fields = ['title', 'course__title', 'created_by__username']
    readonly_fields = ['created_at']
    inlines = [TaskInline]

    def task_count(self, obj):
        return obj.tasks.count()
    task_count.short_description = 'Students Assigned'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['get_title', 'student', 'task_type', 'is_completed', 'priority_score', 'due_date', 'is_personal']
    list_filter = ['is_completed', 'task_type']
    search_fields = ['student__username', 'title', 'assignment__title']
    readonly_fields = ['priority_score', 'completed_at', 'created_at']
    inlines = [SubTaskInline]

    def get_title(self, obj):
        return obj.get_title()
    get_title.short_description = 'Title'

    def is_personal(self, obj):
        return obj.is_personal()
    is_personal.boolean = True
    is_personal.short_description = 'Personal'

    def due_date(self, obj):
        if obj.is_personal():
            return obj.due_date
        return obj.assignment.due_date if obj.assignment else '—'
    due_date.short_description = 'Due Date'


@admin.register(SubTask)
class SubTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'task', 'is_completed', 'created_at']
    list_filter = ['is_completed']
    search_fields = ['title', 'task__student__username']