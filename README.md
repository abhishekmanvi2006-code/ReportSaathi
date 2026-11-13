# ReportSaathi – Plain-Language Medical Report and Prescription Explainer 🏥

ReportSaathi is an open, secure, and user-friendly healthcare technology application designed to help ordinary people understand complex medical reports, laboratory test results, prescriptions, and discharge summaries in their preferred language.

Supported Languages:
- **English**
- **ಕನ್ನಡ (Kannada)**
- **हिन्दी (Hindi)**

> **Important Medical Safety Disclaimer:**
> ReportSaathi provides educational explanations of medical documents. It does **not** diagnose diseases, prescribe medicines, or replace professional medical advice. Always consult a qualified healthcare professional for medical decisions.

---

## Tech Stack

- **Frontend:** React.js (Vite), Tailwind CSS, React Router, Axios, `react-i18next`
- **Backend:** Python 3.13, Django 5.1, Django REST Framework (DRF), `djangorestframework-simplejwt`, `django-cors-headers`
- **Database:** SQLite (local development) / PostgreSQL (production ready)
- **AI & Processing Engine:** Google Gemini API, PyMuPDF, OCR fallback

---

## Getting Started (Local Development)

### Prerequisites
- Python 3.11+ (Python 3.13 tested and verified)
- Node.js 18+ and npm

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create and activate Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start backend server
python manage.py runserver
```

The backend API will run at `http://127.0.0.1:8000/`.
Health check: `http://127.0.0.1:8000/api/health/`

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend application will run at `http://localhost:5173/`.

---

## Stage 5: Gemini AI-Powered Medical Document Explanation

ReportSaathi uses Google Gemini (`google-genai` SDK) to translate verified medical documents into 6th-grade reading level plain-language explanations in English, Kannada, and Hindi.

### 1. Gemini API Key Configuration
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Copy `.env.example` to `.env` in the project root:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL_NAME=gemini-2.5-flash
   ```
3. The API key is stored exclusively on the Django backend and is **never** exposed in React, browser responses, logs, or source control.

### 2. Informed Patient Consent Architecture
* AI processing is strictly disabled unless the patient gives explicit informed consent.
* The frontend displays a dedicated Consent Dialogue explaining that document findings will be sent to Google's Gemini service solely for educational processing.
* The backend enforces consent on the API level (`POST /api/documents/<id>/explain/` requires `consent_given: true`). If consent is omitted or false, Gemini is never invoked.

### 3. Healthcare AI Safety Architecture
* **Zero Diagnosis:** The AI is strictly instructed and validated to never state that the patient has a disease, disorder, or condition.
* **Zero Prescription Changes:** The AI never recommends medicines, alters dosages, or instructs patients to start or stop treatments.
* **Strict Grounding:** The AI uses only the numbers, units, and printed reference ranges extracted from the document.
* **Printed Ranges Only:** If a lab reference range is missing on the document (`NOT_SPECIFIED`), the explainer explicitly states that no range was printed. It never invents or imports generic reference ranges.
* **Prescription Caution:** Unclear dosages or missing instructions are explicitly flagged with advice to consult a doctor or pharmacist.
* **Doctor-Patient Collaboration:** Generates empowering questions for patients to ask their treating physician during their next clinic appointment.

### 4. Running the Test Suite (Mocked Gemini)
The automated test suite uses mocked Gemini responses, ensuring the test suite runs fully offline without requiring a paid API key or network access:
```bash
python backend/manage.py test apps.authentication apps.documents
```

### 5. Known Limitations
* **Scanned/Photo PDFs:** Digital PDFs are processed locally with PyMuPDF. Scanned PDFs require local Tesseract OCR; if missing, the system gracefully alerts the patient.
* **Educational Purpose:** ReportSaathi does not provide medical diagnosis or replace licensed physicians.
