import { useState } from 'react'
import { Lock, ArrowRight, Sparkles, Loader2 } from 'lucide-react'

export function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=admin&password=${encodeURIComponent(password)}`,
      })
      if (response.ok) {
        const data = await response.json()
        onLogin(data.access_token)
      } else {
        setError('密码错误，请重试')
      }
    } catch {
      setError('连接失败，请检查网络')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cms-login">
      <div className="cms-login-grid" />
      <div className="cms-login-card">
        <div className="cms-login-header">
          <div className="cms-login-logo">
            <Sparkles className="cms-login-icon" size={24} />
            <span>SAKURA CMS</span>
          </div>
          <p className="cms-login-subtitle">管理后台</p>
        </div>
        <form onSubmit={handleSubmit} className="cms-login-form">
          <div className="cms-form-group">
            <label className="cms-form-label">
              <Lock size={14} />
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入管理密码"
              className="cms-form-input"
              autoFocus
              disabled={loading}
            />
          </div>
          {error && <p className="cms-error">{error}</p>}
          <button type="submit" className="cms-button" disabled={loading || !password}>
            {loading ? (
              <Loader2 className="cms-button-loader" size={16} />
            ) : (
              <>
                登录
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
        <p className="cms-login-hint">默认密码：admin123</p>
      </div>
    </div>
  )
}