from rest_framework.throttling import SimpleRateThrottle


class OTPRequestThrottle(SimpleRateThrottle):
    """Limits how often a given email can request an OTP (send/resend)."""
    scope = 'otp_request'

    def get_cache_key(self, request, view):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': email}


class OTPVerifyThrottle(SimpleRateThrottle):
    """Limits how many times a given email can attempt OTP verification."""
    scope = 'otp_verify'

    def get_cache_key(self, request, view):
        email = request.data.get('email', '').lower().strip()
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': email}