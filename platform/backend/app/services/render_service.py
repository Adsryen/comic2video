from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image


class RenderService:
    @staticmethod
    def render_slideshow(
        panel_paths: list[str],
        output_path: str,
        seconds_per_panel: float = 2.0,
        fps: int = 24,
        frame_size: tuple[int, int] = (1280, 720),
    ) -> dict:
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)

        frames_per_panel = max(int(seconds_per_panel * fps), 1)
        writer = cv2.VideoWriter(
            str(destination),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            frame_size,
        )
        if not writer.isOpened():
            raise RuntimeError("Failed to open video writer")

        rendered_panels = 0
        try:
            for panel_path in panel_paths:
                frame = RenderService._build_frame(panel_path, frame_size)
                for _ in range(frames_per_panel):
                    writer.write(frame)
                rendered_panels += 1
        finally:
            writer.release()

        return {
            "video_path": str(destination),
            "panel_count": rendered_panels,
            "duration": round(rendered_panels * frames_per_panel / fps, 2),
            "fps": fps,
            "width": frame_size[0],
            "height": frame_size[1],
        }

    @staticmethod
    def _build_frame(panel_path: str, frame_size: tuple[int, int]):
        width, height = frame_size
        canvas = Image.new("RGB", (width, height), color=(10, 10, 14))
        image = Image.open(panel_path).convert("RGB")
        image.thumbnail((width, height), Image.Resampling.LANCZOS)

        x_offset = (width - image.width) // 2
        y_offset = (height - image.height) // 2
        canvas.paste(image, (x_offset, y_offset))

        array = np.array(canvas)
        return cv2.cvtColor(array, cv2.COLOR_RGB2BGR)
