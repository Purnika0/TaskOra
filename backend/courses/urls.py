from django.urls import path
from . import views

urlpatterns = [
    path('', views.CourseListCreateView.as_view(), name='course-list-create'),
    path('<int:pk>/', views.CourseDetailView.as_view(), name='course-detail'),
    path('join/', views.JoinCourseView.as_view(), name='join-course'),
    path('my/', views.MyCoursesView.as_view(), name='my-courses'),
    path('<int:pk>/students/', views.CourseStudentsView.as_view(), name='course-students'),
]