# 研究卡标的目录迁移 Dry-run

> 状态：EXECUTED
>
> 生成日期：2026-08-23
>
> 数据源：`personal-assets/财富/投研/研究/`
>
> 本报告在 dry-run 生成时只读检查，未移动或修改任何研究卡。

> 执行结果：2026-08-23 已按本清单完成迁移，`personal-assets` commit 为 `47cd12a`。

## 1. 结论

本次发现 8 张 schema v2 旧研究卡，涉及 4 个标的。

- 8 个 legacy record ID 全部唯一。
- 8 个目标文件均不存在，无文件名冲突。
- 8 张卡注入各自 legacy `record_id` 后均能在目标路径解析成功。
- 解析后的 record ID 与迁移前完全一致。
- durable 文档中未发现旧路径引用。
- 唯一路径引用来自 `.obsidian/workspace.json`，属于本机状态且不进入 Git，可忽略。

旧 `研究/` 目录另有 2 份跨标的投资系统设计文档，不属于 schema v2 标的研究卡，本次明确不迁移：

- `2026-04-24-investment-finance-iteration-map.md`
- `2026-04-24-investment-iteration-subsystem-index.md`

它们后续应按跨标的系统设计内容单独归类，不能放入某个标的目录。

建议允许执行迁移，但先保留以下两个非阻塞缺口：

- `sh600585` 海螺水泥没有 `profile.yaml`。
- `sz000651` 格力电器没有 `profile.yaml`。

迁移不应为了补目录结构而编造 profile。两者可以先只有 `research/`，后续通过已有官方事实 materialize 流程补 profile。

## 2. 迁移动作

每张研究卡执行两项变更：

1. 在 YAML frontmatter 的 `schema_version` 后加入原 legacy ID：

```yaml
record_id: <legacy_record_id>
```

2. 将文件移动到：

```text
财富/投研/标的/<target_id>/research/<原文件名>
```

除新增 `record_id` 外不修改正文、来源、日期、状态或研究结论。

## 3. 标的汇总

### `sz000858` 五粮液

- 研究卡：3 张。
- 标的目录：已存在。
- `profile.yaml`：已存在。
- 目标冲突：无。

### `sh600585` 海螺水泥

- 研究卡：3 张。
- 标的目录：不存在，将创建 `research/`。
- `profile.yaml`：不存在，非阻塞。
- 目标冲突：无。

### `hk00700` 腾讯控股

- 研究卡：1 张。
- 标的目录：已存在。
- `profile.yaml`：已存在。
- 目标冲突：无。

### `sz000651` 格力电器

- 研究卡：1 张。
- 标的目录：不存在，将创建 `research/`。
- `profile.yaml`：不存在，非阻塞。
- 目标冲突：无。

## 4. 文件清单

### 五粮液

`research_3cw0toyrl7wg7`

```text
财富/投研/研究/2026-08-20-105314-stock-sz000858.md
→ 财富/投研/标的/sz000858/research/2026-08-20-105314-stock-sz000858.md
```

- 原 SHA256：`08bc50db3593`
- 注入 record ID 后 SHA256：`f252984fd170`
- 目标解析：通过。

`research_28j88zhspj44e`

```text
财富/投研/研究/2026-08-21-170839-stock-sz000858.md
→ 财富/投研/标的/sz000858/research/2026-08-21-170839-stock-sz000858.md
```

- 原 SHA256：`9ed30f1bdd21`
- 注入 record ID 后 SHA256：`bf3acf681230`
- 目标解析：通过。

`research_2nk58c57e9sjv`

```text
财富/投研/研究/2026-08-22-220239-stock-sz000858.md
→ 财富/投研/标的/sz000858/research/2026-08-22-220239-stock-sz000858.md
```

- 原 SHA256：`9a5549beb15a`
- 注入 record ID 后 SHA256：`210130e062a5`
- 目标解析：通过。

### 海螺水泥

`research_39kdtecq1b21n`

```text
财富/投研/研究/2026-08-20-111123-stock-sh600585.md
→ 财富/投研/标的/sh600585/research/2026-08-20-111123-stock-sh600585.md
```

- 原 SHA256：`be1b7d1a519c`
- 注入 record ID 后 SHA256：`62d842e38190`
- 目标解析：通过。

`research_ned97lvj3am5`

```text
财富/投研/研究/2026-08-21-172608-stock-sh600585.md
→ 财富/投研/标的/sh600585/research/2026-08-21-172608-stock-sh600585.md
```

- 原 SHA256：`34adb0322a3a`
- 注入 record ID 后 SHA256：`0f408ea82dc8`
- 目标解析：通过。

`research_ac9t5mjyab30`

```text
财富/投研/研究/2026-08-22-220341-stock-sh600585.md
→ 财富/投研/标的/sh600585/research/2026-08-22-220341-stock-sh600585.md
```

- 原 SHA256：`7aa624a3fbe2`
- 注入 record ID 后 SHA256：`80d671418caa`
- 目标解析：通过。

### 腾讯控股

`research_14sgf2axy4j13`

```text
财富/投研/研究/2026-08-20-105323-stock-hk00700.md
→ 财富/投研/标的/hk00700/research/2026-08-20-105323-stock-hk00700.md
```

- 原 SHA256：`3766c649e1fe`
- 注入 record ID 后 SHA256：`7942792fbf63`
- 目标解析：通过。

### 格力电器

`research_1zdph26uncb2m`

```text
财富/投研/研究/2026-08-20-183444-stock-sz000651.md
→ 财富/投研/标的/sz000651/research/2026-08-20-183444-stock-sz000651.md
```

- 原 SHA256：`1444ed99f6f4`
- 注入 record ID 后 SHA256：`6e8fc0e42782`
- 目标解析：通过。

## 5. 引用影响

仓库内 Markdown、YAML、YML 和 JSON 文件已按旧完整路径与旧文件名扫描。

- Durable 内容引用：0。
- 本机 Obsidian workspace 引用：8 个文件均命中 `.obsidian/workspace.json`。
- `.obsidian/workspace.json` 已按 Vault 规则排除提交，不纳入迁移 commit。

App、消息中心和 Agent research context 使用稳定 `record_id`，不以文件路径作为业务身份。双路径读取已经部署，迁移过程中不会出现读取空窗。

## 6. 执行顺序

1. 再次校验 8 个源文件 SHA256 与本报告一致。
2. 为每个文件注入对应 legacy `record_id`。
3. 使用 Git rename 移动到目标目录。
4. 运行 repository 读取校验，要求总记录数仍为 8。
5. 校验 8 个 record ID 与迁移前完全一致。
6. 校验标的详情、消息中心和 Agent research context。
7. 只提交本次 8 个文件的移动与内容变更。

## 7. 回滚

迁移应独立形成一个 `personal-assets` commit。

若回归失败：

1. 回退该迁移 commit。
2. `personal-os` 继续通过双路径 repository 读取旧目录。
3. 不进行反向复制或保留新旧两份文件。

## 8. 执行门槛

执行前需要用户确认：

- 接受海螺水泥和格力电器暂时没有 `profile.yaml`。
- 接受忽略未跟踪的 `.obsidian/workspace.json` 路径缓存。
- 同意本次只迁移 8 张研究卡，不处理估值快照或其他投研文件。

以上门槛已由用户确认，迁移已经执行并通过提交后回归。
