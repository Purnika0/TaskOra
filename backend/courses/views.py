from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Course, Enrollment
from .serializers import CourseSerializer, CourseWriteSerializer, EnrollmentSerializer, JoinCourseSerializer
from users.permissions import IsTeacher, IsAdmin, IsStudent
from tasks.models import Assignment, Task
from tasks.priority import calculate_priority_score
from django.db import transaction
from django.shortcuts import get_object_or_404
from notifications.services import notify_student_left_course, notify_student_removed, notify_student_enrolled


class CourseListCreateView(generics.ListCreateAPIView):
    """
    GET  — Teachers see their own courses; Admins see all.
    POST — Teachers only.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return CourseWriteSerializer if self.request.method == 'POST' else CourseSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Course.objects.all()
        if user.role == 'teacher':
            return Course.objects.filter(teacher=user)
        if user.role == 'student':
            return Course.objects.filter(enrollments__student=user)
        return Course.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
            # Unchanged behavior: a teacher always owns the course they create,
            # regardless of anything sent in the request.
            serializer.save(teacher=user)
        elif user.role == 'admin':
            # Admin may optionally assign a teacher via teacher_id; if omitted
            # the course is created unassigned (teacher=None).
            serializer.save()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers or admins can create courses.")


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    # Teacher can edit/delete their own courses. Admin can do anything,
    # including assigning, changing, or removing the course's teacher.
    permission_classes = [IsAuthenticated]
    serializer_class = CourseWriteSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Course.objects.all()
        if user.role == 'teacher':
            return Course.objects.filter(teacher=user)
        return Course.objects.none()

    def perform_update(self, serializer):
        # Only admins may (re)assign, change, or remove a course's teacher.
        # A teacher editing their own course (title/description/dates) never
        # touches the teacher field, so this only strips it if somehow present.
        if self.request.user.role != 'admin':
            serializer.validated_data.pop('teacher', None)
        serializer.save()


class JoinCourseView(APIView):
    """Student joins a course using a join code."""
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = JoinCourseSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        course = serializer.context['course']

        # Check already enrolled
        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response(
                {"detail": "You are already enrolled in this course."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enroll the student
        with transaction.atomic():
            Enrollment.objects.create(student=request.user, course=course)

            # ── Auto-assign existing assignments ──────────────────────────────
            existing_assignments = Assignment.objects.filter(course=course)
            tasks_to_create = []

            for assignment in existing_assignments:
                 # Skip if task already exists for this student (safety check)
                already_exists = Task.objects.filter(
                    student=request.user,
                    assignment=assignment
                ).exists()

                if not already_exists:
                    score = calculate_priority_score(assignment)
                    tasks_to_create.append(
                        Task(
                            student=request.user,
                            assignment=assignment,
                            priority_score=score
                        )
                    )

            if tasks_to_create:
                Task.objects.bulk_create(tasks_to_create)
        # ─────────────────────────────────────────────────────────────────

        notify_student_enrolled(course, request.user)
        return Response(
            {
                "detail": f"Successfully joined '{course.title}'.",
                "tasks_assigned": len(tasks_to_create),  # tells student how many tasks they received
                "message": f"{len(tasks_to_create)} existing assignment(s) have been added to your task list."
                            if tasks_to_create else "No existing assignments in this course yet."
            },
            status=status.HTTP_201_CREATED
        )


class MyCoursesView(generics.ListAPIView):
    # Student sees their enrolled courses
    serializer_class = CourseSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Course.objects.filter(enrollments__student=self.request.user)


class CourseStudentsView(generics.ListAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        course_id = self.kwargs['pk']
        user = self.request.user
        if user.role == 'admin':
            return Enrollment.objects.filter(course_id=course_id)
        return Enrollment.objects.filter(course_id=course_id, course__teacher=user)
    


class UnenrollStudentView(APIView):
    """
    Teacher (own course) or Admin un-enrolls a student from a course.
    Does NOT delete the student's task/submission history — those stay
    intact and will simply stop showing on the dashboard while unenrolled.
    DELETE /api/courses/<course_id>/students/<student_id>/
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, course_id, student_id):
        course = get_object_or_404(Course, pk=course_id)
        if request.user.role == 'teacher' and course.teacher_id != request.user.id:
            return Response({"detail": "You do not teach this course."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role not in ('teacher', 'admin'):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        enrollment = get_object_or_404(Enrollment, course_id=course_id, student_id=student_id)
        student = enrollment.student
        enrollment.delete()
        notify_student_removed(course, student)  # -> notifies the student
        return Response(
            {"detail": "Student un-enrolled from the course."},
            status=status.HTTP_204_NO_CONTENT
        )
    

class LeaveCourseView(APIView):
    """
    Student leaves (un-enrolls from) a course themselves.
    DELETE /api/courses/<course_id>/leave/
    """
    permission_classes = [IsStudent]

    def delete(self, request, course_id):
        enrollment = get_object_or_404(Enrollment, course_id=course_id, student=request.user)
        course = enrollment.course
        enrollment.delete()
        notify_student_left_course(course, request.user)  # -> notifies course.teacher
        return Response(
            {"detail": "You have left the course. Your progress will be restored if you re-enroll."},
            status=status.HTTP_204_NO_CONTENT
        )


