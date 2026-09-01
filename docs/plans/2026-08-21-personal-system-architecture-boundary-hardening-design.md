# personal-system 架构边界收口设计

> 状态：已实施并通过跨仓验证
> 日期：2026-08-21
> 范围：`personal-system`、`personal-os`、`personal-agent`

## 1. 目标

本轮修复最新架构审查确认的五项问题：

1. `personal-agent` 不再直接修改 `personal-assets`。
2. 所有 durable writer 共享 AssetStore 的锁、仓库预检、路径冲突和限定提交边界；
   是否同步远端、push 以及重建 cache 由 operation 决定。
3. App 写入不得带入用户已有 staged 内容或声明目标路径上的 dirty 内容。
4. 自动投研调度、任务状态和重试迁入 `personal-os` 后台服务。
5. 顶层仓不再追踪任何子项目 gitlink。

## 2. Vault 写入边界

`personal-agent` 继续直接读取 `personal-assets/技能/**` 和
`personal-assets/system/memory/**`，但所有变更请求改为调用 `personal-os`：

```text
personal-agent API
  -> personal-os /api/vault/*
  -> operation-specific validation
  -> AssetStore
  -> personal-assets commit
  -> 按 operation 决定是否 push
  -> personal-agent reload/sync SQLite projection
```

Memory 写入以完整 profile 替换 `system/memory/<user>.json`；Skill 写入使用
`create_skill`、`update_skill`、`delete_skill`、`write_knowledge`、
`delete_knowledge`、`write_script`、`delete_script` 七种显式 operation。
`personal-os` 负责路径生成和遍历校验，不提供通用 `write_file`。

## 3. AssetStore 统一语义

每次 durable write 的当前实现语义为：

1. 获取 AssetStore lock。
2. 允许无关 unstaged 修改；拒绝 staged change、merge state 和声明目标路径冲突。
3. 若配置 upstream，执行 fetch 并只允许 behind-only fast-forward。
4. 只提交 operation 声明的路径，不能带入其他 staged 内容。
5. 若配置 upstream，push；无 upstream 的测试/临时仓保持本地提交。
6. push 失败返回明确错误，不进行 force push 或自动 merge。

所有 finance、research、watchlist、fund、valuation、memory 和 skill writer
共享上述安全边界；publish-enabled writer 才执行 upstream sync/push，
research card writer 只创建本地 commit，cache/projection rebuild 也由
具体 operation 负责。

## 4. 自动投研后台化

`personal-os` 新增持久化 ReviewService：

- SQLite：`var/automation/reviews.sqlite`。
- 启动时恢复 `running` 任务为可重试状态。
- 每分钟扫描 active watchlist 的到期标的。
- 通过唯一幂等键阻止同一观察池、同一标的、同一计划时间重复入队。
- 顺序执行任务，失败按 1/5/15 分钟退避。
- 调用现有 `personal-agent /chat` 的 `deep_research` 模式。
- 复用现有 research card normalization、质量闸门和 AssetStore 写回。
- 成功后更新 watchlist 的 `last_review` / `next_review`。

macOS App 只负责：

- 编辑复查配置；
- 调用后端“立即复查”；
- 展示任务状态、研究记录和消息；
- 定时刷新投影。

后台服务通过 launchd 保持运行，关闭 App 窗口不停止调度。

## 5. 验证

- Go 全量测试和 macOS Debug build。
- Python 全量测试。
- `personal-tools/weixin-clip` Chrome extension Manifest 校验。
- 临时 Git 仓验证：无关 unstaged 修改可保留，staged/目标路径冲突拒绝、
  限定路径提交、publish-enabled operation 有 upstream 时 push、无 upstream
  或 local-only operation 时只创建本地提交。
- 临时 clone 验证顶层仓不再生成空的 `personal-agent/` gitlink。
