import { useState, useEffect } from 'react'
import { Login } from './components/cms/Login'
import { Layout } from './components/cms/Layout'

export default function Cms() {
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('sakura_token')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (token) {
      localStorage.setItem('sakura_token', JSON.stringify(token))
    } else {
      localStorage.removeItem('sakura_token')
    }
  }, [token])

  if (!token) {
    return <Login onLogin={setToken} />
  }

  return <Layout token={token} onLogout={() => setToken(null)} />
}