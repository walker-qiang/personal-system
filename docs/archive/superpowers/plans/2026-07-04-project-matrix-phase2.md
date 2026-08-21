# Project Matrix 阶段二实现计划：LangGraph 编排与角色系统

## 目标

在现有两阶段 Planner-Final 编排之上，引入 LangGraph 状态机编排引擎和角色系统，实现投资分析员核心能力。保持向后兼容，现有 ChatService 不动。

## 核心设计决策

### 1. 渐进式替换策略

阶段二**不替换**现有 `ChatService`，而是新建 `orchestration/` 模块，通过 `/chat` 端点新增 `mode` 参数区分：

| mode | 编排引擎 | 阶段 |
|------|---------|------|
| 默认（不传） | 现有 ChatService（Planner-Final） | 阶段一 |
| `graph` | 新 LangGraph 编排 | 阶段二 |

这样阶段二的代码可以独立测试，不影响现有功能。

### 2. LangGraph 图结构

```
__start__ → classify → skill_run / reAct / planExecute → summarize → __end__
```

- **classify**：LLM 判断意图，路由到三路之一
- **skill_run**：执行确定性 Skill（80% 场景），解析 Markdown 定义，按步骤调用工具
- **reAct**：ReAct 循环（Thought → Action → Observation → Thought...），最多 5 步
- **planExecute**：Plan-Execute 模式，先生成计划再逐步执行
- **summarize**：统一生成最终回答

### 3. 角色系统

`RoleDefinition` dataclass：身份、工具列表、知识库、输出约束。投资分析员为第一个角色。

## 目标目录结构（阶段二新增）

```
src/matrix/
├── orchestration/           # 新增：LangGraph 编排
│   ├── __init__.py
│   ├── graph.py             # build_graph() 图构建器
│   ├── state.py             # AgentState TypedDict
│   └── nodes.py             # classify / reAct / planExecute / summarize 节点
│
├── role/                    # 新增：角色系统
│   ├── __init__.py
│   ├── base.py              # RoleDefinition dataclass
│   └── investment_analyst.py # 投资分析员角色
│
├── skills/                  # 新增：Skill 系统
│   ├── __init__.py
│   ├── loader.py            # Skill 加载器（解析 Markdown）
│   └── executor.py          # Skill 执行器
│
├── server/routes/chat.py    # 修改：新增 mode=graph 路由
│
skills/                      # 新增：Skill 定义（Markdown）
└── investment/
    ├── anomaly-diagnosis.md
    ├── portfolio-review.md
    └── allocation-check.md
```

## 分步工作项

### 步骤 1：基础设施 — 添加 LangGraph 依赖 + 状态定义

**产出**：`pyproject.toml` 新增 `langgraph`，`state.py` 定义 AgentState。

**具体工作**：
1. `pyproject.toml` 添加 `langgraph>=0.2.0`
2. 创建 `src/matrix/orchestration/state.py`：`AgentState(TypedDict)`，字段：messages、tool_results、current_plan、findings、iteration_count
3. 创建 `src/matrix/orchestration/__init__.py`

### 步骤 2：节点实现

**产出**：`nodes.py` 实现 4 个核心节点。

**具体工作**：
1. `classify_node`：LLM 判断意图 → 返回 `"skill"` / `"react"` / `"plan_execute"`
2. `react_node`：Thought → Action → Observation 循环，最多 5 步，去重保护
3. `plan_execute_node`：先生成执行计划（JSON），逐步执行并验证
4. `summarize_node`：基于工具结果生成最终回答
5. 创建 `src/matrix/orchestration/nodes.py`

### 步骤 3：图构建 + 服务集成

**产出**：`graph.py` 构建完整状态图，`chat.py` 路由新增 `mode=graph`。

**具体工作**：
1. 创建 `src/matrix/orchestration/graph.py`：`build_graph()` 使用 `StateGraph` 构建完整图
2. 在 `ChatService` 中新增 `stream_chat_graph()` 方法
3. 修改 `server/routes/chat.py`：读取 `mode` 参数，`mode=graph` 时调用 `stream_chat_graph()`
4. SSE 事件格式保持一致

### 步骤 4：角色系统

**产出**：`RoleDefinition` DSL + 投资分析员角色。

**具体工作**：
1. 创建 `src/matrix/role/base.py`：`RoleDefinition` dataclass
2. 创建 `src/matrix/role/investment_analyst.py`：投资分析员角色定义
3. 角色注入到 system prompt 中

### 步骤 5：Skill 系统 + 3 个投资 Skill

**产出**：Skill 加载器 + 执行器 + 3 个 Markdown Skill。

**具体工作**：
1. 创建 `src/matrix/skills/loader.py`：解析 Markdown Skill 定义
2. 创建 `src/matrix/skills/executor.py`：按步骤执行 Skill
3. 编写 `skills/investment/` 下 3 个 Skill Markdown
4. `skill_run` 节点集成 Skill 执行器

### 步骤 6：测试 + 验证

**产出**：全部测试通过，兼容现有端点。

## 验收标准

1. `POST /chat` 不带 mode 参数，行为与阶段一完全一致
2. `POST /chat` 带 `mode=graph`，走 LangGraph 编排
3. 投资分析员角色可正常回答"当前配置偏离度？"
4. 异动诊断 Skill 可被 classify 节点正确路由
5. 全部测试通过

## 预计工时

| 步骤 | 内容 | 预计 |
|------|------|------|
| 1 | 基础设施 | 0.5h |
| 2 | 节点实现 | 2h |
| 3 | 图构建 + 服务集成 | 1.5h |
| 4 | 角色系统 | 0.5h |
| 5 | Skill 系统 + 3 Skill | 1.5h |
| 6 | 测试 + 验证 | 1h |
| **合计** | | **7h** |