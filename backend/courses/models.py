"""
Course = a class a teacher runs; students join it via an 8-character code.
Enrollment is the join table connecting students to courses they've joined.
"""
import random
import string
from django.db import models
from django.utils import timezone
from users.models import User


def generate_join_code():
    """
    8 random uppercase letters/digits (e.g. 'K3F9QZ2A').
    Note: this doesn't check for collisions against existing codes — relies
    on the DB-level unique=True constraint on Course.join_code to reject a
    clash outright. With 36^8 possible codes this is exceedingly unlikely
    at TaskOra's scale, but a genuine collision would surface as an
    IntegrityError on save rather than being silently retried.
    """
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Nullable because a course can exist without an assigned teacher yet
    # (e.g. an admin creates it before deciding who teaches it) — see
    # notifications/services.py's notify_student_left_course, which
    # deliberately no-ops for courses in this state.
    # on_delete=SET_NULL (not CASCADE): a course can legitimately have no
    # teacher (see the null=True note above), and that's exactly the state
    # a course should fall back to if its teacher's account is deleted —
    # not disappear along with every enrollment, assignment, and task
    # underneath it.
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='courses', null=True, blank=True)
    join_code = models.CharField(max_length=8, unique=True, default=generate_join_code)
    
    # Not exposed via the API — auto-stamped at creation, never shown or settable in the frontend.
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Enrollment(models.Model):
    """A student's membership in a course. One row per student per course."""
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A student can't join the same course twice.
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username} → {self.course.title}"