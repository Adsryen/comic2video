class StoryboardService:
    @staticmethod
    def build(panels: list[dict]) -> dict:
        scenes = []
        for index, panel in enumerate(panels):
            scenes.append(
                {
                    "scene_index": index,
                    "panel_ids": [panel["panel_id"]],
                    "narration_text": panel.get("ocr_text") or panel.get("scene_description") or "",
                    "subtitle_text": panel.get("ocr_text") or "",
                    "video_mode": "basic",
                    "video_prompt": panel.get("scene_description") or "",
                    "duration": 4.0,
                    "audio_asset_id": None,
                    "clip_asset_id": None,
                }
            )
        return {"pages": [], "panels": panels, "scenes": scenes}
