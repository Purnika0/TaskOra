"""
Serializers for assignments and tasks. AssignmentSerializer is the teacher-
authored "template"; TaskSerializer is a student's live view of it, with
priority_score always recomputed rather than read from the stored column
(see the comment on that field for why).
"""
from rest_framework import serializers
from django.utils import timezone
from .models import Assignment, Task
from .priority import calculate_priority_score
from .file_access import make_download_token
from holidays.bs_calendar import ad_to_bs


class AssignmentSerializer(serializers.ModelSerializer):
    due_date_bs = serializers.SerializerMethodField()
    course_name  = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()

    submission_count     = serializers.SerializerMethodField()
    pending_review_count = serializers.SerializerMethodField()
    approved_count        = serializers.SerializerMethodField()
    rejected_count        = serializers.SerializerMethodField()
    file_name             = serializers.SerializerMethodField()
    # Overrides the model's plain FileField representation (a bare
    # /media/... URL with no access control) with a signed, short-lived
    # download link — see tasks/file_access.py and
    # AssignmentFileDownloadView in tasks/views.py.
    file                   = serializers.SerializerMethodField()

    # Human-readable label for the teacher-set importance (1-5), e.g. "Medium-High".
    # This is the *importance* the teacher assigned — not to be confused with
    # Task.priority_score, which is the system-computed urgency shown on TaskSerializer.
    priority_label = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'course', 'course_name',
            'created_by', 'teacher_name',
            'due_date', 'due_date_bs', 'task_type',
            'estimated_hours', 'priority', 'priority_label', 'created_at',
            'submission_count', 'pending_review_count', 'approved_count', 'rejected_count',
            'file', 'file_name',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_due_date_bs(self, obj):
        return ad_to_bs(obj.due_date)
    
    def get_course_name(self, obj):
        return obj.course.title

    def get_teacher_name(self, obj):
        return obj.created_by.full_name or obj.created_by.username

    def get_file_name(self, obj):
        if obj.file:
            return obj.file.name.split('/')[-1]
        return None

    def get_file(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if not obj.file or not user or not user.is_authenticated:
            return None
        token = make_download_token('assignment', obj.pk, user.id)
        path = f'/api/tasks/assignments/{obj.pk}/file/?token={token}'
        return request.build_absolute_uri(path) if request else path

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
    student_name = serializers.SerializerMethodField()
    student_username = serializers.CharField(source="student.username", read_only=True)
    file_name = serializers.SerializerMethodField()
    # Same reasoning as AssignmentSerializer.file above — signed short-lived
    # link instead of a bare, unauthenticated /media/... URL.
    submission_file = serializers.SerializerMethodField()

    # Recomputed live on every read rather than trusting the value stored at
    # task-creation time, which goes stale as the due date approaches (the
    # urgency component is a function of days-left, so a score computed
    # three weeks out is wrong by the time the deadline is close). The view
    # passes a HolidayCountCache in via serializer context so a page of N
    # tasks only queries the Holiday table once per distinct due_date, not
    # once per task.
    priority_score = serializers.SerializerMethodField()

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
            'student', 'status',
            'submitted_at', 'completed_at', 'created_at',
        ]

    def get_priority_score(self, obj):
        cache = self.context.get('holiday_cache')
        return calculate_priority_score(obj.assignment, cache=cache)

    def get_due_date_bs(self, obj):
        return ad_to_bs(obj.assignment.due_date)

    def get_student_name(self, obj):
        return obj.student.full_name or obj.student.username

    def get_file_name(self, obj):
        if obj.submission_file:
            return obj.submission_file.name.split('/')[-1]
        return None

    def get_submission_file(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if not obj.submission_file or not user or not user.is_authenticated:
            return None
        token = make_download_token('submission', obj.pk, user.id)
        path = f'/api/tasks/{obj.pk}/submission-file/?token={token}'
        return request.build_absolute_uri(path) if request else path


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

        if instance.status not in (
            Task.Status.PENDING, Task.Status.OVERDUE,
            Task.Status.REJECTED, Task.Status.SUBMITTED,
        ):
            raise serializers.ValidationError(
                "This task has already been reviewed and can no longer be edited."
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