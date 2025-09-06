from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """Chỉ cho phép user có role = admin"""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'role', 'user') == 'admin')

class IsUser(permissions.BasePermission):
    """Chỉ cho phép user có role = user (không phải admin)"""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'role', 'user') == 'user')