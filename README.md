# personal-system

`personal-system` 是个人系统的长期工作区根目录。

顶层目录本身是 workspace / governance 仓：它记录系统定位、迁移边界、子项目清单、规划文档和少量迁移工具。具体长期项目仍然使用各自独立的 Git 仓库。

## 工作区原则

- 长期维护项目都收敛到 `/Users/qiang.lilq/personal-system` 下。
- 顶层 Git 只跟踪治理材料：`README.md`、`AGENTS.md`、`workspace.yaml`、`docs/**`、`tools/**`。
- 子项目独立 Git 跟踪，不使用 submodule。
- 顶层 Git 不跟踪子项目源码目录、cache、SQLite、logs、`.env`、`node_modules`、`dist` 等运行态。
- `personal-assets` 是 durable source of truth。
- `personal-os` V1 是投资快照操作应用，不替代 Obsidian。

## 当前子项目

- [personal-assets](personal-assets/)：长期数据与知识资产仓，独立 Git repo。
- [personal-os](personal-os/)：投资快照应用，独立 Git repo。
- `personal-tools`：长期工具仓，计划迁入 `/Users/qiang.lilq/personal-system/personal-tools` 后继续作为独立 Git repo。

更多状态见 [workspace.yaml](workspace.yaml)。

## 顶层工具

- [finance_csv_migration_check.py](tools/finance_csv_migration_check.py)：legacy finance CSV 迁移前检查。
- [migrate_finance_csv.py](tools/migrate_finance_csv.py)：将 legacy CSV exports 迁移到 `personal-assets` finance facts。
- [finance_migration_parity_check.py](tools/finance_migration_parity_check.py)：迁移后与 legacy holdings / snapshots 做 parity check。

这些工具属于迁移和治理辅助，不是 `personal-os` 的长期运行入口。

## 设计文档

- [文档索引](docs/README.md)
- [定位](docs/positioning.md)
- [personal-assets 契约](docs/personal-assets-contract.md)
- [AssetStore 协议](docs/assetstore-protocol.md)
- [personal-os 架构](docs/personal-os-architecture.md)
- [实施路线图](docs/implementation-roadmap.md)
- [Finance Fact Model V1](docs/finance-fact-model-v1.md)
- [Finance CSV 迁移映射](docs/finance-csv-migration-mapping.md)

V1 实现边界以 [personal-os/docs/migration-boundary.md](personal-os/docs/migration-boundary.md) 为准。
