# MEMORY.md — 长期项目事实

## personal-system 架构要点（跨会话复用）
- `personal-assets` 是 Durable Source of Truth；`personal-os`(Go API+macOS App) 与 `personal-agent`(Python LangGraph runtime) 都是消费方。
- **personal-agent memory_sync**：`config.py` 默认 `memory_sync_path = personal-agent/../personal-assets/system/memory`；启动时 `sync_profile_from_file`(`store.py:804`) 把该目录下 `{user_id}.json` 键值对同步进 runtime SQLite profile。`personal-assets/system/memory/` 是**用户偏好的设计内持久化源**，不是运行时泄漏，清理时不要误删。
- 架构宪法：Vault owns truth / App owns experience / AI proposes meaning / User owns judgment。运行态(SQLite/cache)可重建，但用户偏好 JSON 是 Vault 源。
- 顶层 `personal-assets/README.md` 的目标目录清单**未列出 `system/`**，但代码依赖它——属文档与代码不一致，需要时可在 README 补 `system/memory` 说明。
