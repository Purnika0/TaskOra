from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from courses.models import Course, Enrollment
from users.models import User
from tasks.models import Assignment, Task
from ml.clustering import cluster_students, detect_outliers


class ClusteringTestBase(TestCase):
    """Shared helpers for building synthetic student/task data via the ORM."""

    def setUp(self):
        self.teacher = User.objects.create_user(
            username='clusterteacher', email='clusterteacher@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )
        self.course = Course.objects.create(title='BIT201', teacher=self.teacher)
        self._assignment_counter = 0

    def _enroll(self, username):
        student = User.objects.create_user(
            username=username, email=f'{username}@example.com',
            password='pass12345', role=User.Role.STUDENT,
        )
        Enrollment.objects.create(student=student, course=self.course)
        return student

    def _new_assignment(self, due_offset):
        self._assignment_counter += 1
        return Assignment.objects.create(
            title=f'Assignment {self._assignment_counter}',
            course=self.course,
            created_by=self.teacher,
            due_date=timezone.localdate() + timedelta(days=due_offset),
            priority=Assignment.PriorityLevel.MEDIUM,
            estimated_hours=2,
        )

    def _add_tasks(self, student, completed=0, submitted=0, pending=0,
                    overdue=0, rejected=0, early_days=3):
        for _ in range(completed):
            a = self._new_assignment(due_offset=0)
            Task.objects.create(
                student=student, assignment=a, status=Task.Status.COMPLETED,
                completed_at=timezone.now() - timedelta(days=early_days),
            )
        for _ in range(submitted):
            a = self._new_assignment(due_offset=3)
            Task.objects.create(student=student, assignment=a, status=Task.Status.SUBMITTED)
        for _ in range(pending):
            a = self._new_assignment(due_offset=5)
            Task.objects.create(student=student, assignment=a, status=Task.Status.PENDING)
        for _ in range(overdue):
            a = self._new_assignment(due_offset=-3)
            Task.objects.create(student=student, assignment=a, status=Task.Status.OVERDUE)
        for _ in range(rejected):
            a = self._new_assignment(due_offset=2)
            Task.objects.create(student=student, assignment=a, status=Task.Status.REJECTED)


class ClusterStudentsTests(ClusteringTestBase):
    def test_requires_minimum_three_students(self):
        s1 = self._enroll('only_one')
        self._add_tasks(s1, completed=5)

        result = cluster_students(self.teacher)
        self.assertIn('error', result)
        self.assertEqual(result['groups'], [])

    def test_balanced_assignment_matches_target_group_sizes(self):
        """
        This is the core regression test for the constrained-assignment fix:
        with 10 students split into clearly-separated performance tiers,
        the Hungarian-assignment step should produce the ~30/40/30 split
        (3/4/3 for n=10) instead of plain K-Means's unconstrained groupings.
        """
        for i in range(3):
            s = self._enroll(f'high{i}')
            self._add_tasks(s, completed=9, pending=1, early_days=3)

        for i in range(4):
            s = self._enroll(f'avg{i}')
            self._add_tasks(s, completed=5, submitted=1, pending=3, overdue=1)

        for i in range(3):
            s = self._enroll(f'risk{i}')
            self._add_tasks(
                s, completed=1, pending=2, overdue=5, rejected=2, early_days=-4
            )

        result = cluster_students(self.teacher)

        self.assertNotIn('error', result)
        self.assertEqual(len(result['students']), 10)
        self.assertEqual(
            result['summary'],
            {'High Performer': 3, 'Average': 4, 'At-Risk': 3},
        )

    def test_clear_high_performer_lands_in_high_performer_group(self):
        star = self._enroll('star_student')
        self._add_tasks(star, completed=10, early_days=5)

        # Padding students with clearly worse (but non-identical) profiles,
        # so we have >= 3 students to cluster without duplicate feature rows.
        self._add_tasks(
            self._enroll('padding0'),
            completed=1, pending=1, overdue=3, rejected=2, early_days=-3,
        )
        self._add_tasks(
            self._enroll('padding1'),
            completed=2, pending=2, overdue=2, rejected=1, early_days=-1,
        )

        result = cluster_students(self.teacher)
        self.assertNotIn('error', result)

        star_entry = next(
            s for s in result['students'] if s['student_name'] == 'star_student'
        )
        self.assertEqual(star_entry['group'], 'High Performer')


class DetectOutliersTests(ClusteringTestBase):
    def test_requires_minimum_four_students(self):
        for i in range(3):
            s = self._enroll(f'student{i}')
            self._add_tasks(s, completed=5)

        result = detect_outliers(self.teacher)
        self.assertIn('error', result)
        self.assertEqual(result['outliers'], [])

    def test_flags_student_with_many_overdue_and_rejected_tasks(self):
        struggling = self._enroll('struggling_student')
        self._add_tasks(struggling, overdue=8, rejected=2)

        for i in range(5):
            s = self._enroll(f'steady{i}')
            self._add_tasks(s, completed=9, pending=1)

        result = detect_outliers(self.teacher)
        flagged_names = [o['student_name'] for o in result['outliers']]
        self.assertIn('struggling_student', flagged_names)