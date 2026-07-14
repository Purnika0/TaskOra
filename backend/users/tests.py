from datetime import timedelta
from io import StringIO

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from users.models import User, OTP
from users.serializers import PromoteUserSerializer, UpdateUserSerializer


class SingleAdminEnforcementTests(TestCase):
    """
    TaskOra allows exactly one admin account. Covers the model-level guard
    (User.save()) and the two serializer-level guards that would otherwise
    let an admin turn another user into a second admin.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            username='the_admin', email='the_admin@example.com',
            password='pass12345', role=User.Role.ADMIN,
        )
        self.teacher = User.objects.create_user(
            username='some_teacher', email='some_teacher@example.com',
            password='pass12345', role=User.Role.TEACHER,
        )

    def test_creating_second_admin_via_model_raises(self):
        second = User(
            username='second_admin', email='second_admin@example.com',
            role=User.Role.ADMIN,
        )
        second.set_password('pass12345')
        with self.assertRaises(ValidationError):
            second.save()

    def test_existing_admin_can_still_be_saved(self):
        """The guard must exclude the instance's own pk, or an admin could never update their own profile."""
        self.admin.full_name = 'Updated Name'
        self.admin.save()  # should not raise
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.full_name, 'Updated Name')

    def test_promote_user_serializer_rejects_admin_role(self):
        serializer = PromoteUserSerializer(self.teacher, data={'role': 'admin'}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)

    def test_promote_user_serializer_allows_student_teacher_roles(self):
        serializer = PromoteUserSerializer(self.teacher, data={'role': 'student'}, partial=True)
        self.assertTrue(serializer.is_valid())

    def test_update_user_serializer_rejects_admin_role(self):
        serializer = UpdateUserSerializer(self.teacher, data={'role': 'admin'}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)


class CreateAdminCommandTests(TestCase):
    """Covers the `create_admin` management command that replaces manual createsuperuser + DB edits."""

    def test_creates_admin_when_none_exists(self):
        call_command(
            'create_admin',
            username='new_admin', email='new_admin@example.com',
            password='Str0ng!Passw0rd',
            stdout=StringIO(),
        )
        admin = User.objects.get(username='new_admin')
        self.assertEqual(admin.role, User.Role.ADMIN)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.check_password('Str0ng!Passw0rd'))

    def test_refuses_when_admin_already_exists(self):
        User.objects.create_user(
            username='existing_admin', email='existing_admin@example.com',
            password='pass12345', role=User.Role.ADMIN,
        )
        with self.assertRaises(CommandError):
            call_command(
                'create_admin',
                username='another_admin', email='another_admin@example.com',
                password='Str0ng!Passw0rd',
                stdout=StringIO(),
            )
        self.assertEqual(User.objects.filter(role=User.Role.ADMIN).count(), 1)

    def test_rejects_weak_password(self):
        with self.assertRaises(CommandError):
            call_command(
                'create_admin',
                username='weak_admin', email='weak_admin@example.com',
                password='123',
                stdout=StringIO(),
            )
        self.assertFalse(User.objects.filter(username='weak_admin').exists())

    def test_rejects_duplicate_username(self):
        User.objects.create_user(
            username='taken', email='taken_original@example.com', password='pass12345',
        )
        with self.assertRaises(CommandError):
            call_command(
                'create_admin',
                username='taken', email='new_email@example.com',
                password='Str0ng!Passw0rd',
                stdout=StringIO(),
            )


class OTPModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='otpuser', email='otpuser@example.com', password='testpass123'
        )

    def test_generate_stores_hash_not_raw_code(self):
        """The raw 6-digit code must never be persisted — only its SHA-256 hash."""
        otp, raw_code = OTP.generate(self.user, OTP.Purpose.EMAIL_VERIFICATION)
        self.assertEqual(len(raw_code), 6)
        self.assertTrue(raw_code.isdigit())
        self.assertNotEqual(otp.otp_hash, raw_code)
        self.assertEqual(otp.otp_hash, OTP._hash(raw_code))

    def test_check_code_accepts_correct_rejects_wrong(self):
        otp, raw_code = OTP.generate(self.user, OTP.Purpose.PASSWORD_RESET)
        self.assertTrue(otp.check_code(raw_code))

        wrong_code = '000000' if raw_code != '000000' else '111111'
        self.assertFalse(otp.check_code(wrong_code))

    def test_is_valid_false_once_used(self):
        otp, _ = OTP.generate(self.user, OTP.Purpose.PASSWORD_RESET)
        self.assertTrue(otp.is_valid)

        otp.is_used = True
        otp.save()
        self.assertFalse(otp.is_valid)

    def test_is_valid_false_once_expired(self):
        otp, _ = OTP.generate(self.user, OTP.Purpose.PASSWORD_RESET)

        otp.expires_at = timezone.now() - timedelta(seconds=1)
        otp.save()

        self.assertTrue(otp.is_expired)
        self.assertFalse(otp.is_valid)

    def test_generate_invalidates_previous_unused_otp_same_purpose(self):
        """
        Requesting a new OTP for the same user+purpose should silently
        invalidate any earlier unused one, so only the latest code works.
        """
        first_otp, _ = OTP.generate(self.user, OTP.Purpose.PASSWORD_RESET)
        second_otp, _ = OTP.generate(self.user, OTP.Purpose.PASSWORD_RESET)

        first_otp.refresh_from_db()
        self.assertTrue(first_otp.is_used)
        self.assertFalse(second_otp.is_used)

    def test_generate_does_not_invalidate_otp_for_different_purpose(self):
        """Requesting a password-reset OTP shouldn't touch an active email-verification OTP."""
        verify_otp, _ = OTP.generate(self.user, OTP.Purpose.EMAIL_VERIFICATION)
        OTP.generate(self.user, OTP.Purpose.PASSWORD_RESET)

        verify_otp.refresh_from_db()
        self.assertFalse(verify_otp.is_used)

    def test_default_expiry_is_five_minutes_from_creation(self):
        otp, _ = OTP.generate(self.user, OTP.Purpose.PASSWORD_RESET)
        delta_seconds = (otp.expires_at - otp.created_at).total_seconds()
        self.assertAlmostEqual(delta_seconds, 300, delta=5)