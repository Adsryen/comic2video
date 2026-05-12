import os
import json
import base64
import logging
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

def generate_cinematic_script(manga_name, manga_genre, ocr_data, image_bytes_list):
    total_panels = len(image_bytes_list)
    logger.info(f"→ Sending {total_panels} images to Groq.")

    content_list = []
    
    prompt = f"""
    ROLE: You are 'Manga-Bhai', a high-energy Indian YouTuber.
    TASK: Narrate these {total_panels} panels in Hinglish (Hindi+English).
    FORMAT: JSON ONLY.
    {{
      "scenes": [
        {{ "image_page_index": 0, "narration_segment": "..." }},
        ... (Must have exactly {total_panels} items)
      ]
    }}
    Manga: {manga_name}
    """
    
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
        if groq_client is None:
            return fallback_script(manga_name, ocr_data)

        completion = groq_client.chat.completions.create(
            # ✅ FIXED: Correct active model
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": content_list}],
            temperature=0.6,
            max_tokens=2500,
            response_format={"type": "json_object"} 
        )

        raw = completion.choices[0].message.content
        json_str = _extract_json_from_text(raw)
        if not json_str: return fallback_script(manga_name, ocr_data)

        data = json.loads(json_str)
        return data

    except Exception as e:
        logger.error(f"❌ Groq Script Gen Failed: {e}")
        return fallback_script(manga_name, ocr_data)