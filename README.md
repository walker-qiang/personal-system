# personal-system

`personal-system` 是个人系统的长期工作区根目录。

顶层目录本身是 workspace / governance 仓：它记录系统定位、迁移边界、子项目清单、规划文档和少量迁移工具。具体长期项目仍然使用各自独立的 Git 仓库。

## 工作区原则

- 长期维护项目都收敛到 `/Users/qiang.lilq/personal-system` 下。
- 顶层 Git 只跟踪治理材料：`README.md`、`AGENTS.md`、`workspace.yaml`、`docs/**`、`tools/**`。
- 子项目独立 Git 跟踪，不使用 submodule。
- 顶层 Git 不跟踪子项目源码目录、cache、SQLite、logs、`.env`、`node_modules`、`dist` 等运行态。
- `personal-assets` 是 durable source of truth。
- `personal-os` V1 是投资快照、投研数据和个人助理工作台，不替代 Obsidian。

## 当前子项目

- [personal-assets](personal-assets/)：长期数据与知识资产仓，独立 Git repo。
- [personal-os](personal-os/)：投资与个人助理工作台，包含持久化自动投研后台，独立 Git repo。
- [personal-agent](personal-agent/)：独立 Python Agent Runtime 和应用服务，独立 Git repo。
- [personal-tools](personal-tools/)：可复用工具、MCP server、脚本和自动化，独立 Git repo。

更多状态见 [workspace.yaml](workspace.yaml)。
建设进度见 [目标项目进度](docs/project-progress.md)。

## 设计文档

- [文档索引](docs/README.md)
- [personal-system 最新设计](docs/personal-system-design.md)
- [目标项目进度](docs/project-progress.md)
- [personal-assets 契约](docs/personal-assets-contract.md)
- [AssetStore 协议](docs/assetstore-protocol.md)
- [Finance Fact Model V1](docs/finance-fact-model-v1.md)
- [投研质量闸门进展](docs/research-quality-gate-progress.md)
- [历史文档归档](docs/archive/README.md)

V1 实现边界以 [personal-os/docs/migration-boundary.md](personal-os/docs/migration-boundary.md) 为准。
