/**
 * 真实数据 API 模块
 * - GitHub Events → 贡献周统计
 */
const GITHUB_USER = 'SakuraChiyo0v0'

// ---- GitHub 贡献周统计 -------------------------------------------------
export async function fetchGitHubContributions() {
  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100`)
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const events = await res.json()

    // 取最近 12 周，每周一为起点
    const weeks = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now)
      start.setDate(start.getDate() - start.getDay() + 1 - i * 7)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      weeks.push({ start, end, count: 0 })
    }

    for (const event of events) {
      if (event.type !== 'PushEvent') continue
      const date = new Date(event.created_at)
      for (const week of weeks) {
        if (date >= week.start && date <= week.end) { week.count++; break }
      }
    }

    // 0 次 → 0, 1-3 → 1, 4-6 → 2, 7-10 → 3, 11+ → 4
    return weeks.map((w) => {
      const c = w.count
      if (c === 0) return 0
      if (c <= 3) return 1
      if (c <= 6) return 2
      if (c <= 10) return 3
      return 4
    })
  } catch {
    return []
  }
}
