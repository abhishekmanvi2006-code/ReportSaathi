from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from .serializers import UserRegistrationSerializer, UserProfileSerializer

def set_refresh_token_cookie(response, refresh_token):
    """
    Sets secure HttpOnly cookie for JWT refresh token.
    Prevents JavaScript/XSS access to long-lived tokens.
    """
    cookie_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        key='reportsaathi_refresh',
        value=str(refresh_token),
        max_age=cookie_max_age,
        httponly=True,
        secure=not settings.DEBUG,  # Secure=True in production HTTPS
        samesite='Lax',
        path='/api/auth/',
    )

def clear_refresh_token_cookie(response):
    """Clears the HttpOnly refresh token cookie on logout."""
    response.delete_cookie(
        key='reportsaathi_refresh',
        path='/api/auth/',
        samesite='Lax',
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            access = refresh.access_token

            profile_data = UserProfileSerializer(user).data
            response = Response({
                "message": "Registration successful",
                "access": str(access),
                "user": profile_data
            }, status=status.HTTP_201_CREATED)

            set_refresh_token_cookie(response, refresh)
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username_or_email = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username_or_email or not password:
            return Response(
                {"detail": "Both username/email and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Allow user to log in with either username or email
        user = None
        if '@' in username_or_email:
            try:
                user_obj = User.objects.get(email__iexact=username_or_email)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
        else:
            user = authenticate(request, username=username_or_email, password=password)

        if user is None or not user.is_active:
            return Response(
                {"detail": "Invalid credentials or inactive account."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        profile_data = UserProfileSerializer(user).data

        response = Response({
            "message": "Login successful",
            "access": str(access),
            "user": profile_data
        }, status=status.HTTP_200_OK)

        set_refresh_token_cookie(response, refresh)
        return response


class CookieTokenRefreshView(APIView):
    """
    Refreshes access token reading refresh token from HttpOnly cookie (or body fallback).
    Enforces refresh token rotation.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token_str = request.COOKIES.get('reportsaathi_refresh') or request.data.get('refresh')

        if not refresh_token_str:
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            old_refresh = RefreshToken(refresh_token_str)
            # Blacklist old refresh token and rotate to new one
            user_id = old_refresh.payload.get('user_id')
            user = User.objects.get(id=user_id)

            old_refresh.blacklist()

            new_refresh = RefreshToken.for_user(user)
            new_access = new_refresh.access_token

            response = Response({
                "access": str(new_access)
            }, status=status.HTTP_200_OK)

            set_refresh_token_cookie(response, new_refresh)
            return response
        except (TokenError, User.DoesNotExist) as e:
            response = Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED
            )
            clear_refresh_token_cookie(response)
            return response


class LogoutView(APIView):
    """
    Logs out user by blacklisting refresh token and clearing cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token_str = request.COOKIES.get('reportsaathi_refresh') or request.data.get('refresh')

        if refresh_token_str:
            try:
                token = RefreshToken(refresh_token_str)
                token.blacklist()
            except TokenError:
                pass  # Token was already expired or blacklisted

        response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        clear_refresh_token_cookie(response)
        return response


class UserProfileView(APIView):
    """
    Fetches and updates active user profile and language preferences.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        new_lang = request.data.get('preferred_language')
        if new_lang:
            if new_lang not in dict(profile.LANGUAGE_CHOICES):
                return Response(
                    {"preferred_language": "Invalid language selection."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            profile.preferred_language = new_lang
            profile.save(update_fields=['preferred_language', 'updated_at'])

        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        if first_name is not None:
            request.user.first_name = first_name
        if last_name is not None:
            request.user.last_name = last_name
        request.user.save(update_fields=['first_name', 'last_name'])

        return Response(UserProfileSerializer(request.user).data)
