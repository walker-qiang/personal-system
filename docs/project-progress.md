# 目标项目进度

本文档记录 personal-system 工作区（双机路径不同：`/Users/liqiang/code/personal-system` 与 `/Users/qiang.lilq/personal-system`）下长期目标项目的建设进度。

> 最近核实：2026-10-22（本机 `/Users/qiang.lilq/personal-system`）。
> 核实方式：Git 状态与远端同步、进程/端口、只读任务统计、Go 测试/静态检查、Agent 默认测试与隔离协议验收、跨仓隔离验收、macOS App Build 与部署。
> 详细命令和限制见 [本轮验证记录](plans/2026-10-22-v3-stability-and-workspace-status.md)。
> 本机各仓已 fetch 并完成所需推送；该状态不代表另一台电脑已同步。
> 已核实但未处理的待办问题见 [已知问题清单](known-issues.md)。

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
| `personal-system` | 顶层 workspace / governance 仓，维护系统规则、规划、迁移台账和项目清单。 | `usable` | 子项目独立 Git、remote、文档归档及问题台账已建立；本轮按当前源码纠正主动研究与 App 生命周期描述，并区分本机和另一台电脑的核实记录。 | 需持续维护状态，避免把旧验收、历史任务和本地 remote-tracking ref 当作当前运行证据。 | 按里程碑更新本文档、`workspace.yaml` 和问题台账。 |
| `personal-assets` | durable source of truth，保存 finance facts 和 broader personal assets。 | `stable` | `obsidian-wiki` 迁移及 `13-财富/` 目录收口完成；历史卡、V3 Thesis/evidence/episode 与收益固定结果按稳定标的目录保存。当前本机 HEAD 为 `8c83091`，已推送且工作区干净。 | 海螺水泥 `sh600585` 目录仍无 profile；日常知识完善及历史术语清理按实际使用推进。另一台电脑的旧同步问题不代表本机状态。 | 保持唯一事实源；不自动迁移、重跑研究或写回。 |
| `personal-os` | 投资快照、投研和个人助理工作台；统一产品/API 与 durable write 入口。 | `usable` | 当前 HEAD `ae628d7`；已有 finance cache、受控写入、单资产收益、收益历史和 Agent proxy；股票/基金统一 V3，新增研究前预检、官方来源优先检索、自动补查与诊断展示。App/API 已按当前工作区构建并安装，启动健康检查通过。Go 测试/静态检查、App Build 与跨仓隔离验收通过。 | 最新修复后的真实 V3 连续复查待授权；研究证据缺口继续保留。组合级核算、更多成本口径仍是后续需求；legacy 历史读取保留。 | 按授权范围、资料权限和预算验证真实 V3 连续研究；不恢复全池自动模型研究。 |
| `personal-agent` | 独立 Python Agent Runtime、chat/tool 服务和研究执行能力，Runtime Core 严格下层化。 | `usable` | 当前 HEAD `97fec2c`；Runtime journal、审批/恢复、记忆治理和受控 Vault API 边界已建立；统一 investment V3 支持两阶段综合、有界修复、预算、精确引用与诊断脱敏。默认测试 `927 passed, 20 deselected`，协议及跨仓隔离验收通过。 | 最新引用修复的真实模型效果与成本尚未复查；可选 RAG 集成能力本轮未重跑，不等同于默认测试失败。 | 保持所有 durable write 经过 `personal-os`，以指定标的验证引用修复和恢复体验，不自动增加预算或调用次数。 |
| `personal-tools` | 长期复用工具仓；当前维护 `weixin-clip` 和 `workspace-git-delivery`。 | `active` | 当前 HEAD `db50105`，工作区干净；扩展 v0.5.0 和 Git delivery Skill 已有。历史进度记录另一台电脑已完成真实页面验收。 | 扩展 README 的真实验收日期和清单仍未补齐，与历史进度记录不一致；本轮未操作 Chrome，未重新核实本机目录授权或全局 Skill 安装。 | 经确认后补齐本机真实页面验收并统一记录；保持 Codex 全局 Skill 以符号链接指向源码。 |

## 迁移来源项目

这些项目不属于长期目标项目。它们只作为历史来源、参考实现或归档对象。

| 来源项目 | 当前作用 | 迁移去向 | 状态 |
| --- | --- | --- | --- |
| `obsidian-wiki` | 历史 Obsidian 工作流、知识内容和工具实践来源。 | 迁移已收口；后续仅作为历史只读参考。 | `reference-only` |
| `personal-finance` | finance backend、SQLite/cache、API、金额精度、灾备经验来源。 | 能力已迁入 `personal-os` 和 `personal-assets`。 | ✅ **已归档** |
| `personal-web` | finance UI 样式和交互参考；旧 admin / 管理页面行为参考。 | 必要 UI 经验已迁入 `personal-os/apps/mac`。 | ✅ **已归档** |
| `personal-agent`（历史旧路径） | 模型环境变量、chat streaming、tool trace、prompt/tool 经验来源。 | 独立 `personal-agent` 长期维护；旧 `personal-os/apps/agent` 已删除，仅保留 Git 历史和 archive 记录。 | 已完成边界纠正 |

## 维护规则

- 主进度表只列长期目标项目。
- 历史来源项目只能出现在“迁移来源项目”小节。
- 不用百分比表达进度，避免虚假精确。
- 每次完成一个关键里程碑时，同步更新本文档和 `workspace.yaml`。
- 每次核实系统状态时，把新发现且未处理的问题记入[已知问题清单](known-issues.md)，不要只写在本表里。
