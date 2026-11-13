import os
import io
import logging
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import pymupdf

logger = logging.getLogger(__name__)

MAX_PDF_PAGES = 15

def is_tesseract_available() -> bool:
    """Checks whether local Tesseract OCR binary is installed and executable."""
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Applies standard contrast enhancement and grayscale conversion
    to improve local OCR readability on photographed/scanned records.
    """
    # Convert to grayscale
    gray = image.convert('L')
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(1.8)
    return enhanced

def extract_text_from_document(file_path: str, file_type: str) -> dict:
    """
    Safely extracts text locally from a PDF or image file.
    Enforces page limits, detects scanned PDFs, checks OCR availability,
    and returns text with optical character confidence scores.

    Note: extraction_confidence strictly measures optical text legibility,
    NEVER medical or clinical correctness.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Medical document file not found at: {file_path}")

    warnings = []
    tesseract_installed = is_tesseract_available()

    # 1. Processing PDF Files
    if file_type == 'PDF':
        try:
            doc = pymupdf.open(file_path)
        except Exception as e:
            logger.error(f"Failed to open PDF document: {e.__class__.__name__}")
            raise ValueError("The uploaded PDF file is corrupt or malformed and cannot be opened.")

        total_pages = len(doc)
        pages_to_process = min(total_pages, MAX_PDF_PAGES)

        if total_pages > MAX_PDF_PAGES:
            warnings.append(
                f"Document contains {total_pages} pages. Only the first {MAX_PDF_PAGES} pages were processed for safety."
            )

        extracted_text_parts = []
        is_scanned = True

        for page_num in range(pages_to_process):
            page = doc[page_num]
            text = page.get_text("text").strip()
            if len(text) > 20:  # Significant digital text present
                is_scanned = False
                extracted_text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

        # If digital text was found
        if not is_scanned and extracted_text_parts:
            full_text = "\n\n".join(extracted_text_parts)
            doc.close()
            return {
                "raw_text": full_text,
                "method": "PYMUPDF_DIGITAL",
                "page_count": pages_to_process,
                "total_pages": total_pages,
                "extraction_confidence": 0.98,  # High optical character clarity from digital PDF
                "is_scanned": False,
                "ocr_available": tesseract_installed,
                "warnings": warnings,
            }

        # If PDF is scanned / image-based
        warnings.append("Document appears to be a scanned or photo-based PDF.")

        if not tesseract_installed:
            doc.close()
            warnings.append(
                "Local Tesseract OCR binary is not installed on this machine. "
                "Text could not be extracted automatically from this scanned PDF."
            )
            return {
                "raw_text": "",
                "method": "NONE",
                "page_count": pages_to_process,
                "total_pages": total_pages,
                "extraction_confidence": 0.0,
                "is_scanned": True,
                "ocr_available": False,
                "warnings": warnings,
            }

        # If Tesseract is installed, render pages and OCR
        ocr_text_parts = []
        confidences = []

        for page_num in range(min(pages_to_process, 3)): # Limit scanned PDF OCR to first 3 pages locally
            page = doc[page_num]
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            processed_img = preprocess_image_for_ocr(img)

            ocr_data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)
            page_words = []
            for i, word in enumerate(ocr_data['text']):
                word = word.strip()
                if word:
                    page_words.append(word)
                    try:
                        conf = float(ocr_data['conf'][i])
                        if conf > 0:
                            confidences.append(conf)
                    except (ValueError, TypeError):
                        pass

            if page_words:
                ocr_text_parts.append(f"--- Page {page_num + 1} (OCR) ---\n" + " ".join(page_words))

        doc.close()
        avg_conf = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.5

        return {
            "raw_text": "\n\n".join(ocr_text_parts),
            "method": "TESSERACT_OCR",
            "page_count": pages_to_process,
            "total_pages": total_pages,
            "extraction_confidence": round(avg_conf, 2),
            "is_scanned": True,
            "ocr_available": True,
            "warnings": warnings,
        }

    # 2. Processing Image Files (JPEG / PNG)
    elif file_type in ['JPEG', 'PNG']:
        try:
            image = Image.open(file_path)
        except Exception as e:
            logger.error(f"Failed to open image file: {e.__class__.__name__}")
            raise ValueError("The uploaded image is corrupt or cannot be opened.")

        if not tesseract_installed:
            warnings.append(
                "Local Tesseract OCR binary is not installed on this system. "
                "Cannot perform automatic text extraction from image files locally."
            )
            return {
                "raw_text": "",
                "method": "NONE",
                "page_count": 1,
                "total_pages": 1,
                "extraction_confidence": 0.0,
                "is_scanned": True,
                "ocr_available": False,
                "warnings": warnings,
            }

        processed_img = preprocess_image_for_ocr(image)
        ocr_data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)

        words = []
        confidences = []
        for i, word in enumerate(ocr_data['text']):
            word = word.strip()
            if word:
                words.append(word)
                try:
                    conf = float(ocr_data['conf'][i])
                    if conf > 0:
                        confidences.append(conf)
                except (ValueError, TypeError):
                    pass

        avg_conf = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.5

        return {
            "raw_text": " ".join(words),
            "method": "TESSERACT_OCR",
            "page_count": 1,
            "total_pages": 1,
            "extraction_confidence": round(avg_conf, 2),
            "is_scanned": True,
            "ocr_available": True,
            "warnings": warnings,
        }

    else:
        raise ValueError(f"Unsupported file type: {file_type}")
