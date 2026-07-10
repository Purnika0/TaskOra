from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User
from courses.models import Course, Enrollment, generate_join_code
from tasks.models import Assignment, Task
from notifications.models import Notification


class JoinCodeGenerationTests(TestCase):
    def test_join_code_is_eight_uppercase_alphanumeric_chars(self):
        code = generate_join_code()
        self.assertEqual(len(code), 8)
        self.assertTrue(code.isalnum())
        self.assertEqual(code, code.upper())

    def test_course_gets_a_join_code_automatically(self):
        teacher = User.objects.create_user(
            username='t1', email='t1@example.com', password='pass12345',
            role=User.Role.TEACHER,
        )
        course = Course.objects.create(title='BIT301', teacher=teacher)
        self.assertEqual(len(course.join_code), 8)


class JoinCourseViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher_join', email='teacher_join@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )
        self.student = User.objects.create_user(
            username='student_join', email='student_join@example.com',
            password='pass12345', role=User.Role.STUDENT,
        )
        self.course = Course.objects.create(title='BIT302', teacher=self.teacher)
        self.client.force_authenticate(user=self.student)

    def test_join_with_valid_code_creates_enrollment(self):
        url = reverse('join-course')
        response = self.client.post(url, {'join_code': self.course.join_code})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Enrollment.objects.filter(student=self.student, course=self.course).exists()
        )

    def test_join_code_lookup_is_case_insensitive(self):
        url = reverse('join-course')
        response = self.client.post(url, {'join_code': self.course.join_code.lower()})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_join_with_invalid_code_returns_400(self):
        url = reverse('join-course')
        response = self.client.post(url, {'join_code': 'ZZZZZZZZ'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Enrollment.objects.filter(student=self.student).exists())

    def test_joining_twice_is_rejected_and_does_not_duplicate(self):
        url = reverse('join-course')
        self.client.post(url, {'join_code': self.course.join_code})

        response = self.client.post(url, {'join_code': self.course.join_code})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Enrollment.objects.filter(student=self.student, course=self.course).count(), 1
        )

    def test_joining_auto_assigns_existing_assignments_as_tasks(self):
        a1 = Assignment.objects.create(
            title='A1', course=self.course, created_by=self.teacher,
            due_date=timezone.localdate() + timezone.timedelta(days=5),
        )
        a2 = Assignment.objects.create(
            title='A2', course=self.course, created_by=self.teacher,
            due_date=timezone.localdate() + timezone.timedelta(days=10),
        )

        url = reverse('join-course')
        response = self.client.post(url, {'join_code': self.course.join_code})

        self.assertEqual(response.data['tasks_assigned'], 2)
        self.assertTrue(Task.objects.filter(student=self.student, assignment=a1).exists())
        self.assertTrue(Task.objects.filter(student=self.student, assignment=a2).exists())

    def test_joining_notifies_the_course_teacher(self):
        url = reverse('join-course')
        self.client.post(url, {'join_code': self.course.join_code})

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.teacher,
                notif_type=Notification.Type.STUDENT_ENROLLED,
            ).exists()
        )


class LeaveAndUnenrollTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher_leave', email='teacher_leave@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )
        self.other_teacher = User.objects.create_user(
            username='other_teacher', email='other_teacher@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )
        self.student = User.objects.create_user(
            username='student_leave', email='student_leave@example.com',
            password='pass12345', role=User.Role.STUDENT,
        )
        self.course = Course.objects.create(title='BIT303', teacher=self.teacher)
        Enrollment.objects.create(student=self.student, course=self.course)

    def test_student_can_leave_own_course(self):
        self.client.force_authenticate(user=self.student)
        url = reverse('leave-course', kwargs={'course_id': self.course.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Enrollment.objects.filter(student=self.student, course=self.course).exists()
        )

    def test_teacher_can_unenroll_student_from_own_course(self):
        self.client.force_authenticate(user=self.teacher)
        url = reverse('unenroll-student', kwargs={
            'course_id': self.course.id, 'student_id': self.student.id
        })
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Enrollment.objects.filter(student=self.student, course=self.course).exists()
        )

    def test_teacher_cannot_unenroll_student_from_course_they_do_not_teach(self):
        self.client.force_authenticate(user=self.other_teacher)
        url = reverse('unenroll-student', kwargs={
            'course_id': self.course.id, 'student_id': self.student.id
        })
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(
            Enrollment.objects.filter(student=self.student, course=self.course).exists()
        )