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
      职业/
      自我/
      健康/
      沟通/
      系统/
    实体/

  项目/
  长乐道/

  财务/
    资产/
    快照/
    交易/
    作废/
    报表/
    模式/
      示例/
    审计/

  技能/
  附件/
  模板/
```

## 组织原则

- `资料/`：通用学习原始资料和来源材料。AI 默认不改写，只能补充元数据或派生内容。
- `知识/领域/`：按 bounded context 组织的稳定知识。
- `知识/概念/`：跨领域复用的概念卡片；概念很多，因此先按主题分目录。
- `知识/实体/`：人、公司、产品、地点、系统等实体页。
- `项目/`：有明确目标、交付物和结束条件的阶段性工作；需要决策的内容在项目内体现。
- `长乐道/`：个人记录、复盘、长期轨迹。
- `财务/`：结构化财务 facts、schema、审计和报表。
- `技能/`：可复用 AI workflow / skill。
- `附件/`：Vault 级附件。
- `模板/`：Obsidian 和 AI 写作模板。

## 资料到知识 Skill

后续 `技能/ingest-source-to-knowledge/` 应承接 `obsidian-wiki` 的 source-based ingest 经验，但使用本仓库的新边界：

1. 输入来自 `资料/**`，原始资料只读。
2. 输出进入 `知识/领域`、`知识/概念` 或 `知识/实体`。
3. 写入前先检索已有知识页，优先更新而不是重复新建。
4. 每个知识页必须保留来源引用。
5. 写入后校验 frontmatter、链接和来源字段。
6. 不写 `长乐道/**` 或 `财务/**`，除非用户明确切换到对应 workflow。

## 写入规则

- Git-backed text files 是长期事实。
- 不提交 secrets、credentials、SQLite、cache、logs、`node_modules`、`dist` 或运行态文件。
- 高风险或来源不足内容用 `status: draft`，不另建 `drafts/` 目录。
- 快照、交易、采集记录、审计日志优先 append-only。
- 财务 facts 必须能通过 `财务/模式/` 的 schema 和仓库级校验。
- 产品/runtime 写入应通过受控接口，例如 `AssetStore`。
- 敏感内容按归属进入 `长乐道/` 或 `财务/`；其他目录默认只放通用材料。
- Obsidian 稳定配置可以提交；`.obsidian/workspace.json` 和 `workspace-mobile.json` 是本机状态，不提交。

## 财务 facts

```text
财务/
  资产/          asset master data
  快照/YYYY/MM/  point-in-time asset values
  交易/YYYY/MM/  transaction facts
  作废/YYYY/MM/  void facts
  targets.yaml  allocation targets
```

持仓由快照推导，不直接手工维护。修正用 correction fact 表达，废弃用 void fact 表达，避免重写历史。

## 隐私分层

| Class | Meaning | Default Handling |
|---|---|---|
| L1 Public-ish | 低敏公开信息 | 可进入外部 AI |
| L2 Personal | 一般个人信息 | 最小必要上下文 |
| L3 Sensitive | 财务、身份、个人复盘等敏感信息 | 需要明确策略或确认 |
| L4 Secret | 密钥、密码、token、恢复码 | 不进入 Git |

## obsidian-wiki 映射方向

| Source | Target |
|---|---|
| `obsidian-wiki/raw/` | `personal-assets/资料/` |
| `obsidian-wiki/wiki/` | `personal-assets/知识/` |
| `obsidian-wiki/skills/` | `personal-assets/技能/` |
| `obsidian-wiki/finance/exports/` | 迁移为 `personal-assets/财务/` facts |

迁移不是机械搬运；以当前目录契约为准，必要时重新归类。
