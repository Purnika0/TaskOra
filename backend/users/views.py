"""
Auth and account-management endpoints: registration, login, profile,
password change/reset, OTP verification, and admin-only user management
(listing, promoting, creating teacher accounts). See users/urls.py for the
exact routes.
"""
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UpdateUserSerializer,
    PromoteUserSerializer,
    CreateTeacherSerializer,
    ChangePasswordSerializer,
    ResendOTPSerializer,
    VerifyEmailSerializer,
    ForgotPasswordSerializer,
    VerifyOTPSerializer,
    ResetPasswordSerializer,
    VerifiedTokenObtainPairSerializer,
)

from .throttles import OTPRequestThrottle, OTPVerifyThrottle

from .permissions import IsAdmin, IsAdminOrTeacher
from .models import User, OTP
from .utils import send_otp_email
from notifications.services import notify_admins_new_student, notify_admins_new_teacher



class RegisterView(generics.CreateAPIView):
    """
    Public registration — students only.
    Teachers cannot self-register.
    Admin role is always blocked.
    """
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        otp, raw_code = OTP.generate(user, OTP.Purpose.EMAIL_VERIFICATION)
        send_otp_email(user, raw_code, OTP.Purpose.EMAIL_VERIFICATION)

        notify_admins_new_student(user)

        return Response(
            {
                "detail": "Registration successful. Please check your email for a verification code.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED
        )


class MeView(APIView):
    """Get or update the currently logged-in user's own profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UpdateUserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            if 'role' in serializer.validated_data:
                return Response(
                    {"detail": "You cannot change your own role."},
                    status=status.HTTP_403_FORBIDDEN
                )
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        # Guard against locking the app out of admin access entirely.
        if user.role == 'admin' and not User.objects.filter(role='admin').exclude(pk=user.pk).exists():
            return Response(
                {"detail": "You are the only admin account and cannot delete it. Promote another user to admin first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    """
    Teacher/Admin only — change your own password with current_password + new_password.
    Students must use the OTP-based forgot-password → verify-otp → reset-password flow instead.
    """
    permission_classes = [IsAdminOrTeacher]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Password changed successfully."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CreateTeacherView(generics.CreateAPIView):
    """
    Admin only — create a teacher account.
    POST /api/users/create-teacher/
    Requires: username, full_name, email, password
    """
    queryset           = User.objects.all()
    serializer_class   = CreateTeacherSerializer
    permission_classes = [IsAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            notify_admins_new_teacher(user, created_by=request.user)
            return Response(
                {
                    "detail": f"Teacher account created for {user.full_name or user.username}.",
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """Admin only — list all users with optional role filter."""
    queryset           = User.objects.all().order_by('date_joined')
    serializer_class   = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin only — view, update, or delete any user."""
    queryset           = User.objects.all()
    serializer_class   = UpdateUserSerializer
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        # Same guard as MeView.delete: never allow the last admin account to
        # be removed, whether that happens via self-service deletion or here
        # (an admin deleting another user) via the admin panel.
        if instance.role == 'admin' and not User.objects.filter(role='admin').exclude(pk=instance.pk).exists():
            raise ValidationError(
                {"detail": "This is the only admin account and cannot be deleted. Promote another user to admin first."}
            )
        instance.delete()


class PromoteUserView(APIView):
    """Admin only — change any user's role."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PromoteUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "detail": f"{user.username} is now a {user.role}.",
                "user"  : UserSerializer(user).data,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifiedLoginView(TokenObtainPairView):
    """Login — blocks unverified users from obtaining tokens."""
    serializer_class = VerifiedTokenObtainPairSerializer


class ResendOTPView(APIView):
    """
    POST /api/users/resend-otp/
    Body: { email, purpose: 'email_verification' | 'password_reset' }
    """
    permission_classes = [AllowAny]
    throttle_classes   = [OTPRequestThrottle]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "If that email exists, a code has been sent."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    """
    POST /api/users/verify-email/
    Body: { email, otp_code }
    """
    permission_classes = [AllowAny]
    throttle_classes   = [OTPVerifyThrottle]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Email verified successfully. You can now log in."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    """
    POST /api/users/forgot-password/
    Body: { email }
    """
    permission_classes = [AllowAny]
    throttle_classes   = [OTPRequestThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
        # Always return the same generic response — don't reveal validation details
        return Response(
            {"detail": "If that email exists, a reset code has been sent."},
            status=status.HTTP_200_OK
        )


class VerifyOTPView(APIView):
    """
    POST /api/users/verify-otp/
    Body: { email, otp_code }
    Checks validity WITHOUT consuming — lets the frontend confirm before showing the reset form.
    """
    permission_classes = [AllowAny]
    throttle_classes   = [OTPVerifyThrottle]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            return Response({"detail": "Code verified."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    """
    POST /api/users/reset-password/
    Body: { email, otp_code, new_password }
    """
    permission_classes = [AllowAny]
    throttle_classes   = [OTPVerifyThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Password reset successfully. You can now log in."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)