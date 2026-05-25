from django.urls import path
from . import views

urlpatterns = [
    path('', views.HolidayListCreateView.as_view(), name='holiday-list-create'),
    path('<int:pk>/', views.HolidayDetailView.as_view(), name='holiday-detail'),
    path('create-bs/', views.HolidayCreateBSView.as_view(), name='holiday-create-bs'),
    path('today/', views.TodayBSView.as_view(), name='today-bs'),
    path('calendar/', views.BSMonthCalendarView.as_view(), name='bs-calendar'),
]