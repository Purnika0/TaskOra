"""
Read-only analytics endpoints. Student-facing views summarize their own
progress; teacher-facing views summarize their courses/assignments/students.

Note: several views here run one or more count() queries per item in a
loop (per assignment, per course, or per student) rather than a single
aggregated query. This is simple and correct, but means the query count
scales with the number of assignments/courses/students rather than being
constant — fine at TaskOra's current class sizes, worth revisiting with
Django's annotate()/aggregate() if data volume grows significantly.
"""
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

# Course status levels shown on the Student Analytics page. Three tiers,
# ranked by priority — the first matching condition wins:
#
#   1. no_assignment       total == 0
#                        (course has no assignments at all yet — neutral,
#                        not a performance judgment)
#
#   2. needs_attention   overdue > 0
#                        OR rejected > 0
#                        OR engagement rate < LOW_RATE
#                        i.e. there's a live problem (something overdue or
#                        sent back) OR the student has only acted on a small
#                        fraction of the course's work so far — most of the
#                        course is still untouched, whether or not any of it
#                        happens to be overdue yet.
#
#   3. excellent         no overdue, no rejected, and
#                        completed / total >= HIGH_RATE
#                        ("almost finished all tasks, on time")
#
#   4. average           no overdue/rejected, not yet at HIGH_RATE completed —
#                        includes work that's been submitted but not graded.
#
# Two different rates drive this, not one:
#   engagement_rate = (completed + submitted) / total   → used for the
#       needs_attention floor. A submitted task is work the student has
#       already done their part on; it isn't neglect just because a
#       teacher hasn't graded it yet.
#   completion_rate = completed / total                 → used for the
#       excellent bar. Submitted-but-ungraded work can still come back
#       rejected, so it shouldn't count toward a top-tier result until
#       it's actually confirmed done.
#
# Worked examples with LOW_RATE at 0.20 (not 0.30):
#   - 2 of 20 done, 0 submitted, 0 overdue → engagement 0.10 < 0.20 → Needs Attention
#     (barely started, most of a large course still untouched)
#   - 1 of 4  done, 0 submitted, 0 overdue → engagement 0.25 >= 0.20 → Average
#   - 2 of 4  done, 0 submitted, 0 overdue → engagement 0.50 >= 0.20 → Average
#     (a small course with a couple of tasks done isn't "barely started"
#     the way 2/20 is — 0.30 misclassified this case as Needs Attention)
#   - 9 of 10 done, 0 overdue              → completion 0.90 >= HIGH_RATE → Excellent
#   - 0 of 1 done, 1 submitted, 0 overdue  → engagement 1.00 >= 0.20 → Average
#     (submitted and awaiting review — not neglect, but not yet a
#     confirmed "excellent" either, since completion rate is still 0)
#
# This replaces an earlier 5-label version (Excellent/Good/Getting
# Started/Needs Revision/Needs Attention) whose "Needs Attention" label
# fired for ANY overdue count with no regard to how far along the course
# otherwise was — a course at 50% with one overdue task read identically
# to a course at 0% with three overdue tasks. It also replaces two later
# versions: one that only checked "has the student done anything at all"
# (completed + submitted > 0) as a yes/no gate rather than a rate — which
# let someone who'd finished just 1 of 20 tasks read as "Average" the
# moment they submitted a single one — and one that dropped `submitted`
# from the calculation entirely, which flagged fully-submitted, awaiting-
# review courses as "Needs Attention" even though the student had done
# everything currently in their control.
LOW_RATE  = 0.20
HIGH_RATE = 0.85

COURSE_STATUS_META = {
    "no_assignment":     {"label": "No Assignment",       "color": "#64748B", "bg": "#F1F5F9"},
    "needs_attention": {"label": "Needs Attention",  "color": "#991b1b", "bg": "#fde8e8"},
    "average":         {"label": "Average",          "color": "#92400e", "bg": "#fff8e6"},
    "excellent":       {"label": "Excellent",         "color": "#166534", "bg": "#e0f7ee"},
}


def derive_course_status(total, completed, submitted, pending, overdue, rejected):
    """
    Implements the 4-level algorithm documented above.

    Input:  task counts for one student in one course
    Output: (level, meta) where level is one of
            "no_assignment" | "needs_attention" | "average" | "excellent"
            and meta is {label, color, bg} for that level

    Algorithm:
        1. If total == 0: return "no_assignment"
        2. engagement_rate ← (completed + submitted) / total   — has the
           student acted on their work, whether or not it's graded yet?
        3. completion_rate ← completed / total                  — has that
           work actually been confirmed done?
        4. If overdue > 0 OR rejected > 0 OR engagement_rate < LOW_RATE:
               return "needs_attention"
        5. If completion_rate >= HIGH_RATE: return "excellent"
        6. Otherwise: return "average"

    Why two separate rates: a student who has submitted every task but
    hasn't been graded yet has completion_rate == 0, which would wrongly
    read as "hasn't started" if that were the only signal. engagement_rate
    credits submitted work for the neglect check, while completion_rate
    still gates "excellent" — ungraded work can still come back rejected,
    so it shouldn't count as a finished, top-tier result yet.
    """
    if total == 0:
        level = "no_assignment"
    else:
        engagement_rate = (completed + submitted) / total
        completion_rate = completed / total
        if overdue > 0 or rejected > 0 or engagement_rate < LOW_RATE:
            level = "needs_attention"
        elif completion_rate >= HIGH_RATE:
            level = "excellent"
        else:
            level = "average"

    return level, COURSE_STATUS_META[level]


class StudentTaskSummaryView(APIView):
    """Overall task status summary for the logged-in student."""
    permission_classes = [IsStudent]

    def get(self, request):
        enrolled_course_ids = Enrollment.objects.filter(
            student=request.user
        ).values_list('course_id', flat=True)

        tasks     = Task.objects.filter(
            student=request.user,
            assignment__course_id__in=enrolled_course_ids
        )
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
        enrolled_course_ids = Enrollment.objects.filter(
            student=request.user
        ).values_list('course_id', flat=True)

        today = timezone.localdate()
        data  = []

        for i in range(6, -1, -1):
            day   = today - timezone.timedelta(days=i)
            count = Task.objects.filter(
                student=request.user,
                assignment__course_id__in=enrolled_course_ids,
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
            rejected  = tasks.filter(status=Task.Status.REJECTED).count()

            status_level, status_meta = derive_course_status(
                total, completed, submitted, pending, overdue, rejected
            )

            data.append({
                "course":    course.title,
                "total":     total,
                "completed": completed,
                "submitted": submitted,
                "pending":   pending,
                "overdue":   overdue,
                "rejected":  rejected,
                "status":    status_level,
                "status_label": status_meta["label"],
                "status_color": status_meta["color"],
                "status_bg":    status_meta["bg"],
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
            enrolled_student_ids = Enrollment.objects.filter(
                course=assignment.course
            ).values_list('student_id', flat=True)

            tasks     = Task.objects.filter(
                assignment=assignment,
                student_id__in=enrolled_student_ids
            )
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

            enrolled_student_ids = Enrollment.objects.filter(
                course=course
            ).values_list('student_id', flat=True)
            tasks            = Task.objects.filter(
                assignment__course=course,
                student_id__in=enrolled_student_ids
            )
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
        course_id = request.query_params.get('course_id')

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
            enrolled_course_ids = Enrollment.objects.filter(
                student=student, course__teacher=request.user
            ).values_list('course_id', flat=True)
            if course_id:
                enrolled_course_ids = enrolled_course_ids.filter(course_id=course_id)

            tasks = Task.objects.filter(
                student=student,
                assignment__course_id__in=enrolled_course_ids,
            )

            total     = tasks.count()
            completed = tasks.filter(status=Task.Status.COMPLETED).count()
            submitted = tasks.filter(status=Task.Status.SUBMITTED).count()
            pending   = tasks.filter(status=Task.Status.PENDING).count()
            overdue   = tasks.filter(status=Task.Status.OVERDUE).count()
            rejected  = tasks.filter(status=Task.Status.REJECTED).count()

            data.append({
                "student_id":      student.id,
                "student":         student.full_name or student.username,
                "completed":       completed,
                "submitted":       submitted,
                "pending":         pending,
                "overdue":         overdue,
                "rejected":        rejected,
                "total":           total,
                "completion_rate": round((completed / total) * 100, 1) if total else 0,
            })

        # Primary sort: completion rate, highest first.
        # Tiebreakers (in order), so ties never fall back to arbitrary
        # queryset order, which isn't guaranteed stable across requests:
        #   1. more completed tasks wins
        #   2. fewer overdue tasks wins
        #   3. fewer rejected tasks wins
        #   4. student name, alphabetically — final deterministic tiebreak
        data.sort(key=lambda x: (
            -x["completion_rate"],
            -x["completed"],
            x["overdue"],
            x["rejected"],
            x["student"].lower(),
        ))

        return Response(data)