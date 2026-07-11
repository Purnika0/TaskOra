"""
Simple role-gate permission classes, used in views' permission_classes to
restrict endpoints by User.role. Each checks authentication first since
role would otherwise be meaningless for an anonymous request.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'teacher'


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsAdminOrTeacher(BasePermission):
    """Used on endpoints both roles can access, e.g. course creation."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'teacher']