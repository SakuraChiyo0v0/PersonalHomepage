"""
VRChat API Routes
Provides authentication proxy and data endpoints for the frontend.
Matches VRCX's API structure but as a backend proxy.
"""

import logging
import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List

from vrchat_client import get_vrchat_client, VRChatAPIError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["vrchat"])


def _is_real_instance(value: str) -> bool:
    """Check if a world/instance value is a real VRChat instance (like VRCX's isRealInstance)."""
    if not value:
        return False
    skip = {'offline', 'private', 'traveling', 'offline:offline', 'private:private', 'traveling:traveling'}
    if value in skip or value.startswith('local'):
        return False
    return True


def _parse_instance_type(location: str, instance_id: str) -> str:
    """Extract instance access type from VRChat location/instance string.
    Examples: 'public', 'friends+', 'friends', 'invite+', 'invite', 'private', 'hidden', 'group'"""
    full = (location or instance_id or '').lower()
    if '~hidden' in full: return 'private'
    if '~friends(' in full: return 'friends+'
    if '~private' in full: return 'private'
    if '~canRequestInvite' in full: return 'invite+'
    if '~invite' in full: return 'invite'
    if '~group' in full: return 'group'
    if instance_id and 'public' in instance_id.lower(): return 'public'
    # Default: if location starts with 'wrld_' after ':', it's public
    if ':' in full:
        after_colon = full.split(':', 1)[1]
        if after_colon and not any(t in after_colon for t in ('~', 'traveling')):
            return 'public'
    return 'public'


# ── Request/Response Models ──

class LoginRequest(BaseModel):
    username: str
    password: str


class TwoFactorRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=10)


class SearchRequest(BaseModel):
    query: str = ""
    n: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class UpdateUserRequest(BaseModel):
    status: Optional[str] = None
    statusDescription: Optional[str] = None
    bio: Optional[str] = None
    bioLinks: Optional[List[str]] = None


class SendInviteRequest(BaseModel):
    world_id: str
    instance_id: Optional[str] = None


# ── Auth Status ──

@router.get("/status")
async def get_auth_status():
    """Check current VRChat login status. Auto-refreshes every 30s."""
    client = get_vrchat_client()
    is_logged_in = client._auth_cookie is not None

    result = {
        "logged_in": is_logged_in,
        "has_pending_2fa": client._two_factor_auth_cookie is not None,
    }

    # Auto-refresh user data if stale (>30 seconds since last fetch)
    if is_logged_in:
        now = time.time()
        if not client._current_user or (now - client._last_user_fetch) > 30:
            try:
                await client.get_current_user()
            except Exception:
                pass

    if is_logged_in and client._current_user:
        user = client._current_user
        presence = user.get("presence") or {}

        # VRCX uses presence.world / presence.instance, not top-level fields
        world_id = presence.get("world") or user.get("worldId")
        instance_id = presence.get("instance") or user.get("instanceId")
        traveling_world = presence.get("travelingToWorld")
        traveling_instance = presence.get("travelingToInstance")

        # Build location string (like VRCX's applyCurrentUser)
        location_str = user.get("location") or ""
        if world_id and _is_real_instance(world_id):
            location_str = f"{world_id}:{instance_id}" if instance_id else world_id
        elif traveling_world and _is_real_instance(traveling_world):
            location_str = f"traveling:{traveling_world}" + (f":{traveling_instance}" if traveling_instance else "")

        result["user"] = {
            "id": user.get("id"),
            "displayName": user.get("displayName"),
            "username": user.get("username"),
            "currentAvatarThumbnailImageUrl": user.get("currentAvatarThumbnailImageUrl"),
            "profilePicOverride": user.get("profilePicOverride"),
            "userIcon": user.get("userIcon"),
            "status": user.get("status"),
            "statusDescription": user.get("statusDescription"),
            "state": user.get("state"),
            "last_platform": user.get("last_platform"),
            "last_login": user.get("last_login"),
            "tags": user.get("tags", []),
            "trustLevel": user.get("trustLevel"),
            "location": location_str,
            "worldId": world_id,
            "instanceId": instance_id,
            "travelingToWorld": traveling_world,
            "travelingToInstance": traveling_instance,
        }

        # Fetch current world info if user is in a world
        if world_id and _is_real_instance(world_id):
            try:
                world = await client.get_world(world_id)
                access_type = _parse_instance_type(location_str, instance_id or "")

                result["current_world"] = {
                    "id": world.get("id"),
                    "name": world.get("name"),
                    "description": world.get("description"),
                    "imageUrl": world.get("imageUrl"),
                    "thumbnailImageUrl": world.get("thumbnailImageUrl"),
                    "authorName": world.get("authorName"),
                    "capacity": world.get("capacity"),
                    "occupants": world.get("occupants"),
                    "access_type": access_type,
                }

                # Fetch instance details for player count and platforms
                if instance_id:
                    result["current_world"]["instance_id"] = instance_id
                    try:
                        instance = await client.get_instance(world_id, instance_id)
                        result["current_world"]["n_users"] = instance.get("n_users", 0)
                        result["current_world"]["instance_capacity"] = instance.get("capacity", world.get("capacity"))
                        result["current_world"]["region"] = instance.get("region", "")
                        platforms = instance.get("platforms", {})
                        result["current_world"]["platforms"] = {
                            "pc": platforms.get("standalonewindows", 0),
                            "quest": platforms.get("android", 0),
                        }
                    except Exception:
                        result["current_world"]["n_users"] = world.get("occupants") or 0
                        result["current_world"]["instance_capacity"] = world.get("capacity") or 0
            except Exception:
                pass

    return result


# ── Authentication ──

@router.post("/login")
async def login(request: LoginRequest):
    """
    Step 1: Login with VRChat credentials.
    If 2FA is required, the response will indicate it.
    """
    client = get_vrchat_client()
    try:
        result = await client.login(request.username, request.password)

        # Check if 2FA is required (VRCX handles this in the login flow)
        if isinstance(result, dict):
            requires_2fa = result.get("requiresTwoFactorAuth")
            if requires_2fa:
                logger.info(f"2FA required: {requires_2fa}")
                return {
                    "success": True,
                    "requires_2fa": True,
                    "methods": requires_2fa if isinstance(requires_2fa, list) else [requires_2fa],
                    "message": "2FA verification required",
                }

        # Login successful
        return {
            "success": True,
            "requires_2fa": False,
            "user": {
                "id": result.get("id"),
                "displayName": result.get("displayName"),
                "username": result.get("username"),
                "currentAvatarImageUrl": result.get("currentAvatarImageUrl"),
                "currentAvatarThumbnailImageUrl": result.get("currentAvatarThumbnailImageUrl"),
            },
        }
    except VRChatAPIError as e:
        if e.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


class CookieLoginRequest(BaseModel):
    cookie: str = Field(..., description="VRChat auth cookie string from browser")


@router.post("/cookie-login")
async def cookie_login(request: CookieLoginRequest):
    """
    Login using an existing VRChat auth cookie from the browser.
    Extracts the 'auth=xxx' value and uses it directly.
    """
    client = get_vrchat_client()
    cookie_str = request.cookie.strip()

    # Extract auth cookie value from the cookie string
    auth_value = None
    for part in cookie_str.replace("; ", ";").split(";"):
        if part.startswith("auth="):
            auth_value = part[5:]
            break

    if not auth_value:
        raise HTTPException(status_code=400, detail="No 'auth' cookie found in the provided cookie string")

    # Set the auth cookie and test it
    client.clear_cookies()
    client._auth_cookie = auth_value
    client._save_cookies()

    try:
        user = await client.get_current_user()
        return {
            "success": True,
            "user": {
                "id": user.get("id"),
                "displayName": user.get("displayName"),
                "username": user.get("username"),
                "state": user.get("state"),
                "status": user.get("status"),
            },
        }
    except VRChatAPIError as e:
        client.clear_cookies()
        raise HTTPException(status_code=e.status_code or 500, detail=f"Invalid cookie: {str(e)}")


@router.post("/2fa/verify")
async def verify_2fa(request: TwoFactorRequest, method: str = "totp"):
    """
    Step 2: Verify 2FA code after login.
    method: "totp" | "otp" | "emailotp"
    """
    client = get_vrchat_client()

    if not client._two_factor_auth_cookie:
        raise HTTPException(status_code=400, detail="No pending 2FA session. Please login first.")

    try:
        if method == "otp":
            result = await client.verify_2fa_otp(request.code)
        elif method == "emailotp":
            result = await client.verify_2fa_email_otp(request.code)
        else:
            result = await client.verify_2fa_totp(request.code)

        # Promote 2FA cookie to final auth cookie after successful verification
        if client._two_factor_auth_cookie:
            client._auth_cookie = client._two_factor_auth_cookie
            client._two_factor_auth_cookie = None
            client._save_cookies()

        # Fetch current user to populate cache
        try:
            await client.get_current_user()
        except Exception:
            pass

        return {
            "success": True,
            "verified": result.get("verified", True) if isinstance(result, dict) else True,
            "message": "2FA verified successfully",
        }
    except VRChatAPIError as e:
        if e.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.post("/logout")
async def logout():
    """Logout from VRChat and clear session."""
    client = get_vrchat_client()
    try:
        if client._auth_cookie:
            await client.logout()
    except Exception:
        pass
    finally:
        client.clear_cookies()
    return {"success": True, "message": "Logged out"}


# ── Current User ──

@router.get("/me")
async def get_current_user():
    """Get current user info with all details (like VRCX's UserInfo 'Me' tab)."""
    client = get_vrchat_client()
    try:
        user = await client.get_current_user()
        return {
            "id": user.get("id"),
            "displayName": user.get("displayName"),
            "username": user.get("username"),
            "currentAvatarImageUrl": user.get("currentAvatarImageUrl"),
            "currentAvatarThumbnailImageUrl": user.get("currentAvatarThumbnailImageUrl"),
            "profilePicOverride": user.get("profilePicOverride"),
            "status": user.get("status"),
            "statusDescription": user.get("statusDescription"),
            "state": user.get("state"),
            "bio": user.get("bio"),
            "bioLinks": user.get("bioLinks", []),
            "last_platform": user.get("last_platform"),
            "last_login": user.get("last_login"),
            "date_joined": user.get("date_joined"),
            "tags": user.get("tags", []),
            "developerType": user.get("developerType"),
            "isFriend": user.get("isFriend"),
            "friendKey": user.get("friendKey"),
            "trustLevel": user.get("trustLevel"),
            "allowAvatarCopying": user.get("allowAvatarCopying"),
            "worldId": user.get("worldId"),
            "instanceId": user.get("instanceId"),
            "location": user.get("location"),
            "onlineFriends": user.get("onlineFriends", []),
            "activeFriends": user.get("activeFriends", []),
            "offlineFriends": user.get("offlineFriends", []),
            "friendGroupNames": user.get("friendGroupNames", []),
        }
    except VRChatAPIError as e:
        if e.status_code == 401:
            raise HTTPException(status_code=401, detail="Not authenticated")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.put("/me")
async def update_current_user(request: UpdateUserRequest):
    """Update current user profile (status, bio, etc.)."""
    client = get_vrchat_client()
    data = {}
    if request.status is not None:
        data["status"] = request.status
    if request.statusDescription is not None:
        data["statusDescription"] = request.statusDescription
    if request.bio is not None:
        data["bio"] = request.bio
    if request.bioLinks is not None:
        data["bioLinks"] = request.bioLinks

    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        result = await client.update_current_user(data)
        return {"success": True, "user": result}
    except VRChatAPIError as e:
        if e.status_code == 401:
            raise HTTPException(status_code=401, detail="Not authenticated")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Friends ──

@router.get("/friends")
async def get_friends(offset: int = 0, n: int = 100, offline: bool = False):
    """
    Get friends list with online/offline/active status.
    Matches VRCX's friend list display.
    """
    client = get_vrchat_client()
    try:
        friends = await client.get_friends(offset=offset, n=n, offline=offline)
        # Categorize friends by status (like VRCX)
        online_friends = []
        active_friends = []
        offline_friends = []

        for friend in friends:
            friend_info = {
                "id": friend.get("id"),
                "displayName": friend.get("displayName"),
                "username": friend.get("username"),
                "currentAvatarImageUrl": friend.get("currentAvatarImageUrl"),
                "currentAvatarThumbnailImageUrl": friend.get("currentAvatarThumbnailImageUrl"),
                "status": friend.get("status"),
                "statusDescription": friend.get("statusDescription"),
                "state": friend.get("state"),
                "last_login": friend.get("last_login"),
                "location": friend.get("location"),
                "worldId": friend.get("worldId"),
                "instanceId": friend.get("instanceId"),
                "travelingToLocation": friend.get("travelingToLocation"),
                "platform": friend.get("platform"),
                "isFavorite": friend.get("isFavorite"),
                "bio": friend.get("bio"),
                "tags": friend.get("tags", []),
                "last_platform": friend.get("last_platform"),
            }

            state = friend.get("state", "offline")
            if state == "active":
                active_friends.append(friend_info)
            elif state == "online":
                online_friends.append(friend_info)
            else:
                offline_friends.append(friend_info)

        return {
            "total": len(friends),
            "online_count": len(online_friends),
            "active_count": len(active_friends),
            "offline_count": len(offline_friends),
            # Sort: active first, then online, then favorites
            "active": active_friends,
            "online": online_friends,
            "offline": offline_friends,
        }
    except VRChatAPIError as e:
        if e.status_code == 401:
            raise HTTPException(status_code=401, detail="Not authenticated")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get("/friends/{user_id}/status")
async def get_friend_status(user_id: str):
    """Get friendship status for a specific user."""
    client = get_vrchat_client()
    try:
        return await client.get_friend_status(user_id)
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Users ──

@router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user profile."""
    client = get_vrchat_client()
    try:
        user = await client.get_user(user_id)
        return {
            "id": user.get("id"),
            "displayName": user.get("displayName"),
            "username": user.get("username"),
            "currentAvatarImageUrl": user.get("currentAvatarImageUrl"),
            "currentAvatarThumbnailImageUrl": user.get("currentAvatarThumbnailImageUrl"),
            "status": user.get("status"),
            "statusDescription": user.get("statusDescription"),
            "state": user.get("state"),
            "bio": user.get("bio"),
            "bioLinks": user.get("bioLinks", []),
            "last_platform": user.get("last_platform"),
            "last_login": user.get("last_login"),
            "date_joined": user.get("date_joined"),
            "tags": user.get("tags", []),
            "developerType": user.get("developerType"),
            "isFriend": user.get("isFriend"),
            "trustLevel": user.get("trustLevel"),
            "location": user.get("location"),
            "worldId": user.get("worldId"),
            "instanceId": user.get("instanceId"),
        }
    except VRChatAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail="User not found")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Worlds ──

@router.get("/worlds/search")
async def search_worlds(query: str = "", n: int = 20, offset: int = 0):
    """Search worlds."""
    client = get_vrchat_client()
    try:
        worlds = await client.search_worlds(search=query, n=n, offset=offset)
        return [
            {
                "id": w.get("id"),
                "name": w.get("name"),
                "description": w.get("description"),
                "authorName": w.get("authorName"),
                "imageUrl": w.get("imageUrl"),
                "thumbnailImageUrl": w.get("thumbnailImageUrl"),
                "capacity": w.get("capacity"),
                "visits": w.get("visits"),
                "favorites": w.get("favorites"),
                "popularity": w.get("popularity"),
                "heat": w.get("heat"),
                "occupants": w.get("occupants"),
                "publicOccupants": w.get("publicOccupants"),
                "privateOccupants": w.get("privateOccupants"),
                "tags": w.get("tags", []),
                "releaseStatus": w.get("releaseStatus"),
                "created_at": w.get("created_at"),
                "updated_at": w.get("updated_at"),
                "instances": w.get("instances", []),
            }
            for w in worlds
        ]
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get("/worlds/{world_id}")
async def get_world(world_id: str):
    """Get world details."""
    client = get_vrchat_client()
    try:
        world = await client.get_world(world_id)
        return {
            "id": world.get("id"),
            "name": world.get("name"),
            "description": world.get("description"),
            "authorName": world.get("authorName"),
            "authorId": world.get("authorId"),
            "imageUrl": world.get("imageUrl"),
            "thumbnailImageUrl": world.get("thumbnailImageUrl"),
            "capacity": world.get("capacity"),
            "visits": world.get("visits"),
            "favorites": world.get("favorites"),
            "popularity": world.get("popularity"),
            "heat": world.get("heat"),
            "occupants": world.get("occupants"),
            "publicOccupants": world.get("publicOccupants"),
            "privateOccupants": world.get("privateOccupants"),
            "tags": world.get("tags", []),
            "releaseStatus": world.get("releaseStatus"),
            "version": world.get("version"),
            "created_at": world.get("created_at"),
            "updated_at": world.get("updated_at"),
            "publicationDate": world.get("publicationDate"),
            "labsPublicationDate": world.get("labsPublicationDate"),
            "instances": world.get("instances", []),
        }
    except VRChatAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail="World not found")
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get("/worlds/{world_id}/instances")
async def get_world_instances(world_id: str):
    """Get active instances for a world."""
    client = get_vrchat_client()
    try:
        return await client.get_world_instances(world_id)
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Instances ──

@router.get("/instances/{world_id}:{instance_id}")
async def get_instance(world_id: str, instance_id: str):
    """Get instance details (players, etc.)."""
    client = get_vrchat_client()
    try:
        instance = await client.get_instance(world_id, instance_id)
        return {
            "id": instance.get("id"),
            "name": instance.get("name"),
            "worldId": instance.get("worldId"),
            "instanceId": instance.get("instanceId"),
            "ownerId": instance.get("ownerId"),
            "type": instance.get("type"),
            "region": instance.get("region"),
            "n_users": instance.get("n_users"),
            "capacity": instance.get("capacity"),
            "users": [
                {
                    "id": u.get("id"),
                    "displayName": u.get("displayName"),
                    "username": u.get("username"),
                    "currentAvatarThumbnailImageUrl": u.get("currentAvatarThumbnailImageUrl"),
                }
                for u in instance.get("users", [])
            ],
            "platforms": instance.get("platforms", {}),
            "tags": instance.get("tags", []),
            "created_at": instance.get("created_at"),
            "shortName": instance.get("shortName"),
        }
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Notifications ──

@router.get("/notifications")
async def get_notifications(n: int = 20, offset: int = 0, type: str = None):
    """Get notifications."""
    client = get_vrchat_client()
    try:
        notifications = await client.get_notifications(n=n, offset=offset, type=type)
        return [
            {
                "id": n.get("id"),
                "type": n.get("type"),
                "senderUserId": n.get("senderUserId"),
                "senderUsername": n.get("senderUsername"),
                "receiverUserId": n.get("receiverUserId"),
                "message": n.get("message"),
                "details": n.get("details"),
                "seen": n.get("seen"),
                "created_at": n.get("created_at"),
            }
            for n in notifications
        ]
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Invites ──

@router.post("/invite/{user_id}")
async def send_invite(user_id: str, request: SendInviteRequest):
    """Send an invite to a user."""
    client = get_vrchat_client()
    try:
        return await client.send_invite(user_id, request.world_id, request.instance_id)
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.post("/invite/self/{world_id}:{instance_id}")
async def self_invite(world_id: str, instance_id: str):
    """Invite yourself to an instance."""
    client = get_vrchat_client()
    try:
        return await client.self_invite(world_id, instance_id)
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Avatars ──

@router.get("/avatars")
async def get_my_avatars(n: int = 100):
    """Get current user's avatar list."""
    client = get_vrchat_client()
    try:
        avatars = await client.get_current_avatars(n=n)
        return [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "description": a.get("description"),
                "imageUrl": a.get("imageUrl"),
                "thumbnailImageUrl": a.get("thumbnailImageUrl"),
                "authorName": a.get("authorName"),
                "releaseStatus": a.get("releaseStatus"),
                "tags": a.get("tags", []),
                "version": a.get("version"),
            }
            for a in avatars
        ]
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get("/avatars/{avatar_id}")
async def get_avatar(avatar_id: str):
    """Get avatar details."""
    client = get_vrchat_client()
    try:
        return await client.get_avatar(avatar_id)
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Favorites ──

@router.get("/favorites")
async def get_favorites(n: int = 100, type: str = None):
    """Get user's favorites."""
    client = get_vrchat_client()
    try:
        favorites = await client.get_favorites(n=n, type=type)
        return [
            {
                "id": f.get("id"),
                "type": f.get("type"),
                "favoriteId": f.get("favoriteId"),
                "tags": f.get("tags", []),
                "created_at": f.get("created_at"),
            }
            for f in favorites
        ]
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── Groups ──

@router.get("/groups")
async def get_user_groups():
    """Get current user's groups."""
    client = get_vrchat_client()
    try:
        return await client.get_user_groups()
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# ── VRChat System Status ──

@router.get("/system-status")
async def get_system_status():
    """Get VRChat system status."""
    client = get_vrchat_client()
    try:
        return await client.get_config()
    except VRChatAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))
