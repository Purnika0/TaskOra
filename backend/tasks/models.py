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

    # Optional reference document the teacher attaches to the assignment
    # (instructions, handout, rubric, etc.) — visible/downloadable by students.
    file = models.FileField(upload_to='assignments/', null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.course.title})"


class Task(models.Model):
    class Status(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        SUBMITTED = 'submitted', 'Submitted'
        COMPLETED = 'completed', 'Completed'
        OVERDUE   = 'overdue',   'Overdue'
        REJECTED  = 'rejected',  'Rejected'

    student    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name='tasks'
    )

    # Smart priority score calculated at task creation
    priority_score = models.FloatField(default=0.0)

    # Status lifecycle: pending → submitted → completed (or overdue)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    # Student submission
    submission_file = models.FileField(
        upload_to='submissions/',
        null=True, blank=True
    )
    submission_text = models.TextField(blank=True)
    submitted_at    = models.DateTimeField(null=True, blank=True)

    # Teacher review
    teacher_feedback = models.TextField(blank=True)
    completed_at     = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('student', 'assignment')]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'assignment'],
                name='unique_student_assignment'
            )
        ]

    def get_title(self):
        return self.assignment.title

    def __str__(self):
        return f"{self.student.username} — {self.assignment.title} [{self.status}]"