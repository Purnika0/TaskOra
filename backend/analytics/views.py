from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from tasks.models import Task, Assignment
from courses.models import Enrollment, Course
from users.models import User
from users.permissions import IsStudent, IsTeacher



# STUDENT ANALYTICS

class StudentTaskSummaryView(APIView):
    # Overall task completion summary for the logged-in student
    permission_classes = [IsStudent]

    def get(self, request):
        tasks = Task.objects.filter(student=request.user)
        total = tasks.count()
        completed = tasks.filter(is_completed=True).count()
        pending = total - completed

        return Response({
            "total": total,
            "completed": completed,
            "pending": pending,
            "completion_rate": round((completed / total) * 100, 1) if total else 0
        })


class StudentWeeklyProgressView(APIView):
    # Tasks completed per day over the last 7 days
    permission_classes = [IsStudent]

    def get(self, request):
        today = timezone.now().date()
        data = []

        for i in range(6, -1, -1):
            day = today - timezone.timedelta(days=i)
            count = Task.objects.filter(
                student=request.user,
                is_completed=True,
                completed_at__date=day
            ).count()
            data.append({"date": str(day), "completed": count})

        return Response(data)


class StudentCourseWorkloadView(APIView):
    # Pending task count per course for the logged-in student
    permission_classes = [IsStudent]

    def get(self, request):
        enrollments = Enrollment.objects.filter(student=request.user).select_related('course')
        data = []

        for enrollment in enrollments:
            course = enrollment.course
            total = Task.objects.filter(
                student=request.user,
                assignment__course=course
            ).count()
            completed = Task.objects.filter(
                student=request.user,
                assignment__course=course,
                is_completed=True
            ).count()
            data.append({
                "course": course.title,
                "total": total,
                "completed": completed,
                "pending": total - completed
            })

        return Response(data)


# TEACHER ANALYTICS

class TeacherTaskProgressView(APIView):
    # Completion stats for each assignment the teacher created
    permission_classes = [IsTeacher]

    def get(self, request):
        assignments = Assignment.objects.filter(created_by=request.user)
        data = []

        for assignment in assignments:
            tasks = Task.objects.filter(assignment=assignment)
            total = tasks.count()
            completed = tasks.filter(is_completed=True).count()
            data.append({
                "assignment": assignment.title,
                "course": assignment.course.title,
                "due_date": str(assignment.due_date),
                "total_students": total,
                "completed": completed,
                "pending": total - completed,
                "completion_rate": round((completed / total) * 100, 1) if total else 0
            })

        return Response(data)


class TeacherCourseOverviewView(APIView):
    # Per-course summary of assignments and student completion
    permission_classes = [IsTeacher]

    def get(self, request):
        courses = Course.objects.filter(teacher=request.user)
        data = []

        for course in courses:
            student_count = Enrollment.objects.filter(course=course).count()
            assignment_count = Assignment.objects.filter(course=course).count()
            tasks = Task.objects.filter(assignment__course=course)
            total_tasks = tasks.count()
            completed_tasks = tasks.filter(is_completed=True).count()

            data.append({
                "course": course.title,
                "students_enrolled": student_count,
                "total_assignments": assignment_count,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "completion_rate": round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0
            })

        return Response(data)


class TeacherStudentRankingView(APIView):
    # Ranks students in a teacher's course by completed tasks
    permission_classes = [IsTeacher]

    def get(self, request):
        course_id = request.query_params.get('course_id')

        enrollments = Enrollment.objects.filter(
            course__teacher=request.user,
            **({"course_id": course_id} if course_id else {})
        ).select_related('student')

        data = []
        for enrollment in enrollments:
            student = enrollment.student
            completed = Task.objects.filter(
                student=student,
                assignment__course__teacher=request.user,
                is_completed=True
            ).count()
            total = Task.objects.filter(
                student=student,
                assignment__course__teacher=request.user
            ).count()
            data.append({
                "student": student.full_name or student.username,
                "completed": completed,
                "total": total,
                "completion_rate": round((completed / total) * 100, 1) if total else 0
            })

        # Sort by completion rate descending
        data.sort(key=lambda x: x["completion_rate"], reverse=True)
        return Response(data)