from pathlib import Path
from zipfile import ZipFile

from PIL import Image

from app.services.parse_service import ParseService


def _make_image(path: Path, color: str):
    image = Image.new("RGB", (64, 64), color=color)
    image.save(path)


def test_detect_source_type_for_pdf(tmp_path: Path):
    pdf_path = tmp_path / "chapter.pdf"
    pdf_path.write_bytes(b"fake-pdf")

    assert ParseService.detect_source_type(str(pdf_path)) == "pdf"


def test_detect_source_type_for_cbz(tmp_path: Path):
    cbz_path = tmp_path / "chapter.cbz"
    cbz_path.write_bytes(b"fake-cbz")

    assert ParseService.detect_source_type(str(cbz_path)) == "cbz"


def test_extract_pages_returns_sorted_cbz_image_paths(tmp_path: Path):
    source_dir = tmp_path / "source"
    source_dir.mkdir()
    page_b = source_dir / "page_b.png"
    page_a = source_dir / "page_a.png"
    _make_image(page_b, "blue")
    _make_image(page_a, "red")

    cbz_path = tmp_path / "chapter.cbz"
    with ZipFile(cbz_path, "w") as archive:
        archive.write(page_b, arcname="b/page_b.png")
        archive.write(page_a, arcname="a/page_a.png")

    output_dir = tmp_path / "out"
    pages = ParseService.extract_pages(str(cbz_path), str(output_dir))

    assert [Path(page).name for page in pages] == ["page_a.png", "page_b.png"]


def test_build_panel_manifest_from_cbz_images(tmp_path: Path):
    page1 = tmp_path / "page1.png"
    page2 = tmp_path / "page2.png"
    _make_image(page1, "green")
    _make_image(page2, "yellow")

    manifest = ParseService.build_panel_manifest([str(page1), str(page2)], tmp_path / "panels")

    assert manifest["pages"] == 2
    assert manifest["panels"] == 2
    assert len(manifest["panel_items"]) == 2
    assert manifest["panel_items"][0]["page_index"] == 0
    assert manifest["panel_items"][1]["page_index"] == 1
    assert manifest["panel_items"][0]["storage_path"].endswith(".jpg")


def test_build_panel_manifest_falls_back_to_placeholder_when_no_pages(tmp_path: Path):
    manifest = ParseService.build_panel_manifest([], tmp_path / "panels")

    assert manifest["pages"] == 1
    assert manifest["panels"] == 1
    assert len(manifest["panel_items"]) == 1
    assert Path(manifest["panel_items"][0]["storage_path"]).exists()
