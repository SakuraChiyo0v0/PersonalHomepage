from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import LifeLog, User
from schemas import LifeLogCreate, LifeLogUpdate, LifeLogResponse
from database import get_db
from routes.users import get_current_user

router = APIRouter()


@router.get("/", response_model=list[LifeLogResponse])
async def read_life_logs(skip: int = 0, limit: int = 100, published: bool = None, db: Session = Depends(get_db)):
    query = db.query(LifeLog)
    if published is not None:
        query = query.filter(LifeLog.published == published)
    logs = query.order_by(LifeLog.order).offset(skip).limit(limit).all()
    return logs


@router.get("/{log_id}", response_model=LifeLogResponse)
async def read_life_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(LifeLog).filter(LifeLog.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="LifeLog not found")
    return log


@router.post("/", response_model=LifeLogResponse)
async def create_life_log(log: LifeLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_log = LifeLog(
        time=log.time,
        title=log.title,
        text=log.text,
        order=log.order,
        published=log.published,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@router.put("/{log_id}", response_model=LifeLogResponse)
async def update_life_log(log_id: int, log: LifeLogUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_log = db.query(LifeLog).filter(LifeLog.id == log_id).first()
    if db_log is None:
        raise HTTPException(status_code=404, detail="LifeLog not found")
    if log.time is not None:
        db_log.time = log.time
    if log.title is not None:
        db_log.title = log.title
    if log.text is not None:
        db_log.text = log.text
    if log.order is not None:
        db_log.order = log.order
    if log.published is not None:
        db_log.published = log.published
    db_log.updated_at = datetime.now()
    db.commit()
    db.refresh(db_log)
    return db_log


@router.delete("/{log_id}")
async def delete_life_log(log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = db.query(LifeLog).filter(LifeLog.id == log_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="LifeLog not found")
    db.delete(log)
    db.commit()
    return {"message": "LifeLog deleted"}
