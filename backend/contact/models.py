from django.db import models


class ContactMessage(models.Model):
    full_name  = models.CharField(max_length=255)
    email      = models.EmailField()
    subject    = models.CharField(max_length=255, blank=True)
    message    = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.full_name} ({self.email}) — {self.submitted_at.strftime('%Y-%m-%d %H:%M')}"