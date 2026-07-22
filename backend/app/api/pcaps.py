import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.models import PcapFile
from app.schemas.schemas import PcapFileResponse
from app.services.pcap_parser import parse_pcap_task

router = APIRouter()


def _get_pcap_or_404(pcap_id: str, db: Session) -> PcapFile:
    pcap_record = db.query(PcapFile).filter(PcapFile.id == pcap_id).first()
    if not pcap_record:
        raise HTTPException(status_code=404, detail="PCAP file not found")
    return pcap_record


def _safe_original_filename(filename: str | None) -> str:
    return Path(filename or "upload.pcap").name


def _validate_pcap_extension(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in settings.ALLOWED_PCAP_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only .pcap and .pcapng files are supported",
        )
    return extension


@router.post("", response_model=PcapFileResponse)
def upload_pcap(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = _safe_original_filename(file.filename)
    extension = _validate_pcap_extension(filename)

    # 准备保存的文件路径
    pcap_id = str(uuid.uuid4())
    safe_filename = f"{pcap_id}{extension}"
    file_path = settings.UPLOAD_DIR / safe_filename

    # 上传大小限制与保存
    total_size = 0
    try:
        with open(file_path, "wb") as f:
            while chunk := file.file.read(8192):
                total_size += len(chunk)
                if total_size > settings.MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "File exceeds maximum size of "
                            f"{settings.MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
                        ),
                    )
                f.write(chunk)
    except HTTPException:
        file_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # 写入数据库记录
    pcap_record = PcapFile(
        id=pcap_id,
        filename=safe_filename,
        original_filename=filename,
        file_path=str(file_path),
        file_size=total_size,
        status="uploaded",
    )
    db.add(pcap_record)
    db.commit()
    db.refresh(pcap_record)

    # 开启后台任务解析 PCAP
    background_tasks.add_task(parse_pcap_task, pcap_id, str(file_path))

    return pcap_record


@router.get("", response_model=List[PcapFileResponse])
def list_pcaps(db: Session = Depends(get_db)):
    return db.query(PcapFile).order_by(PcapFile.created_at.desc()).all()


@router.get("/{pcap_id}", response_model=PcapFileResponse)
def get_pcap_info(pcap_id: str, db: Session = Depends(get_db)):
    return _get_pcap_or_404(pcap_id, db)


@router.delete("/{pcap_id}")
def delete_pcap(pcap_id: str, db: Session = Depends(get_db)):
    pcap_record = _get_pcap_or_404(pcap_id, db)

    # 删除磁盘文件
    Path(pcap_record.file_path).unlink(missing_ok=True)

    db.delete(pcap_record)
    db.commit()
    return {"message": "PCAP file and analysis results deleted successfully"}


@router.get("/{pcap_id}/download")
def download_pcap(pcap_id: str, db: Session = Depends(get_db)):
    pcap_record = _get_pcap_or_404(pcap_id, db)
    file_path = Path(pcap_record.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404, detail="PCAP file has been missing from storage"
        )

    return FileResponse(
        path=file_path,
        filename=pcap_record.original_filename,
        media_type="application/vnd.tcpdump.pcap",
    )
