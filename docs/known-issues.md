# 已知问题清单

> 状态：当前工作区**已核实**的待办问题台账
>
> 最近核实：2026-10-13（本机 `/Users/liqiang/code/personal-system`）
>
> 核实方式：`git log` / `git reflog show origin/master` / `git status`、链接存在性检查、
> `go build|vet|test ./...`（personal-os）、`pytest -q`（personal-agent）。
>
> 本清单只收录**有命令或代码证据**的问题；"建议动作"不等于已实施。

## 状态口径

- `fixed`：已就地修复（含修复依据）。
- `open`：已知问题，尚未处理或需要决策。
- `blocked`：需要外部条件（网络、用户决策、另一台机器）才能推进。

## 问题台账

| 编号 | 问题 | 证据 | 影响 | 处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| KI-01 | 文档断链：索引指向已归档、当前不存在的 `docs/plans/*` | `docs/README.md:22,23,26,27`、`docs/personal-system-design.md:317`；`docs/plans/` 已空，文件实际在 `docs/archive/plans/` | 文档索引不可用 | 已改指 `docs/archive/plans/` 并注明已归档；脚本复核 0 断链 | `fixed` |
| KI-02 | `project-progress.md` 状态滞后，10 月主线未记录 | 原表停在 2026-09-28 口径 | 进度表与实际脱节 | 已按 2026-10-13 实测更新（含各仓 HEAD、fetch 时效、10 月主线） | `fixed` |
| KI-03 | `personal-agent` 文档仍写 Codex provider；README 架构树缺 `runtime/` | `README.md:32`、`docs/architecture.md:602`；`llm/` 下无 codex 实现，`llm/__init__.py:33` 仅接受 `deepseek` | 误导后续分析与接入 | 已改为 DeepSeek-only；架构树补 `runtime/`、`rate_limiter.py`、`vault_client.py`；顺带修 `docs/architecture.md:595` MCP 表格缺尾竖线 | `fixed` |
| KI-04 | 模型命名不一致：`.env.example` 默认模型与代码不一致 | `.env.example` 原写 `deepseek-v4-flash`，该字符串在代码与文档中**无任何其他出现**；`config.py:71 DEFAULT_DEEPSEEK_MODEL="deepseek-flash"`、`config.py:74-79 KNOWN_MODELS` 只有 `deepseek-flash`/`deepseek-v4-pro`；实际 `.env` 未设置 `AGENT_MODEL` | 示例导入的模型不在模型列表 UI 中，且与代码默认值不符 | 已把 `.env.example` 对齐为 `deepseek-flash`，并注明取值应与 `KNOWN_MODELS` 保持一致 | `fixed` |
| KI-05 | 测试过滤是空操作：`-m 'not integration'` 过滤不掉任何东西 | `pyproject.toml:54`；全仓带 `integration` marker 的测试为 **0** 个；`markers` 声明保留 | 当前等价于不过滤，**无实际危害**；风险是将来加 live case 时忘记打 marker | 已在 `pyproject.toml` 就地注释说明；等 live case 回归时补 marker（不删声明） | `open` |
| KI-06 | 已删源码的本地残留目录（未被 Git 跟踪、无源码） | `personal-agent/src/matrix/role/`（16K，仅 `__pycache__`）、`personal-agent/src/matrix/web/`（65M，仅 `node_modules`+`tsconfig.tsbuildinfo`）、`personal-os/apps/web/node_modules/`（235M）；三者 `git ls-files` 均为 0 | 占约 300 MB 磁盘，易被误认为可运行入口 | 已删除上述三处（删除前逐条核对绝对路径 + `git ls-files` 为 0）；**`personal-os/apps/web/dist/` 保留**——它是 `tools/web-preview.py` 唯一的托管对象，源码已不在仓库，删了不可恢复 | `fixed` |
| KI-07 | 两个仓的远端新鲜度未知 | `personal-assets`、`personal-tools` 的 `origin/master` 最后一次更新都是 2026-09-27，此后本机未成功 fetch | 无法判断本机是否落后另一台机器推送的内容 | 见文末命令，需有网环境 | `blocked` |
| KI-08 | RAG 实链路未验证 | 离线 uv 缓存缺 `torch 2.13.0`、`networkx`、`chromadb`：`uv sync --offline --extra rag` 与 `uv pip install --offline` 均失败 | `tests/test_rag.py` 无法收集、`tests/test_knowledge_graph.py` 14 项无法判定 | 见文末命令，需有网环境 | `blocked` |
| KI-09 | 本机服务栈未运行 | `lsof -iTCP:7001/7101` 无监听、`curl` 返回 000、`~/Library/LaunchAgents` 无 personal 相关 plist | 无法做接口级 smoke 验证 | 需用户在**普通 Terminal**执行；本工作会话内启动会因读不到 `~/.ssh/known_hosts` 导致 vault 写入不可用 | `open` |
| KI-10 | 路由表不完整 | `src/matrix/server/app.py:390` 注册 `stock_research.router`（`src/matrix/server/routes/stock_research.py:580,597`），但 `README.md` 与 `docs/architecture.md` 路由表均未列出 | 文档不完整 | 已在两处新增「投研（stock v3）」小节，含 `/api/research/stock.v3/capabilities`（GET）与 `/api/research/stock.v3`（POST） | `fixed` |

## 剩余待办命令

```bash
# KI-07：有网环境下核对远端新鲜度
cd ~/code/personal-system
for d in personal-assets personal-tools; do
  git -C "$d" fetch --prune origin && git -C "$d" status -sb
done

# KI-08：补 rag extra 后重跑全量测试
cd personal-agent && uv sync --extra rag && ./.venv/bin/python -m pytest -q

# KI-09：重启本地服务栈（须在普通 Terminal，不要在本工作会话内启动）
cd personal-os && ./tools/dev
```

## 维护规则

- 本清单只写有证据的问题；修复后把状态改为 `fixed` 并写清处置依据，不要删除记录。
- 破坏性操作（删除目录、改历史）必须在清单里写明确切路径与不可恢复范围。
- 与设计取向有关的问题（如 KI-05）先记录、后决策，不擅自改语义。
- 跨仓问题标注具体仓库与文件路径，避免"某处文档"这类模糊描述。
