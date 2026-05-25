from django.db import models
from users.models import User
from courses.models import Course


class Assignment(models.Model):
    class TaskType(models.TextChoices):
        ASSIGNMENT = 'assignment', 'Assignment'
        EXAM = 'exam', 'Exam'
        PROJECT = 'project', 'Project'
        HOMEWORK = 'homework', 'Homework'
        QUIZ = 'quiz', 'Quiz'
        OTHER = 'other', 'Other'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_assignments')
    due_date = models.DateField()
    task_type = models.CharField(max_length=20, choices=TaskType.choices, default=TaskType.ASSIGNMENT)
    estimated_hours = models.FloatField(default=1.0)
    priority = models.IntegerField(default=3)  # 1 (low) to 5 (high)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.course.title})"


class Task(models.Model):
    class TaskType(models.TextChoices):
        ASSIGNMENT = 'assignment', 'Assignment'
        EXAM = 'exam', 'Exam'
        PROJECT = 'project', 'Project'
        HOMEWORK = 'homework', 'Homework'
        QUIZ = 'quiz', 'Quiz'
        PERSONAL = 'personal', 'Personal'
        OTHER = 'other', 'Other'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')

    # If from a teacher assignment — set automatically
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE,
        related_name='tasks', null=True, blank=True
    )

    # If personal — student fills these in directly
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='personal_tasks'
    )  # optional — student can link to a course
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.FloatField(default=1.0)
    priority = models.IntegerField(default=3)
    task_type = models.CharField(max_length=20, choices=TaskType.choices, default=TaskType.PERSONAL)

    # Shared fields
    is_completed = models.BooleanField(default=False)
    priority_score = models.FloatField(default=0.0)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent duplicate teacher-assigned tasks per student
        unique_together = [('student', 'assignment')]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'assignment'],
                condition=models.Q(assignment__isnull=False),
                name='unique_student_assignment'
            )
        ]

    def is_personal(self):
        return self.assignment is None

    def get_title(self):
        """Helper to always get a display title regardless of task source."""
        return self.title if self.is_personal() else self.assignment.title

    def __str__(self):
        return f"{self.student.username} — {self.get_title()}"


class SubTask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({'done' if self.is_completed else 'pending'})"