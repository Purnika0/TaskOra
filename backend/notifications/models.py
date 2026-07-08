from django.db import models
from users.models import User
from courses.models import Course
from tasks.models import Assignment, Task


class Notification(models.Model):
    """
    A single in-app notification for a user (student or teacher).

    Notifications are created directly by application code (views/services)
    at the moment an event happens — no Django signals are used, to keep the
    trigger points explicit and easy to trace, matching the rest of the
    codebase's style.
    """

    class Type(models.TextChoices):
        NEW_ASSIGNMENT       = 'new_assignment',       'New Assignment'
        SUBMISSION_APPROVED  = 'submission_approved',  'Submission Approved'
        SUBMISSION_REJECTED  = 'submission_rejected',  'Submission Rejected'
        DEADLINE_REMINDER    = 'deadline_reminder',    'Deadline Reminder'
        ASSIGNMENT_OVERDUE   = 'assignment_overdue',   'Assignment Overdue'
        NEW_SUBMISSION       = 'new_submission',       'New Submission'
        ASSIGNMENT_UPDATED   = 'assignment_updated',   'Assignment Updated'
        NEW_STUDENT_REGISTERED = 'new_student_registered', 'New Student Registered'
        NEW_TEACHER_REGISTERED = 'new_teacher_registered', 'New Teacher Registered'
        NEW_COURSE_CREATED     = 'new_course_created',     'New Course Created'
        CONTACT_MESSAGE        = 'contact_message',        'Contact Message'
        COURSE_ASSIGNED        = 'course_assigned',        'Course Assigned'
        STUDENT_LEFT_COURSE = 'student_left_course', 'Student Left Course'
        STUDENT_REMOVED_FROM_COURSE = 'student_removed_from_course', 'Student Removed From Course'

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )

    # Who/what caused the notification (optional — e.g. the student who submitted).
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='triggered_notifications'
    )

    notif_type = models.CharField(max_length=30, choices=Type.choices)
    title      = models.CharField(max_length=255)
    message    = models.CharField(max_length=500)

    # Optional deep-link targets — nullable so the notification survives if
    # the related object is later deleted.
    course     = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    assignment = models.ForeignKey(Assignment, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    task       = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.notif_type}] → {self.recipient.username}: {self.title}"