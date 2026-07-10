from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from users.models import User, OTP


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