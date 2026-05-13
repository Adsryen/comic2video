"""
Local OCR engine using Tesseract or fallback to GPT OCR
-------------------------------------------------------
No Google Cloud required.
"""

import io
import json

import requests
import pytesseract
from PIL import Image

from app.services.model_config_service import DEFAULT_PROVIDER_FALLBACKS

# ----------------------------------------------------------
# 2. Simple OCR function (LOCAL)
# ----------------------------------------------------------
def _provider_options(provider_config: dict | None) -> dict:
    if not provider_config:
        return {}

    raw = provider_config.get("config_json")
    if not raw:
        return {}

    if isinstance(raw, dict):
        return raw

    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}


def _ocr_with_tesseract(img_bytes: bytes, provider_config: dict | None = None) -> str:
    try:
        image = Image.open(io.BytesIO(img_bytes))
        options = _provider_options(provider_config)
        language = options.get("language")
        text = pytesseract.image_to_string(image, lang=language) if language else pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        print("OCR failed:", e)
        return ""


def _ocr_with_http_provider(img_bytes: bytes, provider_config: dict) -> str:
    base_url = (provider_config.get("base_url") or "").rstrip("/")
    if not base_url:
        return ""

    options = _provider_options(provider_config)
    endpoint = options.get("ocr_endpoint", "/ocr")
    files = {"file": ("panel.jpg", img_bytes, "image/jpeg")}
    data = {}
    if options.get("language"):
        data["language"] = options["language"]

    try:
        response = requests.post(
            f"{base_url}{endpoint}",
            files=files,
            data=data,
            timeout=options.get("timeout_seconds", 30),
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, dict):
            return (
                payload.get("text")
                or payload.get("result")
                or payload.get("ocr_text")
                or ""
            ).strip()
    except Exception as e:
        print("OCR provider request failed:", e)
    return ""


def ocr_image_bytes(img_bytes: bytes, provider_config: dict | None = None) -> str:
    provider = provider_config or DEFAULT_PROVIDER_FALLBACKS.get("ocr", {})
    provider_key = provider.get("provider_key") or "tesseract"

    if provider_key == "tesseract":
        return _ocr_with_tesseract(img_bytes, provider)

    text = _ocr_with_http_provider(img_bytes, provider)
    if text:
        return text

    return _ocr_with_tesseract(img_bytes, provider)

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
