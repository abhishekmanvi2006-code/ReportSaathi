import uuid
import os
from django.db import models
from django.contrib.auth.models import User
from .storage import private_storage

def user_document_upload_path(instance, filename):
    """
    Constructs isolated file path: media_private/user_<id>/<uuid>_<clean_filename>
    Ensures no collision and strict organization per patient.
    """
    clean_name = os.path.basename(filename)
    return f"user_{instance.user.id}/{instance.id}_{clean_name}"

class MedicalDocument(models.Model):
    """
    Stores metadata for patient medical documents.
    Physical files reside strictly within private storage and are guarded by user ownership.
    """
    CATEGORY_CHOICES = [
        ('LAB_REPORT', 'Laboratory Report'),
        ('PRESCRIPTION', 'Prescription'),
        ('DISCHARGE_SUMMARY', 'Discharge Summary'),
        ('OTHER', 'Other Medical Document'),
    ]

    STATUS_CHOICES = [
        ('UPLOADED', 'Uploaded'),
        ('EXTRACTED', 'Text Extracted'),
        ('REVIEWED', 'Patient Reviewed Extraction'),
        ('EXPLAINED', 'Explanation Ready'),
        ('FAILED', 'Processing Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(storage=private_storage, upload_to=user_document_upload_path)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    file_size_bytes = models.PositiveIntegerField()
    document_category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='LAB_REPORT'
    )
    selected_language = models.CharField(max_length=5, default='en')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPLOADED')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def delete(self, *args, **kwargs):
        """Cleanly removes physical file from private disk storage when model is deleted."""
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.original_filename} ({self.document_category}) - {self.user.username}"


class ExtractedDocumentData(models.Model):
    """
    Stores structured extraction results for a MedicalDocument.
    One-to-one with MedicalDocument. Additive — never destructive.

    IMPORTANT: extraction_confidence reflects optical text clarity ONLY.
    It is NOT a measure of medical or clinical accuracy.
    Missing reference ranges are stored as the literal string "NOT_SPECIFIED".
    Original extracted values are preserved permanently even after user corrections.
    """
    EXTRACTION_METHOD_CHOICES = [
        ('PYMUPDF_DIGITAL', 'PyMuPDF Digital'),
        ('TESSERACT_OCR', 'Tesseract OCR'),
        ('VISION_FALLBACK', 'Gemini Vision (Consented)'),
        ('NONE', 'No extraction possible'),
    ]

    document = models.OneToOneField(
        MedicalDocument,
        on_delete=models.CASCADE,
        related_name='extracted_data'
    )
    raw_text = models.TextField(blank=True, default='')
    extraction_method = models.CharField(
        max_length=20,
        choices=EXTRACTION_METHOD_CHOICES,
        default='NONE'
    )
    # structured_data shape: {"document_type": str, "items": [...], "has_uncertainties": bool}
    # Each item preserves original_value and corrected_value separately.
    structured_data = models.JSONField(default=dict)
    page_count = models.PositiveIntegerField(default=1)
    # Optical text clarity score only, 0.0–1.0. NEVER medical accuracy.
    overall_extraction_confidence = models.FloatField(default=0.0)
    has_uncertainties = models.BooleanField(default=False)
    is_scanned = models.BooleanField(default=False)
    ocr_available = models.BooleanField(default=False)
    extraction_warnings = models.JSONField(default=list)
    # Patient reviewed extraction status (accurately reflects patient review of OCR/text, NOT clinical/medical verification)
    is_reviewed_by_patient = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    is_verified_by_user = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Extraction({self.extraction_method}) for {self.document.original_filename}"


class DocumentExplanation(models.Model):
    """
    Stores AI-generated plain-language educational explanations for a MedicalDocument.
    One-to-one with MedicalDocument. Additive and non-destructive.
    Enforces that patient consent was explicitly recorded before generation,
    preserves patient language choice, and stores structured explanation output.

    IMPORTANT SAFETY GUARANTEE:
    This model stores educational explanations only. It NEVER diagnoses diseases,
    recommends treatments, or modifies Stage 4 extracted/corrected data.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.OneToOneField(
        MedicalDocument,
        on_delete=models.CASCADE,
        related_name='explanation'
    )
    # Target explanation language ('en', 'kn', 'hi')
    language = models.CharField(max_length=10, default='en')

    # Patient Consent tracking (MANDATORY before Gemini call)
    patient_consent_given = models.BooleanField(default=False)
    consent_timestamp = models.DateTimeField(null=True, blank=True)
    consent_text_version = models.CharField(max_length=50, default='v1.0')

    # Gemini model tracking
    ai_model = models.CharField(max_length=50, default='gemini-2.5-flash')

    # Executive plain-language summary
    summary = models.TextField(blank=True, default='')

    # Structured explanation data containing itemized findings:
    # [{"item_name": str, "reported_value": str, "is_patient_corrected": bool,
    #   "original_value": str, "printed_reference_range": str, "range_status": str,
    #   "plain_explanation": str, "is_uncertain": bool, "uncertainty_note": str}]
    structured_explanation = models.JSONField(default=dict)

    # Tailored doctor-patient consultation questions
    doctor_questions = models.JSONField(default=list)

    # Mandatory medical safety disclaimer text
    safety_disclaimer = models.TextField(
        default="ReportSaathi provides educational document explanations only. It does NOT diagnose diseases, prescribe medicines, or replace professional medical advice. Always consult a qualified healthcare professional for medical decisions."
    )

    # Performance metric
    processing_time_ms = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Explanation ({self.language}) for {self.document.original_filename}"
