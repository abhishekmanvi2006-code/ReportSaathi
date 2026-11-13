"""
URL configuration for ReportSaathi project.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify backend status and configuration.
    """
    return Response({
        "status": "healthy",
        "service": "ReportSaathi Backend API",
        "version": "1.0.0",
        "environment": "development",
        "database": "sqlite",
        "supported_languages": ["en", "kn", "hi"],
        "medical_disclaimer": "ReportSaathi provides educational explanations of medical documents. It does not diagnose diseases, prescribe medicines or replace professional medical advice."
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/documents/', include('apps.documents.urls')),
]
