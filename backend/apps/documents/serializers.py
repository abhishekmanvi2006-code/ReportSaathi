from rest_framework import serializers
from .models import MedicalDocument, ExtractedDocumentData, DocumentExplanation
from .validators import validate_and_sniff_file, sanitize_filename

class MedicalDocumentSerializer(serializers.ModelSerializer):
    """
    Serializes document metadata for patient dashboard.
    Note: Does not expose internal server storage file paths.
    """
    file_size_formatted = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    has_extraction = serializers.SerializerMethodField()
    has_explanation = serializers.SerializerMethodField()

    class Meta:
        model = MedicalDocument
        fields = (
            'id',
            'original_filename',
            'file_type',
            'file_size_bytes',
            'file_size_formatted',
            'document_category',
            'selected_language',
            'status',
            'download_url',
            'preview_url',
            'has_extraction',
            'has_explanation',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'file_type', 'file_size_bytes', 'status', 'created_at', 'updated_at')

    def get_file_size_formatted(self, obj):
        size = obj.file_size_bytes
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.2f} MB"

    def get_download_url(self, obj):
        return f"/api/documents/{obj.id}/download/"

    def get_preview_url(self, obj):
        return f"/api/documents/{obj.id}/preview/"

    def get_has_extraction(self, obj):
        return hasattr(obj, 'extracted_data') and obj.extracted_data is not None

    def get_has_explanation(self, obj):
        return hasattr(obj, 'explanation') and obj.explanation is not None


class ExtractedDocumentDataSerializer(serializers.ModelSerializer):
    """
    Serializes extracted clinical data, optical clarity score, and uncertainty flags.
    Confidence reflects optical text legibility, NEVER medical accuracy.
    """
    class Meta:
        model = ExtractedDocumentData
        fields = (
            'id',
            'document',
            'raw_text',
            'extraction_method',
            'structured_data',
            'page_count',
            'overall_extraction_confidence',
            'has_uncertainties',
            'is_scanned',
            'ocr_available',
            'extraction_warnings',
            'is_reviewed_by_patient',
            'reviewed_at',
            'is_verified_by_user',
            'verified_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id', 'document', 'extraction_method', 'page_count',
            'overall_extraction_confidence', 'is_scanned', 'ocr_available',
            'extraction_warnings', 'created_at', 'updated_at'
        )


class ExtractionItemCorrectionSerializer(serializers.Serializer):
    """
    Validates patient corrections on extracted items.
    Preserves original extracted value permanently while recording corrected value.
    """
    item_id = serializers.CharField(max_length=50, required=True)
    corrected_value = serializers.CharField(max_length=500, required=True, allow_blank=False)
    correction_field = serializers.ChoiceField(
        choices=[
            ('reported_value', 'Reported Value'),
            ('medicine_name', 'Medicine Name'),
            ('strength', 'Strength'),
            ('schedule', 'Schedule'),
            ('printed_reference_range', 'Reference Range'),
            ('unit', 'Unit')
        ],
        default='reported_value',
        required=False
    )


class DocumentUploadSerializer(serializers.Serializer):
    """
    Validates uploaded document files and metadata.
    Enforces magic byte verification and safe filename sanitization.
    """
    file = serializers.FileField(required=True)
    document_category = serializers.ChoiceField(
        choices=MedicalDocument.CATEGORY_CHOICES,
        default='LAB_REPORT',
        required=False
    )
    selected_language = serializers.ChoiceField(
        choices=[('en', 'English'), ('kn', 'Kannada'), ('hi', 'Hindi')],
        default='en',
        required=False
    )

    def validate_file(self, value):
        detected_type = validate_and_sniff_file(value)
        value.detected_type = detected_type
        value.clean_filename = sanitize_filename(value.name)
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        uploaded_file = validated_data['file']

        document = MedicalDocument.objects.create(
            user=user,
            file=uploaded_file,
            original_filename=uploaded_file.clean_filename,
            file_type=uploaded_file.detected_type,
            file_size_bytes=uploaded_file.size,
            document_category=validated_data.get('document_category', 'LAB_REPORT'),
            selected_language=validated_data.get('selected_language', 'en'),
            status='UPLOADED'
        )
        return document


class DocumentExplanationSerializer(serializers.ModelSerializer):
    """
    Serializes AI-generated plain-language medical document explanations.
    Guarantees:
    - Never exposes internal prompt engineering or server API keys.
    - Transparently presents structured explanations, summary, doctor questions, and safety disclaimers.
    """
    class Meta:
        model = DocumentExplanation
        fields = (
            'id',
            'document',
            'language',
            'patient_consent_given',
            'consent_timestamp',
            'consent_text_version',
            'ai_model',
            'summary',
            'structured_explanation',
            'doctor_questions',
            'safety_disclaimer',
            'processing_time_ms',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id', 'document', 'patient_consent_given', 'consent_timestamp',
            'consent_text_version', 'ai_model', 'processing_time_ms',
            'created_at', 'updated_at'
        )


class DocumentExplainRequestSerializer(serializers.Serializer):
    """
    Validates patient request to generate AI explanations.
    Enforces MANDATORY informed consent confirmation before Gemini is ever invoked.
    """
    consent_given = serializers.BooleanField(required=True)
    language = serializers.ChoiceField(
        choices=[('en', 'English'), ('kn', 'Kannada'), ('hi', 'Hindi')],
        required=False,
        default='en'
    )

    def validate_consent_given(self, value):
        if not value:
            raise serializers.ValidationError(
                "Explicit patient consent is required before document details can be processed by Google Gemini."
            )
        return value
