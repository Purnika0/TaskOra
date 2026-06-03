from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


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
            username  = validated_data['username'],
            email     = validated_data['email'],
            password  = validated_data['password'],
            full_name = validated_data.get('full_name', ''),
            role      = User.Role.TEACHER,
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