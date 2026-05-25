from django.contrib import admin
from .models import Holiday
from .bs_calendar import ad_to_bs


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['title', 'date', 'date_in_bs', 'description']
    search_fields = ['title']
    ordering = ['date']

    def date_in_bs(self, obj):
        bs = ad_to_bs(obj.date)
        return bs['str'] if bs else '—'
    date_in_bs.short_description = 'Date (BS)'