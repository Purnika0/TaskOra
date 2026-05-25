from django.contrib import admin
from .models import Course, Enrollment


class EnrollmentInline(admin.TabularInline):
    model = Enrollment
    extra = 0
    readonly_fields = ['enrolled_at']
    autocomplete_fields = ['student']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'teacher', 'join_code', 'start_date', 'end_date', 'student_count']
    list_filter = ['teacher']
    search_fields = ['title', 'join_code', 'teacher__username']
    readonly_fields = ['join_code', 'created_at']
    inlines = [EnrollmentInline]

    def student_count(self, obj):
        return obj.enrollments.count()
    student_count.short_description = 'Students'


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'enrolled_at']
    list_filter = ['course']
    search_fields = ['student__username', 'course__title']
    readonly_fields = ['enrolled_at']