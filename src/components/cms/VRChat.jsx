import { useState, useEffect } from 'react'
import { Sparkles, Loader2, LogOut, RefreshCw, Shield, Eye, EyeOff } from 'lucide-react'

const API_BASE = '/api/vrchat'

export function VRChat({ token }) {
  const [status, setStatus] = useState({ loading: true, logged_in: false })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // 2FA
  const [need2FA, setNeed2FA] = useState(false)
  const [twofaCode, setTwofaCode] = useState('')
  const [twofaMethod, setTwofaMethod] = useState('totp')

  // Cookie login
  const [loginMode, setLoginMode] = useState('password') // 'password' | 'cookie'
  const [cookieInput, setCookieInput] = useState('')

  // 用户数据
  const [user, setUser] = useState(null)
  const [friends, setFriends] = useState(null)

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`)
      const data = await res.json()
      setStatus({ loading: false, logged_in: data.logged_in, has_pending_2fa: data.has_pending_2fa })
      if (data.logged_in) {
        loadUserData()
      }
    } catch {
      setStatus({ loading: false, logged_in: false })
    }
  }

  const loadUserData = async () => {
    try {
      const [meRes, friendsRes] = await Promise.all([
        fetch(`${API_BASE}/me`),
        fetch(`${API_BASE}/friends?n=100&offline=false`),
      ])
      if (meRes.ok) setUser(await meRes.json())
      if (friendsRes.ok) {
        const data = await friendsRes.json()
        // Backend returns { active: [], online: [], offline: [] }, flatten for display
        setFriends([...data.active, ...data.online])
      }
    } catch {}
  }

  useEffect(() => { checkStatus() }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoginLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (data.requires_2fa) {
        setNeed2FA(true)
        const methods = data.methods || []
        if (methods.length > 0) setTwofaMethod(methods[0].toLowerCase())
      } else if (res.ok) {
        setNeed2FA(false)
        setStatus({ loading: false, logged_in: true })
        loadUserData()
      } else {
        setError(data.detail || '登录失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoginLoading(false)
    }
  }

  const handle2FA = async (e) => {
    e.preventDefault()
    if (!twofaCode.trim()) return
    setLoginLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/2fa/verify?method=${twofaMethod}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twofaCode.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setNeed2FA(false)
        setTwofaCode('')
        setStatus({ loading: false, logged_in: true })
        loadUserData()
      } else {
        setError(data.detail || '2FA 验证失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleCookieLogin = async (e) => {
    e?.preventDefault()
    if (!cookieInput.trim()) return
    setLoginLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/cookie-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: cookieInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus({ loading: false, logged_in: true })
        loadUserData()
      } else {
        setError(data.detail || 'Cookie 无效')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST' })
    } catch {}
    setStatus({ loading: false, logged_in: false })
    setUser(null)
    setFriends(null)
    setNeed2FA(false)
  }

  const handleRefresh = () => {
    setStatus({ ...status, loading: true })
    checkStatus()
    if (status.logged_in) loadUserData()
  }

  if (status.loading) {
    return (
      <div className="cms-section">
        <div className="cms-section-header">
          <h2 className="cms-section-title">
            <Sparkles size={18} style={{ color: 'var(--pink)' }} />
            VRChat 连接
          </h2>
        </div>
        <div className="cms-loading">
          <Loader2 size={24} className="spinning" />
          <span>检查连接状态...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="cms-section">
      <div className="cms-section-header">
        <h2 className="cms-section-title">
          <Sparkles size={18} style={{ color: status.logged_in ? '#22c55e' : 'var(--pink)' }} />
          VRChat 连接
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="cms-button cms-button-secondary" onClick={handleRefresh}>
            <RefreshCw size={14} />
            刷新
          </button>
        </div>
      </div>

      {/* 2FA 验证 */}
      {need2FA && (
        <div className="cms-card" style={{ marginBottom: 20 }}>
          <div className="cms-card-header">
            <Shield size={16} style={{ color: 'var(--pink)' }} />
            <span style={{ fontWeight: 600 }}>两步验证</span>
          </div>
          <form onSubmit={handle2FA} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            <div className="cms-form-group">
              <label className="cms-form-label">验证方式</label>
              <select
                value={twofaMethod}
                onChange={(e) => setTwofaMethod(e.target.value)}
                className="cms-form-input"
              >
                <option value="totp">TOTP（身份验证器 App）</option>
                <option value="otp">OTP（邮件一次性码）</option>
                <option value="emailotp">Email OTP</option>
              </select>
            </div>
            <div className="cms-form-group">
              <label className="cms-form-label">验证码</label>
              <input
                type="text"
                value={twofaCode}
                onChange={(e) => setTwofaCode(e.target.value)}
                placeholder="输入 6 位验证码"
                className="cms-form-input"
                autoFocus
              />
            </div>
            {error && <p className="cms-error">{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="cms-button cms-button-secondary"
                onClick={() => { setNeed2FA(false); setError(''); setTwofaCode('') }}
              >
                取消
              </button>
              <button
                type="submit"
                className="cms-button cms-button-primary"
                disabled={loginLoading || !twofaCode.trim()}
                style={{ flex: 1 }}
              >
                {loginLoading ? <Loader2 size={14} className="spinning" /> : '验证'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 已登录：显示账号信息 */}
      {status.logged_in && user ? (
        <div>
          <div className="cms-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 'none' }}>
                {user.currentAvatarThumbnailImageUrl ? (
                  <img
                    src={user.currentAvatarThumbnailImageUrl}
                    alt="avatar"
                    style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                  />
                ) : null}
                <div
                  style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: 'linear-gradient(135deg, var(--pale), #efe7f8)',
                    display: user.currentAvatarThumbnailImageUrl ? 'none' : 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 600, color: 'var(--pink)',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {user.displayName?.[0] || '?'}
                </div>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#22c55e', border: '2.5px solid white',
                  boxShadow: '0 0 0 4px #22c55e24',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 18, display: 'block' }}>{user.displayName}</strong>
                <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                  @{user.username || user.id}
                </span>
                {user.statusDescription && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                    {user.statusDescription}
                  </p>
                )}
              </div>
              <button
                className="cms-button cms-button-secondary"
                onClick={handleLogout}
                style={{ color: '#e2556d', borderColor: '#e2556d33' }}
              >
                <LogOut size={14} />
                断开
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="cms-info-chip">
                <small>STATE</small>
                <span>{user.state || 'offline'}</span>
              </div>
              <div className="cms-info-chip">
                <small>STATUS</small>
                <span>{user.status || '-'}</span>
              </div>
              <div className="cms-info-chip">
                <small>TRUST RANK</small>
                <span>{user.trustLevel || '-'}</span>
              </div>
              <div className="cms-info-chip">
                <small>TAGS</small>
                <span>{user.tags?.join(', ') || '-'}</span>
              </div>
            </div>
            {user.bio && (
              <p style={{ margin: '12px 0 0', padding: '12px 14px', borderRadius: 12, background: '#fdf8fb', borderLeft: '3px solid var(--pink)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                {user.bio}
              </p>
            )}
          </div>

          {/* 好友列表 */}
          {friends && (
            <div className="cms-card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <strong style={{ fontSize: 14 }}>在线好友</strong>
                <small style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)' }}>
                  {friends.length} 人
                </small>
              </div>
              {friends.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>当前没有在线好友</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {friends.slice(0, 50).map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 10,
                        transition: 'background .15s',
                      }}
                      className="cms-hover-row"
                    >
                      <img
                        src={f.userIcon || f.currentAvatarThumbnailImageUrl}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', background: '#f5f0e8' }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.displayName || f.username}
                        </strong>
                        <small style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                          {f.status || f.state || 'online'}
                        </small>
                      </div>
                      {f.location && (
                        <small style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#b5b0ab', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.location}
                        </small>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : !need2FA ? (
        /* 未登录：登录表单 */
        <div className="cms-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--pale), #efe7f8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={28} style={{ color: 'var(--pink)' }} />
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>连接 VRChat 账号</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
              登录后前端首页即可展示你的实时状态
            </p>
          </div>

          {/* Login mode toggle */}
          <div style={{ display: 'flex', marginBottom: 20, border: '1px solid #28282818', borderRadius: 99, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setError('') }}
              style={{
                flex: 1, padding: '10px 0', border: 0, cursor: 'pointer',
                background: loginMode === 'password' ? 'var(--ink)' : 'transparent',
                color: loginMode === 'password' ? '#fff' : 'var(--muted)',
                font: '500 11px var(--mono)', letterSpacing: '.04em',
                transition: '.15s',
              }}
            >密码登录</button>
            <button
              type="button"
              onClick={() => { setLoginMode('cookie'); setError('') }}
              style={{
                flex: 1, padding: '10px 0', border: 0, cursor: 'pointer',
                background: loginMode === 'cookie' ? 'var(--ink)' : 'transparent',
                color: loginMode === 'cookie' ? '#fff' : 'var(--muted)',
                font: '500 11px var(--mono)', letterSpacing: '.04em',
                transition: '.15s',
              }}
            >Cookie 登录</button>
          </div>

          {loginMode === 'password' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="cms-form-group">
                <label className="cms-form-label">VRChat 用户名 / 邮箱</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入 VRChat 账号"
                  className="cms-form-input"
                  autoFocus
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">密码</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    className="cms-form-input"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                      padding: 4,
                    }}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && <p className="cms-error">{error}</p>}
              <button
                type="submit"
                className="cms-button cms-button-primary"
                disabled={loginLoading || !username.trim() || !password}
                style={{ width: '100%' }}
              >
                {loginLoading ? <Loader2 size={16} className="spinning" /> : '登录 VRChat'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCookieLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="cms-form-group">
                <label className="cms-form-label">
                  从浏览器复制完整 Cookie 字符串
                  <span style={{ marginLeft: 8, color: 'var(--muted)', fontWeight: 400 }}>F12 → Application → Cookies → vrchat.com</span>
                </label>
                <textarea
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="粘贴 VRChat 的完整 Cookie 字符串..."
                  className="cms-form-textarea"
                  rows={3}
                  autoFocus
                />
              </div>
              {error && <p className="cms-error">{error}</p>}
              <button
                type="submit"
                className="cms-button cms-button-primary"
                disabled={loginLoading || !cookieInput.trim()}
                style={{ width: '100%' }}
              >
                {loginLoading ? <Loader2 size={16} className="spinning" /> : 'Cookie 登录'}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}
