from pydantic import BaseModel


class StoryboardScene(BaseModel):
    scene_index: int
    panel_ids: list[str]
    narration_text: str
    subtitle_text: str
    video_mode: str
    video_prompt: str
    duration: float
    audio_asset_id: str | None = None
    clip_asset_id: str | None = None
