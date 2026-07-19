"""
Root URL configuration for TaskOra.

Each Django app owns its own urls.py (included below under an /api/<app>/
prefix); this file just wires them together plus the admin site and the
auto-generated OpenAPI schema/docs (drf-spectacular).
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from django.conf import settings
from django.conf.urls.static import static

admin.site.site_header = 'TaskOra Admin'
admin.site.site_title = 'TaskOra'
admin.site.index_title = 'Dashboard'

urlpatterns = [
    path('admin/', admin.site.urls),

    # API schema & docs — Swagger UI lives at /api/, raw schema at /api/schema/
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Apps — each app's own urls.py defines the routes under this prefix
    path('api/users/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/holidays/', include('holidays.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/ml/', include('ml.urls')),
    path('api/contact/', include('contact.urls')),
    path('api/notifications/', include('notifications.urls')),
]


# Serve uploaded media files directly in development (DEBUG only) — this is
# now only a convenience for Django admin (which links to FileField values
# via raw /media/ URLs in its own UI) and local file inspection. It carries
# no access control of its own, but the app's actual API responses no
# longer hand out raw /media/ URLs for Assignment.file or
# Task.submission_file — see AssignmentSerializer.get_file /
# TaskSerializer.get_submission_file and tasks/file_access.py, which issue
# short-lived signed download links instead, checked against the
# requesting user's real permissions on every download. In production this
# route should still be handled by the web server / a storage service, not
# Django's DEBUG static() helper.
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )