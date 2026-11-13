import os
import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from .models import MedicalDocument, ExtractedDocumentData, DocumentExplanation
from .serializers import (
    MedicalDocumentSerializer,
    DocumentUploadSerializer,
    ExtractedDocumentDataSerializer,
    ExtractionItemCorrectionSerializer,
    DocumentExplanationSerializer,
    DocumentExplainRequestSerializer,
)
from .permissions import IsDocumentOwner
from .services.extractor import extract_text_from_document
from .services.parser import structure_document_data
from .services.explainer import generate_document_explanation

logger = logging.getLogger(__name__)

class DocumentListCreateView(APIView):
    """
    GET: List all medical documents for the authenticated user.
    POST: Upload a new document with magic-byte validation and private storage.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        documents = MedicalDocument.objects.filter(user=request.user)
        category = request.query_params.get('category')
        if category:
            documents = documents.filter(document_category=category)

        serializer = MedicalDocumentSerializer(documents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            document = serializer.save()
            return Response(
                MedicalDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentDetailView(APIView):
    """
    GET: Retrieve specific document metadata.
    DELETE: Delete document record and purge physical file from private disk.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def get_object(self, pk, user):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(self.request, document)
        return document

    def get(self, request, pk):
        document = self.get_object(pk, request.user)
        serializer = MedicalDocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        document = self.get_object(pk, request.user)
        document.delete()
        return Response(
            {"message": "Medical document deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )


class DocumentDownloadStreamView(APIView):
    """
    Secure file streaming endpoint.
    Strictly verifies ownership before streaming document bytes.
    Blocks public URLs or unauthorized access.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def get(self, request, pk):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(request, document)

        if not document.file or not document.file.storage.exists(document.file.name):
            raise Http404("Document file not found on disk.")

        file_obj = document.file.open('rb')

        # Determine MIME type
        content_type_map = {
            'PDF': 'application/pdf',
            'JPEG': 'image/jpeg',
            'PNG': 'image/png',
        }
        content_type = content_type_map.get(document.file_type, 'application/octet-stream')

        response = FileResponse(file_obj, content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{document.original_filename}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class DocumentPreviewView(APIView):
    """
    Secure document preview stream endpoint.
    Verifies user ownership before streaming PDF or image for authenticated in-browser view.
    Never exposes public URLs.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def get(self, request, pk):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(request, document)

        if not document.file or not document.file.storage.exists(document.file.name):
            raise Http404("Document file not found on disk.")

        file_obj = document.file.open('rb')

        content_type_map = {
            'PDF': 'application/pdf',
            'JPEG': 'image/jpeg',
            'PNG': 'image/png',
        }
        content_type = content_type_map.get(document.file_type, 'application/octet-stream')

        response = FileResponse(file_obj, content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{document.original_filename}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class DocumentExtractView(APIView):
    """
    POST: Triggers local digital text extraction using PyMuPDF and clinical structuring.
    Enforces user ownership, graceful degradation if OCR is unavailable,
    and safeguards against malformed files or oversized documents.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def post(self, request, pk):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(request, document)

        if not document.file or not document.file.storage.exists(document.file.name):
            return Response(
                {"error": "Document file does not exist on disk."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            extraction_result = extract_text_from_document(
                document.file.path,
                document.file_type
            )
        except ValueError as ve:
            document.status = 'FAILED'
            document.save(update_fields=['status', 'updated_at'])
            return Response(
                {"error": str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error("Extraction error encountered for document id: %s", str(document.id))
            document.status = 'FAILED'
            document.save(update_fields=['status', 'updated_at'])
            return Response(
                {"error": "Failed to process document text safely."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        structured_data = structure_document_data(
            extraction_result.get('raw_text', ''),
            document.document_category
        )

        extracted_obj, _ = ExtractedDocumentData.objects.update_or_create(
            document=document,
            defaults={
                'raw_text': extraction_result.get('raw_text', ''),
                'extraction_method': extraction_result.get('method', 'NONE'),
                'page_count': extraction_result.get('page_count', 1),
                'overall_extraction_confidence': extraction_result.get('extraction_confidence', 0.0),
                'has_uncertainties': structured_data.get('has_uncertainties', False),
                'is_scanned': extraction_result.get('is_scanned', False),
                'ocr_available': extraction_result.get('ocr_available', False),
                'extraction_warnings': extraction_result.get('warnings', []),
                'structured_data': structured_data,
            }
        )

        # Update document status to EXTRACTED if currently UPLOADED
        if document.status == 'UPLOADED':
            document.status = 'EXTRACTED'
            document.save(update_fields=['status', 'updated_at'])

        serializer = ExtractedDocumentDataSerializer(extracted_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentExtractionDetailView(APIView):
    """
    GET: Retrieves structured extraction results and optical confidence scores.
    Guarded by ownership check.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def get(self, request, pk):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(request, document)

        if not hasattr(document, 'extracted_data') or document.extracted_data is None:
            return Response(
                {"error": "No extraction data found for this document. Please trigger extraction first."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ExtractedDocumentDataSerializer(document.extracted_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentVerifyItemView(APIView):
    """
    PATCH: Allows patient to review extracted text, apply corrections, and confirm review.
    - Permanently preserves original extracted values alongside user corrections.
    - Accurately tracks 'Patient reviewed extraction' status without implying clinical validation.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def patch(self, request, pk):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(request, document)

        if not hasattr(document, 'extracted_data') or document.extracted_data is None:
            return Response(
                {"error": "No extracted data available to review for this document."},
                status=status.HTTP_400_BAD_REQUEST
            )

        extracted_data = document.extracted_data
        structured_data = extracted_data.structured_data or {}
        items = structured_data.get('items', [])

        # Check if an item correction was submitted
        item_id = request.data.get('item_id')
        corrected_value = request.data.get('corrected_value')

        if item_id:
            correction_serializer = ExtractionItemCorrectionSerializer(data=request.data)
            if not correction_serializer.is_valid():
                return Response(correction_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            validated = correction_serializer.validated_data
            target_item_id = validated['item_id']
            val = validated['corrected_value']
            target_field = validated.get('correction_field', 'reported_value')

            item_found = False
            for item in items:
                if str(item.get('id')) == str(target_item_id):
                    item_found = True
                    # Preserve original value permanently if not already preserved
                    if 'original_value' not in item:
                        item['original_value'] = item.get(target_field, '')
                    
                    item[target_field] = val
                    item['is_corrected'] = True
                    item['corrected_value'] = val
                    item['corrected_at'] = timezone.now().isoformat()
                    # User actively confirmed/corrected this item, so clear uncertainty on this item
                    item['is_uncertain'] = False
                    item['uncertainty_reason'] = "Corrected and reviewed by patient."
                    break

            if not item_found:
                return Response(
                    {"error": f"Item with id '{target_item_id}' not found in extracted data."},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Re-check remaining uncertainties
        structured_data['items'] = items
        structured_data['has_uncertainties'] = any(item.get('is_uncertain', False) for item in items)
        extracted_data.structured_data = structured_data

        # Update reviewed status (Patient reviewed extraction)
        extracted_data.is_reviewed_by_patient = True
        extracted_data.reviewed_at = timezone.now()
        extracted_data.is_verified_by_user = True
        extracted_data.verified_at = timezone.now()
        extracted_data.save()

        document.status = 'REVIEWED'
        document.save(update_fields=['status', 'updated_at'])

        serializer = ExtractedDocumentDataSerializer(extracted_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentExplainView(APIView):
    """
    POST: Triggers plain-language educational medical document explanation using Google Gemini.
    CRITICAL MEDICAL SAFETY & PRIVACY ENFORCEMENTS:
    - Enforces authentication and document ownership.
    - Fails immediately if patient consent is not provided (never calls Gemini without consent).
    - Uses verified extracted text and patient-corrected values.
    - Never modifies Stage 4 extraction data.
    - Never diagnoses or prescribes.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def post(self, request, pk):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(request, document)

        # Validate consent & target language
        request_serializer = DocumentExplainRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = request_serializer.validated_data
        consent_given = validated_data.get('consent_given', False)
        target_language = validated_data.get('language') or document.selected_language or 'en'

        if not hasattr(document, 'extracted_data') or document.extracted_data is None:
            return Response(
                {"error": "Please extract and verify document text before requesting plain-language explanation."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            explanation_data = generate_document_explanation(
                document=document,
                language=target_language,
                consent_given=consent_given
            )
        except PermissionDenied as pd:
            return Response({"error": str(pd)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error("Failed to generate AI explanation for document ID %s: %s", str(document.id), e.__class__.__name__)
            return Response(
                {"error": "AI explanation service is currently unavailable. Please verify API configuration or try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Persist or update DocumentExplanation
        explanation_obj, _ = DocumentExplanation.objects.update_or_create(
            document=document,
            defaults={
                'language': explanation_data['language'],
                'patient_consent_given': True,
                'consent_timestamp': explanation_data['consent_timestamp'],
                'consent_text_version': explanation_data['consent_text_version'],
                'ai_model': explanation_data['ai_model'],
                'summary': explanation_data['summary'],
                'structured_explanation': explanation_data['structured_explanation'],
                'doctor_questions': explanation_data['doctor_questions'],
                'safety_disclaimer': explanation_data['safety_disclaimer'],
                'processing_time_ms': explanation_data['processing_time_ms'],
            }
        )

        # Transition document status to EXPLAINED
        document.status = 'EXPLAINED'
        document.save(update_fields=['status', 'updated_at'])

        response_serializer = DocumentExplanationSerializer(explanation_obj)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class DocumentExplanationDetailView(APIView):
    """
    GET: Retrieves the saved AI explanation for an authenticated patient's document.
    Enforces document ownership.
    """
    permission_classes = [IsAuthenticated, IsDocumentOwner]

    def get(self, request, pk):
        document = get_object_or_404(MedicalDocument, pk=pk)
        self.check_object_permissions(request, document)

        if not hasattr(document, 'explanation') or document.explanation is None:
            return Response(
                {"error": "No explanation found for this document. Please request explanation first."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DocumentExplanationSerializer(document.explanation)
        return Response(serializer.data, status=status.HTTP_200_OK)
