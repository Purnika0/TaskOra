from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from courses.models import Course
from users.models import User
from tasks.models import Assignment
from tasks.priority import calculate_priority_score, HolidayCountCache


class PriorityScoreTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1', email='teacher1@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )
        self.course = Course.objects.create(title='BIT101', teacher=self.teacher)

    def make_assignment(self, days_until_due, priority, estimated_hours):
        due_date = timezone.localdate() + timedelta(days=days_until_due)
        return Assignment.objects.create(
            title='Test Assignment',
            course=self.course,
            created_by=self.teacher,
            due_date=due_date,
            priority=priority,
            estimated_hours=estimated_hours,
        )

    def test_overdue_task_scores_higher_than_task_due_soon(self):
        overdue = self.make_assignment(
            days_until_due=-2, priority=Assignment.PriorityLevel.LOW, estimated_hours=1
        )
        due_soon = self.make_assignment(
            days_until_due=1, priority=Assignment.PriorityLevel.LOW, estimated_hours=1
        )
        self.assertGreater(
            calculate_priority_score(overdue),
            calculate_priority_score(due_soon),
        )

    def test_score_increases_as_due_date_approaches(self):
        far = self.make_assignment(
            days_until_due=25, priority=Assignment.PriorityLevel.MEDIUM, estimated_hours=2
        )
        near = self.make_assignment(
            days_until_due=2, priority=Assignment.PriorityLevel.MEDIUM, estimated_hours=2
        )
        self.assertGreater(calculate_priority_score(near), calculate_priority_score(far))

    def test_higher_teacher_priority_increases_score(self):
        low = self.make_assignment(
            days_until_due=10, priority=Assignment.PriorityLevel.LOW, estimated_hours=2
        )
        high = self.make_assignment(
            days_until_due=10, priority=Assignment.PriorityLevel.HIGH, estimated_hours=2
        )
        self.assertGreater(calculate_priority_score(high), calculate_priority_score(low))

    def test_score_is_bounded_between_0_and_1(self):
        extreme = self.make_assignment(
            days_until_due=-30, priority=Assignment.PriorityLevel.HIGH, estimated_hours=999
        )
        score = calculate_priority_score(extreme)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_workload_contribution_caps_at_ten_hours(self):
        """
        workload_norm = min(estimated_hours / 10, 1.0), so 10 hours and 20
        hours should contribute identically to the score.
        """
        ten_hours = self.make_assignment(
            days_until_due=15, priority=Assignment.PriorityLevel.MEDIUM, estimated_hours=10
        )
        twenty_hours = self.make_assignment(
            days_until_due=15, priority=Assignment.PriorityLevel.MEDIUM, estimated_hours=20
        )
        self.assertEqual(
            calculate_priority_score(ten_hours),
            calculate_priority_score(twenty_hours),
        )

    def test_holiday_count_cache_reuses_query_per_due_date(self):
        """
        HolidayCountCache exists specifically to avoid one Holiday query per
        task when many tasks share a due_date within the same request.
        """
        same_due_date = timezone.localdate() + timedelta(days=10)
        a1 = Assignment.objects.create(
            title='A1', course=self.course, created_by=self.teacher,
            due_date=same_due_date, priority=Assignment.PriorityLevel.MEDIUM,
            estimated_hours=2,
        )
        a2 = Assignment.objects.create(
            title='A2', course=self.course, created_by=self.teacher,
            due_date=same_due_date, priority=Assignment.PriorityLevel.MEDIUM,
            estimated_hours=2,
        )
        cache = HolidayCountCache()
        with self.assertNumQueries(1):
            cache.count_for(a1.due_date)
            cache.count_for(a2.due_date)