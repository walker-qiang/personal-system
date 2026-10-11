# personal-assets 自动化投研闭环设计

> 状态：V1 基础闭环已实施并完成本地端到端 smoke；完整
> `review_version` / durable message domain 仍是后续演进目标
> 日期：2026-08-21
> 范围：`personal-assets`、`personal-os`、`personal-agent`
>
> 实施说明：`personal-os` ReviewService 使用
> `var/automation/reviews.sqlite` 保存任务、失败和退避状态；后台服务由 launchd
> 持续运行。macOS 只负责配置、立即复查和展示。研究版本继续使用 schema v2
> 研究卡，消息由相邻版本差异生成可重建投影。

## 1. 背景与目标

现有系统已经完成研究数据层、官方事实对账、Deep Research 质量闸门、研究卡
durable 写回/API 回读、ReviewService 自动复查基础闭环以及 App 链路验收。
后续重点是观察自动复查质量，并评估是否需要独立的版本和消息域模型。

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
- 标的最新认知卡及 schema v2 研究卡历史；
- 研究卡中的证据引用和市场事件。

当前不在 `personal-assets` 中单独保存 `review_version` 或消息事件记录。
复查任务和计划状态保存在 `personal-os` 的 SQLite 运行态，消息由研究卡
相邻版本差异重建。

投研产物统一位于 `13-财富/投研/`。SQLite、HTML 缓存、运行日志和任务状态不进入 durable 资产目录。

### 3.2 personal-os

`personal-os` 负责：

- 定时发现到期标的并创建复查任务；
- 获取和标准化最新行情、财务、公告及市场信息；
- 调用 `personal-agent` 执行旧认知与新证据比较；
- 执行研究结果质量闸门；
- 通过受控 `AssetStore` 写入 schema v2 研究卡；
- 生成消息中心所需的消息投影和深链接；
- 由 macOS App 保存消息已读状态等客户端运行态。

### 3.3 personal-agent

`personal-agent` 只负责基于证据的研究比较和结构化输出，不直接写入 `personal-assets`，不直接操作 Git，也不自行决定消息投递。

## 4. 核心数据模型

本节同时记录当前实现和目标演进模型。当前 V1 使用观察池配置、
schema v2 研究卡和可重建消息投影；标记为“目标模型”的字段和事件实体
尚未作为独立 durable schema 落地。

### 4.1 研究池条目

目标模型中的研究池条目建议至少包含：

```text
watch_id
asset_id
canonical_symbol
focus_areas
current_version_id
review_schedule
alert_policy
created_at
updated_at
```

当前实现以 `13-财富/投研/观察池/**` 中的观察池条目和
`review_schedule` 为配置来源；`last_review` / `next_review` 的复查状态
由 `personal-os` ReviewService 运行态单独保存，不维护 `current_version_id`
和 `alert_policy` 这些独立字段。

观察池维护一个默认复查频率；标的可以选择继承默认频率，或单独覆盖为自己的频率。第一版支持固定的日、周、月间隔；标的还可以配置不同的关注重点，例如盈利、估值、竞争格局或监管风险。

观察池列表是复查策略的管理入口。每一行至少展示：

```text
标的名称 / 代码
自动复查状态
复查频率
上次复查时间
下一次复查时间
```

用户可以在列表行内或标的配置面板中编辑复查频率、暂停/恢复自动复查，并触发一次“立即复查”。第一版采用观察池默认频率加标的单独覆盖的方式，例如观察池默认每周复查，但单独为某个标的设置每 3 天或每月复查。

建议将调度语义结构化表达为：

```text
review_schedule:
  mode: inherit | override
  enabled: true
  interval_unit: day | week | month
  interval_value: 7
  timezone: Asia/Shanghai
  next_review_at: ...
  last_review_at: ...
```

编辑频率只改变调度配置和 `next_review_at`，不生成新的认知版本，也不发送消息。用户点击“立即复查”时，才单独创建一次复查任务。

### 4.2 认知版本（目标模型）

目标模型要求每次成功复查都追加一个不可变的 `review_version`，即使没有
明显变化也必须保留：

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

当前实现不单独生成上述 `review_version`。每次成功复查追加一张普通
schema v2 研究卡，由服务端生成稳定 `record_id`；历史顺序和相邻版本关系
由研究日期、保存时间和文件路径推导。

### 4.3 消息（当前为可重建投影，目标为 durable message）

当前消息由 `GET /api/investment/messages` 在读取时根据相邻研究卡差异重建，
并使用运行态 JSON 缓存 AI 生成的变化摘要。当前响应字段为：

```text
id
asset_code
asset_name
review_record_id
message_type
severity
title
summary
changed_sections
created_at
target
```

当前没有独立 durable 消息表、`dedup_key`、服务端 unread/read 状态或分页。
macOS App 在 `UserDefaults` 中维护已读 ID。

目标模型中的消息与 `review_version` 绑定，至少包含：

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
  -> 调用 personal-agent 执行 deep_research
  -> 质量闸门校验结构、来源、期间和完整性
  -> AssetStore 追加 schema v2 研究卡
  -> 根据相邻研究卡差异生成并缓存消息摘要
  -> 更新 ReviewService 运行态的 last_review / next_review
```

同一时刻 ReviewService 顺序执行任务。复查失败、证据不足或质量校验失败
时，不写入半成品研究卡；任务保留失败原因并按退避策略进入可重试状态。

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

当前 App 已有全局消息中心，包含两个 Tab：

```text
未读提醒
已读提醒
```

当前每条消息显示标题、摘要和发生时间；点击消息后：

```text
标记为已读
  -> 跳转标的详情
  -> 跳转到对应标的详情
  -> 使用 `review_record_id` 定位到对应研究卡历史
```

当前返回的跳转目标使用标的代码和研究卡 `record_id`：

```text
/investment/assets/{code}/history/{record_id}
```

列表浏览不自动标记已读；点击消息后由 macOS App 在本地标记已读。
已读消息保留，但当前没有服务端分页。

### 7.4 观察池列表

观察池列表需要让用户不进入标的详情就能管理自动复查：

```text
观察池
  ├── 标的名称 / 当前判断状态
  ├── 复查频率：每周
  ├── 上次复查：2026-08-21
  ├── 下次复查：2026-08-28
  ├── 编辑频率
  ├── 立即复查
  └── 暂停 / 恢复
```

编辑频率后，列表立即展示新的频率和下一次复查时间。调度配置的保存失败时，不更新前端展示，避免用户误以为策略已经生效；“立即复查”只改变任务状态，不改变已保存的周期配置。

## 8. HTML 展示边界

HTML 作为 `personal-os` 的展示投影，不作为唯一事实源。结构化版本数据由 API 返回，HTML 负责详情页、历史时间线和消息跳转所需的可展开内容。

建议使用语义化结构：

- `article` 表示一次认知版本；
- `time` 表示复查时间和信息截至时间；
- `details/summary` 实现历史版本展开；
- `section` 表示 Thesis、事实、风险、触发器和市场事件；
- 证据链接直接挂在对应判断下。

这样 macOS App、Agent 和后续客户端/通知渠道可以复用同一份内容模型，而不需要把
HTML 再解析回事实数据。

## 9. 幂等、失败与安全边界

- ReviewService 使用全局执行锁顺序执行任务；计划任务通过观察池、标的和计划时间
  的幂等键去重，手动复查使用独立任务 ID。
- 当前消息 ID 基于研究卡 `record_id`，消息列表由相邻研究卡差异重建。
- 研究结果必须通过现有质量闸门后才允许写回。
- `personal-agent` 不直接写入 `personal-assets`，也不操作 Git；当前只读加载的
  Skill、RAG 文档和 Memory profile 仍可来自本地 `personal-assets` checkout。
- 所有 durable 写入继续经过 `personal-os` 和 `AssetStore`。
- AssetStore 允许无关 unstaged 修改，但拒绝 staged change、merge state、
  目标路径冲突和分叉同步。
- 消息摘要生成失败时使用确定性 fallback；摘要属于运行态缓存，不影响研究卡写回。
- 消息中心读取失败不影响标的详情和研究版本读取。

## 10. 第一版范围

当前 V1 基础闭环包含：

- 研究池条目和按标的配置复查间隔；
- 观察池列表展示和编辑复查频率、自动复查状态、上次/下次复查时间；
- 从观察池列表触发立即复查、暂停和恢复自动复查；
- 定时发现到期标的；
- 单标的复查、研究卡追加写回和相邻版本差异比较；
- 研究卡历史留痕；
- 认知变化和重大市场事件消息投影；
- 标的最新判断和研究卡历史时间线；
- 消息中心的未读/已读 Tab（已读状态由 macOS App 本地维护）；
- 消息到标的研究卡记录的深链接；
- 幂等、失败保护和可重试。

当前 V1 暂不包含：

- 独立 `review_version` / `previous_version_id` durable schema；
- durable message event、`dedup_key`、服务端已读状态和消息分页；
- 版本级 `unchanged` / `strengthened` 等结构化变化状态；
- 实时行情流和全天候新闻监听；
- 自动交易或交易建议执行；
- 自动修改投资政策；
- 模型未经质量闸门直接覆盖当前认知；
- 全量新闻 RAG 和行业专属研究引擎；
- 多用户协作和复杂通知渠道编排。

## 11. 验收标准

以下是完整目标模型的验收标准。当前 V1 已覆盖 ReviewService、研究卡写回、
相邻版本差异消息投影和 macOS 消息中心的基础部分；涉及独立
`review_version`、durable message、跨来源事件去重和版本级变化状态的条目
仍属于后续演进。

1. 到期标的能够自动创建并执行一次复查任务。
2. 观察池列表展示每个标的的复查频率、自动复查状态、上次复查时间和下一次复查时间。
3. 用户可以从观察池列表编辑复查频率，修改后调度配置和下一次复查时间正确更新。
4. 用户可以从观察池列表立即复查、暂停和恢复自动复查。
5. 编辑频率、暂停或恢复不会生成认知版本，也不会发送消息。
6. 认知无变化时追加历史版本，但不生成消息。
7. Thesis、风险、触发器或关键事实发生变化时生成未读消息。
8. 只有重大市场事件、没有确认认知变化时，也生成事件消息。
9. 同一事件的多来源信息能够合并去重。
10. 标的详情默认显示最新判断，历史页能按版本展示差异。
11. 点击未读消息后，消息转为已读并跳转到正确版本和区块。
12. 已读消息可以在已读 Tab 中继续查看。
13. 失败、证据不足或质量校验失败时，不写入半成品版本，也不生成消息。
14. 任务重试不会重复创建版本或消息。
