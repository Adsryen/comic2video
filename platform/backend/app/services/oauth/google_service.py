from __future__ import annotations

from urllib.parse import urlencode

from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI


class GoogleOAuthService:
    def __init__(self, session: Session):
        self.session = session

    def start_redirect(self):
        query = urlencode(
            {
                "client_id": GOOGLE_CLIENT_ID,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": "openid email profile",
                "access_type": "online",
                "prompt": "consent",
                "state": "google-oauth-state",
            }
        )
        return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")

    def handle_callback(self, *, code: str, state: str | None, frontend_base_url: str):
        return RedirectResponse(f"{frontend_base_url}/projects")
