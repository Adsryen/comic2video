from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.config import AUTH_REFRESH_TOKEN_EXPIRES_DAYS
from app.db.models import RefreshToken, UserSession


class SessionService:
    def __init__(self, session: Session):
        self.session = session

    def create_user_session(self, *, user_id: str, session_token_hash: str, ip: str | None, user_agent: str | None) -> UserSession:
        record = UserSession(
            user_id=user_id,
            session_token_hash=session_token_hash,
            expires_at=datetime.utcnow() + timedelta(days=7),
            ip=ip,
            user_agent=user_agent,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def create_refresh_token(self, *, user_id: str, token_hash: str) -> RefreshToken:
        record = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(days=AUTH_REFRESH_TOKEN_EXPIRES_DAYS),
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def revoke_refresh_token(self, token_hash: str) -> None:
        token = self.session.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if token and token.revoked_at is None:
            token.revoked_at = datetime.utcnow()
            self.session.add(token)
            self.session.commit()

    def get_valid_session(self, session_token_hash: str) -> UserSession | None:
        record = self.session.query(UserSession).filter(UserSession.session_token_hash == session_token_hash).first()
        if record is None or record.revoked_at is not None or record.expires_at < datetime.utcnow():
            return None
        return record
