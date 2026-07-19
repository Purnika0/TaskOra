"""
Signed, short-lived download tokens for Assignment.file and Task.submission_file.

Previously these fields serialized to a bare /media/... URL (see
taskora/urls.py) — anyone who had or guessed that URL could download the
file directly, with no check that they were the assignment's teacher, an
enrolled student, or the task's own student. Serializers now build a
download URL through AssignmentFileDownloadView / TaskSubmissionFileDownloadView
(tasks/views.py) instead, carrying one of these tokens.

The token only says "this link was issued to user X for object Y" — it is
NOT a substitute for a permission check. The download view still re-checks
that user's actual permission against the object every time the link is
used (enrollment/ownership can change between when a link is issued and
when it's clicked), the same way every other endpoint in this app does.
Keeping the expiry short limits how long a leaked/forwarded link works.
"""
from django.core import signing
from django.core.signing import BadSignature, SignatureExpired

SIGNER_SALT = 'tasks.file_download'
MAX_AGE_SECONDS = 10 * 60  # 10 minutes — enough to click through, short enough to limit exposure if a link is copied/shared


def make_download_token(kind, pk, user_id):
    """kind is 'assignment' or 'submission'; pk is the Assignment/Task id."""
    return signing.dumps({'kind': kind, 'pk': pk, 'user_id': user_id}, salt=SIGNER_SALT)


def read_download_token(token):
    """Returns the payload dict, or None if the token is missing/invalid/expired."""
    if not token:
        return None
    try:
        return signing.loads(token, salt=SIGNER_SALT, max_age=MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None
