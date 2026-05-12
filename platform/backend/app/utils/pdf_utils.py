import io
import cv2
import numpy as np
from typing import List
from pdf2image import convert_from_path
from PIL import Image, ImageOps, ImageFilter

# ----------------------------------------------------------
# 1. Convert PDF pages → high quality PIL images (OPTIMIZED)
# ----------------------------------------------------------
def _load_pdf_pages(pdf_path: str, dpi: int = 120, max_pages: int = 50) -> List[Image.Image]:
    """
    ⚡ OPTIMIZED: DPI reduced from 200 → 120
    Saves 50-60% file size with no visible quality loss for video
    """
    print(f"📄 Loading PDF: {pdf_path}")
    pages = convert_from_path(
        pdf_path,
        dpi=dpi,
        first_page=1,
        last_page=max_pages,
        fmt="jpeg"
    )

    processed = []
    for img in pages:
        img = img.convert("RGB")
        img = ImageOps.autocontrast(img, cutoff=2)
        img = img.filter(ImageFilter.SHARPEN)
        processed.append(img)
    
    print(f"✔ Loaded {len(processed)} pages")
    return processed

# ----------------------------------------------------------
# 2. Detect vertical manga panels using OpenCV
# ----------------------------------------------------------
def _extract_panels_from_page(pil_img: Image.Image) -> List[Image.Image]:
    """
    Detects manga panels top→bottom using edges + dilate + contours.
    ⚡ OPTIMIZED: Added strict filtering to prevent over-extraction
    """
    img = np.array(pil_img)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # Edge detection
    edges = cv2.Canny(gray, 60, 120)

    # Connect borders
    kernel = np.ones((15, 15), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=2)

    contours, _ = cv2.findContours(
        dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    panel_images = []
    H, W = gray.shape

    # ⚡ CRITICAL: Minimum panel size (prevent tiny fragments)
    MIN_PANEL_HEIGHT = H * 0.15  # At least 15% of page height
    MIN_PANEL_WIDTH = W * 0.20   # At least 20% of page width
    MIN_PANEL_AREA = (H * W) * 0.05  # At least 5% of page area

    # Sort top → bottom
    contours = sorted(contours, key=lambda c: cv2.boundingRect(c)[1])

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h

        # ⚡ STRICT FILTERING: Ignore tiny fragments
        if h < MIN_PANEL_HEIGHT: continue
        if w < MIN_PANEL_WIDTH: continue
        if area < MIN_PANEL_AREA: continue

        crop = img[y:y+h, x:x+w]
        pil_crop = Image.fromarray(crop).convert("RGB")
        pil_crop = ImageOps.autocontrast(pil_crop, cutoff=3)

        panel_images.append(pil_crop)
        
        # ⚡ SAFETY: Max 20 panels per page
        if len(panel_images) >= 20:
            print("⚠ Warning: Reached max 20 panels per page, stopping extraction")
            break

    # ⚡ FALLBACK: Return entire page if no valid panels found (FIXES 0 FRAMES ISSUE)
    if not panel_images:
        print("⚠ No valid panels found, using full page")
        return [pil_img]

    print(f"✔ Extracted {len(panel_images)} panels from page (filtered)")
    return panel_images

# =====================================================================
# MAIN FUNCTION CALL
# =====================================================================
def extract_pdf_images_high_quality(
    pdf_path: str,
    dpi: int = 120,      # ⚡ OPTIMIZED
    max_pages: int = 50
) -> List[Image.Image]:
    """
    Wrapper used by main worker.
    Returns LIST OF PIL IMAGES.
    """
    pages = _load_pdf_pages(pdf_path, dpi=dpi, max_pages=max_pages)
    all_panels: List[Image.Image] = []
    
    for page in pages:
        all_panels.extend(_extract_panels_from_page(page))

    print(f"✔ extract_pdf_images_high_quality() → {len(all_panels)} total panels")
    return all_panels