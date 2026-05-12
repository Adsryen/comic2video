from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.models import Asset
from app.db.session import get_db

router = APIRouter(prefix="/api/v1", tags=["assets"])


@router.get("/storage/{asset_id}")
def get_asset_file(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    path = Path(asset.storage_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Asset file not found")

    media_type = asset.mime_type or "application/octet-stream"
    filename = path.name
    return FileResponse(path, media_type=media_type, filename=filename)
