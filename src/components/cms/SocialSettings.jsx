import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Save, Wifi, WifiOff, Clock } from 'lucide-react'

const API = '/api/social'

export default function SocialSettings() {
  const [dashboard, setDashboard] = useState(null)
  const [settings, setSettings] = useState({ vrchat: 60, github: 120, steam: 300 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [countdowns, setCountdowns] = useState({ vrchat: 0, github: 0, steam: 0 })
  const [refreshing, setRefreshing] = useState({ vrchat: false, github: false, steam: false })

  // 拉取面板数据
  const fetchDashboard = useCallback(() => {
    fetch(`${API}/dashboard`)
      .then(r => r.json())
      .then(data => {
        setDashboard(data)
        setSettings(data.intervals || settings)
        setCountdowns({
          vrchat: data.vrchat?.next_in ?? 0,
          github: data.github?.next_in ?? 0,
          steam: data.steam?.next_in ?? 0,
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchDashboard()
    const t = setInterval(fetchDashboard, 5000)
    return () => clearInterval(t)
  }, [fetchDashboard])

  // 倒计时
  useEffect(() => {
    const t = setInterval(() => {
      setCountdowns(prev => ({
        vrchat: Math.max(0, prev.vrchat - 1),
        github: Math.max(0, prev.github - 1),
        steam: Math.max(0, prev.steam - 1),
      }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setMsg('已保存')
        fetchDashboard()
      } else {
        setMsg('保存失败')
      }
    } catch {
      setMsg('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async (platform) => {
    setRefreshing(prev => ({ ...prev, [platform]: true }))
    try {
      await fetch(`${API}/refresh/${platform}`, { method: 'POST' })
      await fetchDashboard()
    } catch { /* ignore */ }
    finally {
      setRefreshing(prev => ({ ...prev, [platform]: false }))
    }
  }

  const platformMeta = [
    { key: 'vrchat', label: 'VRChat', icon: '🔮', color: '#0956af' },
    { key: 'github', label: 'GitHub', icon: '🐙', color: '#2b3137' },
    { key: 'steam', label: 'Steam', icon: '🎮', color: '#171a21' },
  ]

  // ── VRChat 状态色 ──
  const vrcStatusColor = (status) => {
    switch (status) {
      case 'active': return { bg: '#2ed319', label: 'Online' }
      case 'join me': return { bg: '#3b88fc', label: 'Join Me' }
      case 'ask me': return { bg: '#ff7b42', label: 'Ask Me' }
      case 'busy': return { bg: '#ef2323', label: 'Do Not Disturb' }
      default: return { bg: '#888', label: 'Offline' }
    }
  }

  const renderPlatformCard = (meta) => {
    const { key, label, icon, color } = meta
    const data = dashboard?.[key]
    if (!data) return null

    const connected = data.connected
    const nextStr = countdowns[key] > 0 ? `${countdowns[key]}s` : '刷新中...'

    // ── VRChat 卡片 ──
    if (key === 'vrchat') {
      const sc = vrcStatusColor(data.status)
      return (
        <div key={key} className="social-card" style={{ borderLeftColor: connected ? sc.bg : '#555' }}>
          {/* Header */}
          <div className="social-card-header">
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
            {connected ? (
              <Wifi size={12} style={{ color: sc.bg, marginLeft: 'auto' }} />
            ) : (
              <WifiOff size={12} style={{ color: '#555', marginLeft: 'auto' }} />
            )}
          </div>

          {/* Status */}
          <div className="social-card-body">
            {connected ? (
              <>
                {/* 头像 + 状态 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {data.avatar && (
                    <img src={data.avatar} alt=""
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${sc.bg}` }} />
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{data.display_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: sc.bg, display: 'inline-block',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, color: sc.bg, fontWeight: 500 }}>{sc.label}</span>
                      {data.status_description && (
                        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 2 }}>
                          — {data.status_description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 世界信息 */}
                {data.world_name && (
                  <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--paper)', borderRadius: 6, fontSize: 11 }}>
                    <div style={{ color: 'var(--muted)', marginBottom: 4 }}>当前世界</div>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{data.world_name}</div>
                    <div style={{ color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 12 }}>
                      <span>👤 {data.world_author}</span>
                      <span>👥 {data.players}</span>
                      <span style={{
                        padding: '0 4px', borderRadius: 3, fontSize: 10,
                        background: data.access_type === 'public' ? '#2ed31922' :
                                   data.access_type === 'friends+' ? '#3b88fc22' :
                                   data.access_type === 'private' ? '#ef232322' : '#5552',
                        color: data.access_type === 'public' ? '#2ed319' :
                               data.access_type === 'friends+' ? '#3b88fc' :
                               data.access_type === 'private' ? '#ef2323' : '#888',
                      }}>
                        {data.access_type || 'unknown'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                未登录 VRChat — 请在 VRChat 管理页登录
              </div>
            )}
          </div>

          {/* Footer: 刷新信息 */}
          <div className="social-card-footer">
            <Clock size={10} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              上次: {data.last_fetch_str} · 下次: {nextStr}
            </span>
          </div>
        </div>
      )
    }

    // ── GitHub 卡片 ──
    if (key === 'github') {
      return (
        <div key={key} className="social-card" style={{ borderLeftColor: connected ? '#2b3137' : '#555' }}>
          <div className="social-card-header">
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
            {connected ? (
              <Wifi size={12} style={{ color: '#2ed319', marginLeft: 'auto' }} />
            ) : (
              <WifiOff size={12} style={{ color: '#555', marginLeft: 'auto' }} />
            )}
          </div>

          <div className="social-card-body">
            {connected ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{data.user}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{data.repos}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>仓库</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{data.followers}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>关注者</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--paper)', borderRadius: 6, fontSize: 11 }}>
                  <span style={{ color: 'var(--muted)' }}>最新仓库: </span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{data.latest_repo}</span>
                </div>
              </>
            ) : (
              <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                未能获取 GitHub 数据
              </div>
            )}
          </div>

          <div className="social-card-footer">
            <Clock size={10} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              上次: {data.last_fetch_str} · 下次: {nextStr}
            </span>
          </div>
        </div>
      )
    }

    // ── Steam 卡片 ──
    if (key === 'steam') {
      const isOnline = data.online_state?.toLowerCase() !== 'offline'
      return (
        <div key={key} className="social-card" style={{ borderLeftColor: connected ? '#171a21' : '#555' }}>
          <div className="social-card-header">
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
            {connected ? (
              <Wifi size={12} style={{ color: '#2ed319', marginLeft: 'auto' }} />
            ) : (
              <WifiOff size={12} style={{ color: '#555', marginLeft: 'auto' }} />
            )}
          </div>

          <div className="social-card-body">
            {connected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {data.avatar && (
                    <img src={data.avatar} alt=""
                      style={{ width: 36, height: 36, borderRadius: '4px', border: '1px solid var(--line)' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{data.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        backgroundColor: isOnline ? '#2ed319' : '#555',
                        display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, color: isOnline ? '#2ed319' : '#888' }}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                      {data.member_since && (
                        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>
                          加入 {data.member_since}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 最近游戏 */}
                {data.games?.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.games.map((g, i) => (
                      <div key={i} style={{
                        padding: '4px 8px', background: 'var(--paper)', borderRadius: 4,
                        fontSize: 11, display: 'flex', justifyContent: 'space-between',
                      }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{g.name}</span>
                        <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                          {g.hours?.toFixed(1)}h
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                未能获取 Steam 数据
              </div>
            )}
          </div>

          <div className="social-card-footer">
            <Clock size={10} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              上次: {data.last_fetch_str} · 下次: {nextStr}
            </span>
          </div>
        </div>
      )
    }
  }

  return (
    <div>
      {/* ── 三列平台卡片 ── */}
      <div className="social-dashboard-grid">
        {platformMeta.map(renderPlatformCard)}
      </div>

      {/* ── 刷新间隔设置 ── */}
      <div className="cms-card" style={{ marginTop: 20 }}>
        <div className="cms-card-header">
          <Clock size={16} style={{ color: 'var(--ink)' }} />
          <span style={{ fontWeight: 600 }}>刷新间隔</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 12, margin: '6px 0 16px' }}>
          后端根据此间隔自动拉取各平台最新数据，前端每 5s 更新面板。
        </p>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {platformMeta.map(({ key, label, icon }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>
                    {key === 'vrchat' ? '状态/世界/好友' : key === 'github' ? '仓库/关注/贡献' : '游戏/在线状态'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="range"
                    min={key === 'vrchat' ? 10 : 30}
                    max={key === 'vrchat' ? 600 : 3600}
                    step="10"
                    value={settings[key]}
                    onChange={(e) => setSettings({ ...settings, [key]: parseInt(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                  <span style={{
                    minWidth: 52, textAlign: 'right',
                    font: '11px var(--mono)', color: 'var(--muted)',
                  }}>
                    {settings[key]}s
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRefresh(key)}
                    disabled={refreshing[key]}
                    title={`立即刷新 ${label}`}
                    style={{
                      background: 'none', border: '1px solid var(--line)', borderRadius: 6,
                      padding: '3px 8px', cursor: refreshing[key] ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                      color: 'var(--ink)', opacity: refreshing[key] ? 0.5 : 1,
                    }}
                  >
                    <RefreshCw size={12} style={refreshing[key] ? { animation: 'spin 1s linear infinite' } : undefined} />
                    {refreshing[key] ? '刷新中' : '刷新'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {msg && (
            <p style={{
              fontSize: 12, margin: 0,
              color: msg.includes('失败') || msg.includes('错误') ? 'var(--red)' : 'var(--green)',
            }}>
              {msg}
            </p>
          )}

          <button
            type="submit"
            className="cms-button cms-button-primary"
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
          >
            <Save size={14} />
            {saving ? '保存中...' : '保存间隔设置'}
          </button>
        </form>
      </div>

      {/* ── 卡片样式 ── */}
      <style>{`
        .social-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .social-dashboard-grid { grid-template-columns: 1fr; }
        }
        .social-card {
          background: var(--paper2);
          border: 1px solid var(--line);
          border-left: 3px solid;
          border-radius: 12px;
          overflow: hidden;
        }
        .social-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
          background: var(--paper);
        }
        .social-card-body {
          padding: 16px;
          background: var(--paper2);
        }
        .social-card-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-top: 1px solid var(--line);
          background: var(--paper);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
