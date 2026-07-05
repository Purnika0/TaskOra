from rest_framework import serializers
from .models import Course, Enrollment
from users.serializers import UserSerializer
from users.models import User


class CourseSerializer(serializers.ModelSerializer):
    teacher = UserSerializer(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'teacher', 'join_code', 'start_date', 'end_date', 'created_at']
        read_only_fields = ['join_code', 'created_at']


class CourseWriteSerializer(serializers.ModelSerializer):
    teacher_id = serializers.PrimaryKeyRelatedField(
        source='teacher', queryset=User.objects.filter(role='teacher'),
        required=False, allow_null=True,
    )

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'start_date', 'end_date', 'teacher_id']


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    student = UserSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'enrolled_at']


class JoinCourseSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=8)

    def validate_join_code(self, value):
        try:
            course = Course.objects.get(join_code=value.upper())
        except Course.DoesNotExist:
            raise serializers.ValidationError("Invalid join code.")
        self.context['course'] = course
        return value