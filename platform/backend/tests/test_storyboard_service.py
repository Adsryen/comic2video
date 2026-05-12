from app.services.storyboard_service import StoryboardService


def test_storyboard_service_creates_scene_entries():
    panels = [
        {"panel_id": "p1", "page_index": 0, "ocr_text": "Hello", "scene_description": "Hero speaks", "importance_score": 0.9},
        {"panel_id": "p2", "page_index": 0, "ocr_text": "World", "scene_description": "Villain appears", "importance_score": 0.8},
    ]

    storyboard = StoryboardService.build(panels)

    assert len(storyboard["scenes"]) == 2
    assert storyboard["scenes"][0]["panel_ids"] == ["p1"]
    assert storyboard["scenes"][0]["video_mode"] == "basic"
