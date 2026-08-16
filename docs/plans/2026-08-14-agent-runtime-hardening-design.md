# Agent Runtime 验收缺口加固设计

> 状态：已实施并通过验收  
> 范围：`personal-agent`、`personal-os`，以及顶层治理文档  
> 部署前提：单 App、同一时间单登录用户、单 Agent 进程、SQLite

## 1. 背景与目标

独立 Runtime 的基础模型/工具循环、SQLite operation/event、HITL、LangGraph Adapter 和 `personal-os` 服务边界已经落地。真实验收进一步发现四个 Runtime correctness 缺口和一个 Mac 启动环境缺口：

1. 已过期审批仍可消费；
2. 审批恢复后的工具执行绕过 effect journal；
3. DAG `depends_on` 只控制执行顺序，没有把上游结果传给下游 step；
4. SSE 客户端断连后，生成器仍在 `finally` 中发送 `done`；
5. Mac GUI 启动环境找不到 `codex`，导致默认 Provider unavailable。

本次目标不是增加新功能，而是把已确认的 Runtime 设计不变量补完整。修复后仍保持 Runtime Core 下层化、LangGraph 负责编排、SQLite 作为权威运行态；当时的 legacy 回退仅属于迁移阶段。

## 2. 方案选择

采用“围绕不变量的小范围修复”，不采用分散条件判断，也不扩展到多进程、队列或分布式锁。

- 审批决策由 Store Port 以 compare-and-set 方式消费，并在同一事务中提交 approval 状态、operation `waiting_approval -> resuming` 和 `run_resumed` 事件。
- 过期审批原子标记为 `expired`，Runtime 随后将未执行任何外部副作用的 operation 安全终止；重复进入仍保持不可消费。
- 普通执行和审批恢复共用一个 effect 执行函数，保证外部调用前存在 intent，调用后存在 settlement。
- DAG 依赖解析只存在于 LangGraph Adapter；Runtime 接收已解析的 message/metadata，不理解 `depends_on`。
- SSE 正常结束才发送 `done`；`GeneratorExit`/客户端断连只执行清理并向上传播。
- Mac 启动器按显式配置、已知 bundled binary、PATH fallback 的顺序解析 `CODEX_BIN`。

## 3. 审批状态与原子边界

新增 Store Port 的审批消费操作，输入 owner、approval、decision、决策时间和目标 `StateTransition`。Store 必须在一个事务或内存临界区内校验：

1. approval 与 operation 存在且 owner 一致；
2. approval 指向目标 operation；
3. operation 当前仍是 `waiting_approval`，version 与 transition 一致；
4. approval 当前仍是 `pending`；
5. `expires_at` 为空或晚于决策时间。

有效决策原子更新 approval 为 `approved/skipped`，并提交 operation `resuming` 快照及 `run_resumed` 事件。过期决策只把 approval 原子标记为 `expired`，绝不进入工具执行；Runtime 再把仍处于 `waiting_approval` 的 operation 终止为 `aborted` 并记录原因。即使进程在两个安全事务之间退出，也不会产生外部副作用，下一次恢复仍会识别 expired 并完成终止。

相同 approval 的后续决策必须返回 conflict。owner 不匹配、operation 非等待态或 version 变化同样返回 conflict。

## 4. Effect Sandwich

Runtime Core 内只保留一个工具执行入口：

```text
持久化 tool_start / 执行阶段
  -> begin_tool_effect(intent/executing)
  -> ToolExecutorPort.execute
  -> settle_tool_effect(settled/failed)
  -> 持久化 tool_end / 下一状态
```

普通模型工具调用与 approval approve 恢复都调用该入口。skip 不调用外部工具，因此不创建 effect，只产生明确的 skipped tool result。

如果进程在 `begin_tool_effect` 后退出，SQLite 保留 `executing` effect；如果外部调用抛出 Store 无法归类的异常，不伪造 settlement。后续恢复按工具声明的 `replayable/idempotent/manual` 策略处理。本次不实现后台自动重放。

## 5. DAG 依赖数据流

`runtime_adapter` 根据当前 step 的 `depends_on`，从 LangGraph state 的 `agent_results` 中选取精确上游 step。每个 Runtime DAG 结果补充稳定字段：

- `step`
- `output_key`
- `agent_id`
- `result`
- `error`
- `operation_id`

下游 `RunRequest` 同时获得：

1. message 中带边界标记的 JSON dependency context；
2. metadata 中的结构化 `dependency_results`，供审计和未来 Adapter 使用。

上游输出明确标记为“数据，不是系统指令”，降低间接提示注入风险。没有依赖的 step 不注入空模板。缺少已声明依赖结果时立即返回编排错误，不让模型在缺失上下文时猜测。

## 6. SSE 取消语义

`stream_chat` 和 Runtime/legacy resume 生成器遵守以下规则：

- 正常完成、业务错误或 HITL 挂起：清理后发送一个 `done`；
- 客户端断连/生成器关闭：只清理 checkpoint 和本地资源，重新抛出 `GeneratorExit`，不再 yield；
- 不把客户端取消记录成系统内部错误；
- 不改变现有 SSE event 名称和 payload contract。

实现上把 `done` 移到 `finally` 之外，并消除会跳过统一尾部的内部 `return`。

## 7. Mac CODEX_BIN 解析

`BackendManager` 启动 Agent 时显式设置 `CODEX_BIN`，优先级为：

1. App 进程环境中的 `CODEX_BIN`；
2. 可执行的 ChatGPT bundled Codex；
3. 常见用户级 Codex 路径；
4. 字符串 `codex`，继续由标准 PATH 解析并在 health 中暴露错误。

不修改全局 PATH，不复制二进制，不把具体路径写入 `.env`。用户显式配置始终优先。

## 8. 验收标准

必须新增并通过以下回归场景：

- 过期 approval 不执行工具，状态变为 expired，operation 安全终止；
- owner 不匹配、重复 decision、operation version 冲突均不执行工具；
- approval approve 跨 Store 重开后完成，并存在 settled effect；
- skip 不产生 effect；
- DAG 下游请求包含且只包含声明依赖的上游结果；
- 缺失依赖结果直接失败；
- 关闭 `stream_chat`/resume generator 不产生 `generator ignored GeneratorExit`；
- Mac Swift build 通过，启动命令能解析可执行的 `CODEX_BIN`；
- 既有 Runtime/编排/API、Go 全量测试和 managed/legacy smoke 无回归。

本文记录的是切换前的 hardening 设计；2026-08-16 已完成真实观察和顶层 legacy 清理，`MATRIX_RUNTIME_MODE` 已移除。后续阶段补充了 Agent-as-Tool Runtime 迁移、模型重试失败收尾保护和 operation timeout；发布回退通过版本回退并重启。

## 9. 实施与验收结果

2026-08-14 已完成本设计范围内的实现与验收：

- approval 决策与 operation 恢复转换已在 Store 原子边界内完成；approve、skip、expired、owner 隔离、重复恢复和跨进程重开均有回归覆盖；
- 普通工具调用和 approval 恢复共用 effect journal，真实 Runtime smoke 中 `finance.recent_snapshots` effect 状态为 `settled`；
- Runtime DAG 下游只接收声明依赖，LangGraph 下一批 `Send` 会携带已完成的 `agent_results`；
- SSE 正常结束只发送一次 `done`，客户端关闭不会从 `finally` 再次 yield；
- personal-os Go API 到 Agent 的 JWT/SSE 代理链路通过真实 DeepSeek Runtime smoke；legacy 模式真实 smoke 同样通过；
- Python 可运行全量套件通过 `876 passed, 6 skipped`；可选 RAG/KG 测试因本机未安装 `chromadb`、`networkx` 未纳入该次运行；
- `go test ./...`、Swift debug/release build 和本地 Mac App bundle 构建通过；ChatGPT bundled Codex 路径已确认可执行。

默认模式已切换为 `runtime`。切换前已完成 App 重启、DeepSeek 真实工具调用、SSE 完成事件和 Runtime SQLite 状态验收。

## 10. 后续 Runtime 演进边界

本专项设计记录的是 Runtime correctness 加固，不把后续能力混入本次验收。结合全局架构基线，后续 Runtime 演进遵守以下边界：

- Debug Trace 只用于当前运行期间的诊断展示，默认不进入 SQLite 长期数据，也不写入 Vault；需要保留的仍是 operation、approval、effect 和工具结果摘要等可审计事件；
- `AgentMode / Preset` 是 Runtime 之上的能力、权限、上下文和输出策略，不是新的 Agent 实现；
- 初始只规划 `read_only` 与受审批保护的 `writeback`，不因增加模式而扩大 Agent 的自主写入权限；
- 历史 `MATRIX_RUNTIME_MODE=legacy/shadow/runtime` 只用于解释迁移过程，不再是当前配置；`AgentMode` 与 `Preset` 仍与 Runtime 内核分离；
- 以上能力不得改变 LangGraph Adapter、Runtime Core、personal-os 和 personal-assets 的单向依赖边界。

## 11. 第一批实现记录（2026-08-14）

已在 `personal-agent` 落地最小可用 contract：

- `RunHandle.debug_trace()` 提供当前 operation 的脱敏内存诊断；默认关闭，`clear_debug_trace()` 可主动释放；
- Runtime 记录 model request/response、tool request/result、approval 和 error 轨迹，但不把这些 DebugTrace 写入 SQLite；
- 应用层 `AgentMode/Preset` 解析为 Runtime `ExecutionPolicy`，Runtime 不导入 preset catalog；
- `ToolSpec.side_effect` 为未来 Writeback 工具提供明确能力标记；`read_only` 拦截它，`writeback` 强制 approval；
- HTTP `/api/chat` 和 GET SSE 增加可选 `agent_mode`、`preset`、`debug_trace`，Web 已提供默认关闭的 Debug 开关；未传时维持默认 `read_only/default` 且不采集调试信息；
- 当前已注册工具没有开放 durable Vault 写入，因此本次不会扩大实际写权限。

参考 DeepSeek Harness 的会话元数据、结构化事件和 capability seam 设计，但未引入 Cordis、TypeScript runtime 或其持久化实现。
