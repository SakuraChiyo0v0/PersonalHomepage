import { useState } from 'react'
import { LayoutDashboard, FolderOpen, ScrollText, LogOut, Sparkles, Plus, ChevronLeft } from 'lucide-react'
import { Projects } from './Projects'
import { LifeLog } from './LifeLog'

const navItems = [
  { id: 'projects', label: '项目管理', icon: FolderOpen },
  { id: 'life_log', label: '生活日志', icon: ScrollText },
]

export function Layout({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('projects')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <Projects token={token} />
      case 'life_log':
        return <LifeLog token={token} />
      default:
        return <Projects token={token} />
    }
  }

  return (
    <div className="cms-layout">
      <aside className={`cms-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <button className="cms-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <ChevronLeft size={18} />
        </button>
        <div className="cms-sidebar-header">
          <Sparkles className="cms-sidebar-icon" size={20} />
          <span>SAKURA CMS</span>
        </div>
        <nav className="cms-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`cms-nav-item ${activeTab === item.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <button className="cms-logout" onClick={onLogout}>
          <LogOut size={16} />
          <span>退出登录</span>
        </button>
      </aside>
      <main className="cms-main">
        <header className="cms-header">
          <div className="cms-header-left">
            <button className="cms-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <LayoutDashboard size={20} />
            </button>
            <h1 className="cms-page-title">
              {navItems.find((n) => n.id === activeTab)?.label || '管理面板'}
            </h1>
          </div>
          <div className="cms-header-right">
            <span className="cms-status">
              <span className="cms-status-dot" />
              在线
            </span>
          </div>
        </header>
        <div className="cms-content">{renderContent()}</div>
      </main>
    </div>
  )
}