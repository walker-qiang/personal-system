# 目标项目进度

本文档记录 `/Users/liqiang/code/personal-system` 下长期目标项目的建设进度。

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
| `personal-system` | 顶层 workspace / governance 仓，维护系统规则、规划、迁移台账和项目清单。 | `usable` | 已初始化顶层 Git 仓；已建立 `README.md`、`AGENTS.md`、`.gitignore`、`workspace.yaml`；已明确子项目独立 Git、不使用 submodule。 | 尚未配置 remote；项目进度需要持续维护；顶层历史规划文档仍有部分英文和较宽泛表述。 | 维护本文档和 `workspace.yaml`；需要远端备份时再配置 remote。 |
| `personal-assets` | durable source of truth，保存 finance facts 和 broader personal assets。 | `usable` | 已迁移 finance facts；已有 finance 目录、schemas、targets、事实文件；作为 `personal-os` cache rebuild 来源已跑通；Vault 轻量校验通过。 | 当前有少量未提交的资产仓整理改动待收口；broader knowledge 与 Obsidian 的最终映射仍需单独计划；非 finance 内容不由 `personal-os` V1 推动。 | 继续作为 finance durable source；先收口当前资产仓本地改动，后续单独规划 Obsidian 内容迁移或映射。 |
| `personal-os` | V1 为投资快照操作应用：快照录入、修正、持仓读取、cache/status、只读 finance Agent。 | `usable` | 已完成 finance cache builder、legacy read parity、新 durable endpoints、snapshot create/correct/void、Web finance 页面、只读 Agent、`tools/dev` 和 smoke；已补桌面端写入状态、doctor blockers、duplicate/dirty repo e2e 覆盖。 | 快照录入 UX 仍可按真实使用继续微调；commit failure 等写入后错误恢复文案还可继续细化；admin / 管理页面保持现状；手机浏览器处理暂不进入近期范围。 | **日常验证中**：Holdings 页面正常；Snapshots/Transactions/Summary/Assets 页面存在渲染问题待修复；smoke 测试基准需更新。 |
| `personal-tools` | 长期工具仓，保存可复用个人工具、MCP servers、脚本和自动化。 | `active` | ✅ 已迁入 `personal-system/personal-tools`，所有脚本和 wiki-search 验证通过，launchd 已切至新路径。 | — | 保持 Codex MCP 配置和 launchd plist 同步。 |

## 迁移来源项目

这些项目不属于长期目标项目。它们只作为历史来源、参考实现或归档对象。

| 来源项目 | 当前作用 | 迁移去向 | 状态 |
| --- | --- | --- | --- |
| `obsidian-wiki` | Obsidian 工作流、历史知识内容、wiki/search/ingest/clipping 实践来源。 | 内容和实践按单独计划映射到 `personal-assets`；Obsidian 编辑方式保留。 | `workflow-source` |
| `personal-finance` | finance backend、SQLite/cache、API、金额精度、灾备经验来源。 | 能力已迁入 `personal-os` 和 `personal-assets`。 | ✅ **已归档** |
| `personal-web` | finance UI 样式和交互参考；旧 admin / 管理页面行为参考。 | 必要 UI 经验迁入 `personal-os/apps/web`。 | ✅ **已归档** |
| `personal-agent` | 模型环境变量、chat streaming、tool trace、prompt/tool 经验来源。 | 经验迁入 `personal-os/apps/agent`。 | ✅ **已归档** |

## 维护规则

- 主进度表只列长期目标项目。
- 历史来源项目只能出现在“迁移来源项目”小节。
- 不用百分比表达进度，避免虚假精确。
- 每次完成一个关键里程碑时，同步更新本文档和 `workspace.yaml`。
