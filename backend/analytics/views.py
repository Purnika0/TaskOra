from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from tasks.models import Task, Assignment
from courses.models import Enrollment, Course
from users.permissions import IsStudent, IsTeacher
from users.models import User


# ---------------------------------------------------------------------------
# STUDENT ANALYTICS
# ---------------------------------------------------------------------------

class StudentTaskSummaryView(APIView):
    """Overall task status summary for the logged-in student."""
    permission_classes = [IsStudent]

    def get(self, request):
        tasks     = Task.objects.filter(student=request.user)
        total     = tasks.count()
        completed = tasks.filter(status=Task.Status.COMPLETED).count()
        submitted = tasks.filter(status=Task.Status.SUBMITTED).count()
        overdue   = tasks.filter(status=Task.Status.OVERDUE).count()
        pending   = tasks.filter(status=Task.Status.PENDING).count()

        return Response({
            "total":           total,
            "completed":       completed,
            "submitted":       submitted,
            "pending":         pending,
            "overdue":         overdue,
            "completion_rate": round((completed / total) * 100, 1) if total else 0,
        })


class StudentWeeklyProgressView(APIView):
    """Tasks completed per day over the last 7 days."""
    permission_classes = [IsStudent]

    def get(self, request):
        today = timezone.now().date()
        data  = []

        for i in range(6, -1, -1):
            day   = today - timezone.timedelta(days=i)
            count = Task.objects.filter(
                student=request.user,
                status=Task.Status.COMPLETED,
                completed_at__date=day
            ).count()
            data.append({"date": str(day), "completed": count})

        return Response(data)


class StudentCourseWorkloadView(APIView):
    """Task status breakdown per course for the logged-in student."""
    permission_classes = [IsStudent]

    def get(self, request):
        enrollments = Enrollment.objects.filter(
            student=request.user
        ).select_related('course')
        data = []

        for enrollment in enrollments:
            course    = enrollment.course
            tasks     = Task.objects.filter(
                student=request.user,
                assignment__course=course
            )
            total     = tasks.count()
            completed = tasks.filter(status=Task.Status.COMPLETED).count()
            submitted = tasks.filter(status=Task.Status.SUBMITTED).count()
            overdue   = tasks.filter(status=Task.Status.OVERDUE).count()
            pending   = tasks.filter(status=Task.Status.PENDING).count()

            data.append({
                "course":    course.title,
                "total":     total,
                "completed": completed,
                "submitted": submitted,
                "pending":   pending,
                "overdue":   overdue,
            })

        return Response(data)


# ---------------------------------------------------------------------------
# TEACHER ANALYTICS
# ---------------------------------------------------------------------------

class TeacherTaskProgressView(APIView):
    """Submission and completion stats for each assignment the teacher created."""
    permission_classes = [IsTeacher]

    def get(self, request):
        assignments = Assignment.objects.filter(created_by=request.user)
        data        = []

        for assignment in assignments:
            tasks     = Task.objects.filter(assignment=assignment)
            total     = tasks.count()
            completed = tasks.filter(status=Task.Status.COMPLETED).count()
            submitted = tasks.filter(status=Task.Status.SUBMITTED).count()
            overdue   = tasks.filter(status=Task.Status.OVERDUE).count()
            pending   = tasks.filter(status=Task.Status.PENDING).count()

            data.append({
                "assignment":      assignment.title,
                "course":          assignment.course.title,
                "due_date":        str(assignment.due_date),
                "total_students":  total,
                "completed":       completed,
                "submitted":       submitted,
                "pending":         pending,
                "overdue":         overdue,
                "completion_rate": round((completed / total) * 100, 1) if total else 0,
                "submission_rate": round(((completed + submitted) / total) * 100, 1) if total else 0,
            })

        return Response(data)


class TeacherCourseOverviewView(APIView):
    """Per-course summary of assignments and student completion."""
    permission_classes = [IsTeacher]

    def get(self, request):
        courses = Course.objects.filter(teacher=request.user)
        data    = []

        for course in courses:
            student_count    = Enrollment.objects.filter(course=course).count()
            assignment_count = Assignment.objects.filter(course=course).count()
            tasks            = Task.objects.filter(assignment__course=course)
            total_tasks      = tasks.count()
            completed_tasks  = tasks.filter(status=Task.Status.COMPLETED).count()
            submitted_tasks  = tasks.filter(status=Task.Status.SUBMITTED).count()

            data.append({
                "course":            course.title,
                "students_enrolled": student_count,
                "total_assignments": assignment_count,
                "total_tasks":       total_tasks,
                "completed_tasks":   completed_tasks,
                "submitted_tasks":   submitted_tasks,
                "pending_tasks":     total_tasks - completed_tasks - submitted_tasks,
                "completion_rate":   round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0,
                "submission_rate":   round(((completed_tasks + submitted_tasks) / total_tasks) * 100, 1) if total_tasks else 0,
            })

        return Response(data)


class TeacherStudentRankingView(APIView):
    """Ranks students in a teacher's courses by completion rate."""
    permission_classes = [IsTeacher]

    def get(self, request):
        course_id   = request.query_params.get('course_id')
        filter_kwargs = {"course__teacher": request.user}
        if course_id:
            filter_kwargs["course_id"] = course_id

        students = User.objects.filter(
            role=User.Role.STUDENT,
            enrollments__course__teacher=request.user,
        ).distinct()

        if course_id:
            students = students.filter(
                enrollments__course_id=course_id
            )

        data = []

        for student in students:
            tasks = Task.objects.filter(
                student=student,
                assignment__course__teacher=request.user,
            )

            if course_id:
                tasks = tasks.filter(
                    assignment__course_id=course_id
                )

            total     = tasks.count()
            completed = tasks.filter(status=Task.Status.COMPLETED).count()
            submitted = tasks.filter(status=Task.Status.SUBMITTED).count()
            overdue   = tasks.filter(status=Task.Status.OVERDUE).count()

            data.append({
                "student":         student.full_name or student.username,
                "completed":       completed,
                "submitted":       submitted,
                "overdue":         overdue,
                "total":           total,
                "completion_rate": round((completed / total) * 100, 1) if total else 0,
            })

        data.sort(key=lambda x: x["completion_rate"], reverse=True)
        return Response(data)