# personal-agent 架构核查与长期加固计划

> 状态：已核查，待按 P0/P1/P2 实施
> 日期：2026-09-01
> 范围：`personal-agent`（只读审查），结论归档于 `personal-system`
> 基线：`master@9e30f61`

## 1. 核查结论

完整测试结果为 `876 passed, 11 skipped, 11 warnings`。测试全绿只说明已有测试覆盖的路径稳定，不能覆盖审批快照、DAG 重启恢复、并行审批和 Runtime 真流式等交叉路径。

| 项目 | 结论 | 级别 |
| --- | --- | --- |
| 审批暂停后 Runtime 快照丢失配置 | 已复现 | P0 |
| Runtime Core 不是真流式 | 已确认 | P1 |
| DAG 审批重启后无法通过 session 入口恢复 | 已复现 | P1 |
| 并行审批 reducer 无法清空且只处理首个 action | 已确认 | P1 |
| 默认 Codex 路径绕过 Commander/LangGraph | 已确认，属架构一致性问题 | P1 |
| `/tools/call` 绕过统一 Runtime 策略入口 | 部分成立；现有 writeback 自身仍会阻断 | P1 架构风险 |
| Python subprocess executor 不是 OS 级沙箱 | 已确认设计限制 | P1/P2 |
| 新 Runtime 与旧 context/compaction 体系不一致 | 已确认 | P2 |
| Memory 缺少 provenance 与 commit gate | 已确认 | P2 |
| delegation plan 缺少完整编译校验 | 已确认，非法 DAG 可静默进入 aggregate | P1/P2 |

## 2. 证据摘要

### P0：审批快照被整体覆盖

Runtime 初始化时持久化了 `system_prompt`、`model`、`tools`、`execution_options`、`execution_policy` 和 `metadata`（`personal-agent/src/matrix/runtime/core/runtime.py:104`）。模型返回后，`_commit_snapshot()` 以 `state=dict(state)` 整体替换，仅写入 `runtime_messages`（`personal-agent/src/matrix/runtime/core/loop.py:159`、`:675`）。

独立复现的等待审批状态只剩：

```text
pending_tool_call
runtime_messages
```

恢复逻辑因此会以空 system prompt、空 model、空 tools 重建 request（`personal-agent/src/matrix/runtime/core/runtime.py:280`）。这破坏 durable approval resume 契约，不能通过“再补几个字段”长期解决。

### P1：生命周期和编排边界

- `RunHandle.events()` 先执行完整 `_run()` 再 yield；Core loop 使用 `model.complete()`，没有消费已定义的 `ModelPort.stream()`（`personal-agent/src/matrix/runtime/core/runtime.py:46`、`personal-agent/src/matrix/runtime/core/loop.py:456`）。
- DAG operation 使用 `operation_scope="dag_step"`，但 SQLite `find_active()` 只查 `top_level`（`personal-agent/src/matrix/orchestration/runtime_adapter.py:190`、`personal-agent/src/matrix/runtime/adapters/sqlite_store.py:205`）。Graph 待确认上下文还依赖进程内 `_pending_confirms`（`personal-agent/src/matrix/chat/_service.py:1789`）。
- `needs_confirmation` 使用 `operator.or_`，`pending_actions` 使用 `operator.add`；确认节点只读取 `actions[0]`（`personal-agent/src/matrix/orchestration/state.py:111`、`personal-agent/src/matrix/orchestration/nodes/runtime.py:165`）。
- 默认 provider 为 Codex 时，普通请求直接进入 `_stream_codex_direct_runtime()`，绕过 Commander/LangGraph（`personal-agent/src/matrix/chat/_service.py:1605`）。
- `/tools/call` 直接执行 `registry.call()`（`personal-agent/src/matrix/server/routes/tools.py:25`）。当前 `writeback_execute()` 仍检查 writeback mode，因此不能定性为当前已绕过审批写入；风险在于策略、审计和副作用入口分散。

### P1/P2：安全、上下文和数据契约

- 代码执行器只有 subprocess、临时目录和 `setrlimit`；`network_enabled=False` 只裁剪代理环境变量，没有 network namespace 或 egress deny（`personal-agent/src/matrix/tools/code/executor.py:32`）。
- Context 超预算时固定保留最近 6 条消息（`personal-agent/src/matrix/runtime/adapters/context.py:17`），与旧 ReAct 的结构化结果引用和语义压缩不一致。
- Memory schema 只有 `key/value/memory_type/time`（`personal-agent/src/matrix/store.py:51`），后台抽取后直接 upsert（`personal-agent/src/matrix/chat/_service.py:2396`）。
- Plan 是 `list[dict]`，只做默认字段补齐（`personal-agent/src/matrix/orchestration/nodes/commander.py:373`）。已复现 cycle、duplicate step、unknown dependency 不会在执行前被编译器拒绝。

## 3. 行业标准核对

下列能力在 OpenAI Agents SDK、LangGraph、Microsoft Agent Framework、MCP 和 Anthropic 的生产实践中具有明显共识：

1. 版本化、可序列化的完整 run/thread state。
2. checkpoint 驱动的 durable workflow 和明确的恢复身份。
3. 显式 interruption/approval 集合，支持多审批、部分批准、拒绝、过期和幂等 resume。
4. 原生异步事件流、取消、超时和背压。
5. Provider 无关的 `Run / Event / Result / Approval / Resume` 生命周期契约。
6. 单一 host/runtime policy enforcement point；副作用工具由 host 授权和审计。
7. container/VM/OS sandbox、最小文件系统权限和受控网络出口。

参考：

- [OpenAI Agents SDK：streaming / human-in-the-loop](https://openai.github.io/openai-agents-js/guides/streaming/)
- [LangGraph：interrupts 与持久化](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/)
- [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [Anthropic secure deployment](https://code.claude.com/docs/en/agent-sdk/secure-deployment)

以下属于实现选择，不应伪装成“唯一行业标准”：SQLite vs Postgres/Temporal、LangGraph vs 自研 Runtime、snapshot+event journal vs event sourcing，以及是否引入 A2A。A2A 解决跨服务 Agent-to-Agent task，不是本地 DAG 编排的必选依赖。

## 4. 非临时改造计划

### P0：先恢复正确性

1. 建立版本化 `RunState`：包含 request contract、messages、tool specs、execution policy、metadata、pending approval set、schema version。
2. 明确 snapshot 的 merge/replace 语义；禁止局部更新覆盖未变化字段。
3. 以 `orchestration_run_id` 为中心持久化 workflow state、step lifecycle、checkpoint 和 approval references。
4. 恢复入口只依赖 durable identifiers，不依赖进程内 `_pending_confirms`。

### P1：统一运行时契约

1. 引入 `ApprovalRequest` / `ApprovalSet` 状态机，支持多 action、部分批准、拒绝、过期、幂等和重启恢复。
2. Runtime Core 原生消费 `ModelPort.stream()`，统一 event stream、cancel、timeout、backpressure。
3. Codex、DeepSeek、DeepResearch 对外统一 `Run/Event/Result/Resume` 契约；provider 可以有内部 loop，但不能改变上层生命周期。
4. `/tools/call` 只开放显式 read-only allowlist；所有 side-effect tool 通过 Runtime command、policy 和 effect journal。
5. 引入 `PlanSpec`、`StepSpec`、`PlanCompiler`，执行前拒绝 schema 错误、重复 ID、未知依赖、cycle、非法 output key 和 revision 冲突。
6. 将代码执行移入 container/VM/OS sandbox，并通过 egress proxy 或 deny-by-default 网络策略控制外联。

### P2：一致性和数据质量

1. 统一旧 ReAct、LangGraph、Runtime 的 context budget、结构化 tool result 引用和 compaction。
2. Memory 改为 `candidate → validation/provenance → user/system commit`；增加 source event、confidence、validity 和确认状态。
3. 建立 workflow、approval、streaming、restart、policy 的交叉验证矩阵。

## 5. 完成门槛

- 审批暂停后重启，恢复请求与原 request contract 等价。
- DAG 任一步骤审批可通过 durable run/session 恢复，不依赖进程内状态。
- 并行审批可独立批准、拒绝、过期和重试。
- Runtime 首个事件不需要等待模型完整返回；取消和超时可中断模型流。
- 任意 provider 切换不改变上层生命周期语义。
- 非法 plan 在执行前失败；副作用工具没有第二条未审计执行路径。
- 沙箱边界经过实际文件、进程、网络出口验证，而非只检查环境变量。
