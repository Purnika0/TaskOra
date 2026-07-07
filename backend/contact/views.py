from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import ContactMessage
from .serializers import ContactMessageSerializer, ContactMessageStatusUpdateSerializer
from .utils import send_contact_notification_email
from users.permissions import IsAdmin
from notifications.services import notify_admins_contact_message


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
            contact_message = serializer.save()
            send_contact_notification_email(contact_message)
            notify_admins_contact_message(contact_message)
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


class ContactMessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin only — view, update status of, or delete a single contact message.
    GET    /api/contact/messages/<id>/   → full message detail
    PATCH  /api/contact/messages/<id>/   → update status (READ / RESOLVED)
    DELETE /api/contact/messages/<id>/   → delete the message
    """
    permission_classes = [IsAdmin]
    queryset           = ContactMessage.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return ContactMessageStatusUpdateSerializer
        return ContactMessageSerializer