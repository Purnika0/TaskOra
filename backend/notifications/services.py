"""
One function per notification "event" in the app (new assignment, student
enrolled, teacher account created, etc.), each building its own
title/message and creating (or bulk-creating, for fan-out cases) the
Notification row(s) directly — no signals, so every trigger point is a
plain, traceable function call from views.py/services.py elsewhere.
"""
from django.utils import timezone
from .models import Notification
from users.models import User


def _display_name(user):
    return user.full_name or user.username


def _admin_recipients(exclude_user=None):
    """All admin users — optionally excluding the admin who caused the event
    themselves (no point notifying an admin about their own action)."""
    qs = User.objects.filter(role=User.Role.ADMIN)
    if exclude_user is not None:
        qs = qs.exclude(pk=exclude_user.pk)
    return qs


def notify_new_assignment(assignment, students):
    """
    students: iterable of User (the enrolled students the assignment was
    just fanned out to). Bulk-creates one notification per student.
    """
    course_title = assignment.course.title
    notifications = [
        Notification(
            recipient=student,
            actor=assignment.created_by,
            notif_type=Notification.Type.NEW_ASSIGNMENT,
            title='New assignment posted',
            message=f"\"{assignment.title}\" was posted in {course_title}. "
                    f"Due {assignment.due_date.strftime('%d %b %Y')}.",
            course=assignment.course,
            assignment=assignment,
        )
        for student in students
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_new_submission(task, is_resubmission=False, is_edit=False):
    teacher = task.assignment.created_by
    student_name = _display_name(task.student)
    submitted_at = timezone.localtime(task.submitted_at) if task.submitted_at else timezone.localtime()
    verb = 'updated their submission for' if is_edit else ('resubmitted' if is_resubmission else 'submitted')
    title_verb = 'updated a submission for' if is_edit else ('resubmitted' if is_resubmission else 'submitted')

    Notification.objects.create(
        recipient=teacher,
        actor=task.student,
        notif_type=Notification.Type.NEW_SUBMISSION,
        title=f"{student_name} {title_verb} an assignment",
        message=f"{student_name} {verb} \"{task.assignment.title}\" "
                f"at {submitted_at.strftime('%d %b %Y, %I:%M %p')}.",
        course=task.assignment.course,
        assignment=task.assignment,
        task=task,
    )


def notify_submission_reviewed(task, approved):
    assignment_title = task.assignment.title

    if approved:
        message = f"Your submission for \"{assignment_title}\" was approved."
        if task.teacher_feedback:
            message += f" Feedback: \"{task.teacher_feedback}\""

        Notification.objects.create(
            recipient=task.student,
            actor=task.assignment.created_by,
            notif_type=Notification.Type.SUBMISSION_APPROVED,
            title='Assignment approved',
            message=message,
            course=task.assignment.course,
            assignment=task.assignment,
            task=task,
        )
    else:
        message = f"Your submission for \"{assignment_title}\" was rejected. You may resubmit."
        if task.teacher_feedback:
            message += f" Feedback: \"{task.teacher_feedback}\""

        Notification.objects.create(
            recipient=task.student,
            actor=task.assignment.created_by,
            notif_type=Notification.Type.SUBMISSION_REJECTED,
            title='Assignment rejected',
            message=message,
            course=task.assignment.course,
            assignment=task.assignment,
            task=task,
        )

def notify_deadline_reminder(task):
    # Avoid duplicate reminders for the same task.
    already_sent = Notification.objects.filter(
        recipient=task.student,
        task=task,
        notif_type=Notification.Type.DEADLINE_REMINDER,
    ).exists()
    if already_sent:
        return False

    assignment = task.assignment
    Notification.objects.create(
        recipient=task.student,
        notif_type=Notification.Type.DEADLINE_REMINDER,
        title='Deadline approaching',
        message=f"\"{assignment.title}\" ({assignment.course.title}) is due "
                f"{assignment.due_date.strftime('%d %b %Y')}. Submit it soon.",
        course=assignment.course,
        assignment=assignment,
        task=task,
    )
    return True


def notify_overdue(task):
    assignment = task.assignment
    Notification.objects.create(
        recipient=task.student,
        notif_type=Notification.Type.ASSIGNMENT_OVERDUE,
        title='Assignment overdue',
        message=f"\"{assignment.title}\" ({assignment.course.title}) was due "
                f"{assignment.due_date.strftime('%d %b %Y')} and is now overdue.",
        course=assignment.course,
        assignment=assignment,
        task=task,
    )


def notify_assignment_updated(assignment, students):
    """
    students: iterable of User (every student currently enrolled in the
    assignment's course). Bulk-creates one notification per student, the
    same fan-out pattern as notify_new_assignment.
    """
    course_title = assignment.course.title
    notifications = [
        Notification(
            recipient=student,
            actor=assignment.created_by,
            notif_type=Notification.Type.ASSIGNMENT_UPDATED,
            title='Assignment updated',
            message=f"\"{assignment.title}\" in {course_title} was updated. "
                    f"Due {assignment.due_date.strftime('%d %b %Y')}.",
            course=assignment.course,
            assignment=assignment,
        )
        for student in students
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


# ── Admin-facing notifications ──────────────────────────────────────────────

def notify_admins_new_student(student):
    """Every admin is notified when a new student self-registers."""
    notifications = [
        Notification(
            recipient=admin,
            actor=student,
            notif_type=Notification.Type.NEW_STUDENT_REGISTERED,
            title='New student registered',
            message=f"{_display_name(student)} ({student.email}) just created a student account.",
        )
        for admin in _admin_recipients()
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_admins_new_teacher(teacher, created_by=None):
    """
    Every OTHER admin is notified when a teacher account is created.
    The admin who performed the action already knows, so they're excluded.
    """
    notifications = [
        Notification(
            recipient=admin,
            actor=teacher,
            notif_type=Notification.Type.NEW_TEACHER_REGISTERED,
            title='New teacher account created',
            message=f"A teacher account was created for {_display_name(teacher)} ({teacher.email}).",
        )
        for admin in _admin_recipients(exclude_user=created_by)
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_admins_new_course(course, created_by=None):
    """
    Every OTHER admin is notified when a course is created. If an admin
    created the course themselves, they're excluded (they already know).
    """
    notifications = [
        Notification(
            recipient=admin,
            actor=created_by,
            notif_type=Notification.Type.NEW_COURSE_CREATED,
            title='New course created',
            message=(f"\"{course.title}\" was created by {_display_name(created_by)}."
                        if created_by else f"\"{course.title}\" was created."),
            course=course,
        )
        for admin in _admin_recipients(exclude_user=created_by)
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_admins_contact_message(contact_message):
    """Every admin is notified when a visitor submits the Contact form."""
    preview = (contact_message.subject or contact_message.message or '').strip()
    if len(preview) > 80:
        preview = preview[:77] + '...'

    notifications = [
        Notification(
            recipient=admin,
            notif_type=Notification.Type.CONTACT_MESSAGE,
            title='New contact message',
            message=f"{contact_message.full_name} ({contact_message.email}) sent a message"
                    + (f": \"{preview}\"" if preview else "."),
        )
        for admin in _admin_recipients()
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_course_assigned(course, teacher, assigned_by=None):
    """A teacher is notified when an admin assigns them to a course."""
    Notification.objects.create(
        recipient=teacher,
        actor=assigned_by,
        notif_type=Notification.Type.COURSE_ASSIGNED,
        title='New course assigned to you',
        message=f"You have been assigned as the teacher for \"{course.title}\".",
        course=course,
    )


def notify_student_left_course(course, student):
    """Teacher is notified when a student leaves (un-enrolls from) their course."""
    if not course.teacher_id:
        return  # unassigned course, no teacher to notify

    Notification.objects.create(
        recipient=course.teacher,
        actor=student,
        notif_type=Notification.Type.STUDENT_LEFT_COURSE,
        title='Student left your course',
        message=f"{_display_name(student)} has left \"{course.title}\".",
        course=course,
    )


def notify_student_removed(course, student, removed_by=None):
    """Student is notified when a teacher/admin un-enrolls them from a course."""
    Notification.objects.create(
        recipient=student,
        actor=removed_by,
        notif_type=Notification.Type.STUDENT_REMOVED_FROM_COURSE,
        title='Removed from course',
        message=f"You have been removed from \"{course.title}\".",
        course=course,
    )

def notify_student_enrolled(course, student):
    """Teacher is notified when a student joins their course via join code."""
    if not course.teacher_id:
        return  # unassigned course, no teacher to notify

    Notification.objects.create(
        recipient=course.teacher,
        actor=student,
        notif_type=Notification.Type.STUDENT_ENROLLED,
        title='New student enrolled',
        message=f"{_display_name(student)} has joined \"{course.title}\".",
        course=course,
    )