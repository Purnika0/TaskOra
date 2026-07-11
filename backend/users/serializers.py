"""
Serializers for the users app: registration, profile management, and the
full OTP lifecycle (email verification + forgot-password), plus a patched
JWT login serializer that accepts username OR email and blocks login for
unverified student accounts.

Three separate serializers exist for reading/updating/promoting a user
(UserSerializer, UpdateUserSerializer, PromoteUserSerializer) rather than
one shared one, so each endpoint only exposes exactly the fields it's
meant to (e.g. only admins should be able to change `role`).
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, OTP
from .utils import send_otp_email
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class RegisterSerializer(serializers.ModelSerializer):
    """
    Public registration — students only.
    Teachers cannot self-register; their accounts are created by an admin.
    Admin role is always blocked here.
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model  = User
        fields = ['id', 'username', 'full_name', 'email', 'password', 'role']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value
    
    def validate_role(self, value):
        if value in ('admin', 'teacher'):
            raise serializers.ValidationError(
                "Only students can self-register. "
                "Teacher accounts are created by an administrator."
            )
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username   = validated_data['username'],
            email      = validated_data['email'],
            password   = validated_data['password'],
            full_name  = validated_data.get('full_name', ''),
            role       = validated_data.get('role', User.Role.STUDENT),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model        = User
        fields       = ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['date_joined']


class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['username', 'email', 'full_name', 'role', 'is_active']


class PromoteUserSerializer(serializers.ModelSerializer):
    """Admin only — change any user's role."""
    class Meta:
        model  = User
        fields = ['role']


class CreateTeacherSerializer(serializers.ModelSerializer):
    """
    Admin only — create a teacher account with a temporary password.
    The teacher can change their password after first login.
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model  = User
        fields = ['id', 'username', 'full_name', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username           = validated_data['username'],
            email              = validated_data['email'],
            password           = validated_data['password'],
            full_name          = validated_data.get('full_name', ''),
            role               = User.Role.TEACHER,
            is_email_verified  = True,   # admin vouches for them — no OTP needed
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """
    Any authenticated user can change their own password.
    Requires the current password for verification.
    """
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError(
                {"new_password": "New password must be different from the current password."}
            )
        return attrs

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class ResendOTPSerializer(serializers.Serializer):
    """Used for both 'resend verification code' and 'resend reset code'."""
    email   = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=OTP.Purpose.choices)

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs['email']).first()
        if user is None:
            # Don't reveal whether the email exists
            raise serializers.ValidationError(
                {"detail": "If that email exists, a code has been sent."}
            )
        attrs['user'] = user
        return attrs

    def save(self):
        user    = self.validated_data['user']
        purpose = self.validated_data['purpose']
        otp, raw_code = OTP.generate(user, purpose)
        send_otp_email(user, raw_code, purpose)
        return otp


class VerifyEmailSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs['email']).first()
        if user is None:
            raise serializers.ValidationError({"detail": "Invalid email or code."})

        otp = OTP.objects.filter(
            user=user, purpose=OTP.Purpose.EMAIL_VERIFICATION, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid or not otp.check_code(attrs['otp_code']):
            raise serializers.ValidationError({"detail": "Invalid or expired code."})

        attrs['user'] = user
        attrs['otp']  = otp
        return attrs

    def save(self):
        user = self.validated_data['user']
        otp  = self.validated_data['otp']
        otp.is_used = True
        otp.save()
        user.is_email_verified = True
        user.save()
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        # Always succeed silently even if the email doesn't exist —
        # prevents leaking which emails are registered.
        user = User.objects.filter(email__iexact=self.validated_data['email']).first()
        if user is None:
            return None

        otp, raw_code = OTP.generate(user, OTP.Purpose.PASSWORD_RESET)
        send_otp_email(user, raw_code, OTP.Purpose.PASSWORD_RESET)
        return user


class VerifyOTPSerializer(serializers.Serializer):
    """Checks a password-reset OTP is valid WITHOUT consuming it."""
    email    = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs['email']).first()
        if user is None:
            raise serializers.ValidationError({"detail": "Invalid email or code."})

        otp = OTP.objects.filter(
            user=user, purpose=OTP.Purpose.PASSWORD_RESET, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid or not otp.check_code(attrs['otp_code']):
            raise serializers.ValidationError({"detail": "Invalid or expired code."})

        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    email        = serializers.EmailField()
    otp_code     = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs['email']).first()
        if user is None:
            raise serializers.ValidationError({"detail": "Invalid email or code.", "code": "otp_invalid"})

        otp = OTP.objects.filter(
            user=user, purpose=OTP.Purpose.PASSWORD_RESET, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid or not otp.check_code(attrs['otp_code']):
            raise serializers.ValidationError({"detail": "Invalid or expired code.", "code": "otp_invalid"})

        attrs['user'] = user
        attrs['otp']  = otp
        return attrs

    def save(self):
        user = self.validated_data['user']
        otp  = self.validated_data['otp']
        user.set_password(self.validated_data['new_password'])
        user.save()
        otp.is_used = True
        otp.save()
        return user


class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Frontend sends either `username` or `email` depending on what the
        # user typed. SimpleJWT's base serializer only declares a required
        # `username` field, so a pure-email login was always failing
        # required-field validation before `validate()` even ran. Make the
        # username field optional and accept an optional `email` field too,
        # then resolve email -> username below.
        self.fields[self.username_field].required = False
        self.fields['email'] = serializers.EmailField(required=False)

    def validate(self, attrs):
        email = attrs.pop('email', None)
        if email and not attrs.get(self.username_field):
            try:
                user_obj = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    {"detail": "No active account found with the given credentials"}
                )
            attrs[self.username_field] = user_obj.username

        if not attrs.get(self.username_field):
            raise serializers.ValidationError(
                {"detail": "Username or email is required."}
            )

        data = super().validate(attrs)  # runs normal username/password auth first
        if self.user.role == User.Role.STUDENT and not self.user.is_email_verified:
            raise serializers.ValidationError(
                {
                    "detail": "Please verify your email before logging in.",
                    "code": "email_not_verified",
                    "email": self.user.email,
                },
            )
        return data