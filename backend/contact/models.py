"""A message submitted through the public Contact page — visible to admins only (see views.py)."""
from django.db import models


class ContactMessage(models.Model):
    STATUS_NEW      = 'NEW'
    STATUS_READ     = 'READ'
    STATUS_RESOLVED = 'RESOLVED'
    STATUS_CHOICES = [
        (STATUS_NEW,      'New'),
        (STATUS_READ,     'Read'),
        (STATUS_RESOLVED, 'Resolved'),
    ]

    full_name  = models.CharField(max_length=255)
    email      = models.EmailField()
    subject    = models.CharField(max_length=255, blank=True)
    message    = models.TextField()
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_NEW)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.full_name} ({self.email}) — {self.submitted_at.strftime('%Y-%m-%d %H:%M')}"