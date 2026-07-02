# """
# URL configuration for studyflow project.

# The `urlpatterns` list routes URLs to views. For more information please see:
#     https://docs.djangoproject.com/en/6.0/topics/http/urls/
# Examples:
# Function views
#     1. Add an import:  from my_app import views
#     2. Add a URL to urlpatterns:  path('', views.home, name='home')
# Class-based views
#     1. Add an import:  from other_app.views import Home
#     2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
# Including another URLconf
#     1. Import the include() function: from django.urls import include, path
#     2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
# """
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

admin.site.site_header = 'TaskOra Admin'
admin.site.site_title = 'TaskOra'
admin.site.index_title = 'Dashboard'

urlpatterns = [
    path('admin/', admin.site.urls),

    # API schema & docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Apps
    path('api/users/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/holidays/', include('holidays.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/ml/', include('ml.urls')),
    path('api/contact/', include('contact.urls')),
]

# from django.contrib import admin
# from django.urls import path, include
# from rest_framework.decorators import api_view
# from rest_framework.response import Response
# from rest_framework.reverse import reverse

# @api_view(['GET'])
# def api_root(request, format=None):
#     return Response({
#         'users': {
#             'register': reverse('register', request=request),
#             'login': reverse('login', request=request),
#             'me': reverse('me', request=request),
#             'list': reverse('user-list', request=request),
#         },
#         'courses': {
#             'list': reverse('course-list-create', request=request),
#             'join': reverse('join-course', request=request),
#             'my-courses': reverse('my-courses', request=request),
#         },
#         'tasks': {
#             'assignments': reverse('assignment-list-create', request=request),
#             'my-tasks': reverse('my-tasks', request=request),
#             'smart-priority': reverse('smart-priority', request=request),
#             'personal-tasks': reverse('personal-task-create', request=request),
#         },
#         'holidays': {
#             'list': reverse('holiday-list-create', request=request),
#             'today': reverse('today-bs', request=request),
#             'calendar': reverse('bs-calendar', request=request),
#         },
#         'analytics': {
#             'student-task-summary': reverse('student-task-summary', request=request),
#             'student-weekly-progress': reverse('student-weekly-progress', request=request),
#             'student-course-workload': reverse('student-course-workload', request=request),
#             'teacher-task-progress': reverse('teacher-task-progress', request=request),
#             'teacher-course-overview': reverse('teacher-course-overview', request=request),
#             'teacher-student-ranking': reverse('teacher-student-ranking', request=request),
#         },
#         'ml': {
#             'recommendations': reverse('ml-recommendations', request=request),
#             'student-groups': reverse('student-groups', request=request),
#             'outliers': reverse('outliers', request=request),
#         },
#     })

# admin.site.site_header = 'TaskOra Admin'
# admin.site.site_title = 'TaskOra'
# admin.site.index_title = 'Dashboard'

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/', api_root, name='api-root'),
#     path('api/users/', include('users.urls')),
#     path('api/courses/', include('courses.urls')),
#     path('api/tasks/', include('tasks.urls')),
#     path('api/holidays/', include('holidays.urls')),
#     path('api/analytics/', include('analytics.urls')),
#     path('api/ml/', include('ml.urls')),
# ]