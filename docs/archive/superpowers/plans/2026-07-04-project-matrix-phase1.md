# Project Matrix 阶段一实现计划：基础设施搭建

## 目标

将 `personal-os/apps/agent` 的现有代码抽离为独立仓库 `personal-agent`，建立 Project Matrix 的通用 Agent 底座骨架，同时保持与 `personal-os` 的完全向后兼容。

## 现状摘要

现有 agent 代码位于 `personal-os/apps/agent/personal_agent/`，约 660 行 Python，分四个模块：

| 模块 | 行数 | 职责 |
|------|------|------|
| `config.py` | 147 | 环境变量配置、`AgentConfig` dataclass、`find_root` 通过 `go.mod` 定位 |
| `server.py` | 187 | `ThreadingHTTPServer` + SSE 流式 HTTP，5 个端点 |
| `chat.py` | 386 | Planner-Final 两阶段编排、DeepSeek/Anthropic LLM、重试、session 记忆 |
| `finance_tools.py` | 449 | 5 个只读 finance 工具，SQLite 只读模式 |

与 personal-os 的耦合点：
- `config.py:find_root()` 通过探测 `go.mod` 定位根目录
- `config.py:load_config()` 默认 cache/trace 路径基于 `root / "var" / ...`
- `chat.py` 的 `parse_tool_calls()` 硬编码了 5 个 finance 工具名白名单
- `server.py` 的 `AgentHTTPServer` 直接实例化 `FinanceTools`（绑死 finance 工具集）

## 兼容性约束

以下接口必须保持完全兼容，否则 personal-os 的 `agent.go` 代理和 smoke 测试会失败：

| 端点 | 方法 | 请求/响应格式 | 来源 |
|------|------|-------------|------|
| `/healthz` | GET | `{"ok": true, "mode": "read-only", "cache_path": "...", ...}` | `agent.go` 代理 |
| `/tools` | GET | `{"tools": [...]}` | `agent.go` 代理 |
| `/tools/call` | POST | `{"tool": "...", "arguments": {...}}` → `{"tool": "...", "result": {...}}` | `agent.go` 代理 |
| `/chat` | POST | `{"message": "..."}` → SSE `event: tool_call/tool_result/token/done/error` | `agent.go` 代理 + smoke |
| `/reset` | POST | `{"session_id": "..."}` → `{"ok": true}` | `agent.go` 代理 |

环境变量兼容：现有 `.env` 中的 `PERSONAL_OS_CACHE_PATH`、`PERSONAL_OS_AGENT_ADDR`、`AGENT_PROVIDER`、`DEEPSEEK_API_KEY` 等必须继续生效。

## 目标目录结构（阶段一）

```
personal-agent/
├── AGENTS.md                          # 项目工作规则
├── README.md                          # 项目概述
├── pyproject.toml                     # Python 项目配置，依赖：fastapi, uvicorn
├── .env.example                       # 环境变量模板
├── .gitignore                         # 忽略 var/、__pycache__、.env
│
├── src/
│   └── matrix/
│       ├── __init__.py
│       │
│       ├── config.py                  # 从 personal_agent/config.py 迁移 + 适配
│       │
│       ├── llm/                       # 从 chat.py 拆出 LLM 层
│       │   ├── __init__.py
│       │   ├── protocol.py            # LLMClient Protocol、ToolCall dataclass
│       │   ├── errors.py              # LLMError / LLMTransientError / LLMAuthError
│       │   ├── deepseek.py            # DeepSeekClient
│       │   ├── anthropic.py           # AnthropicClient
│       │   └── http.py                # post_json / post_json_with_retry
│       │
│       ├── tools/                     # 工具注册系统
│       │   ├── __init__.py
│       │   ├── base.py                # ToolDefinition dataclass、ToolResult
│       │   ├── registry.py            # ToolRegistry：register / list / call / validate
│       │   └── finance/               # 从 finance_tools.py 拆分
│       │       ├── __init__.py
│       │       ├── holdings.py        # holdings_summary
│       │       ├── assets.py          # asset_lookup
│       │       ├── snapshots.py       # snapshot_history + recent_snapshots
│       │       ├── allocation.py      # bucket_allocation
│       │       └── shared.py          # 共享工具函数：_connect, cents_to_yuan, clamp_int, 行映射
│       │
│       ├── chat.py                    # 从 personal_agent/chat.py 迁移，依赖 ToolRegistry 动态获取工具列表
│       │
│       ├── observability/             # 从 server.py 的 TraceLogger 拆出
│       │   ├── __init__.py
│       │   └── trace.py               # TraceLogger + 结构化事件定义
│       │
│       └── server/                    # FastAPI 替代 ThreadingHTTPServer
│           ├── __init__.py
│           ├── app.py                 # FastAPI 应用创建、生命周期、中间件
│           ├── routes/
│           │   ├── __init__.py
│           │   ├── health.py          # GET /healthz
│           │   ├── tools.py           # GET /tools、POST /tools/call
│           │   ├── chat.py            # POST /chat（SSE）、POST /reset
│           │   └── sse.py             # SSE 响应工具函数
│           └── compat.py             # 兼容性验证：响应格式与旧版完全一致
│
├── tests/
│   ├── conftest.py
│   ├── test_config.py
│   ├── test_llm_client.py
│   ├── test_tool_registry.py
│   ├── test_finance_tools.py          # 从 personal-os 迁移
│   ├── test_chat.py                   # 从 personal-os 迁移
│   ├── test_server.py
│   └── fixtures/
│       └── finance_cache.sqlite
│
├── scripts/
│   └── dev.sh                         # 开发启动
│
└── var/                               # 运行时数据（不提交 Git）
    └── .gitkeep
```

## 分步工作项

### 步骤 1：仓库初始化

**产出**：独立 Git 仓库，`pyproject.toml` 配置完成，可 `pip install -e .`。

**具体工作**：
1. `mkdir -p /Users/qiang.lilq/personal-system/personal-agent && cd $_ && git init`
2. 创建 `pyproject.toml`：
   - 包名 `matrix`，入口 `matrix.__main__:main`
   - 依赖：`fastapi`、`uvicorn[standard]`（只有这两个新增依赖，其余用标准库）
   - Python >= 3.11
3. 创建 `.gitignore`：忽略 `var/`、`__pycache__/`、`.env`、`*.pyc`、`.DS_Store`
4. 创建 `.env.example`：列出所有环境变量及默认值（沿用原有命名）
5. 创建 `AGENTS.md`：项目规则 — 中文文档、英文代码、不与 personal-os 互相侵入
6. 创建 `README.md`：Project Matrix 定位 + 快速开始
7. 创建 `var/.gitkeep`

### 步骤 2：迁移 LLM 层（`src/matrix/llm/`）

**产出**：LLM 提供者从 `chat.py` 中拆出，独立模块，可单独测试。

**具体工作**：
1. 从 `chat.py` 提取 `LLMClient` Protocol → `src/matrix/llm/protocol.py`
2. 从 `chat.py` 提取 `ToolCall` dataclass → `src/matrix/llm/protocol.py`
3. 从 `chat.py` 提取 `LLMError`/`LLMTransientError`/`LLMAuthError` → `src/matrix/llm/errors.py`
4. 从 `chat.py` 提取 `DeepSeekClient` → `src/matrix/llm/deepseek.py`
5. 从 `chat.py` 提取 `AnthropicClient` → `src/matrix/llm/anthropic.py`
6. 从 `chat.py` 提取 `post_json`/`post_json_with_retry` → `src/matrix/llm/http.py`
7. 从 `chat.py` 提取 `build_llm_client` 工厂函数 → `src/matrix/llm/__init__.py`
8. 编写 `tests/test_llm_client.py`：retry 逻辑、auth error 不重试、timeout 处理

**关键变更**：`DeepSeekClient` 和 `AnthropicClient` 的构造函数从接收 `AgentConfig` 改为接收必要参数（api_key、model、base_url、max_tokens、timeout），去 `AgentConfig` 耦合。

### 步骤 3：迁移配置系统（`src/matrix/config.py`）

**产出**：配置系统去 `personal-os` 耦合，可独立运行。

**具体工作**：
1. 从 `config.py` 迁移 `AgentConfig` dataclass + 所有 env var 常量 — 保持不变
2. 从 `config.py` 迁移 `load_config()`、`load_bind_addr()`、`clamp_*`、`parse_addr` 等工具函数
3. **关键改动**：重写 `find_root()` — 改为找 `pyproject.toml` 而非 `go.mod`；增加 `MATRIX_CACHE_PATH` 和 `MATRIX_TRACE_PATH` 环境变量作为 fallback
4. 缓存路径优先级：`PERSONAL_OS_CACHE_PATH` > `MATRIX_CACHE_PATH` > `var/cache/finance.sqlite`（相对项目根目录）
5. Trace 路径优先级：`PERSONAL_OS_AGENT_TRACE_PATH` > `MATRIX_TRACE_PATH` > `var/agent/tool-calls.jsonl`
6. 编写 `tests/test_config.py`

**兼容性保证**：`PERSONAL_OS_*` 环境变量优先级最高，确保 personal-os 的 `.env` 文件直接可用。

### 步骤 4：迁移工具系统（`src/matrix/tools/`）

**产出**：工具注册表替代硬编码，finance 工具函数拆分但逻辑不变。

**具体工作**：
1. 创建 `src/matrix/tools/base.py`：`ToolDefinition` dataclass（name, description, input_schema, handler）
2. 创建 `src/matrix/tools/registry.py`：`ToolRegistry` 类
   - `register(tool: ToolDefinition)` — 注册工具
   - `list_tools()` — 返回 `list[dict]`，格式与原有 `TOOL_DEFINITIONS` 完全一致
   - `call(name, arguments)` — 调用工具，返回 `dict`
   - `validate(name, arguments)` — schema 校验
3. 创建 `src/matrix/tools/finance/shared.py`：`_connect`、`cents_to_yuan`、`clamp_int`、行映射函数
4. 拆分 5 个工具为独立文件（`holdings.py`、`assets.py`、`snapshots.py`、`allocation.py`），每个文件导出 `tool_definition` 和 `handler` 函数
5. 创建 `src/matrix/tools/finance/__init__.py`：`register_all(registry)` 函数，注册全部 5 个 finance 工具
6. 从 `chat.py` 迁移 `FinanceToolError` 到 `src/matrix/tools/base.py`
7. 编写 `tests/test_tool_registry.py` 和迁入 `tests/test_finance_tools.py`

**关键改动**：`parse_tool_calls()` 中的工具名白名单不再硬编码，改为从 `ToolRegistry.list_tools()` 动态获取。`FinanceTools` 类不再作为单体，改为 `ToolRegistry` 中注册的独立 handler。

### 步骤 5：迁移 Chat 编排（`src/matrix/chat.py`）

**产出**：`ChatService` 迁移到新仓库，内部依赖切换到 `ToolRegistry`。

**具体工作**：
1. 从 `chat.py` 迁移 `ChatService` 类 — 构造函数签名改为接收 `ToolRegistry` 而非 `FinanceTools`
2. 从 `chat.py` 迁移 `parse_tool_calls` / `extract_json_object` / `compact_tool_results` / `preview_json` / `fingerprint` / `result_count` / `timestamp`
3. 从 `chat.py` 迁移 `READ_ONLY_SYSTEM_PROMPT` / `PLANNER_PROMPT` / `FINAL_PROMPT`
4. `_planner_messages()` 中的 `available_tools` 从 `self.tools.list_tools()` 动态获取
5. `parse_tool_calls()` 中的 `allowed` 集合从 `ToolRegistry` 动态生成
6. `_call_tool()` 改为调用 `self.tools.call(name, arguments)`
7. 编写 `tests/test_chat.py`（迁入现有测试）

### 步骤 6：搭建 FastAPI 服务（`src/matrix/server/`）

**产出**：FastAPI 替代 `ThreadingHTTPServer`，所有端点行为与旧版完全一致。

**具体工作**：
1. 创建 `src/matrix/server/app.py`：
   - FastAPI 应用创建、lifespan 管理（初始化 ToolRegistry、ChatService、TraceLogger）
   - 注册路由
   - CORS 中间件（允许 localhost）
2. 创建 `src/matrix/server/routes/health.py`：
   - `GET /healthz` — 响应格式与旧版 `do_GET` 完全一致
3. 创建 `src/matrix/server/routes/tools.py`：
   - `GET /tools` — 响应格式与旧版一致
   - `POST /tools/call` — 请求/响应格式与旧版 `_tools_call` 完全一致，包括 trace 记录
4. 创建 `src/matrix/server/routes/chat.py`：
   - `POST /chat` — SSE 流式，事件格式与旧版 `_chat` 完全一致（`event: tool_call/tool_result/token/done/error`）
   - `POST /reset` — 请求/响应格式与旧版 `_reset` 完全一致
5. 创建 `src/matrix/server/routes/sse.py`：`StreamingResponse` 封装，SSE 格式工具
6. 创建 `src/matrix/observability/trace.py`：从 `server.py` 的 `TraceLogger` 迁移
7. 创建 `src/matrix/__init__.py` + `__main__.py`：`matrix` 命令入口，启动 uvicorn
8. 创建 `scripts/dev.sh`：开发启动脚本
9. 编写 `tests/test_server.py`

**关键兼容性点**：`/healthz` 响应必须包含 `cache_path`、`cache_exists`、`provider`、`model`、`llm_available`、`llm_error` 字段，因为 personal-os 的 Go API 代理会读取这些字段。

### 步骤 7：兼容性验证

**产出**：确认 personal-os 的 Go API 代理和 smoke 测试可通过新 agent。

**具体工作**：
1. 手动启动新 agent：`python -m matrix`（绑定 `127.0.0.1:7101`）
2. 用 curl 逐个验证 5 个端点，对比旧版响应
3. 在 personal-os 下启动 Go API（`go run ./apps/api`），确保 `/api/agent/*` 代理正常
4. 运行 `tools/smoke/agent-chat.sh`，确保通过
5. 运行 `tools/dev` 全栈启动，确保 Web Agent Chat 面板正常
6. 记录任何差异，修正后重新验证

## 验收标准

1. `python -m matrix` 启动后，`curl http://127.0.0.1:7101/healthz` 返回格式与旧版一致
2. `curl -X POST http://127.0.0.1:7101/chat -d '{"message":"当前资产配置？"}'` 返回 SSE 流，事件类型完整
3. personal-os 的 `tools/smoke/agent-chat.sh` 通过（exit code 0）
4. personal-os 的 `tools/dev` 全栈启动后 Web Agent Chat 面板正常工作
5. 所有单元测试通过（`python -m pytest`）
6. `pyproject.toml` 可 `pip install -e .` 安装

## 不做什么（明确边界）

- **不引入 LangGraph** — 阶段二才引入，阶段一保持 Planner-Final 两阶段不变
- **不修改 personal-os 代码** — `agent.go` 一行不改
- **不实现新工具** — 只迁移现有 5 个 finance 工具
- **不实现记忆系统** — 阶段三
- **不实现 Skill 系统** — 阶段二
- **不实现监控调度** — 阶段四
- **不删除 personal-os 中的旧 agent 代码** — 阶段一保留旧代码，等新 agent 稳定后再清理

## 预计工时

| 步骤 | 内容 | 预计 |
|------|------|------|
| 1 | 仓库初始化 | 0.5h |
| 2 | 迁移 LLM 层 | 1h |
| 3 | 迁移配置系统 | 0.5h |
| 4 | 迁移工具系统 | 1.5h |
| 5 | 迁移 Chat 编排 | 1h |
| 6 | 搭建 FastAPI 服务 | 2h |
| 7 | 兼容性验证 | 1h |
| **合计** | | **7.5h** |