import re
import uuid

# Common medical clinical units
UNIT_PATTERN = r'(?:g/dL|mg/dL|mmol/L|umol/L|µmol/L|IU/L|U/L|%|fl|pg|fL|/uL|/mcL|cells/cu\.mm|x10\^3/uL|x10\^6/uL|10\^3/uL|10\^6/uL|mEq/L|ng/mL|pg/mL|mcg/dL|mg/L)'

# Common lab test name prefixes / keywords
COMMON_LAB_NAMES = [
    'Hemoglobin', 'Hb', 'RBC', 'WBC', 'Platelet Count', 'Platelets',
    'Packed Cell Volume', 'PCV', 'MCV', 'MCH', 'MCHC', 'RDW',
    'Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils',
    'Fasting Blood Sugar', 'FBS', 'Post Prandial Blood Sugar', 'PPBS', 'HbA1c',
    'Blood Urea', 'Serum Creatinine', 'Uric Acid', 'BUN',
    'Total Cholesterol', 'Triglycerides', 'HDL Cholesterol', 'LDL Cholesterol', 'VLDL',
    'Bilirubin Total', 'Bilirubin Direct', 'SGOT', 'AST', 'SGPT', 'ALT', 'Alkaline Phosphatase', 'ALP',
    'Total Protein', 'Albumin', 'Globulin', 'A/G Ratio',
    'TSH', 'T3', 'T4', 'Free T3', 'Free T4', 'Vitamin D', 'Vitamin B12',
    'Sodium', 'Potassium', 'Chloride', 'Calcium', 'Phosphorus',
    'ESR', 'C-Reactive Protein', 'CRP'
]

def parse_lab_report(raw_text: str) -> list:
    """
    Parses laboratory report text to extract:
    - Test name
    - Reported result value
    - Unit of measurement
    - Reference range printed on the report
    
    Guarantees:
    - Never invents reference ranges; missing ranges remain "NOT_SPECIFIED".
    - Ambiguous or low-confidence values are flagged as is_uncertain.
    """
    structured_tests = []
    lines = raw_text.splitlines()

    # Regex to capture: <Test Name> <Value> <Unit (optional)> <Range (optional)>
    # e.g., "Hemoglobin 13.5 g/dL 12.0 - 15.0"
    # e.g., "Serum Creatinine: 1.1 mg/dL (0.7 - 1.3)"
    # e.g., "Total Cholesterol: 210 mg/dL"
    
    range_regex = r'(?:[\(\[]?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*[\)\]]?)'
    
    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line or cleaned_line.startswith('---'):
            continue

        # Look for known test patterns or general table rows
        # Format: <Name> ... <Number> ... <Unit> ... <Range>
        match = re.search(
            r'([A-Za-z0-9\s\(\)/_\-\.]+?)[:\t\s]+(\d+(?:\.\d+)?|\bNegative\b|\bPositive\b|\bNormal\b)\s*(' + UNIT_PATTERN + r')?\s*(.*)',
            cleaned_line,
            re.IGNORECASE
        )

        if match:
            raw_name = match.group(1).strip()
            val = match.group(2).strip()
            unit = match.group(3).strip() if match.group(3) else "Not Specified"
            rest_of_line = match.group(4).strip() if match.group(4) else ""

            # Check if name is reasonable (not page headers or disclaimer text)
            if len(raw_name) < 2 or len(raw_name) > 60 or raw_name.lower().startswith(('page', 'date', 'patient', 'doctor', 'name', 'age', 'sex', 'gender', 'referred')):
                continue

            # Look for printed reference range in the rest of the line
            range_match = re.search(range_regex, rest_of_line)
            if range_match:
                printed_range = f"{range_match.group(1)} - {range_match.group(2)}"
            else:
                # Explicitly missing; never invent!
                printed_range = "NOT_SPECIFIED"

            # Check for uncertainty flags
            is_uncertain = False
            uncertainty_reason = None

            # Detect potential decimal point ambiguity (e.g., single digit or suspiciously high integer)
            if re.match(r'^\d+$', val) and int(val) > 1000 and 'platelet' not in raw_name.lower() and 'wbc' not in raw_name.lower():
                is_uncertain = True
                uncertainty_reason = "Unusually high integer value; verify if decimal point is missing."
            elif printed_range == "NOT_SPECIFIED":
                is_uncertain = True
                uncertainty_reason = "No reference range printed on source document for this test."

            test_item = {
                "id": str(uuid.uuid4())[:8],
                "test_name": raw_name,
                "reported_value": val,
                "original_value": val,
                "unit": unit,
                "printed_reference_range": printed_range,
                "is_uncertain": is_uncertain,
                "uncertainty_reason": uncertainty_reason,
                "is_corrected": False,
                "corrected_value": None,
                "corrected_at": None,
            }
            structured_tests.append(test_item)

    return structured_tests


def parse_prescription(raw_text: str) -> list:
    """
    Parses doctors' prescriptions preserving:
    - Medicine name and strength as written
    - Dosage schedule (morning, afternoon, night / 1-0-1)
    - Instructions (Before/After food)
    - Duration

    Guarantees:
    - Never auto-completes, normalizes or guesses unclear drug names or dosages.
    - Flags unclear writing for pharmacist verification.
    """
    items = []
    lines = raw_text.splitlines()

    for line in lines:
        cleaned = line.strip()
        if not cleaned or cleaned.startswith('---'):
            continue

        # Look for dosage patterns e.g. "Tab Metformin 500mg 1-0-1 After food 30 days"
        # or "Paracetamol 650 mg SOS"
        # Separators [-/ ] must be explicit so numeric strengths like 500mg or 250mg are never matched as schedules.
        dose_schedule_match = re.search(
            r'(\b\d+(?:\s*[-/]\s*\d+){2,3}\b|\b\d+(?:\s+\d+){2,3}\b|\bOD\b|\bBD\b|\bTDS\b|\bQID\b|\bSOS\b|\bOnce daily\b|\bTwice daily\b|\bThrice daily\b)',
            cleaned,
            re.IGNORECASE
        )
        strength_match = re.search(r'(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|IU))\b', cleaned, re.IGNORECASE)

        if dose_schedule_match or strength_match:
            # Extract food instruction
            food_instruction = "As directed"
            if re.search(r'(?:before\s+meals?|before\s+food|AC)', cleaned, re.IGNORECASE):
                food_instruction = "Before Food"
            elif re.search(r'(?:after\s+meals?|after\s+food|PC)', cleaned, re.IGNORECASE):
                food_instruction = "After Food"

            # Duration
            duration_match = re.search(r'(\d+\s*(?:days?|weeks?|months?))', cleaned, re.IGNORECASE)
            duration = duration_match.group(1) if duration_match else "Not specified"

            medicine_str = cleaned
            schedule_str = dose_schedule_match.group(1) if dose_schedule_match else "Unspecified schedule"
            strength_str = strength_match.group(1) if strength_match else "Not specified"

            # Check for ambiguity
            is_uncertain = False
            uncertainty_reason = None
            if schedule_str == "Unspecified schedule" or strength_str == "Not specified":
                is_uncertain = True
                uncertainty_reason = "Dosage schedule or strength is unclear. Pharmacist verification required."

            items.append({
                "id": str(uuid.uuid4())[:8],
                "medicine_name": medicine_str,
                "original_medicine_name": medicine_str,
                "strength": strength_str,
                "schedule": schedule_str,
                "food_instruction": food_instruction,
                "duration": duration,
                "is_uncertain": is_uncertain,
                "uncertainty_reason": uncertainty_reason,
                "is_corrected": False,
                "corrected_value": None,
                "corrected_at": None,
            })

    return items


def parse_discharge_summary(raw_text: str) -> list:
    """
    Parses discharge summary sections (Diagnosis, Hospital Course, Discharge Instructions).
    """
    sections = []
    current_heading = "General Summary"
    current_content = []

    for line in raw_text.splitlines():
        cleaned = line.strip()
        if not cleaned:
            continue

        # Look for section headers e.g. "DIAGNOSIS:", "PROCEDURE:", "DISCHARGE ADVICE:"
        header_match = re.match(r'^([A-Z\s]{3,30}):$', cleaned)
        if header_match:
            if current_content:
                sections.append({
                    "id": str(uuid.uuid4())[:8],
                    "section_title": current_heading,
                    "content": " ".join(current_content),
                    "is_uncertain": False,
                    "uncertainty_reason": None,
                    "is_corrected": False,
                    "corrected_value": None,
                    "corrected_at": None,
                })
                current_content = []
            current_heading = header_match.group(1).title()
        else:
            current_content.append(cleaned)

    if current_content:
        sections.append({
            "id": str(uuid.uuid4())[:8],
            "section_title": current_heading,
            "content": " ".join(current_content),
            "is_uncertain": False,
            "uncertainty_reason": None,
            "is_corrected": False,
            "corrected_value": None,
            "corrected_at": None,
        })

    return sections


def structure_document_data(raw_text: str, category: str) -> dict:
    """
    Central dispatcher to transform raw text into clinical structured data
    while enforcing zero-guessing policies and uncertainty detection.
    """
    if not raw_text or not raw_text.strip():
        return {
            "items": [],
            "has_uncertainties": True,
            "general_warning": "No readable text could be extracted automatically from this document."
        }

    if category == 'LAB_REPORT':
        items = parse_lab_report(raw_text)
    elif category == 'PRESCRIPTION':
        items = parse_prescription(raw_text)
    elif category == 'DISCHARGE_SUMMARY':
        items = parse_discharge_summary(raw_text)
    else:
        # Generic fallback
        items = parse_lab_report(raw_text) or parse_prescription(raw_text)

    has_uncertainties = any(item.get("is_uncertain", False) for item in items)

    return {
        "items": items,
        "has_uncertainties": has_uncertainties,
        "total_extracted_items": len(items)
    }
