import random
import string
from django.db import models
from users.models import User
from datetime import date


def generate_join_code():
    # Generate a unique 8-character alphanumeric join code
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses') # need to remove the null later , null=True, blank=True
    join_code = models.CharField(max_length=8, unique=False, default=generate_join_code)
    start_date = models.DateField(default=date.today)
    end_date = models.DateField(null=True, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username} → {self.course.title}"