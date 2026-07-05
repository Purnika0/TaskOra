from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import Assignment, Task
from .serializers import (
    AssignmentSerializer,
    TaskSerializer,
    TaskSubmitSerializer,
    TaskReviewSerializer,
)
from .priority import calculate_priority_score
from courses.models import Enrollment
from users.permissions import IsTeacher, IsStudent
from notifications.services import (
    notify_new_assignment,
    notify_new_submission,
    notify_submission_reviewed,
)


# ---------------------------------------------------------------------------
# Assignment views (Teacher)
# ---------------------------------------------------------------------------

class AssignmentListCreateView(generics.ListCreateAPIView):
    """Teacher lists their assignments or creates a new one."""
    serializer_class   = AssignmentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Assignment.objects.filter(created_by=self.request.user)\
            .select_related('course')\
            .annotate(
                submission_count=Count('tasks', filter=Q(tasks__submitted_at__isnull=False), distinct=True),
                pending_review_count=Count('tasks', filter=Q(tasks__status=Task.Status.SUBMITTED), distinct=True),
                approved_count=Count('tasks', filter=Q(tasks__status=Task.Status.COMPLETED), distinct=True),
                rejected_count=Count('tasks', filter=Q(tasks__status=Task.Status.REJECTED), distinct=True),
            )

    def perform_create(self, serializer):
        assignment = serializer.save(created_by=self.request.user)
        # Auto-create a Task for every enrolled student
        enrollments   = Enrollment.objects.filter(course=assignment.course).select_related('student')
        score         = calculate_priority_score(assignment)
        Task.objects.bulk_create([
            Task(student=e.student, assignment=assignment, priority_score=score)
            for e in enrollments
        ])
        # Notify every enrolled student that a new assignment was posted
        notify_new_assignment(assignment, [e.student for e in enrollments])


class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Teacher retrieves, updates, or deletes one of their assignments."""
    serializer_class   = AssignmentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Assignment.objects.filter(created_by=self.request.user).select_related('course')


# ---------------------------------------------------------------------------
# Task views (Student)
# ---------------------------------------------------------------------------

class StudentTaskListView(generics.ListAPIView):
    """Student lists all their tasks."""
    serializer_class   = TaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        qs     = Task.objects.filter(student=self.request.user).select_related('assignment__course')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class SmartPriorityTaskView(generics.ListAPIView):
    """Student gets incomplete tasks ordered by priority score."""
    serializer_class   = TaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        # Pending and overdue tasks ordered by urgency
        return Task.objects.filter(
            student=self.request.user,
            status__in=[Task.Status.PENDING, Task.Status.OVERDUE]
        ).order_by('-priority_score').select_related('assignment__course')


class StudentSubmitTaskView(APIView):
    """
    Student submits an assignment.
    PATCH /api/tasks/<pk>/submit/
    Accepts: submission_file (optional), submission_text (optional)
    At least one must be provided.
    """
    permission_classes = [IsStudent]

    def patch(self, request, pk):
        task = get_object_or_404(Task, pk=pk, student=request.user)

        if task.status == Task.Status.COMPLETED:
            return Response(
                {"detail": "This task has already been marked as completed by your teacher."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if task.status == Task.Status.SUBMITTED:
            return Response(
                {"detail": "You have already submitted this task."},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_resubmission = task.status == Task.Status.REJECTED

        serializer = TaskSubmitSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            notify_new_submission(task, is_resubmission=is_resubmission)
            return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Task views (Teacher)
# ---------------------------------------------------------------------------

class TeacherAssignmentTaskListView(generics.ListAPIView):
    """
    Teacher views all student tasks for a specific assignment.
    GET /api/tasks/assignment/<assignment_pk>/submissions/
    Optionally filter by status: ?status=submitted
    """
    serializer_class   = TaskSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        assignment_pk = self.kwargs['assignment_pk']
        assignment    = get_object_or_404(
            Assignment, pk=assignment_pk, created_by=self.request.user
        )
        qs = Task.objects.filter(assignment=assignment).select_related('student', 'assignment__course')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class TeacherSubmissionsInboxView(generics.ListAPIView):
    """
    Cross-course submissions inbox — every task belonging to any of the
    teacher's assignments, across every course, in one list.

    GET /api/tasks/teacher/submissions/
    Optional filters:
      ?status=submitted        (task status — defaults to showing all statuses)
      ?course_id=<id>          (restrict to one course)
      ?assignment_id=<id>      (restrict to one assignment)
      ?search=<text>           (matches student username or full name)
    Ordered newest-submitted-first so the most recent "to review" items
    surface at the top.
    """
    serializer_class   = TaskSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        qs = Task.objects.filter(assignment__created_by=self.request.user)\
            .select_related('student', 'assignment', 'assignment__course')\
            .order_by('-submitted_at', '-created_at')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        course_id = self.request.query_params.get('course_id')
        if course_id:
            qs = qs.filter(assignment__course_id=course_id)

        assignment_id = self.request.query_params.get('assignment_id')
        if assignment_id:
            qs = qs.filter(assignment_id=assignment_id)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(student__username__icontains=search) |
                Q(student__full_name__icontains=search)
            )

        return qs


class TeacherReviewTaskView(APIView):
    """
    Teacher marks a submitted task as completed with optional feedback.
    PATCH /api/tasks/<pk>/review/
    Accepts: teacher_feedback (optional)
    """
    permission_classes = [IsTeacher]

    def patch(self, request, pk):
        # Ensure the task belongs to an assignment created by this teacher
        task = get_object_or_404(
            Task, pk=pk, assignment__created_by=request.user
        )

        if task.status != Task.Status.SUBMITTED:
            return Response(
                {"detail": "Only submitted tasks can be reviewed. Current status: " + task.status},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = TaskReviewSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            notify_submission_reviewed(task, approved=(task.status == Task.Status.COMPLETED))
            return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Overdue task auto-marker utility view (can be called by a cron or manually)
# ---------------------------------------------------------------------------

class MarkOverdueTasksView(APIView):
    """
    Admin/system utility — marks all pending tasks past their due date as overdue.
    POST /api/tasks/mark-overdue/
    """
    from users.permissions import IsAdmin
    permission_classes = [IsAdmin]

    def post(self, request):
        from .services import mark_overdue_tasks
        updated = mark_overdue_tasks()
        return Response(
            {"detail": f"{updated} task(s) marked as overdue."},
            status=status.HTTP_200_OK
        )