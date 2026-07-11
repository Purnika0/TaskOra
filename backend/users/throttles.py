"""
Per-email (not per-IP) rate limits for OTP endpoints, since the attack this
guards against is someone brute-forcing/spamming a specific account rather
than one IP hitting the API too often. Actual rates (5/hour for requests,
10/hour for verify attempts) are configured in taskora/settings.py under
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
"""
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