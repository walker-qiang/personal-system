# 投研分析质量闸门：当前进展与后续计划

更新时间：2026-08-31

## 一、专项目标

在 personal-assets 智能闭环自动化持续运行的基础上，保证手动和自动触发的
Deep Research 结果达到可用标准：

```text
数据源可追溯
    ↓
研究结果结构完整
    ↓
服务端最终质量校验
    ↓
macOS App 可读、可回读
    ↓
进入可恢复的自动化复查闭环
```

本专项不是放宽模型输出要求，而是把“研究结果能否落盘”从模型自报成功改为由 Agent 和 API 共同判定。

## 二、当前进展

### 1. 数据层基础已完成的部分

- A 股历史行情支持 WeStock / BaoStock 双源校验，并保留可信度语义。
- 删除不可稳定依赖的 Sina 网络 Provider，保留稳定 Provider 适配边界。
- A 股公告接入 CNINFO；港股接入 HKEXnews，并支持发行人 IR 官方页面回退。
- 结构化数据、原始 Provider 响应、来源元数据和官方正文证据分层保存。
- 财务报告支持多期保存、报告期规范化、原始值与计算值分离。
- 已建立 `research-data-acceptance.md`，记录真实数据集和生产门槛口径。

### 2. 研究结果质量闸门已实现的部分

`personal-agent` 已增加：

- schema v2、结果类型和必填字段校验；
- 研究日期不得早于报告期的校验；
- 指标、关键判断、风险、触发器、来源不得为空的校验；
- 来源必须包含真实 URL，并优先要求官方来源；
- 拦截 `map[...]` 等模型未展开的内部对象表示；
- 首轮结果不合格时自动发起一次结构化修复；
- 修复调用使用 JSON Schema 强制必填字段、数组最小数量、对象字段和真实 URL 形状；
- DeepSeek JSON 调用显式携带 schema 约束，不只依赖自然语言提示；
- 模型可见 evidence 对未官方对账报告只保留期间和状态，不提供具体财务数值；
- 最终结果确定性清理未对账期间的指标和叙事，并自动标注 estimated PE/PB；
- 字符串数组与对象数组的归一化；
- 同一用户/session 的 Deep Research single-flight，避免重复并发；
- Runtime 失败收尾的冲突保护，避免 `operation version conflict` 覆盖真实错误；
- 客户端显示具体校验错误，不再只显示“缺少 schema v2”。

`personal-os` 已增加：

- `researchcards.ValidateForPersistence` 最终持久化校验；
- `/api/investment/analysis` 写入前的质量闸门；
- 对未来报告期、空的 highlights/thesis/antithesis/risks/triggers、缺少官方来源的结果返回 HTTP 422 并拒绝保存。

## 三、已完成的验证

- personal-agent Python 定向测试：35/35 通过；全量测试 881 passed, 6 skipped。
- personal-os Go 全量测试：通过。
- macOS App Debug 构建：通过。
- API 负向回归：旧的错误研究结果会被 HTTP 422 拒绝保存。
- 真实数据层验收：6 个标的的核心财务事实已完成官方来源、报告期和单位对账，数据层生产门槛通过。
- 真实 Deep Research：五粮液和腾讯均完成证据预取、首轮失败识别、一次修复和最终质量校验；两者均返回完整 schema v2 结果并通过质量闸门。
- 真实 Deep Research：格力完成 10 个数据工具调用、一次结构化修复和最终质量校验，返回完整 schema v2 结果并通过质量闸门。
- durable 研究卡写回与 API 回读：五粮液、腾讯、格力均保存 schema v2 研究卡，AssetStore commit 和 API 回读均通过。
- macOS App 产品端验收：App 可正常打开，已确认研究卡和格力分析链路可用。

## 四、当前状态与未完成的门槛

真实 Deep Research 内容质量门槛、代表性研究卡的 durable 写回/API 回读，以及
macOS App 产品端验收均已通过。历史研究卡清理和 personal-assets 自动化投研
基础闭环也已完成：ReviewService 已负责到期发现、任务恢复、失败退避、研究卡
写回和消息投影。

当前未完成的是长期运行观察，以及更完整的 `review_version` / durable message
domain：当前实现仍以 schema v2 研究卡作为版本记录，并从相邻研究卡差异重建
消息投影。

因此当前状态是：

| 层级 | 状态 | 结论 |
| --- | --- | --- |
| 数据源与官方事实 | 通过 | 可以作为研究输入基础 |
| Agent 结构校验 | 通过 | 能识别并拒绝不完整结果 |
| API 持久化保护 | 通过 | 不完整结果不会写入研究卡 |
| 真实 Deep Research 内容质量 | 通过 | 五粮液、腾讯、格力真实请求均完成修复并通过 |
| API 实际写回与回读 | 通过 | 五粮液、腾讯、格力研究卡已通过 AssetStore 保存并可由 API 回读 |
| macOS App 产品端验收 | 通过 | App 可正常打开，研究卡和格力分析链路已完成验证 |
| 自动化 personal-assets 基础闭环 | 已实现 | ReviewService 已支持到期扫描、持久化任务、失败退避、研究卡写回和消息投影 |
| 完整 review version / message domain | 未实现 | 仍需评估独立版本模型、durable 消息事件、服务端已读状态和分页 |

此前确认的 3 张历史 schema v2 研究卡已通过独立 commit 清理；迁移过的旧研究卡又在
2026-08-30 的 A 股质量观察池重建中清理。本轮新增的研究卡均为通过质量闸门后的有效
写回；当前研究卡存量以 `personal-assets` 工作树为准，迁移和清理过程保留在 Git
历史及本目录的执行记录中。

## 五、后续计划

### Phase 1：修复质量修复闭环（已完成）

1. 已记录并检查首轮结果、修复提示和修复响应的结构化诊断信息。
2. 已增加 JSON Schema、最小数量约束、未对账证据隔离和确定性结果清理。
3. 修复失败时返回明确的质量错误，不继续尝试或伪装成成功。
4. 保持一次修复上限，避免无界模型调用和不可控 token 成本。

### Phase 2：真实数据验收与代表性写回（已完成）

1. 已使用五粮液和腾讯分别执行真实 Deep Research。
2. 已验证首轮失败能被识别，修复成功能通过，修复失败能清晰反馈。
3. 研究结果已确认包含实际日期、来源 URL、指标、风险和触发器。
4. 已将五粮液、腾讯研究结果通过 API-owned write path 写入并完成 API 回读。

### Phase 3：产品界面验收（已完成）

1. 已使用已保存的研究卡进行 macOS App 端到端验证。
2. 已确认 App 可正常打开，研究卡和格力分析链路可用。
3. 已确认新生成的研究不需要历史数据重跑即可使用新展示逻辑。

### Phase 4：生产准入与自动化（基础闭环已完成）

Phase 1～3 已全部通过，自动化基础闭环已落地：

- ReviewService 按观察池计划发现到期标的，并将任务状态保存到
  `var/automation/reviews.sqlite`；
- 自动复查调用 `personal-agent` 的 `deep_research` 模式；
- 研究结果继续通过质量闸门后，经 API-owned write path 写入 schema v2 研究卡；
- 失败任务按退避策略重试，不写入半成品研究卡；
- 成功写回后由相邻研究卡差异生成消息投影，macOS App 在本地维护已读状态。

后续重点：

- 观察消息摘要质量、失败重试和真实复查成本；
- 评估是否需要把当前研究卡历史和消息投影升级为独立的
  `review_version` 与 durable message domain。

## 六、提交边界

本次提交只包含：

- personal-agent 的研究质量校验、修复闭环、证据隔离、Runtime 错误保护及其相关测试；
- personal-os 的研究卡最终校验、数据源适配和相关测试/文档；
- 本文档和已有研究数据验收文档。

不包含：

- `personal-assets` 的日常未提交内容；
- SQLite、日志、缓存、运行态文件；
- 本轮真实测试产生的无效研究卡清理；
- 未经单独确认的 research card durable 写回。
