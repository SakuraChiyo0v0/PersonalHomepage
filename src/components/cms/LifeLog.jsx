import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Loader2 } from 'lucide-react'

export function LifeLog({ token }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newLog, setNewLog] = useState({
    time: new Date().toISOString().slice(0, 16),
    title: '',
    text: '',
    order: 0,
    published: true,
  })

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/life_log/')
      if (response.ok) {
        setLogs(await response.json())
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/life_log/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newLog, time: new Date(newLog.time).toISOString() }),
      })
      if (response.ok) {
        setShowModal(false)
        setNewLog({ time: new Date().toISOString().slice(0, 16), title: '', text: '', order: 0, published: true })
        fetchLogs()
      }
    } catch (e) {
      console.error('Failed to create log:', e)
    }
  }

  const handleUpdate = async (id, data) => {
    try {
      const response = await fetch(`/api/life_log/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, time: new Date(data.time).toISOString() }),
      })
      if (response.ok) {
        setEditing(null)
        fetchLogs()
      }
    } catch (e) {
      console.error('Failed to update log:', e)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条日志吗？')) return
    try {
      const response = await fetch(`/api/life_log/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        fetchLogs()
      }
    } catch (e) {
      console.error('Failed to delete log:', e)
    }
  }

  const togglePublish = async (log) => {
    await handleUpdate(log.id, { ...log, published: !log.published })
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="cms-section">
      <div className="cms-section-header">
        <h2 className="cms-section-title">生活日志</h2>
        <button className="cms-button cms-button-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          新建日志
        </button>
      </div>

      {loading ? (
        <div className="cms-loading">
          <Loader2 size={24} />
        </div>
      ) : logs.length === 0 ? (
        <div className="cms-empty">
          <p>还没有日志，点击上方按钮记录第一篇日志</p>
        </div>
      ) : (
        <div className="cms-list">
          {logs.map((log, index) => (
            <div key={log.id} className="cms-list-item">
              <span className="cms-list-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="cms-list-content">
                <div className="cms-list-header">
                  <h3 className="cms-list-title">{log.title}</h3>
                  <span className="cms-list-date">{formatDate(log.time)}</span>
                </div>
                {log.text && <p className="cms-list-text">{log.text}</p>}
                <span className={`cms-list-status ${log.published ? 'is-published' : ''}`}>
                  {log.published ? '已发布' : '草稿'}
                </span>
              </div>
              <div className="cms-list-actions">
                <button
                  className="cms-action-btn"
                  onClick={() => togglePublish(log)}
                  title={log.published ? '隐藏' : '显示'}
                >
                  {log.published ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  className="cms-action-btn"
                  onClick={() => setEditing(log)}
                  title="编辑"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="cms-action-btn cms-action-btn-danger"
                  onClick={() => handleDelete(log.id)}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="cms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3>新建日志</h3>
              <button className="cms-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-group">
                <label className="cms-form-label">时间 *</label>
                <input
                  type="datetime-local"
                  value={newLog.time}
                  onChange={(e) => setNewLog({ ...newLog, time: e.target.value })}
                  className="cms-form-input"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">标题 *</label>
                <input
                  type="text"
                  value={newLog.title}
                  onChange={(e) => setNewLog({ ...newLog, title: e.target.value })}
                  className="cms-form-input"
                  placeholder="输入日志标题"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">内容</label>
                <textarea
                  value={newLog.text}
                  onChange={(e) => setNewLog({ ...newLog, text: e.target.value })}
                  className="cms-form-textarea"
                  placeholder="记录生活点滴..."
                  rows={4}
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-checkbox">
                  <input
                    type="checkbox"
                    checked={newLog.published}
                    onChange={(e) => setNewLog({ ...newLog, published: e.target.checked })}
                  />
                  发布
                </label>
              </div>
            </div>
            <div className="cms-modal-footer">
              <button className="cms-button cms-button-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="cms-button cms-button-primary" onClick={handleCreate} disabled={!newLog.title || !newLog.time}>
                <Save size={14} />
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="cms-modal-overlay" onClick={() => setEditing(null)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3>编辑日志</h3>
              <button className="cms-modal-close" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-group">
                <label className="cms-form-label">时间 *</label>
                <input
                  type="datetime-local"
                  value={new Date(editing.time).toISOString().slice(0, 16)}
                  onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                  className="cms-form-input"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">标题 *</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="cms-form-input"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">内容</label>
                <textarea
                  value={editing.text || ''}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  className="cms-form-textarea"
                  rows={4}
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-checkbox">
                  <input
                    type="checkbox"
                    checked={editing.published}
                    onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                  />
                  发布
                </label>
              </div>
            </div>
            <div className="cms-modal-footer">
              <button className="cms-button cms-button-secondary" onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="cms-button cms-button-primary" onClick={() => handleUpdate(editing.id, editing)} disabled={!editing.title}>
                <Save size={14} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}