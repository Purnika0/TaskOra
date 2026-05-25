from django.urls import path
from . import views

urlpatterns = [
    # Student endpoints
    path('recommendations/', views.RecommendationsView.as_view(), name='ml-recommendations'),

    # Teacher endpoints
    path('analytics/teacher/student-groups/', views.StudentGroupsView.as_view(), name='student-groups'),
    path('analytics/teacher/outliers/', views.OutliersView.as_view(), name='outliers'),
]