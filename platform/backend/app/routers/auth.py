from fastapi import APIRouter, Depends, Request, Response, HTTPException

from app.auth import auth_is_enabled, require_current_user
from app.config import AUTH_SESSION_COOKIE_DOMAIN, AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_COOKIE_SECURE, FRONTEND_BASE_URL
from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, MeResponse, RefreshRequest, RegisterRequest
from app.services.auth_service import AuthService
from app.services.oauth.google_service import GoogleOAuthService
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _set_session_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        key=AUTH_SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=AUTH_SESSION_COOKIE_SECURE,
        samesite="lax",
        domain=AUTH_SESSION_COOKIE_DOMAIN or None,
        path="/",
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    result = AuthService(db).register_local_user(
        email=payload.email,
        password=payload.password,
        display_name=payload.display_name,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    _set_session_cookie(response, result.session_token)
    return AuthResponse(user=result.user, access_token=result.access_token, refresh_token=result.refresh_token)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    result = AuthService(db).login_local_user(
        email=payload.email,
        password=payload.password,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    _set_session_cookie(response, result.session_token)
    return AuthResponse(user=result.user, access_token=result.access_token, refresh_token=result.refresh_token)


@router.post("/refresh")
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
    access_token, refresh_token = AuthService(db).refresh(refresh_token=payload.refresh_token)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(AUTH_SESSION_COOKIE_NAME, path="/", domain=AUTH_SESSION_COOKIE_DOMAIN or None)
    response.status_code = 204
    return response


@router.get("/me", response_model=MeResponse)
def get_current_user_profile(current_user: dict = Depends(require_current_user)):
    return MeResponse(auth_enabled=auth_is_enabled(), user=current_user)


@router.get("/google/start")
def google_start(db: Session = Depends(get_db)):
    return GoogleOAuthService(db).start_redirect()


@router.get("/google/callback")
def google_callback(code: str | None = None, state: str | None = None, db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")
    return GoogleOAuthService(db).handle_callback(code=code, state=state, frontend_base_url=FRONTEND_BASE_URL)
