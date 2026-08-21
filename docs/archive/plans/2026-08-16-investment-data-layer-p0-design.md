# 投研数据层 P0 实施设计

> 状态：P0 数据层已完成，生产 Golden 门槛通过；公告正文仍按需核验
> 范围：`personal-os` 研究数据工具、`personal-agent` 工具契约、投研来源注册表
> 目标市场：A 股、港股
> 数据原则：官方披露优先，结构化数据可替换，所有核心事实可追溯

## 1. 背景与目标

现有股票研究已经能够识别数据不足，但数据层存在四类根因：多期财务被压缩为最新摘要、来源日期和正文核验结果丢失、行情与财务的 stale 语义不一致、市场代码和同业配置错误。

本次 P0 的目标是让手动研究具备“拿得到、说得清、能追溯、缺失时安全降级”的数据基础。P0 不追求覆盖所有市场和行业，也不把 LLM 变成数据计算器。

## 2. 架构边界

```text
Provider / official fetcher
        -> personal-os normalization
        -> quality / provenance envelope
        -> personal-os research tools
        -> personal-agent orchestration
        -> personal-assets research card
```

- `personal-assets` 继续是 durable source of truth。
- `personal-os` 负责 Provider、标准化、质量检查和只读工具 API。
- `personal-agent` 只消费工具结果和执行研究流程，不直接访问 Provider。
- SQLite 只保存可重建的运行态缓存、原始响应和抓取元数据，不新增第二套长期事实源。
- Provider 原始响应写入 `var/cache/research.sqlite` 的 `raw_provider_responses`，按响应 SHA-256 去重；该库可删除、可重建，不进入 `personal-assets`。
- 不新建独立 `stock-ai` 服务，不引入 Postgres，不实现美股、交易下单或 Level-2。

## 3. P0 数据契约

所有研究数据工具使用统一的顶层语义：

```json
{
  "success": true,
  "data": {},
  "metadata": {
    "provider": "westock-data",
    "upstream_source": "normalized-provider",
    "as_of": "2026-08-14",
    "fetched_at": "2026-08-16T10:00:00+08:00",
    "confidence": "MEDIUM",
    "freshness": "aging",
    "warnings": []
  },
  "errors": []
}
```

核心数据必须明确区分：

- `reported`：报告直接披露的原始事实；
- `calculated`：程序基于披露事实计算；
- `estimated`：包含假设的估算；
- `unavailable`：无法可靠取得；
- `conflict`：不同来源经标准化后仍冲突。

## 4. 证券标识

P0 继续兼容现有 personal-os 代码格式，同时在工具输出中补充规范化字段：

```text
sh600519 -> canonical_symbol=600519.SH, market=A, currency=CNY
hk00700 -> canonical_symbol=00700.HK, market=HK, currency=HKD
```

`us*` 不再映射为 `gb_*`。P0 对美股返回明确的 unsupported，而不是生成错误的市场请求。

公司与证券分离暂以工具响应字段实现，不提前建立独立证券主数据服务；后续若需要支持同一公司多地上市，再抽取持久化 `company/security` 模型。

## 5. 财务数据契约

`personal_os.financials` 保留 `latest` 方便现有调用，但新增完整 `reports`：

```json
{
  "data": {
    "latest": {},
    "reports": [
      {
        "period_start": "2025-01-01",
        "period_end": "2025-12-31",
        "period_type": "FY",
        "report_type": "annual",
        "reported_at": "2026-03-25",
        "currency": "CNY",
        "unit": "yuan",
        "statements": {
          "income": {},
          "balance_sheet": {},
          "cash_flow": {}
        },
        "source": {},
        "data_type": "reported"
      }
    ],
    "metadata": {
      "period_count": 4,
      "latest_report_period": "2025-12-31",
      "stale": true
    }
  }
}
```

标准化层必须保留原始报告期、披露日期、币种和单位；不能把季度累计值当作单季值，也不能把计算出的 FCFE/FCFF 当作报告原值。

## 6. 来源与正文核验

- 来源注册表补充 A 股、港股重点公司 IR 与官方披露域名。
- 搜索结果状态为 `discovered`，不能直接作为已核验事实。
- `web_fetch` 成功抓取且正文识别出报告期后，状态才为 `verified`。
- WeStock 财务报告在尚未关联官方文件前明确标记为 `source_verification=unverified`；数字完整不等于来源已核验。
- 年度官方报告完成抓取和三项核心事实抽取后，升级为 `source_verification=reconciled`；`provenance_ready=true` 只在官方来源、报告期、单位和数值对账均通过时返回。
- `official_facts` 保存完整 PDF 文本中的行标签、证据行、官方单位/缩放因子和结构化 Provider 值，避免把大 PDF 的截断正文误当成完整证据。
- 搜索结果和正文来源都必须保留 URL、来源级别、报告期、发布日期、抓取时间、内容类型和核验状态。
- 缺失日期使用空值，不使用 `0001-01-01` 占位。
- `GET /api/tools/market/announcements` 只返回官方公告候选：A 股限定 CNINFO，港股限定 HKEXnews；候选状态为 `discovered`，必须继续抓取正文并识别报告期后才能升级为 `verified`。

## 7. 行情、估值和同业

- 行情返回 `as_of`、`fetched_at`、`stale/freshness`、币种和 Provider。
- `personal_os.price_history` 返回明确复权口径的日线数据；A 股默认执行 WeStock 与 BaoStock 收盘价交叉校验，差异超过 1% 标记 `conflict`，BaoStock 不可用标记 `provider_unavailable`。
- 估值引用同一请求中的行情和财务快照；财务过期或报告期未知时不得返回看似当前的 PE/PB。
- 同业未配置返回 `status=not_configured`，不返回系统错误 404；Agent 不得自行猜测同业名单。
- 行情 Provider、财务 Provider 和官方披露 Provider 保持可替换，P0 先修复现有 Provider 契约，不在本次强制替换全部来源。

## 8. 研究质量闸门

至少满足以下条件，研究才允许进入可用深度分析：

1. 证券身份和市场已确认；
2. 行情存在且有数据时间；
3. 至少一个明确报告期的财务来源；
4. 关键指标带期间、币种、单位和来源；
5. 财务数据未过期，或已明确取得更近的官方公告并完成正文核验；
6. 股票研究至少有一份来源级别为 official 且 `verification_status=verified` 的正文证据；若财务工具已返回 `source_verification=reconciled`，财务核心事实可直接使用其官方事实证据；公告正文仍需单独核验；
7. 估值输入均可追溯。

不满足时，工具仍可返回可用缺口信息，但研究卡必须保持 `incomplete / low / research before action`，不得生成完整 Thesis。

## 9. 实施顺序与验收

1. 先修改 `personal-os` 财务返回契约和市场代码校验；
2. 修复来源日期、正文来源回填和同业未配置语义；
3. 更新 `personal-agent` 工具描述和研究归一化，确保不把空值、过期值和计算值包装成事实；
4. 建立 `testdata/research/golden-dataset.yaml`，固定 3 只 A 股和 3 只港股的身份、币种、报告字段、官方来源域名和第二来源校验要求；
5. 使用 Golden Dataset 验收器检查证券身份、行情时间、历史行情双源状态、多期财务、报告期间、币种、单位、reported/calculated 分离和官方来源域名；
6. 重新生成研究报告前，先比较工具输出的 `reports`、来源、freshness 和质量状态。

验收重点：多期财务真实返回、无零日期、官方正文来源可追溯、peers 未配置不再 404、过期财务不会产生无标记当前估值、A/H 代码不混淆。

2026-08-17 真实验收结果：6 个标的结构契约 6/6、官方文档核验 6/6、报告期匹配 6/6、三项核心官方事实 6/6、生产门槛 6/6。阿里巴巴按 3 月 31 日财年对账，腾讯和中国移动按 12 月 31 日财年对账。A 股第二来源 3/3 为 `pass`。

当前 Golden Dataset 中 A 股第二来源状态仍为 `implemented_optional`；适配器已经接入，运行环境缺少 BaoStock 时不能标记为最高可信度。本轮通过的是“核心财务数据层生产门槛”，不等同于公告全文自动核验、完整估值模型或自动写回。

BaoStock 适配器位于 `tools/providers/baostock_history.py`，运行环境默认使用被 `var/` 忽略的 `var/baostock-venv`，也可通过 `BAOSTOCK_PYTHON` 覆盖。未安装 `baostock` 时服务仍可返回主行情，但质量状态必须保留为 `provider_unavailable`，不能降级为 `pass`。

## 10. 观察标的 durable facts（P1）

P0 的 SQLite 仍只保存可重建的 Provider 原始响应和运行态缓存；在 P1 中，经过官方
正文核验和逐项对账的报告事实可以显式固化到：

```text
personal-assets/财富/投研/标的/<code>/
  profile.yaml
  reports/<period>-<report_type>.yaml
```

固化入口为 `POST /api/investment/facts/materialize`，不是每次查询自动写入。它只接受
服务端研究缓存中已验证且完成 `reconciled` 的 `reported` 报告，要求报告期、币种、单位、
来源 URL 与 reconciliation 记录匹配且至少三项 `official_facts` 存在。实时行情、未核验结构化数据、计算指标和
LLM 判断继续留在 SQLite 或研究卡中。重复事实幂等跳过，修订通过新版本文件追加，不
覆盖历史。所有 durable write 经过 AssetStore 锁、目标路径级预检和本地 Git commit；
目标路径有修改、仓库存在已暂存变更或合并状态时拒绝，不自动 push，也不混入其他目录
的用户未暂存修改。

这使 `personal-assets` 成为观察标的的小样本事实库，而不是行情缓存或第二个 Provider
数据库。`财富/投研/研究/` 继续保存分析卡，`标的/` 只保存可复用、可追溯的结构化事实。

## 11. 明确延期

- 美股财报 Provider 和 SEC/公司 IR 适配（行情和证券搜索已由 WeStock 覆盖）；
- 行业专属数据包；
- 完整 TTM/FCFF/Owner Earnings 计算引擎；
- 自动公告下载、全文索引和 RAG；
- 个人资产自动写回和自动化投研闭环。
