# 文档索引

本目录保存 `personal-system` 的定位、架构、契约、迁移和进度文档。

## 首要入口

1. [personal-system 最新设计](personal-system-design.md)：当前唯一的全局 canonical 架构基线。
2. [personal-os V1 迁移边界](../personal-os/docs/migration-boundary.md)：约束当前产品实现范围。
3. [目标项目进度](project-progress.md)：各长期仓库和迁移来源的当前状态。

长期目标不自动扩大 V1：当前 `personal-os` 仍是投资快照和个人助理工作台；broader knowledge 主要通过 Obsidian 维护。

## 核心契约

1. [personal-assets Contract](personal-assets-contract.md)
2. [AssetStore Protocol](assetstore-protocol.md)
3. [Finance Fact Model V1](finance-fact-model-v1.md)
4. [Finance CSV Migration Mapping](finance-csv-migration-mapping.md)

## 子系统设计

1. [personal-os Architecture](personal-os-architecture.md)：早期/V1 架构参考，最新全局边界以 canonical 文档为准。
2. [personal-agent 系统架构](../personal-agent/docs/architecture.md)
3. [Agent Runtime 加固设计与验收](plans/2026-08-14-agent-runtime-hardening-design.md)
4. [投研数据层 P0 实施设计](plans/2026-08-16-investment-data-layer-p0-design.md)
5. [Pi-Agent 借鉴设计](../personal-agent/docs/matrix-pi-borrow-design.md)

## 历史定位、路线和迁移记录

1. [Positioning](positioning.md)
2. [Implementation Roadmap](implementation-roadmap.md)
3. [obsidian-wiki 到 personal-assets 迁移执行记录](obsidian-wiki-to-personal-assets-migration.md)

历史文档用于解释决策演进；若与当前仓库状态或全局架构冲突，以 [personal-system 最新设计](personal-system-design.md) 为准。
