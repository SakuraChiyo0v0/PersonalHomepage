import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Loader2 } from 'lucide-react'

const TONES = [
  { value: 'pink', label: '粉色', bg: '#f7e1e7' },
  { value: 'mint', label: '薄荷绿', bg: '#dceee9' },
  { value: 'blue', label: '蓝色', bg: '#dce7ed' },
]

export function Projects({ token }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newProject, setNewProject] = useState({
    title: '',
    type: '',
    text: '',
    tags: [],
    tone: 'pink',
    url: '',
    order: 0,
    published: true,
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/projects/')
      if (response.ok) {
        setProjects(await response.json())
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProject),
      })
      if (response.ok) {
        setShowModal(false)
        setNewProject({ title: '', type: '', text: '', tags: [], tone: 'pink', url: '', order: 0, published: true })
        fetchProjects()
      }
    } catch (e) {
      console.error('Failed to create project:', e)
    }
  }

  const handleUpdate = async (id, data) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        setEditing(null)
        fetchProjects()
      }
    } catch (e) {
      console.error('Failed to update project:', e)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个项目吗？')) return
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        fetchProjects()
      }
    } catch (e) {
      console.error('Failed to delete project:', e)
    }
  }

  const togglePublish = async (project) => {
    await handleUpdate(project.id, { ...project, published: !project.published })
  }

  return (
    <div className="cms-section">
      <div className="cms-section-header">
        <h2 className="cms-section-title">项目列表</h2>
        <button className="cms-button cms-button-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          新建项目
        </button>
      </div>

      {loading ? (
        <div className="cms-loading">
          <Loader2 size={24} />
        </div>
      ) : projects.length === 0 ? (
        <div className="cms-empty">
          <p>还没有项目，点击上方按钮创建第一个项目</p>
        </div>
      ) : (
        <div className="cms-grid">
          {projects.map((project, index) => (
            <div key={project.id} className={`cms-card tone-${project.tone}`}>
              <div className="cms-card-header">
                <span className="cms-card-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="cms-card-actions">
                  <button
                    className="cms-action-btn"
                    onClick={() => togglePublish(project)}
                    title={project.published ? '隐藏' : '显示'}
                  >
                    {project.published ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    className="cms-action-btn"
                    onClick={() => setEditing(project)}
                    title="编辑"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="cms-action-btn cms-action-btn-danger"
                    onClick={() => handleDelete(project.id)}
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="cms-card-title">{project.title}</h3>
              {project.type && <span className="cms-card-type">{project.type}</span>}
              <p className="cms-card-text">{project.text}</p>
              {project.tags && project.tags.length > 0 && (
                <div className="cms-card-tags">
                  {project.tags.map((tag) => (
                    <span key={tag} className="cms-tag">{tag}</span>
                  ))}
                </div>
              )}
              {project.url && (
                <a href={project.url} target="_blank" rel="noreferrer" className="cms-card-link">
                  {project.url}
                </a>
              )}
              <div className="cms-card-footer">
                <span className="cms-card-status">{project.published ? '已发布' : '草稿'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="cms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3>新建项目</h3>
              <button className="cms-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-group">
                <label className="cms-form-label">标题 *</label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="cms-form-input"
                  placeholder="输入项目标题"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">类型</label>
                <input
                  type="text"
                  value={newProject.type}
                  onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                  className="cms-form-input"
                  placeholder="如：Web、Mobile"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">描述</label>
                <textarea
                  value={newProject.text}
                  onChange={(e) => setNewProject({ ...newProject, text: e.target.value })}
                  className="cms-form-textarea"
                  placeholder="输入项目描述"
                  rows={3}
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">标签</label>
                <input
                  type="text"
                  value={newProject.tags.join(', ')}
                  onChange={(e) => setNewProject({ ...newProject, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                  className="cms-form-input"
                  placeholder="用逗号分隔"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">色调</label>
                <div className="cms-tone-options">
                  {TONES.map((tone) => (
                    <button
                      key={tone.value}
                      className={`cms-tone-option ${newProject.tone === tone.value ? 'is-selected' : ''}`}
                      style={{ '--tone-bg': tone.bg }}
                      onClick={() => setNewProject({ ...newProject, tone: tone.value })}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">链接</label>
                <input
                  type="url"
                  value={newProject.url}
                  onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                  className="cms-form-input"
                  placeholder="项目链接"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-checkbox">
                  <input
                    type="checkbox"
                    checked={newProject.published}
                    onChange={(e) => setNewProject({ ...newProject, published: e.target.checked })}
                  />
                  发布
                </label>
              </div>
            </div>
            <div className="cms-modal-footer">
              <button className="cms-button cms-button-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="cms-button cms-button-primary" onClick={handleCreate} disabled={!newProject.title}>
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
              <h3>编辑项目</h3>
              <button className="cms-modal-close" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cms-modal-body">
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
                <label className="cms-form-label">类型</label>
                <input
                  type="text"
                  value={editing.type || ''}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  className="cms-form-input"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">描述</label>
                <textarea
                  value={editing.text || ''}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  className="cms-form-textarea"
                  rows={3}
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">标签</label>
                <input
                  type="text"
                  value={(editing.tags || []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                  className="cms-form-input"
                />
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">色调</label>
                <div className="cms-tone-options">
                  {TONES.map((tone) => (
                    <button
                      key={tone.value}
                      className={`cms-tone-option ${editing.tone === tone.value ? 'is-selected' : ''}`}
                      style={{ '--tone-bg': tone.bg }}
                      onClick={() => setEditing({ ...editing, tone: tone.value })}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cms-form-group">
                <label className="cms-form-label">链接</label>
                <input
                  type="url"
                  value={editing.url || ''}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  className="cms-form-input"
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