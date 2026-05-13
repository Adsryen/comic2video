import os
import json
import base64
import logging
from typing import Any

import requests
from groq import Groq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("groq_utils")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def _extract_json_from_text(raw: str):
    if not raw: return None
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1:
        return raw[start:end + 1]
    return None

def fallback_script(name: str, ocr: str):
    return {
        "full_narration": f"Yeh {name} ki kahani hai...",
        "scenes": [{"narration_segment": "Kahani shuru hoti hai...", "image_page_index": 0}]
    }


def _provider_options(provider_config: dict[str, Any] | None) -> dict[str, Any]:
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


def _build_text_prompt(manga_name: str, manga_genre: str, ocr_data: str, total_panels: int, storyboard_scenes: list[dict] | None = None) -> str:
    storyboard_lines = []
    for scene in storyboard_scenes or []:
        storyboard_lines.append(
            f"scene_index={scene.get('scene_index')} subtitle={scene.get('subtitle_text', '')} narration={scene.get('narration_text', '')}"
        )

    storyboard_text = "\n".join(storyboard_lines[:12])
    return f"""
ROLE: You are a comic-to-video scripting assistant.
TASK: Produce concise narration JSON for {total_panels} comic panels.
FORMAT: JSON ONLY.
{{
  "scenes": [
    {{ "image_page_index": 0, "narration_segment": "..." }}
  ]
}}
Manga name: {manga_name}
Genre / mode: {manga_genre}
OCR summary:
{ocr_data[:4000]}

Storyboard hints:
{storyboard_text[:4000]}
"""


def _generate_with_openai_compatible(
    provider_config: dict[str, Any],
    prompt: str,
) -> dict[str, Any] | None:
    base_url = (provider_config.get("base_url") or "").rstrip("/")
    if not base_url:
        return None

    options = _provider_options(provider_config)
    api_key = options.get("api_key") or os.getenv("SCRIPT_API_KEY")
    model_name = provider_config.get("model_name") or os.getenv("SCRIPT_MODEL_NAME") or "script-default"
    temperature = options.get("temperature", 0.6)
    max_tokens = options.get("max_tokens", 1200)

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    response = requests.post(
        f"{base_url}/chat/completions",
        headers=headers,
        json={
            "model": model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        },
        timeout=options.get("timeout_seconds", 30),
    )
    response.raise_for_status()
    payload = response.json()
    raw = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
    json_str = _extract_json_from_text(raw)
    if not json_str:
        return None
    return json.loads(json_str)


def _generate_with_groq(content_list: list[dict[str, Any]], manga_name: str, ocr_data: str):
    if groq_client is None:
        return fallback_script(manga_name, ocr_data)

    completion = groq_client.chat.completions.create(
        model=os.getenv("GROQ_SCRIPT_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
        messages=[{"role": "user", "content": content_list}],
        temperature=0.6,
        max_tokens=2500,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content
    json_str = _extract_json_from_text(raw)
    if not json_str:
        return fallback_script(manga_name, ocr_data)

    return json.loads(json_str)

def generate_cinematic_script(manga_name, manga_genre, ocr_data, image_bytes_list, provider_config=None, storyboard_scenes=None):
    total_panels = len(image_bytes_list)
    provider_key = (provider_config or {}).get("provider_key") or os.getenv("SCRIPT_PROVIDER") or "groq"
    logger.info(f"→ Generating script with provider={provider_key} for {total_panels} panels.")

    content_list = []
    prompt = _build_text_prompt(manga_name, manga_genre, ocr_data, total_panels, storyboard_scenes)
    
    content_list.append({"type": "text", "text": prompt})

    # Limit to 3 images to avoid token overflow
    for i, img_bytes in enumerate(image_bytes_list[:3]):
        b64 = base64.b64encode(img_bytes).decode('utf-8')
        content_list.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
        })
        content_list.append({"type": "text", "text": f"[Panel {i}]"})

    try:
        if provider_key == "openai_compatible":
            data = _generate_with_openai_compatible(provider_config or {}, prompt)
            if data:
                return data
            return fallback_script(manga_name, ocr_data)

        return _generate_with_groq(content_list, manga_name, ocr_data)

    except Exception as e:
        logger.error(f"❌ Script Gen Failed with provider {provider_key}: {e}")
        return fallback_script(manga_name, ocr_data)
