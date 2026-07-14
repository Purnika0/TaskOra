"""
Core identity models for TaskOra.

User extends Django's built-in AbstractUser with a role (student/teacher/
admin) and email-verification state. OTP backs both email verification at
signup and the forgot-password flow — both use the same one-time-code
mechanism, distinguished only by `purpose`.
"""
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from datetime import timedelta
import hashlib
import random


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        TEACHER = 'teacher', 'Teacher'
        ADMIN   = 'admin',   'Admin'

    # Django's default User.email isn't unique or required — we need both,
    # since email is how OTPs get delivered and how login-by-email works.
    email              = models.EmailField(unique=True)
    role               = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    full_name          = models.CharField(max_length=255, blank=True)
    
    # Gates login (see users/views.py VerifiedLoginView) until the signup
    # OTP has been confirmed. Teacher accounts are admin-created and are
    # marked verified immediately, so this mainly applies to students.
    is_email_verified  = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # TaskOra allows exactly one admin account, provisioned only via
        # `python manage.py create_admin` (see users/management/commands/).
        # This is the last line of defense against a second admin slipping
        # in through the Django admin site, a shell, or a future API bug —
        # the API-level blocks live in RegisterSerializer, PromoteUserSerializer,
        # and UpdateUserSerializer, but this guard holds even if those are
        # ever bypassed.
        if self.role == User.Role.ADMIN:
            other_admin_exists = User.objects.filter(
                role=User.Role.ADMIN
            ).exclude(pk=self.pk).exists()
            if other_admin_exists:
                raise ValidationError(
                    "Only one admin account is allowed in TaskOra. "
                    "Delete the existing admin first if you need to replace it."
                )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"


class OTP(models.Model):
    """
    A single-use, time-limited one-time code, used for both email
    verification and password reset. Only the hash of the code is ever
    persisted — the raw digits exist just long enough to be emailed out.
    """
    class Purpose(models.TextChoices):
        EMAIL_VERIFICATION = 'email_verification', 'Email Verification'
        PASSWORD_RESET     = 'password_reset',     'Password Reset'

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp_hash   = models.CharField(max_length=64)   # SHA-256 hex digest — never store the raw code
    purpose    = models.CharField(max_length=25, choices=Purpose.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-set expiry to 5 minutes from creation, unless the caller
        # already supplied one (generate() below always does, so this
        # mainly exists as a safety net for any other creation path).
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)

    @staticmethod
    def _hash(code):
        """One-way hash for a raw code — mirrors how passwords are never stored in plaintext."""
        return hashlib.sha256(code.encode()).hexdigest()

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """An OTP is usable only if it hasn't already been consumed and hasn't timed out."""
        return not self.is_used and not self.is_expired

    def check_code(self, code):
        """Compare a submitted raw code against the stored hash."""
        return self.otp_hash == self._hash(code)

    @classmethod
    def generate(cls, user, purpose):
        """
        Invalidate any existing unused OTPs for this user+purpose,
        then generate and return a fresh one.

        Returns a tuple: (otp_instance, raw_code).
        raw_code is only available here — send it via email immediately.
        It is never stored or retrievable again after this call.
        """
        # Requesting a new code makes any earlier unused one for the same
        # purpose dead on arrival, so a user can't have two valid codes
        # floating around (e.g. two "resend code" clicks in a row).
        cls.objects.filter(
            user=user, purpose=purpose, is_used=False
        ).update(is_used=True)

        raw_code = str(random.randint(100000, 999999))
        otp = cls.objects.create(
            user       = user,
            otp_hash   = cls._hash(raw_code),
            purpose    = purpose,
            expires_at = timezone.now() + timedelta(minutes=5),
        )
        return otp, raw_code

    def __str__(self):
        return f"{self.user.username} — {self.purpose} ({'used' if self.is_used else 'active'})"