from django.urls import path
from . import views

urlpatterns = [
    # Teacher
    path('assignments/', views.AssignmentListCreateView.as_view(), name='assignment-list-create'),
    path('assignments/<int:pk>/', views.AssignmentDetailView.as_view(), name='assignment-detail'),

    # Student — all tasks (assigned + personal)
    path('my/', views.StudentTaskListView.as_view(), name='my-tasks'),
    path('my/smart-priority/', views.SmartPriorityTaskView.as_view(), name='smart-priority'),
    path('my/<int:pk>/complete/', views.TaskUpdateView.as_view(), name='task-update'),

    # Student — personal tasks only
    path('my/personal/', views.PersonalTaskCreateView.as_view(), name='personal-task-create'),
    path('my/personal/<int:pk>/', views.PersonalTaskDetailView.as_view(), name='personal-task-detail'),

    # Subtasks
    path('my/<int:task_pk>/subtasks/', views.SubTaskListCreateView.as_view(), name='subtask-list-create'),
    path('my/<int:task_pk>/subtasks/<int:pk>/', views.SubTaskDetailView.as_view(), name='subtask-detail'),
]