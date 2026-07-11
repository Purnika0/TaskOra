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


# Serve uploaded media files (e.g. submitted assignment files) in development.
# In production this should be handled by the web server / a storage service
# instead, so it's gated behind DEBUG.
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )