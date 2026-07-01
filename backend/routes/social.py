"""
统一社交数据路由 — GitHub + Steam + VRChat
由后端定时刷新，前端只读
"""

import json
import logging
import os
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from vrchat_client import get_vrchat_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["social"])

GITHUB_USER = "SakuraChiyo0v0"

# 持久化设置文件
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "social_settings.json")
GITHUB_TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "github_token.json")

# 缓存
_social_cache: Dict[str, Any] = {"github": {}, "steam": {}, "vrchat": {}, "_updated": 0}
_last_fetch: Dict[str, float] = {"github": 0, "steam": 0, "vrchat": 0}
_default_contrib = [1, 2, 3, 2, 4, 1, 3, 4, 2, 3, 1, 4]


# ── 设置模型 & 读写 ──

class SocialIntervalSettings(BaseModel):
    vrchat: int = Field(default=60, ge=10, le=3600, description="VRChat 刷新间隔（秒）")
    github: int = Field(default=120, ge=30, le=86400, description="GitHub 刷新间隔（秒）")
    steam: int = Field(default=300, ge=30, le=86400, description="Steam 刷新间隔（秒）")

_default_settings = SocialIntervalSettings()

def _load_settings() -> SocialIntervalSettings:
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                return SocialIntervalSettings(**data)
    except Exception:
        pass
    return _default_settings

def _save_settings(s: SocialIntervalSettings):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(s.model_dump(), f, indent=2)


def _load_github_token() -> Optional[str]:
    try:
        if os.path.exists(GITHUB_TOKEN_FILE):
            with open(GITHUB_TOKEN_FILE, "r") as f:
                data = json.load(f)
                return data.get("token")
    except Exception:
        pass
    return None


# ── GitHub 数据获取（服务端） ──

async def _fetch_github():
    import httpx
    # 加载 GitHub Token（5000 req/h vs 未认证的 60 req/h）
    token = _load_github_token()
    headers = {"User-Agent": "PersonalHomepage/1.0", "Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            user_r = await client.get(
                f"https://api.github.com/users/{GITHUB_USER}",
                headers=headers,
            )
            logger.warning(f"[GitHub] GET /users -> {user_r.status_code} (token={bool(token)})")
            if user_r.status_code != 200:
                logger.warning(f"GitHub user fetch: HTTP {user_r.status_code}")
                return None
            user = user_r.json()

            repos_r = await client.get(
                f"https://api.github.com/users/{GITHUB_USER}/repos?sort=updated&per_page=1",
                headers=headers,
            )
            latest = "quietly building"
            if repos_r.status_code == 200:
                repos_data = repos_r.json()
                if repos_data:
                    latest = repos_data[0].get("name", latest)

            # 贡献数据
            events_r = await client.get(
                f"https://api.github.com/users/{GITHUB_USER}/events/public?per_page=100",
                headers=headers,
            )
            contrib_dots = _default_contrib
            if events_r.status_code == 200:
                events = events_r.json()
                contrib_dots = _compute_contrib_dots(events)
                if not contrib_dots:
                    contrib_dots = _default_contrib

            return {
                "avatar": user.get("avatar_url", ""),
                "repos": user.get("public_repos", 0),
                "followers": user.get("followers", 0),
                "latest": latest,
                "contribDots": contrib_dots,
            }
    except Exception as e:
        logger.warning(f"GitHub fetch failed: {e}", exc_info=True)
        return None


def _compute_contrib_dots(events):
    """计算贡献热度点（12 周），返回 0-4 等级数组"""
    now = time.time()
    weeks = []
    for i in range(11, -1, -1):
        t = now - i * 7 * 86400
        dt = time.gmtime(t)
        dow = dt.tm_wday  # Monday=0
        start = t - dow * 86400
        start = start - start % 86400
        weeks.append({"start": start, "end": start + 7 * 86400 - 1, "count": 0})

    for event in events:
        if event.get("type") != "PushEvent":
            continue
        ts = time.mktime(time.strptime(event["created_at"], "%Y-%m-%dT%H:%M:%SZ"))
        for w in weeks:
            if w["start"] <= ts <= w["end"]:
                w["count"] += 1
                break

    def level(c):
        if c == 0: return 0
        if c <= 3: return 1
        if c <= 6: return 2
        if c <= 10: return 3
        return 4
    return [level(w["count"]) for w in weeks]


# ── Steam 数据（静态/半静态） ──

def _load_steam():
    try:
        import os, re
        path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                            "src", "steam.generated.js")
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        def _extract(key, default=""):
            m = re.search(rf"{key}\s*:\s*'([^']*)'", content)
            if not m:
                m = re.search(rf'{key}\s*:\s*"([^"]*)"', content)
            return m.group(1) if m else default

        def _extract_nullable(key):
            m = re.search(rf"{key}\s*:\s*(null)", content)
            if m: return None
            return _extract(key, "")

        # 解析 games 数组（Top 2）
        games_raw = re.findall(r"\{\s*name:\s*'([^']+)',\s*icon:\s*'([^']+)',\s*hoursRecent:\s*([\d.]+),\s*hoursTotal:\s*([\d.]+)\s*\}", content)
        games = [{"name": g[0], "icon": g[1], "hoursRecent": float(g[2]), "hoursTotal": float(g[3])} for g in games_raw[:2]]

        return {
            "name": _extract("name", "SakuraChiyo"),
            "onlineState": _extract("onlineState", "Online"),
            "avatarFull": _extract("avatarFull", ""),
            "avatarMedium": _extract("avatarMedium", ""),
            "location": _extract("location", ""),
            "memberSince": _extract("memberSince", ""),
            "inGame": _extract_nullable("inGame"),
            "games": games,
        }
    except Exception as e:
        logger.warning(f"Steam data load failed: {e}")
        return None


# ── VRChat 数据 ──

async def _fetch_vrchat():
    try:
        client = get_vrchat_client()
        if not client._auth_cookie:
            return {"logged_in": False}
        if not client._current_user:
            await client.get_current_user()
        user = client._current_user
        if not user:
            return {"logged_in": False}

        presence = user.get("presence") or {}
        world_id = presence.get("world") or user.get("worldId")
        instance_id = presence.get("instance") or user.get("instanceId")

        from routes.vrchat import _is_real_instance, _parse_instance_type

        result = {
            "logged_in": True,
            "user": {
                "id": user.get("id"),
                "displayName": user.get("displayName"),
                "username": user.get("username"),
                "userIcon": user.get("userIcon") or user.get("currentAvatarThumbnailImageUrl"),
                "status": user.get("status"),
                "statusDescription": user.get("statusDescription"),
                "state": user.get("state"),
                "trustLevel": user.get("trustLevel"),
                "last_login": user.get("last_login"),
            }
        }

        if world_id and _is_real_instance(world_id):
            try:
                world = await client.get_world(world_id)
                access_type = _parse_instance_type(
                    f"{world_id}:{instance_id}" if instance_id else world_id,
                    instance_id or ""
                )
                cw = {
                    "id": world.get("id"),
                    "name": world.get("name"),
                    "thumbnailImageUrl": world.get("thumbnailImageUrl"),
                    "authorName": world.get("authorName"),
                    "capacity": world.get("capacity"),
                    "occupants": world.get("occupants"),
                    "access_type": access_type,
                }
                if instance_id:
                    try:
                        inst = await client.get_instance(world_id, instance_id)
                        cw["n_users"] = inst.get("n_users", 0)
                        cw["instance_capacity"] = inst.get("capacity", world.get("capacity"))
                        cw["region"] = inst.get("region", "")
                    except Exception:
                        cw["n_users"] = world.get("occupants") or 0
                        cw["instance_capacity"] = world.get("capacity") or 0
                result["current_world"] = cw
            except Exception:
                pass

        return result
    except Exception:
        return {"logged_in": False}


# ── 刷新 & API ──

async def refresh_social_cache():
    global _social_cache, _last_fetch
    settings = _load_settings()
    now = time.time()
    cache_changed = False

    # VRChat
    if now - _last_fetch.get("vrchat", 0) >= settings.vrchat:
        try:
            vrc = await _fetch_vrchat()
            _social_cache["vrchat"] = vrc
            _last_fetch["vrchat"] = now
            cache_changed = True
        except Exception:
            pass

    # GitHub
    if now - _last_fetch.get("github", 0) >= settings.github:
        gh = await _fetch_github()
        if gh:
            _social_cache["github"] = gh
            _last_fetch["github"] = now
            cache_changed = True

    # Steam
    if now - _last_fetch.get("steam", 0) >= settings.steam:
        st = _load_steam()
        if st:
            _social_cache["steam"] = st
            _last_fetch["steam"] = now
            cache_changed = True

    if cache_changed:
        _social_cache["_updated"] = now


@router.get("/status")
async def social_status():
    settings = _load_settings()
    return {
        **_social_cache,
        "intervals": settings.model_dump(),
        "last_fetch": {k: v for k, v in _last_fetch.items()},
    }


@router.get("/settings")
async def get_settings():
    s = _load_settings()
    return s.model_dump()


@router.put("/settings")
async def update_settings(new_settings: SocialIntervalSettings):
    try:
        _save_settings(new_settings)
        return {"success": True, "intervals": new_settings.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard")
async def social_dashboard():
    """CMS 面板专用的汇总数据，展示各平台实时状态"""
    settings = _load_settings()
    now = time.time()

    def _ago(ts: float) -> str:
        if ts <= 0: return "从未"
        diff = int(now - ts)
        if diff < 60: return f"{diff}s 前"
        if diff < 3600: return f"{diff // 60}m 前"
        return f"{diff // 3600}h 前"

    def _next_in(key: str) -> int:
        elapsed = now - _last_fetch.get(key, 0)
        interval = getattr(settings, key, 60)
        return max(0, interval - int(elapsed))

    # ── VRChat ──
    vrc = _social_cache.get("vrchat", {})
    vrc_user = vrc.get("user", {})
    vrc_world = vrc.get("current_world")
    vrc_logged = vrc.get("logged_in", False)
    vrchat = {
        "connected": vrc_logged,
        "display_name": vrc_user.get("displayName", "—"),
        "avatar": vrc_user.get("userIcon", ""),
        "status": vrc_user.get("status", "offline"),
        "status_description": vrc_user.get("statusDescription", ""),
        "world_name": None,
        "world_author": None,
        "players": None,
        "access_type": None,
        "last_fetch": _last_fetch.get("vrchat", 0),
        "last_fetch_str": _ago(_last_fetch.get("vrchat", 0)),
        "next_in": _next_in("vrchat"),
    }
    if vrc_logged and vrc_world:
        vrchat["world_name"] = vrc_world.get("name")
        vrchat["world_author"] = vrc_world.get("authorName")
        vrchat["players"] = f"{vrc_world.get('n_users') if vrc_world.get('n_users') is not None else (vrc_world.get('occupants') or 0)}/{vrc_world.get('instance_capacity') if vrc_world.get('instance_capacity') is not None else (vrc_world.get('capacity') or 0)}"
        vrchat["access_type"] = vrc_world.get("access_type", "")

    # ── GitHub ──
    gh = _social_cache.get("github", {})
    gh_connected = bool(gh)
    github = {
        "connected": gh_connected,
        "user": GITHUB_USER,
        "repos": gh.get("repos", 0),
        "followers": gh.get("followers", 0),
        "latest_repo": gh.get("latest", "—"),
        "last_fetch": _last_fetch.get("github", 0),
        "last_fetch_str": _ago(_last_fetch.get("github", 0)),
        "next_in": _next_in("github"),
    }

    # ── Steam ──
    st = _social_cache.get("steam", {})
    st_connected = bool(st)
    steam_games = st.get("games", [])
    steam = {
        "connected": st_connected,
        "name": st.get("name", "—"),
        "avatar": st.get("avatarMedium", ""),
        "online_state": st.get("onlineState", "Offline"),
        "member_since": st.get("memberSince", ""),
        "games": [{"name": g["name"], "hours": g.get("hoursTotal", 0)} for g in steam_games[:2]],
        "last_fetch": _last_fetch.get("steam", 0),
        "last_fetch_str": _ago(_last_fetch.get("steam", 0)),
        "next_in": _next_in("steam"),
    }

    return {
        "vrchat": vrchat,
        "github": github,
        "steam": steam,
        "intervals": settings.model_dump(),
    }


@router.post("/refresh/{platform}")
async def force_refresh(platform: str):
    """手动触发单个平台的数据刷新并写入缓存"""
    global _last_fetch
    platform = platform.lower()
    valid = {"vrchat", "github", "steam"}
    if platform not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid platform. Must be one of: {', '.join(valid)}")

    now = time.time()
    fetched = False
    try:
        if platform == "vrchat":
            vrc = await _fetch_vrchat()
            _social_cache["vrchat"] = vrc
            fetched = True
        elif platform == "github":
            gh = await _fetch_github()
            if gh:
                _social_cache["github"] = gh
                fetched = True
            else:
                raise HTTPException(status_code=502, detail="GitHub API 请求失败，可能是网络问题或 token 无效")
        elif platform == "steam":
            st = _load_steam()
            if st:
                _social_cache["steam"] = st
                fetched = True
            else:
                raise HTTPException(status_code=502, detail="Steam 数据加载失败")

        if fetched:
            _last_fetch[platform] = now
            _social_cache["_updated"] = now
        return {"success": True, "platform": platform, "fetched_at": now}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Manual refresh {platform} failed: {e}")
        raise HTTPException(status_code=500, detail=f"刷新失败: {str(e)}")
