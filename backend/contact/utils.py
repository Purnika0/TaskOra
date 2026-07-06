import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_contact_notification_email(contact_message):
    """
    Notifies the admin (Gmail) whenever a new contact message is submitted.
    Best-effort: failures are logged, never raised, so a submission always
    succeeds for the visitor even if the notification email fails to send.
    """
    subject = f"New Contact Message: {contact_message.subject or 'No subject'}"
    body = (
        f"You've received a new message from the TaskOra contact form.\n\n"
        f"Name: {contact_message.full_name}\n"
        f"Email: {contact_message.email}\n"
        f"Subject: {contact_message.subject or '(none)'}\n\n"
        f"Message:\n{contact_message.message}\n\n"
        f"Submitted: {contact_message.submitted_at.strftime('%Y-%m-%d %H:%M')}\n"
        f"— TaskOra"
    )

    admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', settings.EMAIL_HOST_USER)

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin_email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send contact notification email for message id=%s", contact_message.id)