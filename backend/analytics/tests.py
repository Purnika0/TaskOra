from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User
from courses.models import Course, Enrollment
from tasks.models import Assignment, Task


class AnalyticsTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='analytics_teacher', email='analytics_teacher@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )
        self.course = Course.objects.create(title='BIT501', teacher=self.teacher)
        self._counter = 0

    def _new_assignment(self):
        self._counter += 1
        return Assignment.objects.create(
            title=f'Assignment {self._counter}', course=self.course,
            created_by=self.teacher,
            due_date=timezone.localdate() + timezone.timedelta(days=5),
        )

    def _enroll(self, username):
        student = User.objects.create_user(
            username=username, email=f'{username}@example.com',
            password='pass12345', role=User.Role.STUDENT,
        )
        Enrollment.objects.create(student=student, course=self.course)
        return student


class StudentTaskSummaryTests(AnalyticsTestBase):
    def test_summary_counts_and_completion_rate(self):
        student = self._enroll('summary_student')

        for status_val in [
            Task.Status.COMPLETED, Task.Status.COMPLETED,
            Task.Status.SUBMITTED, Task.Status.PENDING, Task.Status.OVERDUE,
        ]:
            Task.objects.create(
                student=student, assignment=self._new_assignment(), status=status_val
            )

        self.client.force_authenticate(user=student)
        response = self.client.get(reverse('student-task-summary'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 5)
        self.assertEqual(response.data['completed'], 2)
        self.assertEqual(response.data['submitted'], 1)
        self.assertEqual(response.data['pending'], 1)
        self.assertEqual(response.data['overdue'], 1)
        self.assertEqual(response.data['completion_rate'], 40.0)

    def test_completion_rate_is_zero_with_no_tasks(self):
        student = self._enroll('empty_student')
        self.client.force_authenticate(user=student)
        response = self.client.get(reverse('student-task-summary'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)
        self.assertEqual(response.data['completion_rate'], 0)

    def test_teacher_cannot_access_student_only_endpoint(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(reverse('student-task-summary'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TeacherCourseOverviewTests(AnalyticsTestBase):
    def test_overview_computes_rates_and_pending_correctly(self):
        student = self._enroll('overview_student')
        for status_val in [
            Task.Status.COMPLETED, Task.Status.COMPLETED, Task.Status.COMPLETED,
            Task.Status.SUBMITTED, Task.Status.PENDING,
        ]:
            Task.objects.create(
                student=student, assignment=self._new_assignment(), status=status_val
            )

        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(reverse('teacher-course-overview'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        overview = response.data[0]
        self.assertEqual(overview['students_enrolled'], 1)
        self.assertEqual(overview['total_tasks'], 5)
        self.assertEqual(overview['completed_tasks'], 3)
        self.assertEqual(overview['submitted_tasks'], 1)
        self.assertEqual(overview['pending_tasks'], 1)
        self.assertEqual(overview['completion_rate'], 60.0)
        self.assertEqual(overview['submission_rate'], 80.0)


class TeacherStudentRankingTests(AnalyticsTestBase):
    def test_ranking_sorts_by_completion_rate_desc(self):
        top_student = self._enroll('top_student')
        for _ in range(4):
            Task.objects.create(
                student=top_student, assignment=self._new_assignment(),
                status=Task.Status.COMPLETED,
            )

        low_student = self._enroll('low_student')
        Task.objects.create(
            student=low_student, assignment=self._new_assignment(),
            status=Task.Status.COMPLETED,
        )
        Task.objects.create(
            student=low_student, assignment=self._new_assignment(),
            status=Task.Status.OVERDUE,
        )

        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(reverse('teacher-student-ranking'))

        names = [row['student'] for row in response.data]
        self.assertEqual(names.index('top_student'), 0)
        self.assertLess(
            names.index('top_student'), names.index('low_student')
        )

    def test_ranking_tiebreak_uses_completed_count_then_name(self):
        """
        Two students tied on completion_rate (both 100%, 1/1 tasks) should be
        ordered by completed count first (equal here), falling through to
        the alphabetical name tiebreak.
        """
        student_b = self._enroll('bob')
        Task.objects.create(
            student=student_b, assignment=self._new_assignment(),
            status=Task.Status.COMPLETED,
        )
        student_a = self._enroll('alice')
        Task.objects.create(
            student=student_a, assignment=self._new_assignment(),
            status=Task.Status.COMPLETED,
        )

        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(reverse('teacher-student-ranking'))

        names = [row['student'] for row in response.data]
        self.assertLess(names.index('alice'), names.index('bob'))