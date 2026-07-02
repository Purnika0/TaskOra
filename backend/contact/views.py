from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import ContactMessage
from .serializers import ContactMessageSerializer
from users.permissions import IsAdmin


class ContactMessageCreateView(generics.CreateAPIView):
    """
    Public endpoint — anyone can submit a contact message.
    No authentication required.
    POST /api/contact/
    """
    serializer_class   = ContactMessageSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "detail": "Thank you for reaching out! We will get back to you within 24 hours.",
                    "data": serializer.data,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactMessageListView(generics.ListAPIView):
    """
    Admin only — view all submitted contact messages.
    GET /api/contact/messages/
    """
    serializer_class   = ContactMessageSerializer
    permission_classes = [IsAdmin]
    queryset           = ContactMessage.objects.all()