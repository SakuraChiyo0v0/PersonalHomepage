"""
VRChat API Client
Based on VRCX's WebApi.cs and AppApi implementation.
Handles authentication, cookie management, and API calls to VRChat.
"""

import base64
import json
import logging
import os
import time
from typing import Optional, Dict, Any, Tuple

import httpx

logger = logging.getLogger(__name__)

# VRChat API base URL
VRC_API_BASE = "https://api.vrchat.cloud/api/1"

# Mimic VRCX's User-Agent format
USER_AGENT = "VRCX/2026.05.03 (PersonalHomepage)"


class VRChatAPIError(Exception):
    """VRChat API error with status code."""
    def __init__(self, message: str, status_code: int = 0, endpoint: str = ""):
        self.status_code = status_code
        self.endpoint = endpoint
        super().__init__(message)


class VRChatClient:
    """
    VRChat API client that mirrors VRCX's approach:
    - Session-based cookie management (like VRCX's CookieContainer)
    - Basic Auth for initial login
    - 2FA support (totp/otp/emailotp)
    - Automatic cookie persistence
    """

    def __init__(self, cookie_file: str = None):
        self._client: Optional[httpx.AsyncClient] = None
        self._auth_cookie: Optional[str] = None
        self._two_factor_auth_cookie: Optional[str] = None
        self._login_credentials: Optional[Tuple[str, str]] = None
        self._current_user: Optional[Dict] = None
        self._last_user_fetch: float = 0
        self._cookie_file = cookie_file or os.path.join(
            os.path.dirname(__file__), "data", "vrchat_cookies.json"
        )
        self._load_cookies()

    def _load_cookies(self):
        """Load persisted auth cookie from file (like VRCX's SQLite cookie storage)."""
        try:
            if os.path.exists(self._cookie_file):
                with open(self._cookie_file, "r") as f:
                    data = json.load(f)
                    self._auth_cookie = data.get("auth_cookie")
                    self._two_factor_auth_cookie = data.get("two_factor_auth_cookie")
                    if self._auth_cookie:
                        logger.info("Loaded persisted VRChat auth cookie")
        except Exception as e:
            logger.warning(f"Failed to load VRChat cookies: {e}")

    def _save_cookies(self):
        """Persist auth cookie to file (like VRCX's SaveCookies)."""
        try:
            os.makedirs(os.path.dirname(self._cookie_file), exist_ok=True)
            with open(self._cookie_file, "w") as f:
                json.dump({
                    "auth_cookie": self._auth_cookie,
                    "two_factor_auth_cookie": self._two_factor_auth_cookie,
                }, f)
        except Exception as e:
            logger.warning(f"Failed to save VRChat cookies: {e}")

    def clear_cookies(self):
        """Clear all cookies and persisted data."""
        self._auth_cookie = None
        self._two_factor_auth_cookie = None
        self._login_credentials = None
        self._current_user = None
        if os.path.exists(self._cookie_file):
            os.remove(self._cookie_file)

    def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client with proper headers (like VRCX's InitializeHttpClient)."""
        if self._client is None:
            limits = httpx.Limits(max_keepalive_connections=10, max_connections=20)
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                limits=limits,
                follow_redirects=True,
            )
        return self._client

    def _get_headers(self) -> Dict[str, str]:
        """Build request headers matching VRCX's WebApi format."""
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }
        if self._auth_cookie:
            headers["Cookie"] = f"auth={self._auth_cookie}"
        elif self._two_factor_auth_cookie:
            headers["Cookie"] = self._two_factor_auth_cookie
        return headers

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        json_data: Dict = None,
        extra_headers: Dict = None,
        use_basic_auth: Tuple[str, str] = None,
    ) -> Dict[str, Any]:
        """
        Execute an API request (like VRCX's WebApi.Execute).
        
        Args:
            method: HTTP method
            endpoint: API endpoint path (e.g., "auth/user")
            params: Query parameters
            json_data: JSON body for POST/PUT
            extra_headers: Additional headers
            use_basic_auth: (username, password) tuple for Basic Auth
        
        Returns:
            Parsed JSON response
        
        Raises:
            VRChatAPIError: On API errors
        """
        url = f"{VRC_API_BASE}/{endpoint}"
        headers = self._get_headers()

        if extra_headers:
            headers.update(extra_headers)

        if use_basic_auth:
            username, password = use_basic_auth
            credentials = base64.b64encode(
                f"{username}:{password}".encode()
            ).decode()
            headers["Authorization"] = f"Basic {credentials}"

        client = self._get_client()

        try:
            logger.info(f"[VRChat API] {method} {endpoint}")
            response = await client.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                headers=headers,
            )

            # Track cookie changes via httpx cookie jar (reliable)
            auth_value = response.cookies.get("auth")
            if auth_value:
                if use_basic_auth:
                    # This is the 2FA intermediate cookie
                    self._two_factor_auth_cookie = auth_value
                    self._save_cookies()
                    logger.info("Stored 2FA auth cookie")
                else:
                    # This is the final auth cookie
                    self._auth_cookie = auth_value
                    self._two_factor_auth_cookie = None
                    self._save_cookies()
                    logger.info("Stored final auth cookie")

            # Handle response
            if response.status_code == 200 or response.status_code == 201:
                try:
                    data = response.json()
                except Exception:
                    data = {"success": True}

                # Check for API-level errors
                if isinstance(data, dict) and "error" in data:
                    error_msg = data["error"]
                    if isinstance(error_msg, dict):
                        raise VRChatAPIError(
                            error_msg.get("message", str(error_msg)),
                            error_msg.get("status_code", response.status_code),
                            endpoint,
                        )
                    raise VRChatAPIError(str(error_msg), response.status_code, endpoint)

                return data

            elif response.status_code == 401:
                error_data = {}
                try:
                    error_data = response.json()
                except Exception:
                    pass
                raise VRChatAPIError(
                    error_data.get("error", {}).get("message", "Unauthorized"),
                    401,
                    endpoint,
                )

            elif response.status_code == 429:
                raise VRChatAPIError("Rate limited - too many requests", 429, endpoint)

            else:
                error_data = {}
                try:
                    error_data = response.json()
                except Exception:
                    pass
                error_msg = error_data.get("error", {}).get("message", response.text[:200]) if isinstance(error_data, dict) else str(error_data)[:200]
                raise VRChatAPIError(
                    error_msg or f"HTTP {response.status_code}",
                    response.status_code,
                    endpoint,
                )

        except httpx.RequestError as e:
            raise VRChatAPIError(f"Network error: {str(e)}", 0, endpoint)
        except VRChatAPIError:
            raise
        except Exception as e:
            raise VRChatAPIError(f"Unexpected error: {str(e)}", 0, endpoint)

    # ── Authentication (matching VRCX flow) ──

    async def get_config(self) -> Dict:
        """Get VRChat API config (no auth needed, like VRCX's config endpoint)."""
        return await self._request("GET", "config")

    async def login(self, username: str, password: str) -> Dict:
        """
        Step 1: Login with VRChat credentials.
        Returns user data or 2FA required info.
        
        Like VRCX, uses Basic Auth against the auth/user endpoint.
        Credentials are saved for subsequent 2FA verification.
        """
        self.clear_cookies()
        self._login_credentials = (username, password)
        return await self._request(
            "GET",
            "auth/user",
            use_basic_auth=(username, password),
        )

    async def verify_2fa_totp(self, code: str) -> Dict:
        """Step 2a: Verify TOTP (authenticator app) code. Sends Basic Auth + 2FA cookie."""
        return await self._request(
            "POST",
            "auth/twofactorauth/totp/verify",
            json_data={"code": code},
            use_basic_auth=self._login_credentials,
        )

    async def verify_2fa_otp(self, code: str) -> Dict:
        """Step 2b: Verify OTP (email/SMS one-time password) code. Sends Basic Auth + 2FA cookie."""
        return await self._request(
            "POST",
            "auth/twofactorauth/otp/verify",
            json_data={"code": code},
            use_basic_auth=self._login_credentials,
        )

    async def verify_2fa_email_otp(self, code: str) -> Dict:
        """Step 2c: Verify Email OTP code. Sends Basic Auth + 2FA cookie."""
        return await self._request(
            "POST",
            "auth/twofactorauth/emailotp/verify",
            json_data={"code": code},
            use_basic_auth=self._login_credentials,
        )

    async def logout(self) -> Dict:
        """Logout and clear cookies."""
        try:
            result = await self._request("PUT", "logout")
        except Exception:
            result = {"success": True}
        self.clear_cookies()
        return result

    # ── Current User (like VRCX's auth/user) ──

    async def get_current_user(self) -> Dict:
        """Get current logged-in user info."""
        data = await self._request("GET", "auth/user")
        self._current_user = data
        self._last_user_fetch = time.time()
        return data

    # ── Friends (matching VRCX friend.js) ──

    async def get_friends(self, offset: int = 0, n: int = 100, offline: bool = False) -> list:
        """
        Get friends list with status info.
        Matches VRCX's friendReq.getFriends() → GET auth/user/friends
        """
        params = {"offset": offset, "n": n}
        if offline:
            params["offline"] = "true"
        return await self._request("GET", "auth/user/friends", params=params)

    async def get_friend_status(self, user_id: str) -> Dict:
        """Get friend status for a specific user."""
        return await self._request("GET", f"user/{user_id}/friendStatus")

    async def send_friend_request(self, user_id: str) -> Dict:
        """Send a friend request."""
        return await self._request("POST", f"user/{user_id}/friendRequest")

    async def delete_friend(self, user_id: str) -> Dict:
        """Unfriend a user."""
        return await self._request("DELETE", f"auth/user/friends/{user_id}")

    # ── Users ──

    async def get_user(self, user_id: str) -> Dict:
        """Get a specific user's profile."""
        return await self._request("GET", f"users/{user_id}")

    async def search_users(self, search: str = "", n: int = 20, offset: int = 0) -> list:
        """Search for users."""
        params = {"search": search, "n": n, "offset": offset}
        return await self._request("GET", "users", params=params)

    async def update_current_user(self, data: Dict) -> Dict:
        """Update current user's status, bio, etc."""
        user_id = self._current_user.get("id") if self._current_user else None
        if not user_id:
            # Fetch current user first
            await self.get_current_user()
            user_id = self._current_user.get("id") if self._current_user else None
        if not user_id:
            raise VRChatAPIError("Not logged in", 401)
        result = await self._request("PUT", f"users/{user_id}", json_data=data)
        # Update cached user
        if self._current_user:
            self._current_user.update(result)
        return result

    # ── Worlds (matching VRCX world.js) ──

    async def get_world(self, world_id: str) -> Dict:
        """Get world details."""
        return await self._request("GET", f"worlds/{world_id}")

    async def search_worlds(self, search: str = "", n: int = 20, offset: int = 0, sort: str = "popularity") -> list:
        """Search for worlds."""
        params = {"search": search, "n": n, "offset": offset, "sort": sort}
        return await self._request("GET", "worlds", params=params)

    async def get_world_instances(self, world_id: str) -> list:
        """Get active instances for a world."""
        return await self._request("GET", f"worlds/{world_id}/instances")

    # ── Instances (matching VRCX instance.js) ──

    async def get_instance(self, world_id: str, instance_id: str) -> Dict:
        """Get instance details."""
        return await self._request("GET", f"instances/{world_id}:{instance_id}")

    # ── Notifications (matching VRCX notification.js) ──

    async def get_notifications(self, n: int = 20, offset: int = 0, type: str = None, sent: bool = False) -> list:
        """Get notifications."""
        params = {"n": n, "offset": offset}
        if type:
            params["type"] = type
        if sent:
            params["sent"] = "true"
        return await self._request("GET", "auth/user/notifications", params=params)

    async def accept_friend_request(self, notification_id: str) -> Dict:
        """Accept a friend request notification."""
        return await self._request("PUT", f"auth/user/notifications/{notification_id}/accept")

    async def hide_notification(self, notification_id: str) -> Dict:
        """Hide a notification."""
        return await self._request("PUT", f"auth/user/notifications/{notification_id}/hide")

    async def mark_notification_seen(self, notification_id: str) -> Dict:
        """Mark notification as seen."""
        return await self._request("PUT", f"auth/user/notifications/{notification_id}/see")

    # ── Invites ──

    async def send_invite(self, user_id: str, world_id: str, instance_id: str = None) -> Dict:
        """Send an invite to a user."""
        data = {"worldId": world_id}
        if instance_id:
            data["instanceId"] = instance_id
        return await self._request("POST", f"invite/{user_id}", json_data=data)

    async def self_invite(self, world_id: str, instance_id: str) -> Dict:
        """Invite yourself to an instance."""
        return await self._request("POST", f"invite/myself/to/{world_id}:{instance_id}")

    # ── Avatars ──

    async def get_avatar(self, avatar_id: str) -> Dict:
        """Get avatar details."""
        return await self._request("GET", f"avatars/{avatar_id}")

    async def get_current_avatars(self, n: int = 100) -> list:
        """Get current user's avatars."""
        return await self._request("GET", "auth/user/avatars", params={"n": n})

    # ── Favorites ──

    async def get_favorites(self, n: int = 100, type: str = None) -> list:
        """Get user's favorites."""
        params = {"n": n}
        if type:
            params["type"] = type
        return await self._request("GET", "favorites", params=params)

    # ── Groups ──

    async def get_user_groups(self, user_id: str = None) -> list:
        """Get user's groups."""
        target = user_id or "me"
        return await self._request("GET", f"users/{target}/groups")

    # ── Utility ──

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Global client instance (like VRCX's WebApi.Instance singleton)
_vrchat_client: Optional[VRChatClient] = None


def get_vrchat_client() -> VRChatClient:
    """Get or create the global VRChat client instance."""
    global _vrchat_client
    if _vrchat_client is None:
        _vrchat_client = VRChatClient()
    return _vrchat_client
