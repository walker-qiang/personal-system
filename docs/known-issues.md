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
| KI-05 | 测试过滤是空操作：`-m 'not integration'` 过滤不掉任何东西 | `pyproject.toml:54` 声明了该过滤，但全仓**没有测试带 `integration` marker**；`tests/test_rag.py:3-5` 却自述"外部 embedding 与 ChromaDB 有意排除在默认门禁之外，属可选能力" | 设计意图（可选能力不进默认门禁）**未实现**：默认 `pytest` 在收集期直接 ImportError 失败，而不是干净跳过 | **已实现该机制**：`tests/test_rag.py` 用 `pytest.importorskip("chromadb")` + `pytestmark = pytest.mark.integration`；`tests/test_knowledge_graph.py` 的 `TestKnowledgeGraph`/`TestGraphRetriever` 加 `@pytest.mark.integration`。默认运行变为 `926 passed, 1 skipped, 14 deselected, 0 failed, 0 errors`；`pytest -m integration` 可收集那 14 项 | `fixed` |
| KI-06 | 已删源码的本地残留目录（未被 Git 跟踪、无源码） | `personal-agent/src/matrix/role/`（16K，仅 `__pycache__`）、`personal-agent/src/matrix/web/`（65M，仅 `node_modules`+`tsconfig.tsbuildinfo`）、`personal-os/apps/web/node_modules/`（235M）；三者 `git ls-files` 均为 0 | 占约 300 MB 磁盘，易被误认为可运行入口 | 已删除上述三处（删除前逐条核对绝对路径 + `git ls-files` 为 0）；**`personal-os/apps/web/dist/` 保留**——它是 `tools/web-preview.py` 唯一的托管对象，源码已不在仓库，删了不可恢复 | `fixed` |
| KI-07 | 两个仓的远端新鲜度未知 | 2026-10-13 已用"只取元数据"的临时克隆（`--filter=blob:none`，828K）核实：**`personal-assets` 本机落后远端 71 个提交，且可快进**（远端 `c590a01`，本机 `dddb269`）；`personal-tools` 与远端一致 | 本机 vault 缺 10-10～10-13 的研究/估值/知识提交（含 sz000858 研究、多笔 valuation snapshot、memory 污染清理、文章剪藏、CHFP 知识域） | 已在有网环境确认；完整 `fetch` 因本机到 GitHub 的 bulk 传输极慢（约 2-3 MB/min，下载到 28M 后停滞）未完成 → 建议在 Terminal 执行 `git -C personal-assets pull --ff-only` | `open` |
| KI-08 | RAG 实链路未验证 | 离线 uv 缓存缺 `torch`、`networkx`、`chromadb`；本机 `uv sync --extra rag --frozen` 仍在后台下载（缓存已 810 MB，网速约 3 MB/min 量级） | 14 项可选能力测试未在本机判定（属设计上的"单独验证"，见 KI-05） | 装完后执行 `./.venv/bin/python -m pytest -m integration` | `blocked` |
| KI-09 | 本机服务栈未运行 | 根因见 KI-11：`.env` 的 node 路径失效导致 API 启动即退出。修正后**完整栈实测通过**：API 200 / agent 200、8 个 finance 读接口全 200、`agent-chat.sh` smoke 通过（`tool_call` + token + `done:11343ms`，走通 personal-os → agent → DeepSeek）。验证后已停两个进程，端口释放 | 服务本身可运行 | 已完成验证；如需常驻，由用户在普通 Terminal 执行 `./tools/dev`（本会话不长期占用 7001/7101，避免顶掉你自己的实例） | `fixed` |
| KI-10 | 路由表不完整 | `src/matrix/server/app.py:390` 注册 `stock_research.router`（`src/matrix/server/routes/stock_research.py:580,597`），但 `README.md` 与 `docs/architecture.md` 路由表均未列出 | 文档不完整 | 已在两处新增「投研（stock v3）」小节，含 `/api/research/stock.v3/capabilities`（GET）与 `/api/research/stock.v3`（POST） | `fixed` |
| KI-11 | API 启动强依赖 `PERSONAL_OS_WESTOCK_NODE`，路径失效即整进程退出 | `personal-os/.env:24` 原指向 `.../node/versions/22.22.2-3/bin/node`，本机实际只有 `22.22.2-6`（`versions/current` 是普通文件不是目录）；启动日志只有一行 `westock node executable unavailable ... no such file or directory` 后进程消失 | 10-11 node 版本升级后，`./tools/dev` 起不来 API，且报错不指向 `.env` 配置项，排查成本高 | 已就地修 `.env:24` 为 `22.22.2-6`；实测 API `doctor` 返回 200 / `blockers: []`。建议后续在 Go 侧增加"路径不存在时回退 PATH node 或给出指名 env var 的错误" | `fixed` |
| KI-12 | `tools/smoke/finance-read.sh` 的期望值与真实 vault 不符，默认必失败 | 脚本默认 `EXPECTED_ASSETS/SNAPSHOTS/HOLDINGS=37`，实际为 56/94/56；更关键的是它断言 `assets.count == status.asset_count`，但 vault 里 56 个 `status: active` + 9 个 `status: archived` = 65，而接口默认 `include_archived=false` → 恒为 56 vs 65 | 脚本在真实 vault 上跑必红，容易被误判成数据/接口回归 | 已改为数据驱动：新增 `?include_archived=true` 响应并断言其 count == `status.asset_count`；active 计数、`v2.total`、snapshots、targets、sum_pct 全部从接口自身与 cache status 派生；`EXPECTED_*` 保留为可选覆盖。另发现原硬编码的 `cmb-zhao-zhao-bao` 余额断言同样过期（脚本写 `150000000`，实际 `337268`），已改为"存在性默认校验 + 余额按需钉死"。实测默认运行 13 项断言全过、rc=0 | `fixed` |
| KI-13 | `finance-read.sh` 末尾的写探针会真的改 vault | 脚本第 87 行 POST `/api/finance/assets`，路由到 `apps/api/main.go:193 → a.upsertAsset`（durable write + AssetStore commit）；脚本把 201（创建成功）也算通过，且 vault 里当前没有 `test-smoke` 资产 | 在真实 vault 上跑 smoke 会凭空多一条测试资产并产生一次 git 提交，甚至 push | 写探针已改为显式开关 `SMOKE_ALLOW_WRITE=1`，默认跳过并打印原因；同时给脚本补上 `NO_PROXY=127.0.0.1,localhost` 以免被全局代理劫持。实测默认运行后 `git -C personal-assets status --porcelain` 为 0 项，vault 未被触碰 | `fixed` |

## 剩余待办命令

```bash
# KI-07：本机 vault 落后远端 71 个提交，可快进（bulk 下载慢，建议在 Terminal 跑）
cd ~/code/personal-system
git -C personal-assets pull --ff-only origin master
git -C personal-assets log --oneline -5

# KI-08：UV_CACHE_DIR 用可写位置；装完跑可选能力测试
cd personal-agent
UV_CACHE_DIR=/tmp/uv-cache uv sync --extra rag
./.venv/bin/python -m pytest -q                 # 默认门禁：应 926 passed / 1 skipped / 14 deselected
./.venv/bin/python -m pytest -m integration     # 可选能力：14 项

# KI-09：完整服务栈（建议在普通 Terminal 常驻）
cd personal-os && ./tools/dev
# 仅验证时可用：./tools/dev --foreground，验证完记得停
```

## 维护规则

- 本清单只写有证据的问题；修复后把状态改为 `fixed` 并写清处置依据，不要删除记录。
- 破坏性操作（删除目录、改历史）必须在清单里写明确切路径与不可恢复范围。
- 与设计取向有关的问题（如 KI-05）先记录、后决策，不擅自改语义。
- 跨仓问题标注具体仓库与文件路径，避免"某处文档"这类模糊描述。
