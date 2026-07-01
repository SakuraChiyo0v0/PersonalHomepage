# Errors

## [ERR-20260701-001] ui-ux-pro-max-design-system-search

**Logged**: 2026-07-01T00:00:00+08:00
**Priority**: low
**Status**: pending
**Area**: config

### Summary
UI/UX Pro Max 文档所述的 `scripts/search.py` 在当前技能目录中不存在。

### Error
`python.exe: can't open file 'C:\Users\MaFuY\.codex\skills\ui-ux-pro-max\scripts\search.py': [Errno 2] No such file or directory`

### Context
- 尝试为 SakuraChiyo 个人网站生成设计系统。
- 视觉规范可通过技能正文与已确认设计继续执行。

### Suggested Fix
检查技能包内脚本实际名称，并在技能文档中同步正确入口。

### Metadata
- Reproducible: yes
- Related Files: `C:\Users\MaFuY\.codex\skills\ui-ux-pro-max\SKILL.md`

---

## [ERR-20260701-006] public-profile-web-fetch

**Logged**: 2026-07-01T00:00:00+08:00
**Priority**: low
**Status**: pending
**Area**: frontend

### Summary
直接读取 GitHub、Steam 与 VRChat 公开资料页被当前网络 URL 安全策略拒绝。

### Suggested Fix
实现时仅对 GitHub 官方公共 API 做客户端渐进增强；Steam 与 VRChat 使用用户确认的静态资料和外链，后续由后端代理接入。

---

## [ERR-20260701-005] edge-player-browser-click

**Logged**: 2026-07-01T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
浏览器自动化通过可访问名称点击右侧半隐藏播放器时，因边缘元素可见性判定超时。

### Resolution
使用已验证唯一的 `.player-peek` 稳定选择器并在测试中强制点击，再通过 audio 元素状态核验真实播放。

---

## [ERR-20260701-004] dev-server-restart-status

**Logged**: 2026-07-01T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
重启 Vite 的复合命令在新进程完成监听前以非零状态返回，但后续检查确认 5173 端口已由新进程监听。

---

## [ERR-20260701-003] jsmediatags-vite-entry

**Logged**: 2026-07-01T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
`jsmediatags@3.9.7` 声明的 `main` 指向未随包发布的 `build2/jsmediatags.js`，导致 Vite 无法解析包入口。

### Resolution
直接模块导入仍导致浏览器运行时无法挂载 React，因此将包内 `dist/jsmediatags.min.js` 复制为 public vendor 脚本，并通过其官方 `window.jsmediatags` 全局接口调用。

### Final Resolution
全局构建仍会阻断页面挂载。最终移除 `jsmediatags`，改为在 `predev` / `prebuild` 阶段使用 `music-metadata` 生成曲目清单并提取内嵌封面，浏览器端只消费生成结果。

---

## [ERR-20260701-002] vite-dev-server-path

**Logged**: 2026-07-01T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
开发服务器首次启动使用了不存在的默认 Node.js 安装路径。

### Resolution
通过 `Get-Command npm` 确认实际入口为 `D:\SDKs\Nodejs\npm.cmd`。

---
