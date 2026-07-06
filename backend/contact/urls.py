from django.urls import path
from . import views

urlpatterns = [
    path('',           views.ContactMessageCreateView.as_view(), name='contact-submit'),
    path('messages/',  views.ContactMessageListView.as_view(),   name='contact-messages'),
    path('messages/<int:pk>/', views.ContactMessageDetailView.as_view(), name='contact-message-detail'),
]