import io
import os
import json
import pymupdf
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from .models import MedicalDocument, ExtractedDocumentData, DocumentExplanation
from apps.authentication.models import PatientProfile

class DocumentManagementTests(TestCase):
    def setUp(self):
        self.client_a = APIClient()
        self.client_b = APIClient()

        # Create Patient A
        self.user_a = User.objects.create_user(
            username="patient_a",
            email="patient.a@example.com",
            password="Password123!"
        )
        PatientProfile.objects.create(
            user=self.user_a,
            preferred_language='en',
            disclaimer_accepted=True
        )

        # Create Patient B
        self.user_b = User.objects.create_user(
            username="patient_b",
            email="patient.b@example.com",
            password="Password123!"
        )
        PatientProfile.objects.create(
            user=self.user_b,
            preferred_language='kn',
            disclaimer_accepted=True
        )

        self.client_a.force_authenticate(user=self.user_a)
        self.client_b.force_authenticate(user=self.user_b)

        # Synthetic test files
        self.valid_pdf_content = b"%PDF-1.4\n%synthetic report\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        self.valid_png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        self.fake_pdf_content = b"This is plain text pretending to be a PDF"

    def test_upload_valid_synthetic_pdf(self):
        file = SimpleUploadedFile("synthetic_cbc_report.pdf", self.valid_pdf_content, content_type="application/pdf")
        response = self.client_a.post('/api/documents/', {
            'file': file,
            'document_category': 'LAB_REPORT',
            'selected_language': 'en'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['file_type'], 'PDF')
        self.assertEqual(response.data['document_category'], 'LAB_REPORT')
        self.assertIn('id', response.data)

        # Verify document exists in DB and is owned by user A
        doc = MedicalDocument.objects.get(id=response.data['id'])
        self.assertEqual(doc.user, self.user_a)
        # Verify file is stored in private location
        self.assertTrue(doc.file.storage.exists(doc.file.name))

    def test_reject_file_with_invalid_magic_signature(self):
        # A file named .pdf containing plain text
        file = SimpleUploadedFile("malicious.pdf", self.fake_pdf_content, content_type="application/pdf")
        response = self.client_a.post('/api/documents/', {
            'file': file,
            'document_category': 'LAB_REPORT'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('file', response.data)

    def test_reject_file_exceeding_10mb(self):
        # Simulate oversized file (>10MB)
        oversized_data = b"%PDF-1.4\n" + (b"0" * (10 * 1024 * 1024 + 10))
        file = SimpleUploadedFile("huge.pdf", oversized_data, content_type="application/pdf")
        response = self.client_a.post('/api/documents/', {
            'file': file,
            'document_category': 'LAB_REPORT'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('file', response.data)

    def test_cross_user_isolation_listing(self):
        # Upload doc for user A
        file_a = SimpleUploadedFile("doc_a.pdf", self.valid_pdf_content, content_type="application/pdf")
        self.client_a.post('/api/documents/', {'file': file_a}, format='multipart')

        # Upload doc for user B
        file_b = SimpleUploadedFile("doc_b.png", self.valid_png_content, content_type="image/png")
        self.client_b.post('/api/documents/', {'file': file_b}, format='multipart')

        # User A should only see 1 document (doc_a)
        resp_a = self.client_a.get('/api/documents/')
        self.assertEqual(len(resp_a.data), 1)
        self.assertEqual(resp_a.data[0]['original_filename'], 'doc_a.pdf')

        # User B should only see 1 document (doc_b)
        resp_b = self.client_b.get('/api/documents/')
        self.assertEqual(len(resp_b.data), 1)
        self.assertEqual(resp_b.data[0]['original_filename'], 'doc_b.png')

    def test_cross_user_download_forbidden(self):
        file = SimpleUploadedFile("private_cbc.pdf", self.valid_pdf_content, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file}, format='multipart')
        doc_id = upload_resp.data['id']

        # User A can download
        download_a = self.client_a.get(f'/api/documents/{doc_id}/download/')
        self.assertEqual(download_a.status_code, status.HTTP_200_OK)

        # User B attempts to download User A's file -> Forbidden (403)
        download_b = self.client_b.get(f'/api/documents/{doc_id}/download/')
        self.assertEqual(download_b.status_code, status.HTTP_403_FORBIDDEN)

    def test_cross_user_deletion_forbidden(self):
        file = SimpleUploadedFile("patient_record.pdf", self.valid_pdf_content, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file}, format='multipart')
        doc_id = upload_resp.data['id']

        # User B attempts to delete User A's file -> Forbidden (403)
        delete_b = self.client_b.delete(f'/api/documents/{doc_id}/')
        self.assertEqual(delete_b.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(MedicalDocument.objects.filter(id=doc_id).exists())

    def test_document_deletion_removes_physical_file(self):
        file = SimpleUploadedFile("to_delete.pdf", self.valid_pdf_content, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file}, format='multipart')
        doc_id = upload_resp.data['id']

        doc = MedicalDocument.objects.get(id=doc_id)
        file_path = doc.file.path
        self.assertTrue(os.path.exists(file_path))

        # Delete document
        del_resp = self.client_a.delete(f'/api/documents/{doc_id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MedicalDocument.objects.filter(id=doc_id).exists())
        # Physical file must also be removed
        self.assertFalse(os.path.exists(file_path))

    def _create_synthetic_lab_pdf(self):
        """Helper to generate a real synthetic digital lab report PDF in memory."""
        doc = pymupdf.open()
        page = doc.new_page()
        lines = [
            "Clinical Diagnostic Laboratory Services",
            "Patient: Synthetic Test Patient",
            "Hemoglobin: 13.5 g/dL (12.0 - 15.5)",
            "Serum Creatinine: 1.1 mg/dL (0.7 - 1.3)",
            "Total Cholesterol: 210 mg/dL",
        ]
        p = pymupdf.Point(50, 72)
        for line in lines:
            page.insert_text(p, line, fontsize=11)
            p.y += 24
        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes

    def test_digital_pdf_extraction_pipeline(self):
        pdf_bytes = self._create_synthetic_lab_pdf()
        file = SimpleUploadedFile("cbc_sample.pdf", pdf_bytes, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {
            'file': file,
            'document_category': 'LAB_REPORT',
            'selected_language': 'en'
        }, format='multipart')
        doc_id = upload_resp.data['id']

        # Trigger extraction
        extract_resp = self.client_a.post(f'/api/documents/{doc_id}/extract/')
        self.assertEqual(extract_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(extract_resp.data['extraction_method'], 'PYMUPDF_DIGITAL')
        self.assertGreaterEqual(extract_resp.data['overall_extraction_confidence'], 0.9)
        self.assertFalse(extract_resp.data['is_scanned'])

        # Verify items extracted
        items = extract_resp.data['structured_data']['items']
        self.assertGreaterEqual(len(items), 2)
        
        # Check Hemoglobin
        hb_item = next((i for i in items if 'hemoglobin' in i['test_name'].lower()), None)
        self.assertIsNotNone(hb_item)
        self.assertEqual(hb_item['reported_value'], '13.5')
        self.assertEqual(hb_item['printed_reference_range'], '12.0 - 15.5')
        self.assertFalse(hb_item['is_uncertain'])

        # Check Total Cholesterol (lacks printed range -> must be NOT_SPECIFIED and is_uncertain=True)
        chol_item = next((i for i in items if 'cholesterol' in i['test_name'].lower()), None)
        self.assertIsNotNone(chol_item)
        self.assertEqual(chol_item['reported_value'], '210')
        self.assertEqual(chol_item['printed_reference_range'], 'NOT_SPECIFIED')
        self.assertTrue(chol_item['is_uncertain'])

        # Check document status updated to EXTRACTED
        doc = MedicalDocument.objects.get(id=doc_id)
        self.assertEqual(doc.status, 'EXTRACTED')

    def test_patient_correction_preserves_original_value(self):
        pdf_bytes = self._create_synthetic_lab_pdf()
        file = SimpleUploadedFile("cbc_to_correct.pdf", pdf_bytes, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file, 'document_category': 'LAB_REPORT'}, format='multipart')
        doc_id = upload_resp.data['id']

        # Extract
        extract_resp = self.client_a.post(f'/api/documents/{doc_id}/extract/')
        items = extract_resp.data['structured_data']['items']
        target_item = items[0]
        target_id = target_item['id']
        original_reported_value = target_item['reported_value']

        # Patient corrects the reported value
        verify_resp = self.client_a.patch(f'/api/documents/{doc_id}/verify/', {
            'item_id': target_id,
            'corrected_value': '14.2',
            'correction_field': 'reported_value'
        })
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_resp.data['is_reviewed_by_patient'])
        self.assertIsNotNone(verify_resp.data['reviewed_at'])

        # Verify in DB: original_value is PERMANENTLY preserved
        extracted = ExtractedDocumentData.objects.get(document_id=doc_id)
        updated_item = next(i for i in extracted.structured_data['items'] if i['id'] == target_id)
        self.assertEqual(updated_item['original_value'], original_reported_value)
        self.assertEqual(updated_item['reported_value'], '14.2')
        self.assertEqual(updated_item['corrected_value'], '14.2')
        self.assertTrue(updated_item['is_corrected'])
        self.assertIsNotNone(updated_item['corrected_at'])

        # Check document status updated to REVIEWED
        doc = MedicalDocument.objects.get(id=doc_id)
        self.assertEqual(doc.status, 'REVIEWED')

    def test_repeated_verification_idempotent(self):
        pdf_bytes = self._create_synthetic_lab_pdf()
        file = SimpleUploadedFile("cbc_multi_verify.pdf", pdf_bytes, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file, 'document_category': 'LAB_REPORT'}, format='multipart')
        doc_id = upload_resp.data['id']

        self.client_a.post(f'/api/documents/{doc_id}/extract/')
        
        # First verify
        resp1 = self.client_a.patch(f'/api/documents/{doc_id}/verify/', {})
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertTrue(resp1.data['is_reviewed_by_patient'])

        # Second verify (e.g. confirming review again)
        resp2 = self.client_a.patch(f'/api/documents/{doc_id}/verify/', {})
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data['is_reviewed_by_patient'])

    def test_cross_user_extraction_and_preview_forbidden(self):
        pdf_bytes = self._create_synthetic_lab_pdf()
        file = SimpleUploadedFile("user_a_private.pdf", pdf_bytes, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file, 'document_category': 'LAB_REPORT'}, format='multipart')
        doc_id = upload_resp.data['id']

        # User A extracts
        self.client_a.post(f'/api/documents/{doc_id}/extract/')

        # User B attempts to extract User A's document -> 403 Forbidden
        ext_b = self.client_b.post(f'/api/documents/{doc_id}/extract/')
        self.assertEqual(ext_b.status_code, status.HTTP_403_FORBIDDEN)

        # User B attempts to read extraction details -> 403 Forbidden
        detail_b = self.client_b.get(f'/api/documents/{doc_id}/extraction/')
        self.assertEqual(detail_b.status_code, status.HTTP_403_FORBIDDEN)

        # User B attempts to verify -> 403 Forbidden
        verify_b = self.client_b.patch(f'/api/documents/{doc_id}/verify/', {})
        self.assertEqual(verify_b.status_code, status.HTTP_403_FORBIDDEN)

        # User B attempts preview -> 403 Forbidden
        preview_b = self.client_b.get(f'/api/documents/{doc_id}/preview/')
        self.assertEqual(preview_b.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_preview_stream(self):
        pdf_bytes = self._create_synthetic_lab_pdf()
        file = SimpleUploadedFile("preview_test.pdf", pdf_bytes, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file, 'document_category': 'LAB_REPORT'}, format='multipart')
        doc_id = upload_resp.data['id']

        # User A can preview
        preview_resp = self.client_a.get(f'/api/documents/{doc_id}/preview/')
        self.assertEqual(preview_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(preview_resp['Content-Type'], 'application/pdf')
        self.assertEqual(preview_resp['X-Content-Type-Options'], 'nosniff')

    def test_malformed_pdf_handled_gracefully(self):
        # Starts with %PDF header to pass magic byte sniffing, but has garbage bytes inside
        corrupt_pdf_content = b"%PDF-1.4\nGarbageCorruptedBinaryDataCannotBeParsedAsValidPDF"
        file = SimpleUploadedFile("corrupt.pdf", corrupt_pdf_content, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file, 'document_category': 'LAB_REPORT'}, format='multipart')
        doc_id = upload_resp.data['id']

        # Extraction should return 400 Bad Request, not 500 crash
        extract_resp = self.client_a.post(f'/api/documents/{doc_id}/extract/')
        self.assertEqual(extract_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', extract_resp.data)

        # Document status should be FAILED
        doc = MedicalDocument.objects.get(id=doc_id)
        self.assertEqual(doc.status, 'FAILED')

    def test_prescription_schedule_regex_regression(self):
        """
        Regression tests for prescription dosage parsing:
        - 500mg should be identified as strength, NOT schedule (schedule remains 'Unspecified schedule')
        - 1-0-1 should be identified as schedule
        - 1 0 1 should be identified as schedule
        - 500mg BD should have strength '500mg' and schedule 'BD'
        - 250mg TDS should have strength '250mg' and schedule 'TDS'
        """
        from apps.documents.services.parser import parse_prescription

        # 1. 500mg alone without dosage schedule
        res_500 = parse_prescription("Tab Metformin 500mg")
        self.assertEqual(len(res_500), 1)
        self.assertEqual(res_500[0]['strength'], '500mg')
        self.assertEqual(res_500[0]['schedule'], 'Unspecified schedule')
        self.assertTrue(res_500[0]['is_uncertain'])

        # 2. 1-0-1 schedule
        res_hyphen = parse_prescription("Tab Pantoprazole 1-0-1 Before food")
        self.assertEqual(len(res_hyphen), 1)
        self.assertEqual(res_hyphen[0]['schedule'], '1-0-1')

        # 3. 1 0 1 schedule
        res_space = parse_prescription("Tab Pantoprazole 1 0 1 Before food")
        self.assertEqual(len(res_space), 1)
        self.assertEqual(res_space[0]['schedule'], '1 0 1')

        # 4. 500mg BD
        res_bd = parse_prescription("Tab Metformin 500mg BD After food 30 days")
        self.assertEqual(len(res_bd), 1)
        self.assertEqual(res_bd[0]['strength'], '500mg')
        self.assertEqual(res_bd[0]['schedule'], 'BD')
        self.assertFalse(res_bd[0]['is_uncertain'])

        # 5. 250mg TDS
        res_tds = parse_prescription("Cap Amoxicillin 250mg TDS 5 days")
        self.assertEqual(len(res_tds), 1)
        self.assertEqual(res_tds[0]['strength'], '250mg')
        self.assertEqual(res_tds[0]['schedule'], 'TDS')
        self.assertFalse(res_tds[0]['is_uncertain'])

    def _setup_extracted_document(self):
        """Helper to create and extract a synthetic lab document for user A."""
        pdf_bytes = self._create_synthetic_lab_pdf()
        file = SimpleUploadedFile("cbc_explain.pdf", pdf_bytes, content_type="application/pdf")
        upload_resp = self.client_a.post('/api/documents/', {'file': file, 'document_category': 'LAB_REPORT'}, format='multipart')
        doc_id = upload_resp.data['id']
        self.client_a.post(f'/api/documents/{doc_id}/extract/')
        return doc_id

    @override_settings(GEMINI_API_KEY='fake-test-key-for-mocking')
    @patch('google.genai.Client')
    def test_gemini_explanation_success_with_mock(self, mock_client_cls):
        doc_id = self._setup_extracted_document()

        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "This is an educational summary of your Complete Blood Count report.",
            "items": [
                {
                    "item_name": "Hemoglobin",
                    "reported_value": "13.5 g/dL",
                    "is_patient_corrected": False,
                    "original_value": "13.5",
                    "printed_reference_range": "12.0 - 15.5",
                    "range_status": "WITHIN_RANGE",
                    "plain_explanation": "Hemoglobin carries oxygen in your bloodstream to all body tissues.",
                    "is_uncertain": False,
                    "uncertainty_note": None
                },
                {
                    "item_name": "Total Cholesterol",
                    "reported_value": "210 mg/dL",
                    "is_patient_corrected": False,
                    "original_value": "210",
                    "printed_reference_range": "NOT_SPECIFIED",
                    "range_status": "NOT_SPECIFIED",
                    "plain_explanation": "Cholesterol is a fat-like substance made by your liver.",
                    "is_uncertain": True,
                    "uncertainty_note": "No reference range was printed on your laboratory slip for this test."
                }
            ],
            "doctor_questions": [
                "What do these results mean in the context of my current symptoms?",
                "Are any lifestyle or dietary adjustments recommended?"
            ],
            "safety_disclaimer": "ReportSaathi provides educational document explanations only."
        })
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_instance

        # Call explain endpoint with explicit consent
        response = self.client_a.post(f'/api/documents/{doc_id}/explain/', {
            'consent_given': True,
            'language': 'en'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['patient_consent_given'])
        self.assertEqual(response.data['language'], 'en')
        self.assertIn("Complete Blood Count", response.data['summary'])
        self.assertEqual(len(response.data['doctor_questions']), 2)

        # Check DB model and document status
        exp = DocumentExplanation.objects.get(document_id=doc_id)
        self.assertEqual(exp.language, 'en')
        self.assertTrue(exp.patient_consent_given)

        doc = MedicalDocument.objects.get(id=doc_id)
        self.assertEqual(doc.status, 'EXPLAINED')

        # Check GET /explanation/
        get_resp = self.client_a.get(f'/api/documents/{doc_id}/explanation/')
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data['id'], str(exp.id))

    def test_gemini_explanation_consent_required(self):
        doc_id = self._setup_extracted_document()

        # Attempt explain with consent_given=False
        resp_false = self.client_a.post(f'/api/documents/{doc_id}/explain/', {
            'consent_given': False,
            'language': 'en'
        })
        self.assertEqual(resp_false.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consent_given', resp_false.data)

        # Attempt explain with missing consent_given
        resp_missing = self.client_a.post(f'/api/documents/{doc_id}/explain/', {
            'language': 'en'
        })
        self.assertEqual(resp_missing.status_code, status.HTTP_400_BAD_REQUEST)

        # Document status should NOT be EXPLAINED
        doc = MedicalDocument.objects.get(id=doc_id)
        self.assertNotEqual(doc.status, 'EXPLAINED')

    @override_settings(GEMINI_API_KEY='')
    def test_gemini_missing_api_key_error(self):
        doc_id = self._setup_extracted_document()
        # When key is empty
        resp = self.client_a.post(f'/api/documents/{doc_id}/explain/', {
            'consent_given': True,
            'language': 'en'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Gemini API key is not configured', resp.data['error'])

    @override_settings(GEMINI_API_KEY='fake-test-key-for-mocking')
    @patch('google.genai.Client')
    def test_gemini_api_failure_handled_safely(self, mock_client_cls):
        doc_id = self._setup_extracted_document()

        # Simulate Gemini service failure
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = RuntimeError("Service connection timeout")
        mock_client_cls.return_value = mock_instance

        resp = self.client_a.post(f'/api/documents/{doc_id}/explain/', {
            'consent_given': True,
            'language': 'en'
        })
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('error', resp.data)

    @override_settings(GEMINI_API_KEY='fake-test-key-for-mocking')
    @patch('google.genai.Client')
    def test_gemini_malformed_json_response_handled_safely(self, mock_client_cls):
        doc_id = self._setup_extracted_document()

        # Simulate non-JSON response from model
        mock_response = MagicMock()
        mock_response.text = "Error: Model returned plain text without valid JSON structure."
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_instance

        resp = self.client_a.post(f'/api/documents/{doc_id}/explain/', {
            'consent_given': True,
            'language': 'en'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid response format', resp.data['error'])

    @override_settings(GEMINI_API_KEY='fake-test-key-for-mocking')
    @patch('google.genai.Client')
    def test_cross_user_explanation_forbidden(self, mock_client_cls):
        doc_id = self._setup_extracted_document()

        # User B attempts to trigger explanation on User A's document -> 403 Forbidden
        explain_b = self.client_b.post(f'/api/documents/{doc_id}/explain/', {
            'consent_given': True,
            'language': 'en'
        })
        self.assertEqual(explain_b.status_code, status.HTTP_403_FORBIDDEN)

        # User B attempts to read explanation -> 403 Forbidden
        get_b = self.client_b.get(f'/api/documents/{doc_id}/explanation/')
        self.assertEqual(get_b.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(GEMINI_API_KEY='fake-test-key-for-mocking')
    @patch('google.genai.Client')
    def test_patient_corrections_passed_to_gemini(self, mock_client_cls):
        doc_id = self._setup_extracted_document()

        # Patient A corrects Hemoglobin to 14.8
        extracted = ExtractedDocumentData.objects.get(document_id=doc_id)
        target_item = extracted.structured_data['items'][0]
        self.client_a.patch(f'/api/documents/{doc_id}/verify/', {
            'item_id': target_item['id'],
            'corrected_value': '14.8',
            'correction_field': 'reported_value'
        })

        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Summary with corrected value.",
            "items": [],
            "doctor_questions": [],
            "safety_disclaimer": "Educational only."
        })
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_instance

        self.client_a.post(f'/api/documents/{doc_id}/explain/', {
            'consent_given': True,
            'language': 'en'
        })

        # Verify prompt passed to Gemini contains 14.8 and is_corrected: True
        call_args = mock_instance.models.generate_content.call_args
        prompt_content = call_args[1]['contents']
        self.assertIn('14.8', prompt_content)
        self.assertIn('"is_corrected": true', prompt_content)
