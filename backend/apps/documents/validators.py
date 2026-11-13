import os
import re
from rest_framework.exceptions import ValidationError

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

MAGIC_SIGNATURES = {
    'PDF': b'%PDF-',
    'JPEG': b'\xff\xd8\xff',
    'PNG': b'\x89PNG\r\n\x1a\n',
}

def sanitize_filename(filename: str) -> str:
    """
    Strips directory traversal sequences, path separators, and unsafe characters.
    """
    clean_name = os.path.basename(filename)
    # Remove characters that aren't alphanumeric, dot, dash, or underscore
    clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', clean_name)
    if not clean_name or clean_name.startswith('.'):
        clean_name = f"document_{clean_name}"
    return clean_name[:150]

def validate_and_sniff_file(uploaded_file):
    """
    Validates file size and inspects actual content magic bytes (file signature),
    guaranteeing the file is genuinely a PDF, JPEG, or PNG regardless of file extension.
    """
    # 1. Size check
    if uploaded_file.size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            f"File size exceeds maximum allowed limit of 10 MB. (Uploaded: {uploaded_file.size / (1024*1024):.2f} MB)"
        )

    if uploaded_file.size == 0:
        raise ValidationError("Uploaded file is empty.")

    # 2. Magic signature check
    initial_pos = uploaded_file.tell() if hasattr(uploaded_file, 'tell') else 0
    header = uploaded_file.read(16)
    if hasattr(uploaded_file, 'seek'):
        uploaded_file.seek(initial_pos)

    detected_type = None
    if header.startswith(MAGIC_SIGNATURES['PDF']):
        detected_type = 'PDF'
    elif header.startswith(MAGIC_SIGNATURES['JPEG']):
        detected_type = 'JPEG'
    elif header.startswith(MAGIC_SIGNATURES['PNG']):
        detected_type = 'PNG'
    else:
        raise ValidationError(
            "Security verification failed: File content does not match genuine PDF, JPEG, or PNG format."
        )

    return detected_type
