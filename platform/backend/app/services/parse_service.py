import io
import os
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw

from app.utils.pdf_utils import extract_pdf_images_high_quality
from app.utils.vision_utils import detect_language, ocr_image_bytes


class ParseService:
    @staticmethod
    def detect_source_type(source_path: str) -> str:
        suffix = Path(source_path).suffix.lower()
        if suffix == ".pdf":
            return "pdf"
        if suffix == ".cbz":
            return "cbz"
        raise ValueError(f"Unsupported source type: {suffix}")

    @staticmethod
    def extract_pages(source_path: str, output_dir: str):
        source_type = ParseService.detect_source_type(source_path)
        if source_type == "pdf":
            try:
                return extract_pdf_images_high_quality(source_path)
            except Exception:
                return []

        os.makedirs(output_dir, exist_ok=True)
        try:
            with zipfile.ZipFile(source_path, "r") as archive:
                archive.extractall(output_dir)
                return sorted(
                    [
                        str(Path(output_dir) / name)
                        for name in archive.namelist()
                        if name.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
                    ]
                )
        except Exception:
            return []

    @staticmethod
    def build_panel_manifest(page_items: list, output_dir: str | Path) -> dict:
        destination_dir = Path(output_dir)
        destination_dir.mkdir(parents=True, exist_ok=True)

        panel_items = []
        for page_index, page_item in enumerate(page_items):
            image = ParseService._load_image(page_item)
            if image is None:
                continue
            panel_items.append(
                ParseService._persist_panel_image(
                    image=image,
                    destination_dir=destination_dir,
                    page_index=page_index,
                    panel_index=0,
                )
            )

        if not panel_items:
            placeholder = ParseService._placeholder_image()
            panel_items.append(
                ParseService._persist_panel_image(
                    image=placeholder,
                    destination_dir=destination_dir,
                    page_index=0,
                    panel_index=0,
                    scene_description="Placeholder panel generated because source parsing produced no frames.",
                )
            )
            page_count = 1
        else:
            page_count = len(page_items)

        combined_text = " ".join(item["ocr_text"] for item in panel_items if item["ocr_text"])
        return {
            "pages": page_count,
            "panels": len(panel_items),
            "language": detect_language(combined_text),
            "panel_items": panel_items,
        }

    @staticmethod
    def _load_image(page_item):
        try:
            if isinstance(page_item, Image.Image):
                return page_item.convert("RGB")
            return Image.open(page_item).convert("RGB")
        except Exception:
            return None

    @staticmethod
    def _persist_panel_image(
        image: Image.Image,
        destination_dir: Path,
        page_index: int,
        panel_index: int,
        scene_description: str | None = None,
    ) -> dict:
        normalized = image.convert("RGB")
        filename = f"page-{page_index:04d}-panel-{panel_index:04d}.jpg"
        storage_path = destination_dir / filename
        normalized.save(storage_path, format="JPEG", quality=92)

        image_bytes = ParseService._image_to_bytes(normalized)
        ocr_text = ocr_image_bytes(image_bytes)
        width, height = normalized.size
        panel_id = f"page-{page_index:04d}-panel-{panel_index:04d}"

        return {
            "panel_id": panel_id,
            "page_index": page_index,
            "panel_index": panel_index,
            "storage_path": str(storage_path),
            "mime_type": "image/jpeg",
            "width": width,
            "height": height,
            "ocr_text": ocr_text,
            "scene_description": scene_description or f"Page {page_index + 1} panel {panel_index + 1}",
            "importance_score": 0.5,
        }

    @staticmethod
    def _image_to_bytes(image: Image.Image) -> bytes:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=92)
        return buffer.getvalue()

    @staticmethod
    def _placeholder_image() -> Image.Image:
        image = Image.new("RGB", (1280, 720), color=(24, 24, 32))
        draw = ImageDraw.Draw(image)
        draw.rectangle((80, 80, 1200, 640), outline=(160, 120, 255), width=4)
        draw.text((120, 320), "Source preview unavailable", fill=(240, 240, 245))
        return image
