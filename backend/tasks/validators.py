"""
Shared upload-validation for Assignment.file and Task.submission_file.

Previously these were plain FileField() columns with no server-side
restriction at all — the only check anywhere was the frontend file picker's
`accept` attribute and a client-side size check, both of which are trivially
bypassed by calling the API directly. These validators are attached to the
model fields (tasks/models.py) so they're enforced no matter how the file
gets in (API, admin, shell, a future integration).

Extensions and the size cap here are the single source of truth and are
kept in sync with the frontend's existing checks:
  - Assignment.file:      .pdf/.doc/.docx, 20 MB  (AssignmentManagement.jsx, TeacherDashboard.jsx)
  - Task.submission_file: .pdf/.doc/.docx/.jpg/.jpeg/.png, 20 MB (AssignmentManagement.jsx, StudentDashboard.jsx)
If either side's allowed types or size cap changes, update both.
"""
from django.core.exceptions import ValidationError

MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB — matches the frontend's client-side check

ASSIGNMENT_FILE_EXTENSIONS = ['pdf', 'doc', 'docx']
SUBMISSION_FILE_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']


def validate_upload_size(file):
    """Rejects any upload over MAX_UPLOAD_SIZE_BYTES, regardless of file type."""
    if file.size > MAX_UPLOAD_SIZE_BYTES:
        raise ValidationError(
            f"File must be under {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB "
            f"(got {file.size / (1024 * 1024):.1f} MB)."
        )
