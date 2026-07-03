import smtplib
import socket

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.core.mail.backends.smtp import EmailBackend as DjangoSMTPBackend
from django.db.models import Q

User = get_user_model()


class UsernameOrEmailBackend(ModelBackend):
    """
    Allows authentication using either username or email.
    Falls back to the default ModelBackend behavior otherwise.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        if username is None or password is None:
            return None

        try:
            user = User.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except User.DoesNotExist:
            # Run the default password hasher to mitigate timing attacks
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # Edge case: username matches one user's email and another's username
            user = User.objects.filter(username__iexact=username).first()
            if user is None:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None


# Forces IPv4-only SMTP connections. Some networks/routers advertise
# IPv6 support without a working IPv6 route to the internet, causing
# smtplib's default connection attempt (which may try IPv6 first) to
# fail with ConnectionRefusedError even though IPv4 works fine.
class IPv4SMTP(smtplib.SMTP):
    """SMTP client that forces IPv4 connections, avoiding broken IPv6 routes."""

    def _get_socket(self, host, port, timeout):
        addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        sock = socket.socket(addr_info[0][0], addr_info[0][1], addr_info[0][2])
        if timeout is not None and timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
            sock.settimeout(timeout)
        sock.connect(addr_info[0][4])
        return sock


class IPv4EmailBackend(DjangoSMTPBackend):
    """Django email backend that uses IPv4-only SMTP connections."""
    connection_class = IPv4SMTP