"""
Assignment CRUD (teacher-side) and Task listing/submission/review
endpoints (student and teacher side). See tasks/urls.py for routes.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from django.db import models
from django.db.models import Count, Q, F

from .models import Assignment, Task
from .serializers import (
    AssignmentSerializer,
    TaskSerializer,
    TaskSubmitSerializer,
    TaskReviewSerializer,
)
from .priority import calculate_priority_score, HolidayCountCache
from .file_access import read_download_token
from courses.models import Enrollment
from users.models import User
from users.permissions import IsTeacher, IsStudent
from notifications.services import (
    notify_new_assignment,
    notify_new_submission,
    notify_submission_reviewed,
    notify_assignment_updated,
)


class HolidayCacheMixin:
    """
    Shares one HolidayCountCache across every task serialized in a single
    request/response, so TaskSerializer's live priority_score recompute
    doesn't re-query the Holiday table once per task.
    """
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.setdefault('holiday_cache', HolidayCountCache())
        return context

class AssignmentListCreateView(generics.ListCreateAPIView):
    """Teacher lists their assignments or creates a new one."""
    serializer_class   = AssignmentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Assignment.objects.filter(created_by=self.request.user)\
            .select_related('course')\
            .annotate(
                submission_count=Count(
                    'tasks',
                    filter=Q(tasks__submitted_at__isnull=False) & Q(tasks__student__enrollments__course=F('course')),
                    distinct=True
                ),
                pending_review_count=Count(
                    'tasks',
                    filter=Q(tasks__status=Task.Status.SUBMITTED) & Q(tasks__student__enrollments__course=F('course')),
                    distinct=True
                ),
                approved_count=Count(
                    'tasks',
                    filter=Q(tasks__status=Task.Status.COMPLETED) & Q(tasks__student__enrollments__course=F('course')),
                    distinct=True
                ),
                rejected_count=Count(
                    'tasks',
                    filter=Q(tasks__status=Task.Status.REJECTED) & Q(tasks__student__enrollments__course=F('course')),
                    distinct=True
                ),
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

    def perform_update(self, serializer):
        assignment = serializer.save()
        # Notify every student currently enrolled in the course that the
        # assignment they were given has changed (title, due date, etc.).
        students = [
            e.student for e in
            Enrollment.objects.filter(course=assignment.course).select_related('student')
        ]
        notify_assignment_updated(assignment, students)


class StudentTaskListView(generics.ListAPIView):
    """Student lists all their tasks (only for courses they're currently enrolled in)."""
    serializer_class   = TaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        enrolled_course_ids = Enrollment.objects.filter(
            student=self.request.user
        ).values_list('course_id', flat=True)

        qs = Task.objects.filter(
            student=self.request.user,
            assignment__course_id__in=enrolled_course_ids
        ).select_related('assignment__course')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs



class SmartPriorityTaskView(generics.ListAPIView):
    """
    Student gets incomplete tasks ordered by priority score
    (currently enrolled courses only).

    Ordering can no longer be a DB-level `.order_by('-priority_score')`
    since that stored column goes stale as due dates approach. Instead we
    recompute the live score for each task (sharing one HolidayCountCache
    across the whole list to avoid N+1 queries) and sort in Python — fine
    here since a single student's incomplete-task list is small.
    """
    serializer_class   = TaskSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        enrolled_course_ids = Enrollment.objects.filter(
            student=self.request.user
        ).values_list('course_id', flat=True)

        return Task.objects.filter(
            student=self.request.user,
            assignment__course_id__in=enrolled_course_ids,
            status__in=[Task.Status.PENDING, Task.Status.OVERDUE]
        ).select_related('assignment__course')

    def list(self, request, *args, **kwargs):
        self._holiday_cache = HolidayCountCache()
        tasks = list(self.filter_queryset(self.get_queryset()))
        tasks.sort(
            key=lambda t: calculate_priority_score(t.assignment, cache=self._holiday_cache),
            reverse=True,
        )
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.setdefault('holiday_cache', getattr(self, '_holiday_cache', None) or HolidayCountCache())
        return context



class StudentSubmitTaskView(APIView):
    """
    Student submits an assignment — and can also edit that submission
    (same endpoint) as long as it hasn't been reviewed yet.
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

        is_resubmission = task.status == Task.Status.REJECTED
        is_edit         = task.status == Task.Status.SUBMITTED

        serializer = TaskSubmitSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            notify_new_submission(task, is_resubmission=is_resubmission, is_edit=is_edit)
            return Response(TaskSerializer(task, context={'request': request}).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



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
        enrolled_student_ids = Enrollment.objects.filter(
            course=assignment.course
        ).values_list('student_id', flat=True)

        qs = Task.objects.filter(
            assignment=assignment,
            student_id__in=enrolled_student_ids
        ).select_related('student', 'assignment__course')
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
        enrolled_pairs = Enrollment.objects.filter(
            course__teacher=self.request.user,
            student_id=models.OuterRef('student_id'),
            course_id=models.OuterRef('assignment__course_id'),
        )

        qs = Task.objects.filter(assignment__created_by=self.request.user)\
            .filter(models.Exists(enrolled_pairs))\
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
            return Response(TaskSerializer(task, context={'request': request}).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


def _can_access_assignment_file(user, assignment):
    if user.role == 'admin':
        return True
    if user.role == 'teacher':
        return assignment.created_by_id == user.id
    if user.role == 'student':
        return Enrollment.objects.filter(student_id=user.id, course_id=assignment.course_id).exists()
    return False


def _can_access_submission_file(user, task):
    if user.role == 'admin':
        return True
    if user.role == 'teacher':
        return task.assignment.created_by_id == user.id
    if user.role == 'student':
        return task.student_id == user.id
    return False


class AssignmentFileDownloadView(APIView):
    """
    Serves Assignment.file to whoever a signed download token (see
    tasks/file_access.py, issued by AssignmentSerializer.get_file) was
    issued for — the assignment's teacher, an admin, or a student
    currently enrolled in the course. Replaces direct /media/ access,
    which had no access control at all.

    permission_classes is AllowAny at the DRF level because auth here
    comes from the signed token itself (which encodes who it was issued
    for and expires after 10 minutes), not from the request's session —
    the actual permission check happens below, re-verified against the
    token's user on every request rather than trusted from issue time.

    GET /api/tasks/assignments/<pk>/file/?token=...
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        payload = read_download_token(request.query_params.get('token'))
        if not payload or payload.get('kind') != 'assignment' or payload.get('pk') != pk:
            raise Http404
        try:
            user = User.objects.get(pk=payload['user_id'])
        except User.DoesNotExist:
            raise Http404

        assignment = get_object_or_404(Assignment, pk=pk)
        if not assignment.file or not _can_access_assignment_file(user, assignment):
            raise Http404

        return FileResponse(
            assignment.file.open('rb'),
            filename=assignment.file.name.rsplit('/', 1)[-1],
        )


class TaskSubmissionFileDownloadView(APIView):
    """
    Serves Task.submission_file — same signed-token pattern as
    AssignmentFileDownloadView above, scoped to the task's own student,
    the assignment's teacher, or an admin.

    GET /api/tasks/<pk>/submission-file/?token=...
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        payload = read_download_token(request.query_params.get('token'))
        if not payload or payload.get('kind') != 'submission' or payload.get('pk') != pk:
            raise Http404
        try:
            user = User.objects.get(pk=payload['user_id'])
        except User.DoesNotExist:
            raise Http404

        task = get_object_or_404(Task, pk=pk)
        if not task.submission_file or not _can_access_submission_file(user, task):
            raise Http404

        return FileResponse(
            task.submission_file.open('rb'),
            filename=task.submission_file.name.rsplit('/', 1)[-1],
        )