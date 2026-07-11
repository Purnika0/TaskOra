"""
Holiday dates (Nepali public holidays/festivals/etc.), stored in AD (the
Gregorian calendar) even though they're displayed in BS to users — see
bs_calendar.py for the conversion. Feeds into tasks/priority.py's urgency
scoring (holiday_bump) so upcoming holidays nudge task priority up.
"""
from django.db import models

class Holiday(models.Model):
    HOLIDAY_TYPES = (
        ('public', 'Public'),
        ('festival', 'Festival'),
        ('regional', 'Regional'),
        ('restricted', 'Restricted'),
    )

    title = models.CharField(max_length=255)
    date = models.DateField()
    holiday_type = models.CharField(max_length=20, choices=HOLIDAY_TYPES, default='public')
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.title} ({self.date})"