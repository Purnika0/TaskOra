from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Assignment, Task, SubTask
from .serializers import (
    AssignmentSerializer, TaskSerializer,
    PersonalTaskSerializer, TaskUpdateSerializer, SubTaskSerializer
)
from .priority import calculate_priority_score
from courses.models import Enrollment
from users.permissions import IsTeacher, IsStudent


class AssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AssignmentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Assignment.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        assignment = serializer.save(created_by=self.request.user)
        enrollments = Enrollment.objects.filter(course=assignment.course)
        score = calculate_priority_score(assignment)
        Task.objects.bulk_create([
            Task(student=e.student, assignment=assignment, priority_score=score)
            for e in enrollments
        ])


class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AssignmentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Assignment.objects.filter(created_by=self.request.user)


class StudentTaskListView(generics.ListAPIView):
    """All tasks — both assigned and personal."""
    serializer_class = TaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        qs = Task.objects.filter(student=self.request.user).select_related('assignment')
        task_type = self.request.query_params.get('type')  # ?type=personal or ?type=assigned
        if task_type == 'personal':
            qs = qs.filter(assignment__isnull=True)
        elif task_type == 'assigned':
            qs = qs.filter(assignment__isnull=False)
        return qs


class PersonalTaskCreateView(generics.CreateAPIView):
    """Student creates a personal task."""
    serializer_class = PersonalTaskSerializer
    permission_classes = [IsStudent]


class PersonalTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Student edits or deletes their own personal tasks only."""
    serializer_class = PersonalTaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Task.objects.filter(student=self.request.user, assignment__isnull=True)


class SmartPriorityTaskView(generics.ListAPIView):
    """Incomplete tasks ordered by priority score."""
    serializer_class = TaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Task.objects.filter(
            student=self.request.user, is_completed=False
        ).order_by('-priority_score').select_related('assignment')


class TaskUpdateView(generics.UpdateAPIView):
    """Mark any task complete/incomplete."""
    serializer_class = TaskUpdateSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Task.objects.filter(student=self.request.user)


class SubTaskListCreateView(generics.ListCreateAPIView):
    serializer_class = SubTaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return SubTask.objects.filter(
            task_id=self.kwargs['task_pk'],
            task__student=self.request.user
        )

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'], student=self.request.user)
        serializer.save(task=task)


class SubTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubTaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return SubTask.objects.filter(
            task_id=self.kwargs['task_pk'],
            task__student=self.request.user
        )