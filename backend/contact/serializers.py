"""Public submission serializer plus an admin-only, status-only update serializer for the same model."""
from rest_framework import serializers
from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ContactMessage
        fields = ['id', 'full_name', 'email', 'subject', 'message', 'status', 'submitted_at']
        read_only_fields = ['id', 'status', 'submitted_at']

    def validate_message(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Message must be at least 10 characters long."
            )
        return value.strip()

    def validate_full_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Please enter your full name."
            )
        return value.strip()


class ContactMessageStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Admin only — used to mark a message as read or resolved.
    Only `status` is writable; every other field is included read-only so the
    response always carries the full message (not just id + status).
    """
    class Meta:
        model  = ContactMessage
        fields = ['id', 'full_name', 'email', 'subject', 'message', 'status', 'submitted_at']
        read_only_fields = ['id', 'full_name', 'email', 'subject', 'message', 'submitted_at']

    def validate_status(self, value):
        valid = [choice[0] for choice in ContactMessage.STATUS_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f"Status must be one of {valid}.")
        return value