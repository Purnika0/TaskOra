from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer, UpdateUserSerializer, PromoteUserSerializer
from .permissions import IsAdmin
from .models import User


class RegisterView(generics.CreateAPIView):
    """
    Anyone can register as student or teacher.
    Admin role is blocked — use PromoteUserView instead.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    # Get or update the currently logged-in user's profile
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        serializer = UpdateUserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            # Prevent users from promoting themselves via this endpoint
            if 'role' in serializer.validated_data:
                return Response(
                    {"detail": "You cannot change your own role."},
                    status=status.HTTP_403_FORBIDDEN
                )
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    #Admin only — list all users, with optional role filter
    queryset = User.objects.all().order_by('date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    # Admin only — view, update, or delete any user
    queryset = User.objects.all()
    serializer_class = UpdateUserSerializer
    permission_classes = [IsAdmin]


class PromoteUserView(APIView):
    """Admin only — change any user's role (including promoting to admin)."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PromoteUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "detail": f"{user.username} is now a {user.role}.",
                "user": UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)