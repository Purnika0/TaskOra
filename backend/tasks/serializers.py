from rest_framework import serializers
from django.utils import timezone
from .models import Assignment, Task
from holidays.bs_calendar import ad_to_bs


class AssignmentSerializer(serializers.ModelSerializer):
    due_date_bs = serializers.SerializerMethodField()
    course_name  = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'course', 'course_name', 'created_by',
            'due_date', 'due_date_bs', 'task_type',
            'estimated_hours', 'priority', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_due_date_bs(self, obj):
        return ad_to_bs(obj.due_date)
    
    def get_course_name(self, obj):
        return obj.course.title



class TaskSerializer(serializers.ModelSerializer):
    """Read serializer — used for listing tasks (student and teacher views)."""
    assignment    = AssignmentSerializer(read_only=True)
    due_date_bs   = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'student', 'assignment',
            'priority_score', 'status',
            'submission_file', 'submission_text', 'submitted_at',
            'teacher_feedback', 'completed_at',
            'due_date_bs', 'created_at',
        ]
        read_only_fields = [
            'student', 'priority_score', 'status',
            'submitted_at', 'completed_at', 'created_at',
        ]

    def get_due_date_bs(self, obj):
        return ad_to_bs(obj.assignment.due_date)


class TaskSubmitSerializer(serializers.ModelSerializer):
    """
    Student submits an assignment.
    At least one of submission_file or submission_text is required.
    """
    class Meta:
        model = Task
        fields = ['submission_file', 'submission_text']

    def validate(self, attrs):
        file = attrs.get('submission_file')
        text = attrs.get('submission_text', '').strip()
        if not file and not text:
            raise serializers.ValidationError(
                "Please provide a submission file, a written response, or both."
            )
        return attrs

    def update(self, instance, validated_data):
        if instance.status != Task.Status.PENDING:
            raise serializers.ValidationError(
                "This task has already been submitted."
            )
        instance.submission_file = validated_data.get('submission_file', instance.submission_file)
        instance.submission_text = validated_data.get('submission_text', instance.submission_text)
        instance.status          = Task.Status.SUBMITTED
        instance.submitted_at    = timezone.now()
        instance.save()
        return instance


class TaskReviewSerializer(serializers.ModelSerializer):
    """
    Teacher marks a submitted task as completed with optional feedback.
    """
    class Meta:
        model = Task
        fields = ['teacher_feedback']

    def update(self, instance, validated_data):
        if instance.status != Task.Status.SUBMITTED:
            raise serializers.ValidationError(
                "Only submitted tasks can be marked as completed."
            )
        instance.teacher_feedback = validated_data.get('teacher_feedback', '')
        instance.status           = Task.Status.COMPLETED
        instance.completed_at     = timezone.now()
        instance.save()
        return instance