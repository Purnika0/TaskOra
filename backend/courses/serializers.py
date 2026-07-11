"""
Course-related serializers. CourseSerializer (read) and CourseWriteSerializer
(create/update) are split because reads need the nested teacher object
(UserSerializer) while writes just need a teacher_id to assign one.
"""
from rest_framework import serializers
from .models import Course, Enrollment
from users.serializers import UserSerializer
from users.models import User


class CourseSerializer(serializers.ModelSerializer):
    teacher = UserSerializer(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'teacher', 'join_code', 'created_at']
        read_only_fields = ['join_code', 'created_at']


class CourseWriteSerializer(serializers.ModelSerializer):
    teacher_id = serializers.PrimaryKeyRelatedField(
        source='teacher', queryset=User.objects.filter(role='teacher'),
        required=False, allow_null=True,
    )

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'teacher_id']


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    student = UserSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'enrolled_at']


class JoinCourseSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=8)

    def validate_join_code(self, value):
        # Codes are generated/stored uppercase; normalize the student's
        # input so pasting a lowercased code still works (see AuthPage-style
        # UX expectations — students may retype the code by hand).
        try:
            course = Course.objects.get(join_code=value.upper())
        except Course.DoesNotExist:
            raise serializers.ValidationError("Invalid join code.")
        
        # Stashed here so the view doesn't have to re-query for the course.
        self.context['course'] = course
        return value