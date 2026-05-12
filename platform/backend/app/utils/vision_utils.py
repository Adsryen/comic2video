"""
Local OCR engine using Tesseract or fallback to GPT OCR
-------------------------------------------------------
No Google Cloud required.
"""

import io
import pytesseract
from PIL import Image

# ----------------------------------------------------------
# 2. Simple OCR function (LOCAL)
# ----------------------------------------------------------
def ocr_image_bytes(img_bytes: bytes) -> str:
    """
    Local OCR using pytesseract.
    Super fast, no external API required.
    """
    try:
        image = Image.open(io.BytesIO(img_bytes))
        # Tesseract is installed in the Docker container, so this works natively
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        print("OCR failed:", e)
        return ""

# ----------------------------------------------------------
# 3. (Optional) Language detection
# ----------------------------------------------------------
def detect_language(text: str) -> str:
    if not text.strip():
        return "unknown"

    # very naive language detection (Hindi vs English)
    if any(char in "अआइईउऊएऐओऔकखगघङचछजझञटठडढणतथदधन" for char in text):
        return "hi"

    return "en"