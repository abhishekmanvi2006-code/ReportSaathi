from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from .models import PatientProfile

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Handles secure patient registration.
    Enforces password validation, unique email, and explicit medical disclaimer acceptance.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    preferred_language = serializers.ChoiceField(
        choices=PatientProfile.LANGUAGE_CHOICES,
        default='en',
        required=False
    )
    disclaimer_accepted = serializers.BooleanField(required=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'password_confirm', 'preferred_language', 'disclaimer_accepted')
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("An email address is required.")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        if not attrs.get('disclaimer_accepted', False):
            raise serializers.ValidationError({
                "disclaimer_accepted": "You must review and accept the medical safety disclaimer to use ReportSaathi."
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        preferred_language = validated_data.pop('preferred_language', 'en')
        disclaimer_accepted = validated_data.pop('disclaimer_accepted')

        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )

            PatientProfile.objects.create(
                user=user,
                preferred_language=preferred_language,
                disclaimer_accepted=disclaimer_accepted,
                disclaimer_accepted_at=timezone.now() if disclaimer_accepted else None
            )

        return user


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ('preferred_language', 'disclaimer_accepted', 'disclaimer_accepted_at', 'created_at')


class UserProfileSerializer(serializers.ModelSerializer):
    profile = PatientProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile')
        read_only_fields = ('id', 'username', 'email')
