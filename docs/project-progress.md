# 目标项目进度

本文档记录 `/Users/qiang.lilq/personal-system` 下长期目标项目的建设进度。

这里的“目标项目”只包括长期维护对象。历史项目只作为迁移来源，不进入主进度表。

## 状态口径

- `planned`：已确定方向，但目标目录或仓库尚未就位。
- `migrating`：正在从旧项目迁移能力或内容。
- `usable`：已有可用闭环，但仍有关键打磨项。
- `stable`：边界稳定，日常维护进入常规节奏。
- `archived`：不再主动建设，只保留记录。

## 长期目标项目

| 项目 | 目标定位 | 当前状态 | 已完成 | 未完成 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| `personal-system` | 顶层 workspace / governance 仓，维护系统规则、规划、迁移台账和项目清单。 | `usable` | 已初始化顶层 Git 仓；已建立 `README.md`、`AGENTS.md`、`.gitignore`、`workspace.yaml`；已明确子项目独立 Git、不使用 submodule；已配置 Git remote。 | 项目进度需要持续维护；顶层历史规划文档仍有部分英文和较宽泛表述。 | 维护本文档和 `workspace.yaml`；按需推送远端备份。 |
| `personal-assets` | durable source of truth，保存 finance facts 和 broader personal assets。 | `stable` | 已完成 `obsidian-wiki -> personal-assets` 迁移收口；`财富/` 已成为最终物理目录；已有 finance 目录、schemas、targets、事实文件；作为 `personal-os` cache rebuild 来源已跑通；Vault 轻量校验通过。 | `知识/` 仍可随日常使用继续补强；历史归档文档中仍可能保留少量旧术语。 | 以 `personal-assets` 作为唯一主目录继续维护；按实际使用补强 `知识/` 和历史文档清理。 |
| `personal-os` | V1 为投资快照操作应用和产品/API 入口；通过 HTTP/SSE 使用独立 `personal-agent`。 | `usable` | 已完成 finance cache builder、legacy read parity、新 durable endpoints、snapshot create/correct/void、Web finance 页面、Agent proxy、managed/external/legacy 启动模式和 confirm SSE 代理。 | 快照录入 UX 仍可按真实使用继续微调；commit failure 等写入后错误恢复文案还可继续细化；admin / 管理页面保持现状。 | 日常验证 finance snapshot workflow 与 managed Agent 集成。 |
| `personal-agent` | 独立 Python Agent Runtime 与 chat/tool 服务；借鉴 Pi 的内核分层，Runtime Core 严格下层化。 | `usable` | 已完成独立 Runtime domain/ports/core、单 Agent loop、retry/cancel/budget、SQLite operations/events/approvals/session entries、HITL 跨重启恢复、单 Agent 与 DAG Runtime profile、legacy/shadow/runtime feature flag；Codex direct 与 Deep Research 保持原路径。 | 真实 provider smoke、Runtime effect sandwich 完整化、可选 RAG 依赖环境补齐、运行观察与恢复策略继续硬化。 | 先保持 `legacy` 默认，按 runtime profile 观察并逐步补强多 Agent 与恢复。 |
| `personal-tools` | 长期工具仓，保存可复用个人工具、MCP servers、脚本和自动化。 | `active` | ✅ 已迁入 `personal-system/personal-tools`，所有脚本和 wiki-search 验证通过，launchd 已切至新路径。 | — | 保持 Codex MCP 配置和 launchd plist 同步。 |

## 迁移来源项目

这些项目不属于长期目标项目。它们只作为历史来源、参考实现或归档对象。

| 来源项目 | 当前作用 | 迁移去向 | 状态 |
| --- | --- | --- | --- |
| `obsidian-wiki` | 历史 Obsidian 工作流、知识内容和工具实践来源。 | 迁移已收口；后续仅作为历史只读参考。 | `reference-only` |
| `personal-finance` | finance backend、SQLite/cache、API、金额精度、灾备经验来源。 | 能力已迁入 `personal-os` 和 `personal-assets`。 | ✅ **已归档** |
| `personal-web` | finance UI 样式和交互参考；旧 admin / 管理页面行为参考。 | 必要 UI 经验迁入 `personal-os/apps/web`。 | ✅ **已归档** |
| `personal-agent`（历史旧路径） | 模型环境变量、chat streaming、tool trace、prompt/tool 经验来源。 | 独立 `personal-agent` 长期维护；`personal-os/apps/agent` 保留为显式 legacy 回退。 | 已完成边界纠正 |

## 维护规则

- 主进度表只列长期目标项目。
- 历史来源项目只能出现在“迁移来源项目”小节。
- 不用百分比表达进度，避免虚假精确。
- 每次完成一个关键里程碑时，同步更新本文档和 `workspace.yaml`。
