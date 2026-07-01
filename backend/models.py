from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String)
    created_at = Column(DateTime)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    type = Column(String)
    text = Column(Text)
    tags = Column(JSON)
    tone = Column(String)
    url = Column(String)
    order = Column(Integer, default=0)
    published = Column(Boolean, default=True)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class LifeLog(Base):
    __tablename__ = "life_log"

    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime, nullable=False)
    title = Column(String, nullable=False)
    text = Column(Text)
    order = Column(Integer, default=0)
    published = Column(Boolean, default=True)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
