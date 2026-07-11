"""Holiday serializer — adds the BS-calendar equivalent alongside the stored AD date."""
from rest_framework import serializers
from .models import Holiday
from .bs_calendar import ad_to_bs


class HolidaySerializer(serializers.ModelSerializer):
    date_bs = serializers.SerializerMethodField()
    class Meta:
        model = Holiday
        fields = ['id', 'title', 'description', 'date', 'date_bs', 'holiday_type']
        read_only_fields = ['id']

    def get_date_bs(self, obj):
        return ad_to_bs(obj.date)