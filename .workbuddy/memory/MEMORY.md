# MEMORY.md — 长期项目事实

## 本地联调环境的硬约束（踩过坑，必读）
- **全局 HTTP_PROXY 会劫持 localhost**：本环境导出 `HTTP_PROXY=http://127.0.0.1:62254`。
  personal-agent → personal-os（127.0.0.1:7001）的 urllib 请求必须绕代理，否则返回 **502**（曾被误判为"personal-os 未启动"）。
  启动任何本地服务都加 `NO_PROXY=127.0.0.1,localhost`；curl 探测加 `--noproxy '*'`。
- **personal-os API 默认端口是 7001**（不是 7100/3000）；agent 是 7101。Go 在 `/usr/local/go/bin/go`（不在 PATH）。
  首次启动前需 `npm install`（`personal-os/tools/westock-runtime`），否则 westock CLI 检查失败直接 exit 1。
- **personal-os 的 vault 写入会 `git fetch/push`**：**联调/测试**一律用**无 remote 的临时副本** + 独立 runtime 目录，
  复制 assets 用 `tar`（`cp -R`/`rsync` 会因非 UTF8 文件名失败）。**真实使用**（App/Web 日常）才指向真实 vault。
- ⚠️ **vault 锁被 git 卡死的真实机制**（2026-09-27 实测，已修）：vault 写入全程在 `WithLock` 内，而 `runGit` 原本
  **没有超时、ssh 是交互式的**。ssh 遇到未知 host key 会打开 `/dev/tty` 等人确认 → 一个 `memory.sync` 把
  `assetstore.lock` 占了 **90 分钟**，之后所有写入都 409/503。
  修法（`packages/assetstore/assetstore.go`，commit e573027）：所有 git 调用默认
  `GIT_TERMINAL_PROMPT=0` + `GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=15 …"`，
  并加 120s 硬超时（`PERSONAL_OS_GIT_TIMEOUT_SEC` 可调）。**排查手法**：`lsof -p <api_pid> -a -d <fd>`
  看到 `.lock` 还开着 → `lsof | grep <pipe_addr>` 能揪出挂起的 `ssh …git-upload-pack`；`kill` 掉它，锁立即释放。
- `assetstore.lock` 用的是 `flock`（`packages/assetstore/assetstore.go::acquireLock`），进程退出内核自动释放，
  **文件里残留的 pid/内容只是观测信息，不需要手动删**；只有 flock 被活进程持有时才会 409。
- ⚠️ **从 WorkBuddy 会话启动的 API 读不到 `~/.ssh/known_hosts`**：进程继承沙箱（fd 里带
  `~/.workbuddy/logs/sandbox/...log`），ssh 报 `hostkeys_foreach failed … Operation not permitted` /
  `Host key verification failed` → **vault 写入全部失败**（修复后是快速失败，不再挂死）。
  要从"能写 vault"的状态跑，需**用户在普通 Terminal 里**执行 `cd personal-os && ./tools/dev`。
- **一键联调**：`bash personal-agent/scripts/e2e-app.sh`（拉起两个服务 + 黑盒断言），检查逻辑在 `scripts/e2e_app_check.py`。
  它的 `E2E_ASSETS_PATH` 默认 `/private/tmp/e2e-assets`（无 remote 副本），可用 `E2E_ASSETS_PATH` 覆盖。
- **官方启动器是 `personal-os/tools/dev`**（同时托管 API + agent，API_BIN 在 `/private/tmp/personal-os-dev/personal-os-api`）：
  1. **必须先有 `personal-os/.env`**，否则 `start_api` 里无条件的 `source "$ENV_FILE"` 直接失败、API 起不来。仓库已于 2026-10-11（`0c11c1a`）加入双机 `.env.example`，先 `cp .env.example .env` 再启动。
  2. 从 WorkBuddy 会话里执行 `./tools/dev`（launchd 模式）会 **`launchctl submit` 返回 rc=1 静默失败**，
     进程还会随命令结束被杀；可行做法是 `./tools/dev --foreground` 配 `run_in_background=true`。
     想要 launchd 托管需用户在自己的 Terminal 里执行。
  3. `ensure_dividend_provider_runtime` 会尝试建 `var/akshare-venv` 并装 akshare+baostock；
     本机 pip 会因临时目录 EEXIST 失败 → 只打印 warning，dividend 分析降级，**不影响启动**。
- agent HTTP 契约易错点：`POST /chat`（无 `/api` 前缀）、`/memory/list` 返回字段是 `memories`、登录响应字段是 `token`、
  vault 文件路径是 `92-系统/memory/{user}.json`。

## 判断"最新代码"的正确姿势（2026-10-13 踩坑，必读）
- **不要用本地 HEAD 的提交日期判断是否最新**。必须同时看：`git status -sb`（ahead/behind）、
  `git log -1 --oneline origin/master`、`git reflog show origin/master`（最后一次成功 fetch 的时间）。
- 2026-10-13 实测：`personal-agent` 本地 master 曾长期停在与 origin 分叉的旧血统 `d6e16aa`，
  **缺全部 10 月工作**（`git diff --stat 49d4172 d6e16aa` = 60 文件 +1238/−4580，缺 `stock_research.py`、`plan_validator.py`、JSON Schema 批次，多出已废弃的 `llm/codex_cli.py`）；
  21:30 一次 `git pull --rebase` 才收口到 `origin/master` `49d4172`。而 `origin/master` 本地记录在 10-11 21:12 就已指向新头，
  即这次落后**当天就能发现**。双机工作区极易出现"本地干净、其实落后远端"的状态。
- 各仓最后一次成功 fetch（2026-10-13 复核）：顶层 / `personal-os` / `personal-agent` = 2026-10-11；
  **`personal-assets` / `personal-tools` = 2026-09-27**，这两仓的"最新"在本机无法确认。
- 已核实的待办问题台账在 `docs/known-issues.md`（KI-01..KI-10），新发现的问题往那里记，不要只写在日志里。
- 沙箱环境：`~/.cache/uv` 不可写且无外网 → 离线装依赖用
  `cp -R ~/.cache/uv/. /tmp/uv-cache/` + `UV_CACHE_DIR=/tmp/uv-cache uv sync --offline --frozen`（用完删副本）；
  `rag` extra（torch / networkx / chromadb）不在缓存里，装不上。
- `perl -e 'alarm N; exec @ARGV'` 给 `git fetch` 限时**无效**（exec 后 alarm 失效、会挂住），要限时用 `perl -e 'alarm N; system @ARGV'`。

## personal-assets vault 同步状态（2026-10-14 凌晨，必读）
- 本机 vault 曾**落后远端 71 个提交**（远端 tip `c590a01`，本机停在 `dddb269` = 2026-09-27）。10-14 00:28 已取回 **70/71** 并 `git merge --ff-only` 把本地 HEAD 推进到 **`1c84e25`**（10-13 知识总纲）；10-10～10-13 的估值快照等已可用。
- **只剩 `c590a01`**（下载的投资理财学习原文 + CHFP 资料清单，含 PDF，本批最大）在后台反复重试：
  `nohup bash personal-assets/.git/dsh-fetch-vault.sh &`（脚本持久副本在 `.git` 内，不入库；日志 `/tmp/assets-overnight.log`）。
  成功后脚本自动 `git fetch --prune origin master` + `git merge --ff-only origin/master` → HEAD 变 `c590a01`。
- ⚠️ 在 `c590a01` 落地前：**不要 push `personal-assets`**；且 `git status -sb` 会显示 `ahead 70`，那是**假象**（本机 `refs/remotes/origin/master` 仍是旧值 `dddb269`，git 不允许把 ref 指向尚未存在的对象）——真实是 behind 1。
- ⚠️ 慢链路上大传输必挂：单次 `git pull` 跑了 62 分钟后 `early EOF` 全废。正确姿势是**按提交逐个取 + 进度 ref**：
  `git fetch --no-tags origin <sha>` 的对象**不挂 ref**，服务端下次谈判会重复发送（曾一次要传 6405 个对象）；
  每取一个就 `git update-ref refs/fetch/progress <sha>`（**不要放 `refs/heads/*`**，否则 `git push --all` 会把这个临时分支推上去），
  再配短超时（150-180s）+3 次重试+多轮棘轮 → 实测 ~6 秒/提交。
- 收尾清理：`git gc` 前先看 git 自己的 `warning: garbage found: .git/objects/pack/tmp_pack_*`，被杀掉的 fetch 会留下大量残片（本次清掉 421MB）。

## personal-system 架构要点（跨会话复用）
- ⚠️ **UI 入口只有 macOS App（`/Applications/筋斗云.app`，连 127.0.0.1:7001），没有 Web App**：
  `apps/web` 源码已于 `f355de1`（2026-08-28）从 git 删除，仅存于 git 历史（`1ba8b85^`..`f355de1^`）。
  **磁盘上仍有 `personal-os/apps/web/`，但只剩 gitignored 的 `dist/` + `node_modules/` 残留**（2026-10-13 复核，
  `git ls-files apps/web` 为空），不是可运行入口；`tools/web-preview.py` 无托管对象、不可用。
  做架构汇总前必须核对当前磁盘 + git log + `git ls-files`，**不要照搬旧日志里的组件清单**（2026-10-10 曾因此画出过时的 Web 预览节点被用户纠正）。
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
