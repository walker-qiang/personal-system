# personal-assets 自动化投研闭环设计

> 状态：设计已确认，尚未实施
> 日期：2026-08-21
> 范围：`personal-assets`、`personal-os`、`personal-agent`

## 1. 背景与目标

现有系统已经完成研究数据层、官方事实对账、Deep Research 质量闸门、研究卡 durable 写回/API 回读以及 App 链路验收。下一步建设 personal-assets 自动化投研闭环。

本方案的第一版目标不是定时重写完整研报，而是建立“研究池定时复查”能力：

1. 按用户为标的设定的时间间隔自动复查。
2. 结合上次认知和最新证据，判断认知是否发生变化。
3. 保存每次复查形成的认知版本，支持回看连续迭代过程。
4. 在认知变化或重大市场事件发生时，向 App 消息中心发送提醒。
5. 用户点击消息后，能够回到对应标的、对应版本和具体判断内容。

## 2. 产品形态

系统形成两个互补入口：

```text
标的详情
  -> 看当前最新判断
  -> 看当前风险、触发器和证据
  -> 查看历史认知迭代

App 消息中心
  -> 看需要关注的变化
  -> 在未读/已读提醒之间切换
  -> 点击消息跳转到对应版本内容
```

标的详情不承载提醒列表。提醒是 App 的全局能力，统一进入消息中心；标的详情只负责展示判断和认知历史。

## 3. 三层职责

### 3.1 personal-assets

`personal-assets` 是 durable source of truth，保存：

- 研究池条目及其复查配置；
- 标的最新认知卡；
- 每次复查产生的不可变 `review_version`；
- 版本之间的认知差异、证据引用和市场事件；
- 与研究版本绑定的消息事件记录。

投研产物统一位于 `财富/投研/`。SQLite、HTML 缓存、运行日志和任务状态不进入 durable 资产目录。

### 3.2 personal-os

`personal-os` 负责：

- 定时发现到期标的并创建复查任务；
- 获取和标准化最新行情、财务、公告及市场信息；
- 调用 `personal-agent` 执行旧认知与新证据比较；
- 执行研究结果质量闸门；
- 通过受控 `AssetStore` 写入研究版本；
- 生成消息中心所需的消息投影和深链接；
- 保存消息已读状态等 App 运行态。

### 3.3 personal-agent

`personal-agent` 只负责基于证据的研究比较和结构化输出，不直接写入 `personal-assets`，不直接操作 Git，也不自行决定消息投递。

## 4. 核心数据模型

### 4.1 研究池条目

研究池条目建议至少包含：

```text
watch_id
asset_id
canonical_symbol
enabled
review_interval
next_review_at
focus_areas
current_version_id
alert_policy
created_at
updated_at
```

`review_interval` 第一版支持固定的日、周、月间隔；标的可以配置不同的关注重点，例如盈利、估值、竞争格局或监管风险。

### 4.2 认知版本

每次成功复查都追加一个不可变的 `review_version`，即使没有明显变化也必须保留：

```text
version_id
asset_id
reviewed_at
evidence_as_of
previous_version_id
overall_status
overall_judgment
thesis_change
facts_change
risks_change
triggers_change
market_events
change_summary
source_refs
confidence
quality_status
alert_decision
```

每个判断维度统一使用以下变化状态：

```text
unchanged       相对上个版本无明显变化
strengthened    判断被强化
weakened        判断被削弱
added           新增判断
removed         原判断不再成立
uncertain       证据不足，暂无法判断
```

每个维度同时保存当前内容和变化说明：

```json
{
  "status": "weakened",
  "current": "盈利增长仍可维持，但短期增速可能放缓",
  "change": "相较上一版本，下调盈利持续性的判断",
  "evidence_refs": ["source_20260821_001"]
}
```

版本通过 `previous_version_id` 串联，形成单个标的的完整认知链。历史版本不被后续版本覆盖。

### 4.3 消息

消息与 `review_version` 绑定，至少包含：

```text
message_id
asset_id
review_version_id
message_type       cognition_changed / market_event
severity           info / important / critical
title
summary
created_at
target
dedup_key
```

消息状态只有 `unread` 和 `read`。消息内容、来源和跳转目标与研究版本关联；`read_at` 等用户交互状态属于 `personal-os` 运行态，不写入投研事实。

## 5. 自动复查流程

```text
定时器发现 next_review_at 到期
  -> 创建 review_run
  -> 读取标的当前版本
  -> 获取上次复查之后的增量信息
  -> 获取当前行情、估值、财务和官方披露
  -> personal-agent 比较旧认知与新证据
  -> 质量闸门校验结构、来源、期间和完整性
  -> AssetStore 追加 review_version
  -> 判断是否生成消息
  -> 写入消息投影
  -> 更新 current_version_id 和 next_review_at
```

同一标的同时只允许一个复查任务运行。复查失败、证据不足或质量校验失败时，不写入半成品版本，也不生成消息；任务保留失败原因并进入可重试状态。

复查输入至少包括：

- 上一个成功版本的完整认知卡；
- 上次复查之后新增的公告、财报和市场信息；
- 当前行情、估值和关键财务数据；
- 研究池条目的关注重点和已有触发器。

## 6. 认知变化与消息规则

以下变化生成 `cognition_changed` 消息：

- 核心 Thesis 被强化或削弱；
- 关键事实发生足以影响判断的变化；
- 新增或移除重要风险；
- 触发器从待观察变为已触发，或原触发条件失效。

以下事件生成 `market_event` 消息：

- 重大业绩或官方公告；
- 监管、诉讼、管理层和持续经营事件；
- 对原有判断有潜在实质影响的行业或公司事件。

市场事件和认知变化是两个独立维度，可以同时出现在一条消息中。市场事件即使暂时无法确认认知改变，也必须单独提醒。

相对上一版本无明显变化时，仍保存版本，但不生成消息。同一事件通过“标的 + 事件指纹 + 影响维度”去重；多个来源指向同一事件时合并来源。后续复查确认影响扩大时，生成新的升级消息，不修改旧消息。

## 7. App 展示设计

### 7.1 标的详情

标的详情默认展示最新版本：

```text
标的名称 / 代码
最近复查时间
信息截至时间
当前判断状态
Thesis 与反 Thesis
关键事实与来源
当前风险与触发器
最近一次相对变化
```

详情页回答“现在怎么看”，不展示全局提醒列表。

### 7.2 历史认知

历史页按复查时间倒序展示版本时间线。每个版本先显示差异摘要，再允许展开完整判断：

```text
2026-08-21 复查
- Thesis：相对上一版本无明显变化
- 盈利判断：得到新公告数据支持，信心上升
- 风险：新增需求下滑观察项
- 触发器：维持原有触发条件
- 市场事件：发生重大公告，已触发关注提醒
```

支持以下筛选：

```text
全部复查
只看有变化
只看重大事件
只看提醒
```

### 7.3 消息中心

App 新增全局消息中心，包含两个 Tab：

```text
未读提醒
已读提醒
```

每条消息显示严重程度、消息类型、一句话摘要、受影响判断维度、发生时间和来源。点击消息后：

```text
标记为已读
  -> 跳转标的详情
  -> 定位到对应 review_version
  -> 自动展开本次变化的 Thesis / 风险 / 市场事件区块
```

建议跳转目标保持稳定：

```text
/investment/assets/{asset_id}
/investment/assets/{asset_id}/history/{review_version_id}
/investment/assets/{asset_id}/history/{review_version_id}#risks
```

列表浏览不自动标记已读；点击消息后标记已读。已读消息保留并支持分页查看，不做自动删除。

## 8. HTML 展示边界

HTML 作为 `personal-os` 的展示投影，不作为唯一事实源。结构化版本数据由 API 返回，HTML 负责详情页、历史时间线和消息跳转所需的可展开内容。

建议使用语义化结构：

- `article` 表示一次认知版本；
- `time` 表示复查时间和信息截至时间；
- `details/summary` 实现历史版本展开；
- `section` 表示 Thesis、事实、风险、触发器和市场事件；
- 证据链接直接挂在对应判断下。

这样 Web、macOS App 和后续通知渠道可以复用同一份内容模型，而不需要把 HTML 再解析回事实数据。

## 9. 幂等、失败与安全边界

- 同一标的复查任务单飞，避免重复并发。
- `review_version` 使用基于标的、基线版本和证据快照的幂等键。
- 消息使用 `dedup_key`，重试不会重复生成提醒。
- 研究结果必须通过现有质量闸门后才允许写回。
- `personal-agent` 不直接访问 `personal-assets` 或 Git。
- 所有 durable 写入继续经过 `personal-os` 和 `AssetStore`。
- 工作区脏、远端分叉、计划过期或 schema 校验失败时拒绝写入。
- 写回成功但消息投影失败时，保留研究版本，标记消息投影待重建，不回滚 durable 事实。
- 消息中心读取失败不影响标的详情和研究版本读取。

## 10. 第一版范围

第一版包含：

- 研究池条目和按标的配置复查间隔；
- 定时发现到期标的；
- 单标的复查、认知比较和版本化写回；
- 无变化版本留痕；
- 认知变化和重大市场事件消息；
- 标的最新判断和历史时间线；
- 消息中心的未读/已读 Tab；
- 消息到标的版本和判断区块的深链接；
- 幂等、失败保护和可重试。

第一版暂不包含：

- 实时行情流和全天候新闻监听；
- 自动交易或交易建议执行；
- 自动修改投资政策；
- 模型未经质量闸门直接覆盖当前认知；
- 全量新闻 RAG 和行业专属研究引擎；
- 多用户协作和复杂通知渠道编排。

## 11. 验收标准

1. 到期标的能够自动创建并执行一次复查任务。
2. 认知无变化时追加历史版本，但不生成消息。
3. Thesis、风险、触发器或关键事实发生变化时生成未读消息。
4. 只有重大市场事件、没有确认认知变化时，也生成事件消息。
5. 同一事件的多来源信息能够合并去重。
6. 标的详情默认显示最新判断，历史页能按版本展示差异。
7. 点击未读消息后，消息转为已读并跳转到正确版本和区块。
8. 已读消息可以在已读 Tab 中继续查看。
9. 失败、证据不足或质量校验失败时，不写入半成品版本，也不生成消息。
10. 任务重试不会重复创建版本或消息。
