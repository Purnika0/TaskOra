from django.test import TestCase
from django.utils import timezone

from users.models import User
from courses.models import Course
from tasks.models import Assignment, Task
from notifications.models import Notification
from notifications.services import (
    notify_deadline_reminder,
    notify_new_assignment,
    notify_admins_new_teacher,
    notify_admins_new_course,
    notify_student_left_course,
    notify_course_assigned,
)


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='notif_teacher', email='notif_teacher@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )
        self.student = User.objects.create_user(
            username='notif_student', email='notif_student@example.com',
            password='pass12345', role=User.Role.STUDENT,
        )
        self.course = Course.objects.create(title='BIT401', teacher=self.teacher)
        self.assignment = Assignment.objects.create(
            title='Assignment 1', course=self.course, created_by=self.teacher,
            due_date=timezone.localdate() + timezone.timedelta(days=3),
        )
        self.task = Task.objects.create(student=self.student, assignment=self.assignment)

    def test_deadline_reminder_created_once(self):
        first_call = notify_deadline_reminder(self.task)
        self.assertTrue(first_call)
        self.assertEqual(
            Notification.objects.filter(
                task=self.task, notif_type=Notification.Type.DEADLINE_REMINDER
            ).count(),
            1,
        )

    def test_deadline_reminder_not_duplicated_on_second_call(self):
        notify_deadline_reminder(self.task)
        second_call = notify_deadline_reminder(self.task)

        self.assertFalse(second_call)
        self.assertEqual(
            Notification.objects.filter(
                task=self.task, notif_type=Notification.Type.DEADLINE_REMINDER
            ).count(),
            1,
        )

    def test_new_assignment_fans_out_one_notification_per_student(self):
        student2 = User.objects.create_user(
            username='notif_student2', email='notif_student2@example.com',
            password='pass12345', role=User.Role.STUDENT,
        )
        notify_new_assignment(self.assignment, [self.student, student2])

        self.assertEqual(
            Notification.objects.filter(
                notif_type=Notification.Type.NEW_ASSIGNMENT, assignment=self.assignment
            ).count(),
            2,
        )

    def test_new_assignment_with_no_students_creates_nothing(self):
        notify_new_assignment(self.assignment, [])
        self.assertEqual(
            Notification.objects.filter(notif_type=Notification.Type.NEW_ASSIGNMENT).count(), 0
        )

    def test_admin_notified_new_teacher_excludes_creating_admin(self):
        creating_admin = User.objects.create_user(
            username='admin1', email='admin1@example.com',
            password='pass12345', role=User.Role.ADMIN,
        )
        other_admin = User.objects.create_user(
            username='admin2', email='admin2@example.com',
            password='pass12345', role=User.Role.ADMIN,
        )
        new_teacher = User.objects.create_user(
            username='new_teacher', email='new_teacher@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )

        notify_admins_new_teacher(new_teacher, created_by=creating_admin)

        recipients = set(
            Notification.objects.filter(
                notif_type=Notification.Type.NEW_TEACHER_REGISTERED
            ).values_list('recipient_id', flat=True)
        )
        self.assertIn(other_admin.id, recipients)
        self.assertNotIn(creating_admin.id, recipients)

    def test_admin_notified_new_course_includes_all_admins_when_no_creator_given(self):
        admin1 = User.objects.create_user(
            username='admin3', email='admin3@example.com',
            password='pass12345', role=User.Role.ADMIN,
        )
        admin2 = User.objects.create_user(
            username='admin4', email='admin4@example.com',
            password='pass12345', role=User.Role.ADMIN,
        )
        notify_admins_new_course(self.course, created_by=None)

        recipients = set(
            Notification.objects.filter(
                notif_type=Notification.Type.NEW_COURSE_CREATED
            ).values_list('recipient_id', flat=True)
        )
        self.assertEqual(recipients, {admin1.id, admin2.id})

    def test_student_left_course_noop_when_course_has_no_teacher(self):
        unassigned_course = Course.objects.create(title='BIT402', teacher=None)
        notify_student_left_course(unassigned_course, self.student)

        self.assertEqual(
            Notification.objects.filter(
                notif_type=Notification.Type.STUDENT_LEFT_COURSE
            ).count(),
            0,
        )

    def test_course_assigned_notifies_teacher_with_correct_actor(self):
        admin = User.objects.create_user(
            username='admin5', email='admin5@example.com',
            password='pass12345', role=User.Role.ADMIN,
        )
        notify_course_assigned(self.course, self.teacher, assigned_by=admin)

        notif = Notification.objects.get(notif_type=Notification.Type.COURSE_ASSIGNED)
        self.assertEqual(notif.recipient, self.teacher)
        self.assertEqual(notif.actor, admin)
        self.assertEqual(notif.course, self.course)