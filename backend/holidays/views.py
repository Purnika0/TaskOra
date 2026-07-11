"""
Holiday CRUD (admin-only writes, any authenticated user can read) plus
BS-calendar-specific endpoints: creating a holiday by BS date, today's
date in both calendars, and a full BS month view with holidays marked.
"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Holiday
from .serializers import HolidaySerializer
from users.permissions import IsAdmin
from .bs_calendar import bs_to_ad, today_bs

class HolidayListCreateView(generics.ListCreateAPIView):
    """
    GET  — Any authenticated user can view holidays.
    POST — Admin only.
    """
    serializer_class = HolidaySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        queryset = Holiday.objects.all().order_by('date')

        # Filter by holiday type — ?type=public / festival / regional
        holiday_type = self.request.query_params.get('type')
        if holiday_type:
            queryset = queryset.filter(holiday_type=holiday_type)

        # Filter by month — ?month=10
        month = self.request.query_params.get('month')
        if month:
            queryset = queryset.filter(date__month=month)

        # Filter by year — ?year=2025
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(date__year=year)

        return queryset


class HolidayDetailView(generics.RetrieveUpdateDestroyAPIView):
    # Admin only — edit or delete a holiday
    serializer_class = HolidaySerializer
    queryset = Holiday.objects.all()
    permission_classes = [IsAdmin]


class HolidayCreateBSView(APIView):
    # Admin creates a holiday using a BS date instead of AD
    permission_classes = [IsAdmin]

    def post(self, request):
        try:
            year = int(request.data['year_bs'])
            month = int(request.data['month_bs'])
            day = int(request.data['day_bs'])
            title = request.data['title']
            description = request.data.get('description', '')
            holiday_type = request.data.get('holiday_type', 'public')
        except (KeyError, ValueError):
            return Response(
                {"detail": "Provide year_bs, month_bs, day_bs, title and holiday_type."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate holiday_type
        valid_types = [t[0] for t in Holiday.HOLIDAY_TYPES]
        if holiday_type not in valid_types:
            return Response(
                {"detail": f"Invalid holiday_type. Choose from: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            ad_date = bs_to_ad(year, month, day)
        except Exception:
            return Response(
                {"detail": "Invalid BS date."},
                status=status.HTTP_400_BAD_REQUEST
            )

        holiday = Holiday.objects.create(
            title=title,
            date=ad_date,
            description=description,
            holiday_type=holiday_type
        )
        return Response(HolidaySerializer(holiday).data, status=status.HTTP_201_CREATED)


class TodayBSView(APIView):
    # Returns today's date in both AD and BS
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        today_ad = timezone.localdate()
        return Response({
            "today_ad": str(today_ad),
            "today_bs": today_bs()
        })


class BSMonthCalendarView(APIView):
    """
    Returns all days in a given BS month with holidays marked.
    Query params: ?year=2081&month=3
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            year = int(request.query_params['year'])
            month = int(request.query_params['month'])
        except (KeyError, ValueError):
            return Response(
                {"detail": "Provide year and month as query params."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # BS months don't have a fixed length (unlike AD months), so instead
        # of hardcoding day counts we just keep converting day 1, 2, 3...
        # to AD until bs_to_ad() raises (day out of range for that month),
        # which tells us exactly where the month ends.
        days = []
        day = 1
        while True:
            try:
                ad = bs_to_ad(year, month, day)
            except Exception:
                break
            holiday = Holiday.objects.filter(date=ad).first()
            days.append({
                "day_bs": day,
                "date_ad": str(ad),
                "is_holiday": holiday is not None,
                "holiday_id": holiday.id if holiday else None,
                "holiday_title": holiday.title if holiday else None,
                "holiday_type": holiday.holiday_type if holiday else None,
            })
            day += 1

        return Response({
            "year_bs": year,
            "month_bs": month,
            "days": days
        })