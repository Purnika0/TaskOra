from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'email', 'password', 'role']

    def validate_role(self, value):
        # Anyone can register as student or teacher — never as admin
        if value == 'admin':
            raise serializers.ValidationError("You cannot register as an admin.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            role=validated_data.get('role', '')
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['date_joined']


class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'role', 'is_active']

class PromoteUserSerializer(serializers.ModelSerializer):
    # Admin-only — change any user's role
    class Meta:
        model = User
        fields = ['role']