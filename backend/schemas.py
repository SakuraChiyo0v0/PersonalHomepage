from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    username: str
    password: str
    name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    name: Optional[str] = None
    created_at: Optional[datetime] = None


class ProjectCreate(BaseModel):
    title: str
    type: Optional[str] = None
    text: Optional[str] = None
    tags: Optional[List[str]] = None
    tone: Optional[str] = None
    url: Optional[str] = None
    order: Optional[int] = 0
    published: Optional[bool] = True


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    text: Optional[str] = None
    tags: Optional[List[str]] = None
    tone: Optional[str] = None
    url: Optional[str] = None
    order: Optional[int] = None
    published: Optional[bool] = None


class ProjectResponse(BaseModel):
    id: int
    title: str
    type: Optional[str] = None
    text: Optional[str] = None
    tags: Optional[List[str]] = None
    tone: Optional[str] = None
    url: Optional[str] = None
    order: int
    published: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LifeLogCreate(BaseModel):
    time: datetime
    title: str
    text: Optional[str] = None
    order: Optional[int] = 0
    published: Optional[bool] = True


class LifeLogUpdate(BaseModel):
    time: Optional[datetime] = None
    title: Optional[str] = None
    text: Optional[str] = None
    order: Optional[int] = None
    published: Optional[bool] = None


class LifeLogResponse(BaseModel):
    id: int
    time: datetime
    title: str
    text: Optional[str] = None
    order: int
    published: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
