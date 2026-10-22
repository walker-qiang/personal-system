# 已知问题清单

> 状态：当前工作区**已核实**的待办问题台账
>
> 最近核实：2026-10-22（本机 `/Users/qiang.lilq/personal-system`）
>
> 核实方式与边界：[本轮验证记录](plans/2026-10-22-v3-stability-and-workspace-status.md)。
> KI-01～KI-13 保留 2026-10-13 在 `/Users/liqiang/code/personal-system` 的历史证据；
> 未注明本轮复核的，不自动视为在当前机器重新验收。
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
| KI-07 | 另一台电脑的历史同步状态尚未收口 | 2026-10-13，`/Users/liqiang/code/personal-system/personal-assets` 从 `dddb269` 落后远端 `c590a01` 共 71 个提交；10-14 已按提交逐个取回 70 个并快进至 `1c84e25`，剩余提交曾由原机 `.git/dsh-fetch-vault.sh` 重试。`personal-tools` 当时与远端一致 | 原机是否最终完成仍需原机证据；不能把其旧 HEAD 或 `ahead 70` 警告套用到当前机器 | 2026-10-22 当前机器已 fetch 并核实远端；`personal-assets` 的 `8c83091` 已推送，`personal-tools` `db50105` 干净。原机最终状态仍待在原机核实 | `blocked` |
| KI-08 | RAG 实链路未验证 | 离线 uv 缓存缺 `torch`、`networkx`、`chromadb`；`uv sync --extra rag --frozen` 自 22:15 起在后台下载（缓存 859 MB，速率约 4 MB/min，正在拉 transformers/torch） | 14 项可选能力测试未在本机判定（属设计上的"单独验证"，见 KI-05） | **已验证**：`uv sync --extra rag --frozen` 完成（torch 2.13.0 / chromadb / sentence-transformers / transformers 等，`uv.lock` 未被改动；`.venv` 1.1 GB）。`pytest -q -m integration` → **20 passed**（14 项 `test_knowledge_graph` + 6 项 `test_rag`）；默认门禁 `pytest -q` → **926 passed / 20 deselected / 0 failed**（可选能力由 KI-05 的 marker 机制排除）。中途为提前验证，曾把系统环境的纯 Python `networkx` 拷入 venv（现已被 uv 正规安装替代） | `fixed` |
| KI-09 | 本机服务栈此前未运行 | 根因见 KI-11：`.env` 的 node 路径失效导致 API 启动即退出。修正后**完整栈实测通过**：API 200 / agent 200、8 个 finance 读接口全 200、`agent-chat.sh` smoke 通过（`tool_call` + token + `done:11343ms`，走通 personal-os → agent → DeepSeek）。2026-10-22 按用户要求部署并启动 App，启动日志确认 API/Agent 健康检查通过 | 服务本身可运行；正常使用由 App 托管生命周期 | 当前 App 已启动，可直接测试；退出 App 会停止其托管服务 | `fixed` |
| KI-10 | 路由表不完整 | `src/matrix/server/app.py:390` 注册 `stock_research.router`（`src/matrix/server/routes/stock_research.py:580,597`），但 `README.md` 与 `docs/architecture.md` 路由表均未列出 | 文档不完整 | 已在两处新增「投研（stock v3）」小节，含 `/api/research/stock.v3/capabilities`（GET）与 `/api/research/stock.v3`（POST） | `fixed` |
| KI-11 | API 启动强依赖 `PERSONAL_OS_WESTOCK_NODE`，路径失效即整进程退出 | `personal-os/.env:24` 原指向 `.../node/versions/22.22.2-3/bin/node`，本机实际只有 `22.22.2-6`（`versions/current` 是普通文件不是目录）；启动日志只有一行 `westock node executable unavailable ... no such file or directory` 后进程消失 | 10-11 node 版本升级后，`./tools/dev` 起不来 API，且报错不指向 `.env` 配置项，排查成本高 | 已就地修 `.env:24` 为 `22.22.2-6`；实测 API `doctor` 返回 200 / `blockers: []`。建议后续在 Go 侧增加"路径不存在时回退 PATH node 或给出指名 env var 的错误" | `fixed` |
| KI-12 | `tools/smoke/finance-read.sh` 的期望值与真实 vault 不符，默认必失败 | 脚本默认 `EXPECTED_ASSETS/SNAPSHOTS/HOLDINGS=37`，实际为 56/94/56；更关键的是它断言 `assets.count == status.asset_count`，但 vault 里 56 个 `status: active` + 9 个 `status: archived` = 65，而接口默认 `include_archived=false` → 恒为 56 vs 65 | 脚本在真实 vault 上跑必红，容易被误判成数据/接口回归 | 已改为数据驱动：新增 `?include_archived=true` 响应并断言其 count == `status.asset_count`；active 计数、`v2.total`、snapshots、targets、sum_pct 全部从接口自身与 cache status 派生；`EXPECTED_*` 保留为可选覆盖。另发现原硬编码的 `cmb-zhao-zhao-bao` 余额断言同样过期（脚本写 `150000000`，实际 `337268`），已改为"存在性默认校验 + 余额按需钉死"。实测默认运行 13 项断言全过、rc=0 | `fixed` |
| KI-13 | `finance-read.sh` 末尾的写探针会真的改 vault | 脚本第 87 行 POST `/api/finance/assets`，路由到 `apps/api/main.go:193 → a.upsertAsset`（durable write + AssetStore commit）；脚本把 201（创建成功）也算通过，且 vault 里当前没有 `test-smoke` 资产 | 在真实 vault 上跑 smoke 会凭空多一条测试资产并产生一次 git 提交，甚至 push | 写探针已改为显式开关 `SMOKE_ALLOW_WRITE=1`，默认跳过并打印原因；同时给脚本补上 `NO_PROXY=127.0.0.1,localhost` 以免被全局代理劫持。实测默认运行后 `git -C personal-assets status --porcelain` 为 0 项，vault 未被触碰 | `fixed` |
| KI-14 | 顶层文档未反映 V3 与 App 托管生命周期 | 顶层 README、项目进度、架构基线及运行图曾写自动模型研究或 App 退出后继续运行；当前 `personal-os` 为 `ae628d7`，已统一股票/基金主动 V3，App 生命周期变更见 `6b932b1` | 误导运行、验收及下一步实施范围 | 已同步顶层索引、进度、项目清单、架构描述/运行图及 `personal-os` README/迁移边界；V2 专项记录标注为历史 | `fixed` |
| KI-15 | 安装 App/API 尚未与本轮源码同步 | 初始 App SHA-256 为 `f06b82515e8843d57391e57863f87a1c0e87bfc1d0d73cfb30ffa3fafb008a5e`；旧 API build info 为 `6b932b1` 且 `vcs.modified=true` | 无法确认新修复是否在当前安装包运行 | 已执行部署脚本替换 App；新 App SHA-256 为 `42543cdf2c91466bb374c865df107690cd3d09404c5cbfc21bccb27c928426dd`。启动日志确认 API 从当前工作区重建且服务健康检查通过 | `fixed` |
| KI-16 | 最新引用修复尚缺授权后的真实模型复查 | `personal-agent 97fec2c` 及之前的协议与跨仓假模型验收通过；原修复记录明确不代表真实模型已经成功；本轮真实调用为 0 | 离线正确性不能证明真实输出质量、成功率和成本 | 待确认标的、最小外发字段、Token 硬预算与真实写回范围，再执行一次并检查逐项核验、引用、结果状态及 API 回读；不自动增加预算或重跑全池 | `blocked` |
| KI-17 | 连续研究与清缓存后的 durable 历史读取缺少显式验收断言 | 既有隔离验收覆盖了失败恢复，但未直接断言跨回合证据复用、待答问题传递及移走 PDF/删除行情缓存后的历史一致性 | 后续变更可能在没有明显失败的情况下复制证据、丢失历史或新增模型调用 | 已扩展现有 `personal-os/tools/acceptance/stock_research_v3.py` 并通过跨仓隔离验收；未新增单元测试、未改业务逻辑，所有删改仅针对临时夹具 | `fixed` |
| KI-18 | 真实历史任务成功不等于当前判断已核验 | 本机只读统计为 92 条任务、活跃 0；华能水电既有成功 episode 仍有待回答问题且缺少新版 `claim_checks` / `research_result` | 不能用旧 `complete` 证明判断已校准，也不能由累计失败数推断当前故障 | 保留原始记录；后续授权研究只核验选定问题，未获证据的判断继续保持未知。本轮不补写结论或改历史任务 | `open` |
| KI-19 | 微信剪藏真实页面验收记录不一致 | 历史进度写另一台电脑已验收；`personal-tools/weixin-clip/README.md` 的真实选择器日期与六项验收清单仍未补齐 | 无法从文档确认本机目录权限、图片路径及网络异常处理是否实测 | 本轮只读核实；待确认后在本机 Chrome 补验并统一日期/机器信息，不自动改变扩展权限或保存目录 | `blocked` |

## 当前验证与后续操作

- 本轮默认验证：Go 全量测试/静态检查、Agent `927 passed, 20 deselected`、
  Agent V3 协议验收、扩展后的跨仓隔离验收、macOS App Build 与部署均通过。
- KI-08 的可选 RAG 测试已有历史通过记录，本轮未重跑，不再列为必做安装步骤。
- KI-09 当前 App 已启动，部署流程中的 API/Agent 健康检查通过；正常使用打开 App
  即由 App 托管服务，不把 `tools/dev` 常驻作为产品使用前置条件。
- KI-07 必须先在目标机器核实仓库、工作区和远端；不提供针对当前机器的自动 pull。
- KI-16、KI-19 仍需分别授权真实资料外发与成本、Chrome 实机验收。

## 维护规则

- 本清单只写有证据的问题；修复后把状态改为 `fixed` 并写清处置依据，不要删除记录。
- 破坏性操作（删除目录、改历史）必须在清单里写明确切路径与不可恢复范围。
- 与设计取向有关的问题（如 KI-05）先记录、后决策，不擅自改语义。
- 跨仓问题标注具体仓库与文件路径，避免"某处文档"这类模糊描述。
