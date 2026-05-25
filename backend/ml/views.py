from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from users.permissions import IsStudent, IsTeacher
from tasks.models import Task
from .recommendations import get_task_recommendations
from .clustering import cluster_students, detect_outliers


class RecommendationsView(APIView):
    """
    Student — get task type recommendations
    based on similar students (Collaborative Filtering).
    """
    permission_classes = [IsStudent]

    def get(self, request):
        recommendations = get_task_recommendations(request.user)
        return Response({
            "student": request.user.username,
            "recommendations": recommendations,
            "total": len(recommendations)
        })


class StudentGroupsView(APIView):
    """
    Teacher — see students grouped by performance
    using K-Means Clustering.
    """
    permission_classes = [IsTeacher]

    def get(self, request):
        result = cluster_students()
        return Response(result)


class OutliersView(APIView):
    """
    Teacher — see students flagged as outliers
    using Isolation Forest + Z-Score.
    """
    permission_classes = [IsTeacher]

    def get(self, request):
        result = detect_outliers()
        return Response(result)

