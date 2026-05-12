# backend/app/utils/supabase_utils.py

import os
import time
from supabase import create_client, Client


# -------------------------------------------------------------
# Load required environment variables
# ---------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET_NAME")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
    )

# -------------------------------------------------------------
# Initialize Client (sync only)
# -------------------------------------------------------------
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    raise RuntimeError(f"❌ Failed to initialize Supabase client: {e}")


# -------------------------------------------------------------
# Clean path helper
# -------------------------------------------------------------
def _clean_path(path: str) -> str:
    p = str(path).replace("\r", "").replace("\n", "")
    while "//" in p:
        p = p.replace("//", "/")
    return p.lstrip("/")


# -------------------------------------------------------------
# SYNC Upload helper
# -------------------------------------------------------------
def supabase_upload(file_bytes: bytes, file_path: str, content_type: str) -> str:
    """
    Uploads file to Supabase Storage with RETRY logic.
    Handles 'Server disconnected' errors by retrying.
    """
    max_retries = 3
    
    for attempt in range(1, max_retries + 1):
        try:
            # ⚡ OPTIMIZATION: Check if file already exists to skip upload
            # (Optional, but good for speed if you re-run often)
            # list_files = supabase.storage.from_(SUPABASE_BUCKET).list(os.path.dirname(file_path))
            # ... (omitted for simplicity, sticking to overwrite)

            # Upload (using 'upsert' to overwrite if exists)
            res = supabase.storage.from_(SUPABASE_BUCKET).upload(
                path=file_path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            
            # Construct Public URL
            # Note: Supabase Python SDK usage varies. 
            # If your bucket is public, we can construct the URL manually or use get_public_url
            
            public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(file_path)
            
            # ⚡ Fix: Sometimes get_public_url returns a signed URL or different format
            # Ensure it looks correct. If get_public_url returns nothing useful, construct manually:
            # public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_path}"
            
            print(f"✔ Uploaded → {public_url}")
            return public_url

        except Exception as e:
            error_msg = str(e).lower()
            print(f"⚠ Upload attempt {attempt}/{max_retries} failed: {error_msg}")
            
            # If it's the last attempt, raise the error
            if attempt == max_retries:
                raise RuntimeError(f"❌ Supabase upload failed after {max_retries} attempts: {e}")
            
            # Wait a bit before retrying (exponential backoff)
            time.sleep(1.5 * attempt)
            
            # ⚡ CRITICAL FIX for "Server Disconnected":
            # Sometimes the global client connection gets stale. 
            # We rarely can "reset" the global client easily here without re-initializing,
            # but usually, a short sleep + retry is enough for httpx to pick a new connection.