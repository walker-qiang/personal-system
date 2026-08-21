# Implementation Roadmap

## Purpose

This document turns the current design into an execution path.

首个 finance slice 后的修正：V1 实现边界现在以 `personal-os/docs/migration-boundary.md` 为准。下面较早的长期阶段仍是参考材料，但不能据此把 `personal-os` 扩成通用 capture 或 knowledge editor。当前工作中，`personal-os` 应保持聚焦：finance snapshot 输入、finance reads、cache/status checks，以及只读 finance Agent 辅助。

The goal is not to preserve the current repository layout. Existing projects are source material and reference implementations. The target system should be built around two clean boundaries:

- `personal-assets`: long-term private Git repository for facts, knowledge, skills, and source materials.
- `personal-os`: local/cloud application for operating `personal-assets`.

Finance is the first proving workflow because it is structured, testable, and already useful. It should validate the architecture, not define the whole system.

## Fixed Decisions for V1

Use these defaults unless real implementation friction proves otherwise.

| Topic | Decision | Reason |
|---|---|---|
| Source of truth | Git-backed text files in `personal-assets` | Portable, auditable, rebuildable |
| Runtime app | `personal-os` monorepo | One product boundary with multiple modules |
| Web | Vue + TypeScript + Vite | Reuse current strengths from `personal-web` |
| API / AssetStore | Go | Good fit for stable HTTP APIs, Git/file orchestration, SQLite, and current `personal-finance` code |
| Agent | Python, separate process | Better AI ecosystem; keeps model/runtime churn away from core writes |
| Durable writes | API-owned `AssetStore` only | Prevents Web, Agent, Codex, and tools from inventing different write behavior |
| Cache | Node-local SQLite + FTS first | Simple, fast, rebuildable |
| Sync | Scheduled pull + write-time final sync check | Enough for single-user multi-node usage |
| Cloud access | Tailscale first | Private single-user access without building account/auth infrastructure |
| Mobile | Deferred for V1 | Do not spend current work on phone browser handling; revisit responsive web/PWA only after desktop finance workflow is stable |
| Knowledge target name | `知识/` | Clearer long-term name than preserving `wiki/` as an architecture concept |
| Compatibility | No historical compatibility constraint | Migrate intentionally after the new path works |

Personal data and secrets may live in the private asset repository and sync across trusted nodes.

## What Not to Build First

Avoid these until real usage demands them:

- Multi-user account system.
- Real-time collaboration or automatic Git conflict merging.
- Offline write queue.
- Vector database as a required dependency.
- Mini program.
- Generic web file editor.
- Full migration of `obsidian-wiki` before the first working slice.
- Refactoring existing changed admin/management pages.
- Autonomous agent writes to durable knowledge without confirmation.

These are not rejected forever. They are rejected as first moves because they increase system surface before the core thesis is proven.

## Phase 0: Freeze the Target Shape

Outcome: the design is stable enough to create repositories.

Work:

1. Keep `personal-system/docs` as the planning source.
2. Treat `positioning.md`, `personal-assets-contract.md`, `assetstore-protocol.md`, and `personal-os-architecture.md` as the baseline contract.
3. Record architecture changes as new decision documents instead of repeatedly rewriting the entire design.

Acceptance:

- The target boundaries are clear.
- The first product slice is clear.
- The old repos are treated as inputs, not constraints.

## Phase 1: Create `personal-assets`

Outcome: an empty but valid private asset repository exists.

Recommended initial tree:

```text
personal-assets/
  README.md
  AGENTS.md
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
    实体/
  项目/
  长乐道/
  财富/
    资产/
    快照/
    交易/
    作废/
    报表/
    模式/
    审计/
    targets.yaml
  技能/
  附件/
  模板/
```

Work:

1. Add repo-level rules in `AGENTS.md`.
2. Add `.gitignore` for caches, local state, secrets, and generated artifacts.
3. Add initial finance schemas for asset and snapshot records.
4. Add one or two sample finance records by hand.
5. Add `system/rules/operating-principles.md`.

Acceptance:

- A clean clone of `personal-assets` is human-readable without any app.
- Sample finance records validate against schemas.
- No SQLite/cache/runtime files are committed.

## Phase 2: Create `personal-os`

Outcome: the app monorepo exists, with empty but enforceable boundaries.

Recommended initial tree:

```text
personal-os/
  README.md
  AGENTS.md
  apps/
    web/
    api/
    agent/
  packages/
    schemas/
    assetstore/
    finance-core/
    knowledge-core/
  tools/
    cli/
    doctor/
    migrate/
    cache-builders/
  deploy/
    local/
    cloud/
  docs/
```

Work:

1. Scaffold API in Go.
2. Scaffold Agent in Python, but keep it read-only at first.
3. Scaffold Web in Vue/TypeScript.
4. Add a local config convention that points to `personal-assets`.
5. Add `doctor` checks for repo path, Git status, cache path, and runtime versions.
6. Add a single dev command later, after the three processes can start independently.

Acceptance:

- `personal-os doctor` can explain whether the local node is ready.
- API can report health and sync status.
- Web can display system status from API.
- Agent exists but cannot write durable files.

## Phase 3: Finance Vertical Slice

Outcome: the first end-to-end path proves the architecture.

Scope:

```text
finance asset file
finance snapshot file
  -> finance cache builder
  -> SQLite cache
  -> API query endpoint
  -> Web holdings page
  -> Web snapshot entry
  -> AssetStore write
  -> Git commit/push
  -> cache rebuild
```

Work:

1. Define finance asset schema v1.
2. Define finance snapshot schema v1.
3. Define correction model v1:
   - append-only by default.
   - unsynced obvious mistakes may be edited.
   - synced mistakes should be corrected through full replacement facts linked by `correction_of`.
   - invalid synced facts should be excluded through explicit void records.
4. Build finance cache from files to SQLite.
5. Implement API read endpoints for assets, snapshots, holdings, and cache metadata.
6. Implement `finance.snapshot.create` through AssetStore.
7. Build Web pages for snapshot entry and holdings analysis.
8. Add tests around schema validation, cache rebuild, and write path.

Acceptance:

- A snapshot entered from Web becomes a Git commit in `personal-assets`.
- The same snapshot appears in Web after cache rebuild.
- A fresh clone can rebuild the same SQLite cache.
- If Git is dirty/diverged, the write stops clearly instead of guessing.

## Phase 4: Read-only Web Agent

Outcome: the self-built Agent becomes useful without owning state.

Work:

1. Give Agent tools for finance cache reads and knowledge search.
2. Route all durable writes through API, but keep write tools disabled initially.
3. Add trace logging for tool calls and retrieved context.
4. Use deterministic finance tools for numbers; LLM only explains.

Acceptance:

- Agent can answer questions about current finance data using cache-backed tools.
- Agent cannot write files directly.
- External model context is bounded and inspectable.

## Phase 5: Capture and Knowledge Ingest

Outcome: articles, notes, and raw materials can enter the system without corrupting durable knowledge.

Work:

1. Add `capture.inbox.create`.
2. Add `capture.raw.create`.
3. Add source metadata requirements.
4. Add a source-backed ingest workflow from `资料/` to `知识/`.
5. Migrate only a small representative subset from `obsidian-wiki`.

Acceptance:

- Captured material preserves original source.
- AI-created knowledge has source references.
- Weak or uncertain synthesis uses `status: draft`.

## Phase 6: Cloud Node

Outcome: the same system runs on a trusted private server.

Work:

1. Deploy `personal-os` on a cloud host.
2. Access through Tailscale first.
3. Clone full private `personal-assets` on the host.
4. Configure scoped Git credentials outside the repo.
5. Run scheduled pull and cache rebuild.
6. Allow Web writes only through AssetStore.

Acceptance:

- Cloud can read and write the same `personal-assets` repo.
- Cloud writes are committed with a distinct actor such as `web-cloud`.
- Secrets are not committed.
- If sync is blocked, UI shows the blocked state.

## Migration Order from Current Projects

Use current repos as inputs in this order:

1. `personal-finance`: mine finance concepts, SQLite/API behavior, and useful code.
2. `personal-web`: mine UI structure and finance/chat screens.
3. `personal-agent`: mine useful prompt/tool patterns after finance read APIs exist.
4. `obsidian-wiki`: migrate only after `知识/` ingest rules are working.
5. `personal-tools`: move or wrap capture tools only after AssetStore exists.
6. `openclaw-workspace`: keep experimental unless a concrete component is proven useful.

Do not migrate old structure wholesale.

Existing changed admin/management pages should keep their current behavior and layout during the first migration. Treat them as out of scope unless a later work package explicitly targets them.

## Immediate Next Work Package

The next concrete package should be:

1. Create the `personal-os` repository scaffold.
2. Build a read-only finance cache builder from `personal-assets/财富/**` to SQLite.
3. Reproduce legacy read API parity for assets, snapshots, holdings, and bucket targets.
4. Add doctor/status checks for asset repo path, source commit, and cache freshness.
5. Keep existing admin/management pages unchanged.

This package should stay read-only. AssetStore write operations come after cache/read parity is proven.

## Design Gaps to Close Next

These should be resolved while doing the immediate package:

1. Node-local config path convention.
2. Finance SQLite cache schema.
3. Generated numeric API IDs versus stable fact IDs.
4. Whether to use JSON Schema only, or JSON Schema plus generated Go/Python types.
