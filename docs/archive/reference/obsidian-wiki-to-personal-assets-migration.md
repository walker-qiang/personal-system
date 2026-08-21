# obsidian-wiki 到 personal-assets 迁移执行记录

本文档记录旧 `obsidian-wiki` 向 `personal-assets` 的最终收口结果。

## 最终结论

- `personal-assets` 已成为唯一主资产目录和 Obsidian 主 Vault。
- 顶层目录已收口为：`长乐道 / 身体 / 家庭 / 事业 / 财富 / 兴趣 / 资料 / 知识 / 项目 / 技能 / 模板 / 附件`。
- `项目/` 保持顶层独立目录，不按关注域预拆分。
- `财富/` 已成为最终物理目录，原 `财务/` 目录废弃。
- `personal-os` 与 `personal-tools` 的活跃入口已切换到 `personal-assets` 口径。
- 旧 `obsidian-wiki` 后续只作为历史只读参考，不再承担主工作流。

## 三阶段结果

### 阶段 1：目录与迁移边界

已完成：

- 冻结并落地目标顶层目录口径。
- 明确 `项目/` 的独立顶层语义。
- 完成 `财富/` 物理目录收口，并同步 Schema、审计、投研和结构化记录路径。

### 阶段 2：内容迁移

已完成：

- 旧 `obsidian-wiki` 中需要承接到新 Vault 的长期内容已经迁入或被明确承接。
- `raw/`、`wiki/`、`skills/`、`journal/`、`finance/exports/` 等主要来源已按新边界落位。
- `obsidian-wiki` 不再作为待迁移工作区；后续只有在追溯历史上下文时才回查。

### 阶段 3：工具依赖切换

已完成：

- `personal-tools` 的活跃说明文档和默认保存示例已切到 `personal-assets`。
- `personal-os` 的财富目录路径已切到 `personal-assets/财富/**`。
- 旧路径依赖只保留在历史归档文档或兼容层说明中。

## 冻结映射表

以下映射作为迁移完成后的最终边界：

| 旧路径 | 新路径 | 规则 |
| --- | --- | --- |
| `obsidian-wiki/raw/general/articles/**` | `personal-assets/资料/文章/**` | 原始文章与剪藏保持来源层属性 |
| `obsidian-wiki/raw/general/books/**` | `personal-assets/资料/书籍/**` | 原始书籍资料 |
| `obsidian-wiki/raw/general/courses/**` | `personal-assets/资料/课程/**` | 原始课程资料 |
| `obsidian-wiki/raw/general/papers/**` | `personal-assets/资料/论文/**` | 原始论文资料 |
| `obsidian-wiki/raw/general/videos/**` | `personal-assets/资料/视频/**` | 原始视频资料 |
| `obsidian-wiki/raw/general/docs/**` | `personal-assets/资料/官方文档/**` | 官方文档与手册 |
| `obsidian-wiki/wiki/entities/**` | `personal-assets/知识/实体/**` | 实体页直接映射 |
| `obsidian-wiki/wiki/concepts/**` | `personal-assets/知识/概念/**` | 概念页直接映射 |
| `obsidian-wiki/wiki/domains/**` | `personal-assets/知识/领域/**` | 地图页与领域综述页 |
| `obsidian-wiki/skills/**` | `personal-assets/技能/**` | 保持 skill 作为知识资产 |
| `obsidian-wiki/journal/**` | `personal-assets/长乐道/复盘/**` 或相关关注域 | 按记录性质分流 |
| `obsidian-wiki/raw/sensitive/work/**` | `personal-assets/事业/**` | 工作资料与职业敏感原文 |
| `obsidian-wiki/raw/sensitive/family/**` | `personal-assets/家庭/**` | 家庭敏感原文 |
| `obsidian-wiki/raw/sensitive/health/**` | `personal-assets/身体/**` | 身体与健康相关原文 |
| `obsidian-wiki/raw/sensitive/knowledge/规划&复盘/**` | `personal-assets/长乐道/复盘/**` | 规划、复盘、个人轨迹 |
| `obsidian-wiki/finance/exports/**` | `personal-assets/财富/**` | 迁入财富系统的结构化与审计边界 |
| `obsidian-wiki/wiki/watchlists/**` | `personal-assets/财富/投研/观察池/**` | 观察池保留在财富系统内 |
| `obsidian-wiki/wiki/queries/**` | `personal-assets/项目/**` 或 `知识/**` | 只保留有长期价值的内容 |

## 后续维护

- 新内容直接进入 `personal-assets` 对应目录，不再先写旧 `obsidian-wiki`。
- `知识/` 仍可按日常使用继续补强，但这属于持续整理，不再属于迁移阻塞。
- 历史归档文档中如保留旧术语或旧路径，只作为历史语义，不影响当前主目录边界。
