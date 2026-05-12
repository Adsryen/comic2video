import asyncio
import os
# Mock config for testing
class Config:
    TTS_CACHE_DIR = "tts_cache"
import app.utils.tts_utils as tts
tts.TTS_CACHE_DIR = "tts_cache"

async def test():
    print("Testing EdgeTTS...")
    text = "Hello brother, this is a test of the new neural voice system."
    path, duration = await tts.generate_narration_audio(text)
    
    print(f"\nSUCCESS!")
    print(f"Saved to: {path}")
    print(f"Duration: {duration}s")
    print("Please play the file to check quality.")

if __name__ == "__main__":
    asyncio.run(test())