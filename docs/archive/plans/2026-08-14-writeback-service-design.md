# WritebackService 详细设计

> 状态：第一批已实施，远端安全处理和专用审批预览已补齐，仍需真实环境 smoke 验证
> 范围：`personal-agent`、`personal-os`、`AssetStore`
> 目标：在不允许 Agent 直接写入 `personal-assets` 的前提下，提供可审批、可审计、可恢复的结构化写回能力。

## 1. 核心原则

```text
personal-agent 生成计划
  -> Runtime 持久化 operation / approval
  -> 用户或策略批准
  -> personal-os 校验并执行计划
  -> AssetStore 写入 personal-assets
```

- `personal-agent` 不直接操作 `personal-assets` 或 Git。
- Runtime Core 不依赖 `personal-os`，只依赖抽象的 `WritebackGateway`。
- `personal-os` 是业务写入入口，`AssetStore` 是唯一 durable write boundary。
- SQLite 只保存运行态、审批态和恢复信息；长期事实仍保存在 `personal-assets`。
- 不提供通用 `write_file` 工具，所有写入必须声明 operation type。

## 2. 两阶段接口

### 2.1 生成计划

Agent 工具：`writeback.prepare`

此阶段只做：

- 规范化输入；
- 业务校验；
- 生成 fact ID、目标路径和幂等键；
- 记录当前资产仓库 commit；
- 返回影响范围和撤销方式。

不修改文件、不 commit、不 push。

### 2.2 执行计划

Agent 工具：`writeback.execute_plan`

此阶段只接受 `plan_id` 和 `plan_hash`，不接受模型重新生成的业务 payload。工具属性：

```text
side_effect = true
requires_approval = true
recovery_policy = idempotent
```

personal-os 必须重新校验计划，不能信任 Agent 之前的校验结果。

## 3. WritebackPlan

计划至少包含：

```json
{
  "plan_id": "plan_...",
  "plan_version": 1,
  "operation": "finance.snapshot.create",
  "owner_id": "owner_...",
  "session_id": "session_...",
  "request_id": "req_...",
  "idempotency_key": "owner:operation:target:date",
  "normalized_payload": {},
  "materialized": {
    "fact_id": "snap_...",
    "relative_path": "财富/快照/YYYY/MM/....json",
    "created_at": "..."
  },
  "precondition": {
    "asset_repo_commit": "abc1234"
  },
  "preview": {
    "summary": "...",
    "affected_paths": [],
    "cache_scope": "finance",
    "git_action": "fast_forward_if_behind_then_commit_and_push"
  },
  "risk": "low",
  "reversibility": {
    "kind": "void_fact",
    "operation": "finance.snapshot.void"
  },
  "plan_hash": "sha256:...",
  "expires_at": "..."
}
```

审批绑定 `owner_id`、`session_id`、`operation_id`、`tool_call_id`、`plan_id` 和 `plan_hash`。计划内容发生任何变化都必须重新审批。

## 4. 审批策略

采用三种策略：

```text
blocked          禁止写入
manual           每次人工确认（默认）
auto_allowlist   仅符合策略的操作自动批准
```

自动审批不是绕过审批。Runtime 仍创建完整 approval，只是决策来源为 `policy`：

```text
approval_required
  -> auto_approved
  -> effect_started
  -> effect_settled
```

自动审批策略不由模型控制，由应用层的 AgentMode / Preset 或用户配置解析后传给 Runtime。建议抽象为：

```python
ApprovalPolicy(
    mode="auto_allowlist",
    allowed_operations={"finance.snapshot.create"},
    require_explicit_user_input=True,
    limits={"max_per_run": 1},
)
```

自动批准必须同时满足：

- operation 在 allowlist 中；
- owner 和 session 匹配；
- plan 未过期且 hash 未变化；
- 工作区干净且远程没有 diverge；
- 通过 operation-specific 校验；
- 未超过次数或金额限制；
- 关键业务字段由用户明确提供，而非模型猜测。

第一版不提供全局 `auto_approve_all`。

推荐用户侧模式：

```text
read_only       禁止写入
writeback       人工审批
writeback_auto  仅 allowlist 操作自动审批
```

自动审批仍记录 approval、策略版本、批准原因、plan hash、commit SHA 和 cache 状态。

## 5. 第一批 operation

第一版 Agent 只开放：

```text
finance.snapshot.create
```

理由：已有 `personal-os` API 和 `finance-writes` 实现，append-only，具备 `asset_id + snapshot_date` 幂等约束，并可通过 `finance.snapshot.void` 进行后续撤销。

暂不开放：

```text
finance.asset.upsert
finance.target.update
finance.snapshot.correct
finance.snapshot.void
finance.transaction.create
investment.analysis
report.create
skill.update
```

其中 snapshot correction / void 可作为第二批；研究卡写入需要额外的来源质量、重复写入和修正设计。

## 6. 执行流程

```text
获取 AssetStore lock
  -> 检查 repo、branch、merge 状态
  -> fetch / fast-forward / diverged 检查
  -> 确认基准 commit 未变化
  -> 重做 operation 校验
  -> 检查幂等键
  -> 生成 durable audit
  -> 写入 fact
  -> 校验 staged diff 和仓库 schema
  -> commit
  -> push
  -> rebuild finance cache
  -> runtime log
```

计划生成后本地工作区或本地 HEAD 发生变化时，第一版返回 `PLAN_STALE`，要求重新生成计划。
如果执行前发现本地分支只是 behind upstream，则只允许 `git merge --ff-only` 更新到 upstream；
如果 ahead/behind 同时存在则返回 `ASSET_REPO_REMOTE_DIVERGED`，不自动 merge。push 失败最多做一次
安全重试，禁止 force push。

## 7. owner、session、operation 和幂等

- `owner_id` 来自登录主体，不由模型生成。
- `session_id` 必须属于当前 owner。
- `operation_id` 表示一次 Runtime 执行尝试。
- `plan_id` 表示一次不可变的写入提案。
- `approval_id` 表示一次对具体 operation/plan 的批准。
- `idempotency_key` 用于重试和响应丢失恢复。

建议快照幂等键：

```text
<owner_id>:finance.snapshot.create:<asset_id>:<snapshot_date>
```

相同幂等键重复执行时返回已有结果，不重复生成事实文件或 commit。

## 8. 错误和恢复

| 情况 | 处理 |
|---|---|
| dirty worktree | 拒绝执行，返回 dirty paths |
| remote diverged | 拒绝执行，要求人工解决，禁止自动 merge/force push |
| 计划基准 commit 变化 | 返回 `PLAN_STALE` |
| schema / reference 校验失败 | commit 前终止 |
| commit 失败 | 清理本次未提交新增文件 |
| commit 成功但 push 失败 | 保留本地 commit，标记 `committed_unpublished` |
| push 后 cache rebuild 失败 | 保留 durable commit，标记 `cache_degraded` |
| 请求超时或响应丢失 | 通过 plan_id / 幂等键查询状态 |
| 无法判断外部效果是否发生 | 返回 `RECOVERY_REQUIRED`，禁止盲目重放 |

禁止 force push、自动 merge、删除已提交事实或覆盖非本次 operation 的文件。

## 9. 审计和可逆性

Runtime SQLite 保存运行态审计：operation、approval、effect、owner/session、plan hash 和错误状态。

成功的 durable 写入同时提交精简审计文件：

```text
财富/审计/YYYY/MM/<operation-id>.json
```

审计文件保存 operation、actor、owner、session、plan hash、目标路径和 commit，不重复保存完整财务金额。

已提交事实不直接删除：

```text
create -> void fact
error  -> correction fact
```

## 10. 实施顺序

1. 补齐 AssetStore 的同步检查、路径 allowlist、审计、push 状态和幂等查询。
2. 为 `finance.snapshot.create` 增加 plan / execute 接口。
3. 在 `personal-agent` 增加 `WritebackGateway` 和两个 Agent 工具。
4. 接入 Runtime approval policy，包括 `manual` 和 `auto_allowlist`。
5. 接入 Web / macOS 展示并进行 smoke 验证。

## 11. 第一批实施记录

已完成：

- `personal-os` 增加 `/api/writeback/plan`、`/api/writeback/execute` 和 `/api/writeback/status`；
- 第一批 operation 为 `finance.snapshot.create`；
- 计划冻结 fact ID、创建时间、目标路径、仓库 commit、幂等键和 plan hash；
- 执行时重新校验 owner/session、hash、过期时间、仓库 commit、资产引用和重复日期；
- 写入事实和 `财富/审计/**`，通过 AssetStore commit、push 和 finance cache rebuild；
- `personal-agent` 增加 `writeback.prepare` 与 `writeback.execute_plan`；
- `read_only` 和 legacy 直接执行路径阻断 durable writeback；
- `writeback` 模式强制 Runtime；
- 增加 `manual` / `auto_allowlist` 审批策略，自动审批仍记录 approval 和 effect；
- 自动审批配置：`MATRIX_WRITEBACK_APPROVAL_MODE`、`MATRIX_WRITEBACK_AUTO_OPERATIONS`。
- AssetStore 增加 fetch、behind-only fast-forward、diverged 拒绝和 push 一次安全重试；禁止自动 merge 和 force push。
- Web 审批弹窗对 `writeback.execute_plan` 展示专用计划预览：摘要、影响文件、Git 动作、缓存范围、可逆方式、计划 hash、提交基线和过期时间。

尚未完成：

- 真实 `personal-assets` 干净工作区下的端到端写回验证；
- macOS 原生界面的专用 Writeback 预览（当前先覆盖 personal-agent Web 审批界面）。
