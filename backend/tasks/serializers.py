from rest_framework import serializers
from .models import Assignment, Task, SubTask
from holidays.bs_calendar import ad_to_bs


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ['id', 'title', 'is_completed', 'created_at']


class AssignmentSerializer(serializers.ModelSerializer):
    due_date_bs = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'course', 'created_by',
            'due_date', 'due_date_bs', 'task_type',
            'estimated_hours', 'priority', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_due_date_bs(self, obj):
        return ad_to_bs(obj.due_date)


class TaskSerializer(serializers.ModelSerializer):
    # Read serializer — works for both assigned and personal tasks
    assignment = AssignmentSerializer(read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    display_title = serializers.SerializerMethodField()
    is_personal = serializers.SerializerMethodField()
    due_date_bs = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'student', 'assignment',
            'display_title', 'is_personal',
            'title', 'description', 'course',
            'due_date', 'due_date_bs',
            'estimated_hours', 'priority', 'task_type',
            'is_completed', 'priority_score', 'completed_at', 'created_at',
            'subtasks'
        ]
        read_only_fields = ['student', 'priority_score', 'completed_at', 'created_at']

    def get_display_title(self, obj):
        return obj.get_title()

    def get_is_personal(self, obj):
        return obj.is_personal()

    def get_due_date_bs(self, obj):
        due = obj.due_date if obj.is_personal() else (obj.assignment.due_date if obj.assignment else None)
        return ad_to_bs(due)


class PersonalTaskSerializer(serializers.ModelSerializer):
    # Write serializer — student creates a personal task
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'course',
            'due_date', 'estimated_hours', 'priority', 'task_type',
            'is_completed'
        ]

    def validate(self, attrs):
        if not attrs.get('title'):
            raise serializers.ValidationError({"title": "Personal tasks must have a title."})
        return attrs

    def create(self, validated_data):
        from .priority import calculate_priority_score_personal
        task = Task(**validated_data)
        task.student = self.context['request'].user
        task.priority_score = calculate_priority_score_personal(task)
        task.save()
        return task


class TaskUpdateSerializer(serializers.ModelSerializer):
    # Student marks a task complete/incomplete
    class Meta:
        model = Task
        fields = ['is_completed']

    def update(self, instance, validated_data):
        from django.utils import timezone
        instance.is_completed = validated_data.get('is_completed', instance.is_completed)
        if instance.is_completed and not instance.completed_at:
            instance.completed_at = timezone.now()
        elif not instance.is_completed:
            instance.completed_at = None
        instance.save()
        return instance