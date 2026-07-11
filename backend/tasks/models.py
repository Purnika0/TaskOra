"""
Assignment = a piece of work a teacher creates for a course (the "template").
Task = one student's personal instance of an Assignment (their submission,
status, and score). This split lets one Assignment fan out into many Tasks
(one per enrolled student) without duplicating the assignment's own data.
"""
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
        LAB = 'lab', 'Lab'
        OTHER = 'other', 'Other'

    class PriorityLevel(models.IntegerChoices):
        """
        Teacher-set editorial importance (1-5). This is distinct from
        Task.priority_score, which is the system-computed urgency score.
        Both assignment forms and any frontend display of this field
        should use these five labels rather than inventing their own
        subset — see src/constants/assignmentChoices.js on the frontend.
        """
        LOW = 1, 'Low'
        MEDIUM_LOW = 2, 'Medium-Low'
        MEDIUM = 3, 'Medium'
        MEDIUM_HIGH = 4, 'Medium-High'
        HIGH = 5, 'High'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_assignments')
    due_date = models.DateField(db_index=True)
    task_type = models.CharField(max_length=20, choices=TaskType.choices, default=TaskType.ASSIGNMENT)
    estimated_hours = models.FloatField(default=1.0)
    priority = models.IntegerField(choices=PriorityLevel.choices, default=PriorityLevel.MEDIUM)
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

    # Snapshot of the urgency score at the moment this Task was created.
    # NOT the authoritative value shown to users — since urgency changes
    # as the due date approaches, the live score is always recomputed via
    # tasks/priority.py's calculate_priority_score() wherever it's displayed
    # or sorted on. This stored value is effectively just a fallback/record
    # of the initial score, kept for reference rather than live use.
    priority_score = models.FloatField(default=0.0)

    # Status lifecycle: pending → submitted → completed (or overdue)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
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
        # A student can only have one Task per Assignment (re-joining a
        # course, for instance, must not create duplicates).
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