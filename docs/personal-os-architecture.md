# personal-os Architecture

## Purpose

`personal-os` is the local/cloud application for operating `personal-assets`.

It is a product boundary, not a single-language or single-process mandate. Its job is to provide the website, structured APIs, AI chat/runtime, cache builders, sync tooling, diagnostics, and deployment shape around the private Git-backed asset repository.

`personal-os` owns runtime behavior. `personal-assets` owns long-term truth.

## Positioning

`personal-os` should make the private asset layer usable every day:

- Record structured facts, starting with finance snapshots and transactions.
- Browse and analyze personal data.
- Search and organize knowledge.
- Run AI-assisted workflows through Codex, Trae, and the Web Agent.
- Coordinate scheduled Git sync and write-before-sync checks.
- Rebuild local caches from `personal-assets`.
- Run locally and on a trusted cloud node.

## Non-goals

`personal-os` is not:

- A public SaaS.
- A multi-user collaboration system.
- The source of truth for durable data.
- A replacement for Git.
- A replacement for Codex/Trae in deep maintenance workflows.
- A mobile mini program in v1.

## Repository Model

Use a monorepo:

```text
personal-os/
  README.md
  AGENTS.md

  apps/
    web/                    # Browser UI, responsive/PWA-ready
    api/                    # HTTP API, AssetStore service, cache query API
    agent/                  # Web Agent runtime and model/tool orchestration

  packages/
    schemas/                # Shared JSON Schema, OpenAPI, generated DTOs
    assetstore/             # Core write/sync library used by api/CLI
    finance-core/           # Finance parsing, validation, effective-state calculations
    knowledge-core/         # Knowledge metadata, source refs, indexing helpers

  tools/
    cli/                    # personal-os command
    doctor/                 # Diagnostics
    migrate/                # One-time migration tools from current repos
    cache-builders/         # Rebuild finance DB, FTS, optional vector index

  deploy/
    local/                  # launchd/dev scripts
    cloud/                  # server config, reverse proxy notes, systemd/containers

  docs/
    architecture.md
    operations.md
    api.md
```

This layout keeps one product boundary while allowing the right language for each module.

## Recommended Technology Shape

Do not force one language.

Recommended v1 shape:

| Area | Recommended Stack | Reason |
|---|---|---|
| Web UI | Vue + TypeScript + Vite | Matches current `personal-web`; fast local UI iteration |
| API / AssetStore service | Go | Strong fit for stable APIs, file/Git orchestration, SQLite, and existing `personal-finance` experience |
| Agent runtime | Python, separate process | LLM/agent ecosystem is better; separation keeps model/runtime churn away from core writes |
| Schemas | JSON Schema + OpenAPI | Shared contract for Web/API/cache builders |
| Finance cache | SQLite | Local query cache, not source of truth |
| Search cache | SQLite FTS first | Simple, rebuildable, good enough before vector search |

The boundary is more important than the language choice, but v1 should use Go for the API/AssetStore path and Python for the Agent path. Web, API, Agent, AssetStore, and cache builders remain distinct modules even when local development starts them together.

## Runtime Topology

### Local Node

```text
Browser
  -> web dev server or built static UI
  -> api service
      -> AssetStore
      -> local caches
      -> personal-assets checkout
  -> agent service/runtime
      -> tools through api/cache/AssetStore
```

Local development may run three processes:

- `web`: frontend dev server.
- `api`: structured API + AssetStore service + cache query API.
- `agent`: AI runtime.

A single `personal-os dev` command should start them all.

### Cloud Node

```text
Browser / mobile browser
  -> trusted access layer
  -> web
  -> api
      -> AssetStore
      -> local caches
      -> personal-assets checkout
  -> agent runtime
```

Cloud is a trusted private node, not a new source of truth.

Minimum cloud assumptions:

- Full private `personal-assets` checkout may be synced.
- External authentication is required.
- Secrets live outside Git.
- Git credential is scoped to `personal-assets`.
- Scheduled pull and cache rebuild run on the cloud node.

## Process Boundaries

### `apps/web`

Responsibilities:

- Daily operating console.
- Finance pages: assets, snapshots, transactions, holdings, analysis.
- Knowledge pages: search, source browsing, ingest status, reports.
- AI chat surface.
- Sync/cache status indicators.
- Responsive mobile web/PWA experience.

Rules:

- Web does not write files directly.
- Web calls `api`.
- Web should show whether data is fresh, stale, syncing, or blocked.
- Web should not expose a generic file editor in v1.

### `apps/api`

Responsibilities:

- HTTP API for Web and Agent.
- Owns `AssetStore` service boundary.
- Serves cache-backed query endpoints.
- Validates structured write requests.
- Triggers cache rebuilds.
- Reports sync and doctor status.

Recommended endpoint groups:

```text
/api/system/health
/api/system/sync/status
/api/system/cache/status

/api/finance/assets
/api/finance/snapshots
/api/finance/transactions
/api/finance/holdings
/api/finance/analysis

/api/knowledge/search
/api/knowledge/pages
/api/capture/inbox

/api/agent/chat
```

The API can call the agent runtime internally or proxy to a separate `apps/agent` process.

### `apps/agent`

Responsibilities:

- Web Agent experiment surface.
- Chat orchestration.
- Tool selection and tracing.
- Model provider adapters.
- Read-heavy finance and knowledge Q&A.
- Controlled writes through API/AssetStore only.

Initial permission ladder:

1. Read-only chat over finance cache and knowledge search.
2. Low-risk writes: create inbox/capture records.
3. Structured writes: create finance snapshots or transactions.
4. Draft writes: create knowledge/report drafts.
5. Durable knowledge writes only after explicit confirmation.

Rules:

- Agent does not own long-term memory outside `personal-assets`.
- Agent does not write files directly.
- Agent does not bypass AssetStore.
- For finance analysis, deterministic tools produce numbers; the model explains results.
- External model calls use minimal retrieved context.

### `packages/assetstore`

Responsibilities:

- Core Git-backed write protocol.
- Operation allowlists.
- Input validation hooks.
- Commit planning.
- Local lock.
- Sync status.
- Runtime logging.

`assetstore` should exist as a reusable package, but product runtime should expose one authoritative service through `apps/api`. This avoids Web/API/Agent each inventing slightly different Git behavior.

### `packages/finance-core`

Responsibilities:

- Parse finance fact files.
- Validate finance schemas.
- Build effective state from append-only facts.
- Handle corrections/voids.
- Compute deterministic metrics.
- Feed finance SQLite cache builder.

This package must not depend on the Web UI or Agent runtime.

### `packages/knowledge-core`

Responsibilities:

- Parse Markdown/frontmatter.
- Validate source refs.
- Manage knowledge metadata.
- Feed FTS/index builders.
- Support ingest workflows.

This package should stay conservative. It should not become an autonomous ontology engine before real usage demands it.

### `tools/cli`

`personal-os` CLI should be the operator interface:

```bash
personal-os dev
personal-os sync status
personal-os sync pull
personal-os cache rebuild
personal-os doctor
personal-os write --operation finance.snapshot.create --payload payload.json
```

The CLI and API should share the same implementation, not duplicate protocol logic.

## Data and Cache Flow

### Read Flow

```text
personal-assets files
  -> cache builders
  -> SQLite / FTS / optional vector cache
  -> api query endpoints
  -> web / agent
```

Read endpoints should include cache metadata:

- source commit SHA.
- cache build time.
- stale flag.
- rebuild failure state.

### Write Flow

```text
web / agent / cli
  -> api
  -> AssetStore operation
  -> personal-assets files
  -> git commit + push
  -> cache rebuild
  -> response
```

In v1, product writes require an online Git path. If sync fails or branches diverge, the write stops and asks for manual resolution.

## Sync Strategy

This is a single-user multi-node system.

Use simple scheduled sync:

- Background fetch/pull every 5-30 minutes.
- Pull only when the worktree is clean and can fast-forward.
- Rebuild caches after HEAD changes.
- Product writes do a final sync check before writing.
- Divergence/conflicts stop and require manual Git resolution.

Do not build offline write queues or auto-merge logic in v1.

## Cloud Security

Because cloud can write the private asset layer, v1 must have a real access boundary.

Recommended:

- Use Tailscale first.
- Do not build a full user/account system.
- Use a Git deploy key or machine credential scoped to `personal-assets`.
- Store model keys and other secrets outside Git.
- Log cloud writes as `web-cloud` or another explicit actor.

The cloud node may sync the full private repository if the host and access layer are trusted.

Cloudflare Access can be considered later if a public domain with browser-based identity becomes more useful than private-device access.

## AI and Model Policy

Private data may live in `personal-assets`, but model calls still need minimization.

Rules:

- Retrieve only the minimum relevant context.
- Do not send whole repo context to external models.
- Prefer deterministic tools for finance calculations.
- Keep prompt traces and tool traces local unless explicitly exported.
- Web Agent write permissions should be feature-gated.
- Codex/Trae remain the main deep-maintenance entry points.

The policy should be practical, not bureaucratic. The goal is to avoid accidental broad exfiltration, not to block normal use.

## First Product Slice

Start with one end-to-end slice:

1. `personal-assets` finance schema for asset + snapshot.
2. `personal-os` cache builder from finance files to SQLite.
3. Web page to record a snapshot.
4. AssetStore write operation for `finance.snapshot.create`.
5. Git commit/push.
6. Cache rebuild.
7. Holdings/analysis page reads from cache.

This validates the core thesis: Git-backed text facts as SoT, app cache for UX, Web writes through AssetStore.

## Migration Strategy

Do not migrate everything before the first slice works.

Recommended order:

1. Create empty `personal-assets` with contracts, schemas, and a small finance sample.
2. Create `personal-os` skeleton and finance cache builder.
3. Migrate current finance assets/snapshots into new fact files.
4. Rebuild current finance UI against the new API/cache.
5. Port Web Agent read-only finance chat.
6. Move skills and knowledge after finance validates the infrastructure.
7. Migrate capture tools last.

Finance is the proving ground, not the final center.

## Remaining Implementation Decisions

The high-level v1 defaults are fixed in `implementation-roadmap.md`. These details still need to be resolved during the first implementation package:

1. Cache storage path conventions.
2. Finance asset taxonomy.
3. Money and multi-currency representation.
4. Snapshot, transaction, correction, and void semantics.
5. Schema versioning policy.
6. Whether to generate Go/Python types from JSON Schema.
7. Exact migration mapping from existing `wiki/` pages into target `knowledge/`.

## Design Rules

1. One product boundary: `personal-os`.
2. One durable asset boundary: `personal-assets`.
3. One write protocol: `AssetStore`.
4. Multiple processes and languages are allowed.
5. Caches are local and rebuildable.
6. Product writes stay structured; no generic file editor in v1.
7. Cloud is a trusted node, not a central database.
8. Agent is an experiment surface, not the owner of state.
