from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Course, Enrollment
from .serializers import CourseSerializer, CourseWriteSerializer, EnrollmentSerializer, JoinCourseSerializer
from users.permissions import IsTeacher, IsAdmin, IsStudent
from tasks.models import Assignment, Task

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
        return Course.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'teacher':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers can create courses.")
        serializer.save(teacher=self.request.user)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    # Teacher can edit/delete their own courses. Admin can do anything
    permission_classes = [IsAuthenticated]
    serializer_class = CourseWriteSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Course.objects.all()
        if user.role == 'teacher':
            return Course.objects.filter(teacher=user)
        return Course.objects.none()


# class JoinCourseView(APIView):
#     # Student joins a course using a join code
#     permission_classes = [IsStudent]

#     def post(self, request):
#         serializer = JoinCourseSerializer(data=request.data, context={'request': request})
#         if serializer.is_valid():
#             course = serializer.context['course']

#             if Enrollment.objects.filter(student=request.user, course=course).exists():
#                 return Response({"detail": "You are already enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)

#             Enrollment.objects.create(student=request.user, course=course)
#             return Response({"detail": f"Successfully joined '{course.title}'."}, status=status.HTTP_201_CREATED)

#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    # Teacher sees all students enrolled in their course
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        course_id = self.kwargs['pk']
        return Enrollment.objects.filter(course_id=course_id, course__teacher=self.request.user)