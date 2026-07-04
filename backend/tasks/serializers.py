from rest_framework import serializers
from django.utils import timezone
from .models import Assignment, Task
from holidays.bs_calendar import ad_to_bs


class AssignmentSerializer(serializers.ModelSerializer):
    due_date_bs = serializers.SerializerMethodField()
    course_name  = serializers.SerializerMethodField()

    # Per-assignment task counts for the teacher dashboard's analytics cards.
    # Populated via annotate() on the queryset (see views.py) when available,
    # falling back to a live count so this serializer is also safe to use
    # on a single, non-annotated instance (e.g. after create/update).
    submission_count     = serializers.SerializerMethodField()
    pending_review_count = serializers.SerializerMethodField()
    approved_count        = serializers.SerializerMethodField()
    rejected_count        = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'course', 'course_name', 'created_by',
            'due_date', 'due_date_bs', 'task_type',
            'estimated_hours', 'priority', 'created_at',
            'submission_count', 'pending_review_count', 'approved_count', 'rejected_count',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_due_date_bs(self, obj):
        return ad_to_bs(obj.due_date)
    
    def get_course_name(self, obj):
        return obj.course.title

    def get_submission_count(self, obj):
        # Annotated by the view's queryset when listing; fall back otherwise.
        if hasattr(obj, 'submission_count'):
            return obj.submission_count
        return obj.tasks.filter(submitted_at__isnull=False).count()

    def get_pending_review_count(self, obj):
        if hasattr(obj, 'pending_review_count'):
            return obj.pending_review_count
        return obj.tasks.filter(status=Task.Status.SUBMITTED).count()

    def get_approved_count(self, obj):
        if hasattr(obj, 'approved_count'):
            return obj.approved_count
        return obj.tasks.filter(status=Task.Status.COMPLETED).count()

    def get_rejected_count(self, obj):
        if hasattr(obj, 'rejected_count'):
            return obj.rejected_count
        return obj.tasks.filter(status=Task.Status.REJECTED).count()



class TaskSerializer(serializers.ModelSerializer):
    """Read serializer — used for listing tasks (student and teacher views)."""
    assignment    = AssignmentSerializer(read_only=True)
    due_date_bs   = serializers.SerializerMethodField()

    # Extra fields for teacher dashboard
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    file_name = serializers.SerializerMethodField()
    class Meta:
        model = Task
        fields = [
            'id', 'student', 'student_name', 'student_username', 'assignment',
            'priority_score', 'status',
            'submission_file', 'file_name', 'submission_text', 'submitted_at',
            'teacher_feedback', 'completed_at',
            'due_date_bs', 'created_at',
        ]
        read_only_fields = [
            'student', 'priority_score', 'status',
            'submitted_at', 'completed_at', 'created_at',
        ]

    def get_due_date_bs(self, obj):
        return ad_to_bs(obj.assignment.due_date)
    
    # def get_student_name(self, obj):
    #     return (
    #         obj.student.get_full_name()
    #         or obj.student.full_name
    #         or obj.student.username
    #     )
    def get_student_name(self, obj):
        if hasattr(obj.student, "get_full_name"):
            name = obj.student.get_full_name()
            if name:
                return name
        return obj.student.username

    def get_file_name(self, obj):
        if obj.submission_file:
            return obj.submission_file.name.split('/')[-1]
        return None


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
        # A task can be (re)submitted while PENDING (first submission),
        # OVERDUE (late first submission) or REJECTED (resubmission after
        # the teacher sent it back for revision).
        if instance.status not in (Task.Status.PENDING, Task.Status.OVERDUE, Task.Status.REJECTED):
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
    Teacher approves or rejects a submitted task, with optional feedback.

    `action` accepts 'approve' (default) or 'reject':
        • approve → status becomes COMPLETED
        • reject  → status becomes REJECTED, and the student may resubmit
    """
    action = serializers.ChoiceField(choices=['approve', 'reject'], required=False, default='approve')

    class Meta:
        model = Task
        fields = ['teacher_feedback', 'action']

    def update(self, instance, validated_data):
        if instance.status != Task.Status.SUBMITTED:
            raise serializers.ValidationError(
                "Only submitted tasks can be reviewed."
            )
        action = validated_data.pop('action', 'approve')
        instance.teacher_feedback = validated_data.get('teacher_feedback', '')

        if action == 'reject':
            instance.status       = Task.Status.REJECTED
            instance.completed_at = None
        else:
            instance.status       = Task.Status.COMPLETED
            instance.completed_at = timezone.now()

        instance.save()
        return instance