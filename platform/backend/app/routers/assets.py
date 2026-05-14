from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.db.models import Asset
from app.db.session import get_db
from app.permissions import ensure_asset_access
from app.services.storage_service import StorageService

router = APIRouter(prefix="/api/v1", tags=["assets"])


@router.get("/storage/{asset_id}")
def get_asset_file(asset_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    asset = ensure_asset_access(db, asset, current_user)

    storage = StorageService()
    if not storage.exists(asset.storage_path):
        raise HTTPException(status_code=404, detail="Asset file not found")

    media_type = asset.mime_type or "application/octet-stream"
    filename = asset.storage_path.split("/")[-1]
    stream = storage.open_stream(asset.storage_path)
    headers = {"Content-Disposition": f"inline; filename={filename}"}
    return StreamingResponse(stream, media_type=media_type, headers=headers)
