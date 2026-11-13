import json
import logging
import time
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.utils import timezone
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

CONSENT_VERSION = "v1.0"

# Target language descriptions for prompt instructions
LANGUAGE_INSTRUCTION_MAP = {
    'en': 'English (clear everyday vocabulary, 6th-grade reading level)',
    'kn': 'Kannada (ಕನ್ನಡ - authentic, culturally natural everyday vocabulary for Karnataka patients)',
    'hi': 'Hindi (हिन्दी - clear, culturally natural everyday Hindi for patients across India)',
}

SYSTEM_SAFETY_INSTRUCTION = """
You are ReportSaathi, a compassionate, educational healthcare communication assistant.
Your sole mission is to explain medical documents (lab reports, prescriptions, discharge summaries) in simple, understandable language so patients feel informed and prepared for conversations with their healthcare provider.

CRITICAL MEDICAL SAFETY RULES (NON-NEGOTIABLE):
1. NEVER DIAGNOSE: You are NOT a doctor. Never tell a patient they have a disease, disorder, or condition (e.g. do NOT say "You have anemia" or "You have diabetes"). Instead say: "This test measures...".
2. NEVER PRESCRIBE OR MODIFY TREATMENT: Never recommend drugs, supplements, therapies, or dosage changes. Never tell a patient to start, stop, or adjust any medicine.
3. ZERO GUESSING & STRICT GROUNDING: Use only the numbers, units, reference ranges, and medicine instructions explicitly provided in the user's document.
4. PRINTED REFERENCE RANGES ONLY:
   - If a reference range is printed, state whether the reported number is below, within, or above that printed range.
   - If the reference range is marked "NOT_SPECIFIED" or missing, EXPLICITLY state: "No reference range was printed on your laboratory slip for this test. Your doctor will interpret this result based on your clinical context." Never import or guess reference ranges.
5. PRESCRIPTION ACCURACY:
   - Explain only what is clearly written (medicine name, strength, dosage schedule, food timing, duration).
   - If any detail is marked uncertain or missing, explicitly instruct: "This detail is unclear or unstated on the prescription. Please confirm with your treating doctor or pharmacist before taking this medicine."
6. DOCTOR CONSULTATION QUESTIONS: Provide 2 to 4 friendly, actionable, empowering questions for the patient to ask their physician during their next clinical consultation.

YOU MUST OUTPUT ONLY VALID JSON conforming to the requested schema. Do not include markdown code block syntax (such as ```json) outside the JSON.
"""

def build_explanation_prompt(category: str, items: list, language: str, has_uncertainties: bool) -> str:
    """Constructs a factual, safe prompt containing structured clinical items."""
    lang_name = LANGUAGE_INSTRUCTION_MAP.get(language, 'English')

    prompt = f"""
TARGET EXPLANATION LANGUAGE: {lang_name}
DOCUMENT TYPE: {category}

Here are the clinical items extracted from the patient's medical document:
{json.dumps(items, indent=2)}

INSTRUCTIONS FOR JSON OUTPUT:
Generate a JSON object with the following top-level keys:
1. "summary": A brief, comforting 2-3 sentence overview explaining what kind of document this is and what body systems or treatments it covers (written in {lang_name}).
2. "items": An array of explanation objects for each item in the list above:
   [
     {{
       "item_name": "<exact test name or medicine name>",
       "reported_value": "<reported value with unit>",
       "is_patient_corrected": <true if patient corrected this item, false otherwise>,
       "original_value": "<original value before correction>",
       "printed_reference_range": "<exact printed reference range or NOT_SPECIFIED>",
       "range_status": "<BELOW_RANGE | WITHIN_RANGE | ABOVE_RANGE | NOT_SPECIFIED>",
       "plain_explanation": "<simple 1-2 sentence explanation of what this test measures or what this medicine is commonly used for, in {lang_name}>",
       "is_uncertain": <true if uncertain or missing range, false otherwise>,
       "uncertainty_note": "<clear warning note if uncertain, null if clear, in {lang_name}>"
     }}
   ]
3. "doctor_questions": An array of 2 to 4 empathetic, empowering questions for the patient to ask their doctor (in {lang_name}).
4. "safety_disclaimer": "This explanation is educational and does not constitute medical diagnosis or advice. Always consult a licensed physician."

Return strictly valid JSON.
"""
    return prompt


def generate_document_explanation(
    document,
    language: str = 'en',
    consent_given: bool = False,
    client = None
) -> dict:
    """
    Core service function to generate plain-language explanation using Google Gemini.

    Guarantees:
    - Fails immediately if patient consent is not given.
    - Uses verified extracted items and patient corrections.
    - Never logs document contents or API keys.
    - Validates Gemini JSON output against safety requirements.
    """
    if not consent_given:
        raise PermissionDenied("Explicit patient consent is required before sending document information to Gemini.")

    if not hasattr(document, 'extracted_data') or document.extracted_data is None:
        raise ValueError("Cannot explain document: no text or clinical items have been extracted yet.")

    api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
    if not api_key and client is None:
        raise ValueError("Gemini API key is not configured on this server.")

    extracted_obj = document.extracted_data
    structured = extracted_obj.structured_data or {}
    items = structured.get('items', [])
    category = document.document_category
    has_uncertainties = structured.get('has_uncertainties', False)

    # Sanitize and prepare items for Gemini prompt
    # Note: original_value and patient corrections are explicitly passed
    prepared_items = []
    for item in items:
        prepared_items.append({
            "id": item.get("id"),
            "name": item.get("test_name") or item.get("medicine_name") or "Medical Item",
            "reported_value": item.get("reported_value", "Not specified"),
            "original_value": item.get("original_value", item.get("reported_value")),
            "is_corrected": item.get("is_corrected", False),
            "unit": item.get("unit", "Not Specified"),
            "printed_reference_range": item.get("printed_reference_range", "NOT_SPECIFIED"),
            "schedule": item.get("schedule"),
            "food_instruction": item.get("food_instruction"),
            "duration": item.get("duration"),
            "is_uncertain": item.get("is_uncertain", False),
            "uncertainty_reason": item.get("uncertainty_reason")
        })

    prompt = build_explanation_prompt(category, prepared_items, language, has_uncertainties)

    start_time = time.time()

    # Initialize Google GenAI client if not provided (mockable for tests)
    if client is None:
        client = genai.Client(api_key=api_key)

    model_name = getattr(settings, 'GEMINI_MODEL_NAME', 'gemini-2.5-flash')

    # Security: Log document ID and target language only. NEVER document contents or secrets.
    logger.info("Calling Gemini explanation for document %s, language: %s", str(document.id), language)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_SAFETY_INSTRUCTION,
                response_mime_type="application/json",
                temperature=0.2, # Low temperature for grounded, non-hallucinatory explanations
            )
        )
    except Exception as e:
        logger.error("Gemini API call failed for document %s: %s", str(document.id), e.__class__.__name__)
        raise RuntimeError(f"AI explanation service error: {e.__class__.__name__}")

    duration_ms = int((time.time() - start_time) * 1000)

    # Safely parse JSON response
    response_text = getattr(response, 'text', '') or ''
    # Strip potential ```json markers if model included them
    clean_json_str = response_text.strip()
    if clean_json_str.startswith('```json'):
        clean_json_str = clean_json_str[7:]
    elif clean_json_str.startswith('```'):
        clean_json_str = clean_json_str[3:]
    if clean_json_str.endswith('```'):
        clean_json_str = clean_json_str[:-3]
    clean_json_str = clean_json_str.strip()

    try:
        parsed_result = json.loads(clean_json_str)
    except json.JSONDecodeError as jde:
        logger.error("Failed to decode JSON from Gemini response for document %s", str(document.id))
        raise ValueError("AI explanation service returned an invalid response format.")

    # Validate essential structure
    summary = parsed_result.get('summary', 'Educational medical explanation.')
    explained_items = parsed_result.get('items', [])
    doctor_questions = parsed_result.get('doctor_questions', [])
    safety_disclaimer = parsed_result.get(
        'safety_disclaimer',
        "ReportSaathi provides educational document explanations only. It does NOT diagnose diseases, prescribe medicines, or replace professional medical advice."
    )

    return {
        "language": language,
        "patient_consent_given": True,
        "consent_timestamp": timezone.now(),
        "consent_text_version": CONSENT_VERSION,
        "ai_model": model_name,
        "summary": summary,
        "structured_explanation": {
            "document_type": category,
            "items": explained_items,
            "total_items": len(explained_items),
            "has_uncertainties": has_uncertainties,
        },
        "doctor_questions": doctor_questions,
        "safety_disclaimer": safety_disclaimer,
        "processing_time_ms": duration_ms
    }
