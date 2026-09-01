# personal-assets Contract

`personal-assets` 是个人长期资产库和 Obsidian 主 Vault。它保存 durable source of truth；应用生成的 SQLite、索引、cache、缩略图和 API 投影都必须可重建。

## 目录契约

```text
personal-assets/
  AGENTS.md
  README.md

  资料/
    文章/
    书籍/
    课程/
    论文/
    视频/
    官方文档/

  知识/
    领域/
    概念/
      人工智能/
      工程/
      投资/
      事业/
      自我/
      身体/
      沟通/
      系统/
    实体/

  项目/
  长乐道/

  财富/
    资产/
    快照/
    作废/
    交易/
    交易作废/
    投研/
    原始资料/
    投资政策.md
    targets.yaml

  技能/
  附件/
  模板/
```

## 组织原则

- `资料/`：通用学习原始资料和来源材料。由人工和程序收集，AI 默认不改写原文，只能补充元数据或派生内容。
- `知识/领域/`：按 bounded context 组织的稳定知识。
- `知识/概念/`：跨领域复用的概念卡片；概念很多，因此先按主题分目录。
- `知识/实体/`：人、公司、产品、地点、系统等实体页。
- `知识/` 只保留 `领域/`、`概念/`、`实体/` 三类主容器；不再新增 `综合/`、`关注列表/` 等并行主分类。
- `知识/`：AI 整理为主，人工审核定稿。
- `项目/`：人工主导的阶段性工作；AI 辅助整理，有明确目标、交付物和结束条件；需要决策的内容在项目内体现。
- `项目/` 可按 `README.md`、`过程记录/`、`交付物/`、`归档/` 组织阶段性产物。
- `长乐道/`：人工主导的个人记录、复盘和长期轨迹；AI 默认不改写原文。
- `长乐道/` 不用 `草稿/`、`decisions/` 这类状态型目录；草稿状态通过 frontmatter 表达。
- `财富/`：结构化财富 facts、资产、估值快照、交易、修正/作废事实、投资政策和投研材料；资产与 finance facts 由程序主导写入，人工只做校验和例外处理。
- `财富/投研/`：承接标的研究、观察池、组合复盘和模板类投研产物，由 AI 和人工共同维护，但不等同于财富事实。标的级内容以 `标的/<target_id>/` 为权威聚合目录。
- `技能/`：由人工定义、AI 协助迭代的可复用 workflow / skill。
- `附件/`：Vault 级附件；新附件默认按 `YYYY-MM/` 归档。
- `模板/`：由人工定义、AI 协助整理的 Obsidian 和 AI 写作模板。

## 资料到知识 Skill

后续 `技能/ingest-source-to-knowledge/` 应承接 `obsidian-wiki` 的 source-based ingest 经验，但使用本仓库的新边界：

1. 输入来自 `资料/**`，原始资料只读。
2. 输出进入 `知识/领域`、`知识/概念` 或 `知识/实体`。
3. 写入前先检索已有知识页，优先更新而不是重复新建。
4. 每个知识页必须保留来源引用。
5. 写入后校验 frontmatter、链接和来源字段。
6. 不写 `长乐道/**` 或 `财富/**`，除非用户明确切换到对应 workflow。

## 写入规则

- Git-backed text files 是长期事实。
- 不提交 SQLite、cache、logs、`node_modules`、`dist` 或运行态文件。
- secrets、credentials 等敏感内容按归属进入受保护目录（如 `财富/原始资料/`、`长乐道/` 下的专用路径），仍受 Git 跟踪。
- 高风险或来源不足内容用 `status: draft`，不另建 `drafts/` 目录。
- 快照和采集记录优先 append-only。
- 财富 facts 必须符合 `资产/`、`快照/`、`targets.yaml` 的当前数据约定，并通过应用 workflow 校验。
- 产品/runtime 写入应通过受控接口，例如 `AssetStore`。
- 敏感内容按归属进入 `长乐道/` 或 `财富/`；其他目录默认只放通用材料。
- Obsidian 稳定配置可以提交；`.obsidian/workspace.json` 和 `workspace-mobile.json` 是本机状态，不提交。

## 财富结构化记录

```text
财富/
  资产/          asset master data
  快照/YYYY/MM/  point-in-time asset values
  作废/YYYY/MM/  snapshot void facts
  交易/YYYY/MM/  transaction and economic event facts
  交易作废/YYYY/MM/ transaction void facts
  投研/          research, watchlists, reviews, and templates
  原始资料/      non-tabular sensitive finance source documents
  投资政策.md    personal investment policy
  targets.yaml   allocation targets
```

当前持仓是混合派生视图，不直接手工维护：最新有效估值快照提供当前市值；
基金、ETF、股票等数量型资产的数量、成本基础和已实现收益由有效交易事实
聚合；现金和其他非数量型资产仍以快照为主。逐笔交易事实保存在
`交易/`，用于解释资产变化、现金流和收益核算；组合判断和复盘写入
`投研/`，数据摘要从估值快照和交易事实重算。

快照金额保存为非负原币金额；负债使用 `balance_side: liability`、
`asset_type: personal-debt` 和 `allocation_bucket: liability`，其快照金额
表示正的待还金额，由 holdings 汇总在净资产计算中扣除。快照和交易事实的
`source.method` 必须存在；修正通过完整替代事实，作废通过独立 void fact
表达。

## 投研标的优先契约

单个投资对象的长期信息按稳定标的 ID 聚合：

```text
财富/投研/
  标的/
    <target_id>/
      profile.yaml
      reports/
      research/
      return-analysis/
      valuation/
      events/

  观察池/
  同业/
  基金池/
  复盘/
  模板/
```

规则：

- `target_id` 使用规范化市场代码或注册表稳定 ID，不使用名称。
- profile、官方报告、标的研究卡、收益分析快照、标的估值和事件进入标的目录。
- 观察池、同业比较、组合复盘、基金目录和模板保留在外层。
- 全局列表、搜索、时间线和反向引用是可重建投影，不通过复制 durable 文件实现。
- 同一内容只能有一个权威文件；迁移期间允许读新旧路径，但新写入只进入标的目录。
- 收益分析的全部计算历史默认保存在本地 SQLite；只有固定、引用或确认的记录进入 `return-analysis/`。
- 研究卡迁移已完成记录 ID 与文件路径的解耦；移动文件不能改变业务身份，旧记录
  的 `legacy_id` 和历史链接继续保留。
- 当前按日期保存的多标的估值快照在确定新的权威模型前保持原状，不与标的 `valuation/` 双写。

详细设计见
[`2026-08-23-target-centric-investment-information-architecture-design.md`](plans/2026-08-23-target-centric-investment-information-architecture-design.md)。

## 隐私分层

| Class | Meaning | Default Handling |
|---|---|---|
| L1 Public-ish | 低敏公开信息 | 可进入外部 AI |
| L2 Personal | 一般个人信息 | 最小必要上下文 |
| L3 Sensitive | 财务、身份、个人复盘等敏感信息 | 需要明确策略或确认 |
| L4 Secret | 密钥、密码、token、恢复码 | 按归属进入受保护目录，仍受 Git 跟踪；外部 AI 调用时自动排除 |

## obsidian-wiki 映射方向

| Source | Target |
|---|---|
| `obsidian-wiki/raw/` | `personal-assets/资料/` |
| `obsidian-wiki/wiki/` | `personal-assets/知识/` |
| `obsidian-wiki/skills/` | `personal-assets/技能/` |
| `obsidian-wiki/finance/exports/` | 迁移为 `personal-assets/财富/` facts |

迁移不是机械搬运；以当前目录契约为准，必要时重新归类。
