import os
from database import engine, Base, SessionLocal
from models import User
from security import get_password_hash
from datetime import datetime

os.makedirs(os.path.dirname("./data/sakurachiyo.db"), exist_ok=True)

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if not db.query(User).filter(User.username == "admin").first():
    admin_user = User(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        name="Admin",
        created_at=datetime.now()
    )
    db.add(admin_user)
    db.commit()
    print("Admin user created")
else:
    print("Admin user already exists")

db.close()
print("Database initialized")
