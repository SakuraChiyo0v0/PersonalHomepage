from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import Project, User
from schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from database import get_db
from routes.users import get_current_user

router = APIRouter()


@router.get("/", response_model=list[ProjectResponse])
async def read_projects(skip: int = 0, limit: int = 100, published: bool = None, db: Session = Depends(get_db)):
    query = db.query(Project)
    if published is not None:
        query = query.filter(Project.published == published)
    projects = query.order_by(Project.order).offset(skip).limit(limit).all()
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_project = Project(
        title=project.title,
        type=project.type,
        text=project.text,
        tags=project.tags,
        tone=project.tone,
        url=project.url,
        order=project.order,
        published=project.published,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.title is not None:
        db_project.title = project.title
    if project.type is not None:
        db_project.type = project.type
    if project.text is not None:
        db_project.text = project.text
    if project.tags is not None:
        db_project.tags = project.tags
    if project.tone is not None:
        db_project.tone = project.tone
    if project.url is not None:
        db_project.url = project.url
    if project.order is not None:
        db_project.order = project.order
    if project.published is not None:
        db_project.published = project.published
    db_project.updated_at = datetime.now()
    db.commit()
    db.refresh(db_project)
    return db_project


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}
