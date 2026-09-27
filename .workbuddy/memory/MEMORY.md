# MEMORY.md — 长期项目事实

## 本地联调环境的硬约束（踩过坑，必读）
- **全局 HTTP_PROXY 会劫持 localhost**：本环境导出 `HTTP_PROXY=http://127.0.0.1:62254`。
  personal-agent → personal-os（127.0.0.1:7001）的 urllib 请求必须绕代理，否则返回 **502**（曾被误判为"personal-os 未启动"）。
  启动任何本地服务都加 `NO_PROXY=127.0.0.1,localhost`；curl 探测加 `--noproxy '*'`。
- **personal-os API 默认端口是 7001**（不是 7100/3000）；agent 是 7101。Go 在 `/usr/local/go/bin/go`（不在 PATH）。
  首次启动前需 `npm install`（`personal-os/tools/westock-runtime`），否则 westock CLI 检查失败直接 exit 1。
- **personal-os 的 vault 写入会 `git fetch/push`**：对真实 `personal-assets`（有 GitHub SSH remote）会挂死在主机密钥确认，
  并泄漏 `assetstore.lock`。**联调/测试**一律用**无 remote 的临时副本** + 独立 runtime 目录，复制 assets 用 `tar`
  （`cp -R`/`rsync` 会因非 UTF8 文件名失败）。**真实使用**（App/Web 日常）才指向真实 vault。
- `assetstore.lock` 用的是 `flock`（`packages/assetstore/assetstore.go::acquireLock`），进程退出内核自动释放，
  **文件里残留的 pid/内容只是观测信息，不需要手动删**；只有 flock 被活进程持有时才会 409。
- **一键联调**：`bash personal-agent/scripts/e2e-app.sh`（拉起两个服务 + 黑盒断言），检查逻辑在 `scripts/e2e_app_check.py`。
  它的 `E2E_ASSETS_PATH` 默认 `/private/tmp/e2e-assets`（无 remote 副本），可用 `E2E_ASSETS_PATH` 覆盖。
- **官方启动器是 `personal-os/tools/dev`**（同时托管 API + agent，API_BIN 在 `/private/tmp/personal-os-dev/personal-os-api`）：
  1. **必须先有 `personal-os/.env`**，否则 `start_api` 里无条件的 `source "$ENV_FILE"` 直接失败、API 起不来（仓库里没有 `.env.example`）。
  2. 从 WorkBuddy 会话里执行 `./tools/dev`（launchd 模式）会 **`launchctl submit` 返回 rc=1 静默失败**，
     进程还会随命令结束被杀；可行做法是 `./tools/dev --foreground` 配 `run_in_background=true`。
     想要 launchd 托管需用户在自己的 Terminal 里执行。
  3. `ensure_dividend_provider_runtime` 会尝试建 `var/akshare-venv` 并装 akshare+baostock；
     本机 pip 会因临时目录 EEXIST 失败 → 只打印 warning，dividend 分析降级，**不影响启动**。
- agent HTTP 契约易错点：`POST /chat`（无 `/api` 前缀）、`/memory/list` 返回字段是 `memories`、登录响应字段是 `token`、
  vault 文件路径是 `92-系统/memory/{user}.json`。

## personal-system 架构要点（跨会话复用）
- `personal-assets` 是 Durable Source of Truth；`personal-os`(Go API+macOS App) 与 `personal-agent`(Python LangGraph runtime) 都是消费方。
- **personal-agent memory_sync**：`config.py` 默认 `memory_sync_path = personal-agent/../personal-assets/92-系统/memory`
  （不是 `personal-assets/system/memory`；`92-系统/memory` 才是真实目录）。启动时 `sync_profile_from_file`（`store.py`）
  把 `{user_id}.json` 的键值对同步进 runtime SQLite profile。**同步是 upsert-only，不删键**：
  日志 `entries=8 (existing=13)` 表示 vault 文件里已删除的键仍留在 runtime profile 中，需要手工清理。
- **vault 的用户偏好源是 `92-系统/memory/{user_id}.json`，由 personal-os 受控写入**
  （`apps/api/vault.go`，路径 `filepath.Join("92-系统","memory", userID+".json")`）；agent 只读加载。
  切换 vault（换 `PERSONAL_ASSETS_PATH`）后 agent 侧靠 `memory_sync_path` 决定读哪里，两边都要指向同一个 vault。
- 架构宪法：Vault owns truth / App owns experience / AI proposes meaning / User owns judgment。运行态(SQLite/cache)可重建，但用户偏好 JSON 是 Vault 源。
- ⚠️ `personal-assets/README.md` 里写的 `system/`、`system/memory` 是**目标布局，磁盘上并不存在**：
  真实 vault 顶层只有 `00-长乐道 … 92-系统`，偏好源实际是 **`92-系统/memory/`**。
  遇到两者冲突一律以代码为准（`apps/api/vault.go` 的 `filepath.Join("92-系统","memory",...)`、
  agent `config.py` 的 `memory_sync_path`）。README 待修。
