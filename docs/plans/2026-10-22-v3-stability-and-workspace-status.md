# V3 稳定性验证与工作区状态收口

日期：2026-10-22。初始验收阶段已确认修改 `personal-system`、`personal-os`、
`personal-agent` 当前 `master`。初始验收结束时尚未安装 App、提交或推送；
后续用户明确要求替换旧版 App，并将本项目及子项目的全部改动提交到远程。

## 范围与完成标准

1. 只读核实源码、已安装 App、后台进程及真实任务状态，不把文件时间戳当作版本证明。
2. 使用现有隔离验收验证连续研究、证据复用、任务恢复、预算和用户编辑保护。
3. 按证据更新项目进度、已知问题、项目清单及与当前实现冲突的架构描述。
4. 核实研究证据缺口、组合核算与微信剪藏验收状态，只记录本轮未实施部分。

不新增单元测试，不默认运行完整 UI E2E。隔离核实阶段对 `personal-assets`、
`personal-tools` 只读；交付阶段仅推送 `personal-assets` 已有提交，未修改其内容。
真实模型调用和真实资产写回不包含在隔离验证及本次交付中。

## 核实基线

- 工作区：`/Users/qiang.lilq/personal-system`。本轮不代表另一台电脑的状态。
- 顶层、`personal-os`、`personal-agent` 初始分支均为 `master`，工作区干净。
- `personal-os`：`1e49108`，统一股票/基金 V3、研究有效性及结果错误分类。
- `personal-agent`：`ea64ce0`，保留引用修复前后诊断，严格区分漏项与无效引用。
- `personal-assets`：`22f2dbbc3fa88a1ff0fdca8c5aad771cb57090ee`，
  HEAD tree 为 `ef6aafd0c37c14eb29febf1ad449b7000ff078e9`，初始工作区干净。
- `personal-tools`：`db50105`，工作区干净。
- 初始核实时上述仓库均未显示相对本地 `origin/master` 的 ahead/behind；随后已
  fetch 实时远端并逐仓比较。该核实只代表当前机器，不代表另一台电脑状态。

## 运行版本

- 初始核实时未发现筋斗云、项目 API 或 Agent；7001、7101 无监听。
  服务未运行不等于启动故障；后续仅按用户要求由 App 部署脚本启动服务栈。
- 已安装 App：`/Applications/筋斗云.app`，可执行文件时间为 2026-10-18 17:13，
  SHA-256 为 `f06b82515e8843d57391e57863f87a1c0e87bfc1d0d73cfb30ffa3fafb008a5e`。
- 旧 API 产物 `/private/tmp/personal-os-dev/personal-os-api` 的 Go build info
  为 `6b932b1` 且 `vcs.modified=true`；不能据此把该产物等同于当前提交。
- 初始安装包没有可核实的源码 revision 证明；不同构建的 hash 不同也不能单独证明
  功能新旧。后续部署记录与新安装包 hash 见本文末尾。
- 正常产品生命周期由 App 托管；退出 App 会停止托管的 API、Agent 和 ReviewService。
  手工运行 `tools/dev` 的 launchd 后台模式是另一个显式开发入口。

## 隔离验证

使用 Go 1.19.13、Python 3.13.7 和 Xcode 的 macOS App target。

- Go 全量 `go test ./...`、`go vet ./...` 与 API 构建通过。
  首次沙箱运行因禁止监听临时端口失败，授权沙箱外重跑后通过。
- Agent 默认 `pytest -q`：`927 passed, 20 deselected`；本轮未重跑可选 RAG 集成测试。
- Agent 既有 V3 协议验收通过：两阶段综合、一次有界修复、精确引用、范围覆盖、
  预算失败关闭、权限与持仓上下文隔离、诊断限量及脱敏，真实模型调用为 0。
- 原有跨仓隔离验收通过：股票与基金、纯数字基金身份、迁移预览、partial 保护、
  写回失败及 checkpoint 恢复、用户编辑保护、结果复用与显式重跑。
- 扩展同一验收脚本并通过跨仓隔离验收：连续回合复用相同证据、待回答问题进入后续
  计划、恢复不重复生成 episode；删除临时行情缓存、移走临时 PDF 缓存并重启 API 后，
  commit、Thesis、episode 和 evidence 的回读保持一致，模型调用数不增加。
- 扩展后的单仓假 Agent 模式也通过，保持原验收脚本两种模式可用。
- macOS App target Build 通过，产物写入 `/private/tmp/personal-system-20261022-xcode/`。
  初始隔离验收阶段未安装、未启动 App、未执行 UI E2E。CoreSimulator 版本警告不阻止
  macOS target 构建。

主要命令：

```bash
GOCACHE=/private/tmp/personal-system-20261022-go-cache GOPROXY=off go test ./...
GOCACHE=/private/tmp/personal-system-20261022-go-cache GOPROXY=off go vet ./...
GOCACHE=/private/tmp/personal-system-20261022-go-cache GOPROXY=off \
  go build -o /private/tmp/personal-system-20261022-review-api ./apps/api
REVIEW_API_BINARY=/private/tmp/personal-system-20261022-review-api \
  DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  ../personal-agent/.venv/bin/python tools/acceptance/stock_research_v3.py --cross-repo
```

以上在 `personal-os` 执行；Agent 验证在 `personal-agent` 执行：

```bash
./.venv/bin/python -m pytest -q
PYTHONPATH=src ./.venv/bin/python tools/acceptance/stock_research_v3.py
```

App 仅构建、不安装，命令在 `personal-os` 执行：

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -project apps/mac/JinDouYunMac.xcodeproj -target JinDouYunMac \
  -configuration Debug ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  SYMROOT=/private/tmp/personal-system-20261022-xcode/products \
  OBJROOT=/private/tmp/personal-system-20261022-xcode/intermediates \
  CODE_SIGNING_ALLOWED=NO build -quiet
```

## 剩余事项

- 真实 V3 复查仍待授权；真实验证应先指定一个标的、外发字段及 Token 硬预算，
  再检查完成状态、逐项核验、引用、未解决问题和 API 回读。
- 真实任务库只读统计为 92 条：股票 52 成功、16 失败、7 取消，基金 12 成功、
  5 失败，活跃 0。累计失败数不是当前故障数，本轮不改写或自动重试历史任务。
- 华能水电既有成功回合仍保留待回答问题，且没有新版 `claim_checks` /
  `research_result`；不能把旧 `complete` 当作已经逐项校准。
- 跨资产组合核算及更多成本口径仍是独立后续需求；单资产收益和手动现金流能力已存在。
- 微信剪藏真实验收记录与主进度存在差异；本轮不操作 Chrome、不改扩展及权限，
  待用户确认本机验收再补右键域限制、目录权限持久化、图片路径和网络异常记录。
- 另一台电脑的历史资产同步状态必须在原机核实，不能继续套用其旧 HEAD 到本机。

## 交付与安全检查

- 业务逻辑未修改；仅扩展既有 acceptance 脚本，并更新三个已授权仓库的文档与运行图。
- Markdown 本地链接、`workspace.yaml` 与项目目录、SVG XML 检查通过；
  运行图已生成本地 PNG 做视觉检查。三个仓库的 `git diff --check` 均通过。
- 隔离验收阶段未修改真实数据、未调用真实模型；真实任务当时为 92 条、活跃 0。
- 隔离验收之后的部署与 Git 交付结果见下节；真实模型效果和 Chrome 实机验收仍未完成。

## 后续交付（2026-10-22）

- 按 `personal-os/tools/deploy-mac-app.sh` 重建并替换
  `/Applications/筋斗云.app`，随后启动成功。安装包可执行文件 SHA-256：
  `42543cdf2c91466bb374c865df107690cd3d09404c5cbfc21bccb27c928426dd`。
- App 启动日志确认 API 从当前工作区源码重新构建，`personal-os dev stack ready`；
  supervisor 的 API/Agent 健康检查通过。部署脚本确认恰有一个已安装 App 进程。
- 已 fetch 远端并在 `master` 上逐仓提交/推送，无强推：
  - `personal-os`: `ae628d7` (`feat(research): add preflight and bounded follow-up`)
  - `personal-agent`: `97fec2c` (`docs(research): document unified investment v3`)
  - `personal-assets`: 推送原有提交 `8c83091` (`investment: research sh600025`)
  - `personal-system`: 本记录及状态文档随本仓提交推送
  - `personal-tools`: 工作区干净，无需提交
- 本次未调用真实模型、未新增或修改真实资产数据；`personal-assets` 仅推送既有提交。
- 现在可直接打开已安装的筋斗云 App 测试；真实 V3 研究仍按授权范围、资料权限和预算执行。
