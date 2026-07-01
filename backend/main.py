from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routes import users, projects, life_log, vrchat, social
from contextlib import asynccontextmanager
import asyncio
import logging
import os

logger = logging.getLogger(__name__)


# ── 后台统一数据刷新 ──

async def _social_refresh_loop():
    from routes.social import refresh_social_cache
    await asyncio.sleep(5)
    print("[Social] Auto-refresh started (check every 10s)")
    while True:
        try:
            await refresh_social_cache()
        except Exception as e:
            print(f"[Social] Refresh error: {e}")
        await asyncio.sleep(10)  # 每 10s 检查一次，各平台按各自间隔决定是否刷新


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_social_refresh_loop())
    yield


app = FastAPI(title="SakuraChiyo API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users, prefix="/api/users", tags=["users"])
app.include_router(projects, prefix="/api/projects", tags=["projects"])
app.include_router(life_log, prefix="/api/life_log", tags=["life_log"])
app.include_router(vrchat, prefix="/api/vrchat", tags=["vrchat"])
app.include_router(social, prefix="/api/social", tags=["social"])


@app.get("/api/status")
async def status():
    return {"online": True, "message": "SakuraChiyo API"}


frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dist')
if os.path.exists(frontend_dir):
    for subdir in ['assets', 'images', 'music', 'vendor']:
        subdir_path = os.path.join(frontend_dir, subdir)
        if os.path.exists(subdir_path):
            app.mount(f"/{subdir}", StaticFiles(directory=subdir_path), name=subdir)

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dir, 'index.html'))