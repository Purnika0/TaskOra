from django.contrib.auth.models import AbstractUser
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

    email              = models.EmailField(unique=True)
    role               = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    full_name          = models.CharField(max_length=255, blank=True)
    is_email_verified  = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.role})"


class OTP(models.Model):
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
        # Auto-set expiry to 5 minutes from creation
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)

    @staticmethod
    def _hash(code):
        return hashlib.sha256(code.encode()).hexdigest()

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
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