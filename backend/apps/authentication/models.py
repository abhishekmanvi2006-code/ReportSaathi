from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class PatientProfile(models.Model):
    """
    Extends standard Django User model to hold healthcare and multilingual preferences.
    Explicitly tracks medical disclaimer consent without modifying auth_user schema.
    """
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('kn', 'Kannada'),
        ('hi', 'Hindi'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    preferred_language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='en',
        help_text="User's preferred language for application UI and AI explanations."
    )
    disclaimer_accepted = models.BooleanField(
        default=False,
        help_text="Records whether user explicitly accepted the non-diagnostic educational medical disclaimer."
    )
    disclaimer_accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the user accepted the educational medical disclaimer."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def record_disclaimer_acceptance(self):
        """Method to safely record disclaimer acceptance timestamp."""
        self.disclaimer_accepted = True
        self.disclaimer_accepted_at = timezone.now()
        self.save(update_fields=['disclaimer_accepted', 'disclaimer_accepted_at', 'updated_at'])

    def __str__(self):
        return f"PatientProfile for {self.user.username} ({self.preferred_language})"
