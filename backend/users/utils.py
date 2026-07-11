"""Email-sending helpers for the users app (currently just OTP delivery)."""
from django.conf import settings
from django.core.mail import send_mail


def send_otp_email(user, otp_code, purpose):
    """
    Sends an OTP code to the user's email for the given purpose.
    purpose: 'email_verification' or 'password_reset'
    """
    if purpose == 'email_verification':
        subject = 'Verify your TaskOra email'
        message = (
            f"Hi {user.full_name or user.username},\n\n"
            f"Your TaskOra email verification code is: {otp_code}\n\n"
            f"This code expires in 5 minutes. If you didn't request this, you can ignore this email.\n\n"
            f"— TaskOra"
        )
    else:  # password_reset
        subject = 'TaskOra password reset code'
        message = (
            f"Hi {user.full_name or user.username},\n\n"
            f"Your TaskOra password reset code is: {otp_code}\n\n"
            f"This code expires in 5 minutes. If you didn't request this, you can safely ignore this email — "
            f"your password will not be changed.\n\n"
            f"— TaskOra"
        )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )