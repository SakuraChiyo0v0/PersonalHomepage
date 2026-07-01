/**
 * 真实数据 API 模块
 * - 社交状态（GitHub + Steam + VRChat 统一端点）
 * - VRChat CMS 操作（登录/2FA/登出等）
 */
const API_BASE = '/api/vrchat'
const SOCIAL_BASE = '/api/social'

// ── 社交状态统一端点 ──────────────────────────────────────────────────

/**
 * 从后端获取所有平台数据（GitHub + Steam + VRChat）
 * 后端每 60s 自动刷新一次
 */
export async function fetchSocialStatus() {
  try {
    const res = await fetch(`${SOCIAL_BASE}/status`)
    if (!res.ok) throw new Error(`Social API ${res.status}`)
    return await res.json()
  } catch {
    return { github: {}, steam: {}, vrchat: { logged_in: false } }
  }
}

/**
 * VRChat 登录 (用户名 + 密码)
 */
export async function vrchatLogin(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Login failed')
  return data
}

/**
 * VRChat 2FA 验证
 */
export async function vrchatVerify2FA(code, method = 'totp') {
  const res = await fetch(`${API_BASE}/2fa/verify?method=${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || '2FA verification failed')
  return data
}

/**
 * VRChat 登出
 */
export async function vrchatLogout() {
  const res = await fetch(`${API_BASE}/logout`, { method: 'POST' })
  return await res.json()
}

/**
 * 获取当前用户完整信息
 */
export async function fetchVRChatMe() {
  const res = await fetch(`${API_BASE}/me`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch user')
  return data
}

/**
 * 获取好友列表
 */
export async function fetchVRChatFriends(offline = false) {
  const res = await fetch(`${API_BASE}/friends?n=100&offline=${offline}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch friends')
  return data
}

/**
 * 获取通知
 */
export async function fetchVRChatNotifications() {
  const res = await fetch(`${API_BASE}/notifications?n=20`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch notifications')
  return data
}
