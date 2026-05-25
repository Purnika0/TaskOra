from django.urls import path
from . import views

urlpatterns = [
    # Student
    path('student/task-summary/', views.StudentTaskSummaryView.as_view(), name='student-task-summary'),
    path('student/weekly-progress/', views.StudentWeeklyProgressView.as_view(), name='student-weekly-progress'),
    path('student/course-workload/', views.StudentCourseWorkloadView.as_view(), name='student-course-workload'),

    # Teacher
    path('teacher/task-progress/', views.TeacherTaskProgressView.as_view(), name='teacher-task-progress'),
    path('teacher/course-overview/', views.TeacherCourseOverviewView.as_view(), name='teacher-course-overview'),
    path('teacher/student-ranking/', views.TeacherStudentRankingView.as_view(), name='teacher-student-ranking'),
]