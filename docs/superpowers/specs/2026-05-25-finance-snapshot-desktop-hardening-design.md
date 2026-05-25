# Finance Snapshot Desktop Hardening Design

## 目标

本轮只打磨 `personal-os` V1 的桌面端 finance snapshot workflow：创建快照、修正最近快照、写入阻断状态、doctor/smoke 检查。手机浏览器处理、移动端专项适配、`snapshot.void` UI 不进入本轮范围。

## 当前基础

- Web 页面已能读取 `assets.v2`、`holdings.v2`、`snapshots.v2`、`cache/status`。
- Web 页面已有 `submitBlockReason`、`correctionBlockReason`、`safetyBlockReason`，能阻止 dirty repo、stale cache、missing cache、重复日期等风险写入。
- API 已有 `snapshot.create`、`snapshot.correct`、`snapshot.void`，写入走 `AssetStore`，会 commit 并 rebuild cache。
- `tools/doctor` 和 `/api/system/doctor` 已存在，但输出和 ok 判定还不够适合日常定位。
- Playwright e2e 已覆盖一次 create 和 correct 成功路径。

## 范围

### 做

- 保持当前单页 Web 结构，不重做大布局。
- 把写入状态从零散文字提升为清晰的桌面端 operator 状态：
  - `ready`：可提交。
  - `blocked`：repo/cache/duplicate/date/form 等原因导致写入暂停。
  - `checking`：状态仍在加载。
  - `error`：状态读取失败或 cache/repo 不可用。
- 创建快照和修正快照继续复用现有 `AssetStore` write path。
- duplicate date 继续由前端通过 `snapshots.v2` 预检；提示用户改走“修正最近快照”。
- 运行状态卡片显示当前 repo/cache 的关键事实：repo path、current commit、cache source commit、built at、dirty/cache fresh/cache exists。
- `doctor` 输出更适合命令行和 API 使用：同一套 status，加上 `ok` 和 blocker 列表。
- smoke/e2e 覆盖成功路径和至少两个阻断路径：duplicate date、dirty asset repo。

### 不做

- 不新增 `snapshot.void` Web UI。
- 不新增新的 durable write endpoint。
- 不让 Web、Agent、Codex 绕过 API-owned structured operations 直接写 durable facts。
- 不做手机浏览器适配、PWA、小程序。
- 不做 generic capture、knowledge ingest、cloud node、vector database。

## 设计

### Web 状态模型

在 `apps/web/src/App.vue` 内保守增加本地状态派生，不拆组件：

- `writeStatus`：从 `cacheStatus`、`pageError`、`duplicateSnapshot`、表单选择状态派生。
- `writeBlockers`：数组，每一项包含 `code`、`label`、`detail`、`severity`、`action`。
- `submitBlockReason` 和 `correctionBlockReason` 保留，用于按钮禁用和按钮旁短提示。

这样可以避免引入新组件结构，同时让页面有一个统一的状态来源。后续如果页面继续变大，再把状态模型抽到单独文件。

### 页面呈现

- 顶栏继续显示 `cache fresh/cache stale` 和 `dirty repo`，作为快速信号。
- “快照录入”卡片顶部显示写入状态 alert：
  - ready：简短说明“写入检查通过”。
  - blocked/error：列出阻断原因和下一步。
  - duplicate：明确提示“该日期已有快照，创建已暂停；如需修改金额，请使用修正最近快照。”
- 按钮旁只保留最关键的一句话，避免重复堆满。
- “运行状态”卡片新增 repo/cache 明细和 blocker 列表，便于不用打开终端也能定位。

### Doctor

后端新增一个内部 helper 生成 blocker 列表，供 `/api/system/doctor` 和 `tools/doctor` 使用同一口径：

- `asset_repo_missing`
- `asset_repo_dirty`
- `cache_missing`
- `cache_stale`
- `cache_error`

`ok=true` 只在 repo 存在、repo clean、cache 存在、cache fresh、无 cache error 时成立。当前 API 的 cache status 可保持兼容；doctor 可以多返回 `blockers`。

### 测试

- Go API 测试：
  - doctor clean 状态返回 `ok=true`。
  - dirty repo 返回 `ok=false`，包含 `asset_repo_dirty`。
  - stale cache 返回 `ok=false`，包含 `cache_stale`。
- Web e2e：
  - 保留 create/correct 成功路径。
  - 增加 duplicate date 阻断断言。
  - 增加 dirty repo 阻断断言，验证按钮 disabled 和页面显示 blocker。
- Web type/build：
  - `npm run build` 确认 Vue/TypeScript 通过。

## 验收

- 桌面端页面能清楚说明“为什么不能提交”，不是只把按钮置灰。
- dirty repo、stale cache、missing cache、duplicate date 至少在页面或 doctor 中有明确 blocker code/detail。
- 成功 create/correct 仍会写入 `personal-assets`、commit、rebuild cache、刷新 holdings。
- 本轮不出现 mobile/PWA/void UI 相关实现。
