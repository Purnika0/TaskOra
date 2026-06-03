from django.urls import path
from . import views

urlpatterns = [
    # Teacher
    path('assignments/', views.AssignmentListCreateView.as_view(), name='assignment-list-create'),
    path('assignments/<int:pk>/', views.AssignmentDetailView.as_view(), name='assignment-detail'),

    # Student — all tasks (assigned + personal)
    path('my/', views.StudentTaskListView.as_view(), name='my-tasks'),
    path('my/smart-priority/', views.SmartPriorityTaskView.as_view(), name='smart-priority'),

    path('<int:pk>/submit/', views.StudentSubmitTaskView.as_view(),         name='task-submit'),
    path('<int:pk>/review/', views.TeacherReviewTaskView.as_view(),         name='task-review'),
    path('assignment/<int:assignment_pk>/submissions/', views.TeacherAssignmentTaskListView.as_view(), name='assignment-submissions'),
    path('mark-overdue/', views.MarkOverdueTasksView.as_view(),          name='mark-overdue'),
]