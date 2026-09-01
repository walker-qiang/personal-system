# AssetStore Protocol

## Purpose

`AssetStore` is the shared safety and write protocol for `personal-assets`.

The current product entry points are the `personal-os` macOS App and HTTP API,
`personal-agent`, engineering agents such as Codex/Trae, and controlled local
tools. The old Web UI has been retired from the current application tree;
legacy read API compatibility remains. Cloud nodes, capture tools, and
additional automation are possible future entry points. None of these entry
points should invent its own Git behavior.

Every durable write shares the same lock, repository, path, and conflict
boundary. Remote sync, remote publication, and cache rebuilding are selected
by the operation:

```text
lock -> preflight -> validate -> write -> validate repository -> commit
  -> optional remote sync/publication -> optional cache rebuild -> runtime log
```

Publish-enabled finance and Vault operations use remote preflight and
`CommitAndPush`; the research-card writer uses repository preflight and a local
`Commit`, without pushing or rebuilding the finance cache. The operation
contract therefore determines which optional steps are required.

The current implementation is a set of Go packages used by API-owned
operations. There is no standalone `personal-os` CLI or AssetStore service.
A future CLI or local service may reuse the same protocol, but the protocol
should stay stable when the delivery shape changes.

## Non-goals

`AssetStore` is not:

- A real-time collaboration engine.
- A replacement for Git.
- A long-running database that owns facts.
- A silent conflict resolver.
- A permission system for external model egress.

Its job is narrower: coordinate safe local writes to a Git-backed personal asset repository for one user operating multiple nodes.

## Core Responsibilities

1. Locate and validate the `personal-assets` checkout.
2. Coordinate Git fetch, fast-forward, commit, and optional push when the
   operation publishes to an upstream.
3. Enforce path and schema rules for each operation type.
4. Prevent concurrent local writes through locking.
5. Keep durable facts in Git-friendly files.
6. Rebuild the affected local cache or projection when the operation owns one.
7. Surface conflicts clearly.
8. Record minimal audit logs.

## System Boundary

```text
Current Entry Points
  - personal-os macOS App -> personal-os HTTP API
  - personal-agent
  - Codex / Trae
  - Controlled local tools

Future Entry Points
  - Future capture tools, cloud nodes, and automation
        |
        v
AssetStore
  - Lock manager
  - Git sync driver
  - Operation router
  - Schema validator
  - Commit planner
  - Cache/index rebuilder
  - Audit logger
        |
        v
personal-assets Git checkout
```

The retired Web client is historical context, not a currently runnable
AssetStore entry point.

All entry points may read through caches for speed, but durable writes should pass through `AssetStore`.

## Operating Model

This is a single-user multi-node system.

Assumptions:

- Only one human is intentionally operating the system.
- Multiple nodes may exist: work Mac, home Mac, cloud server, future mobile/cloud worker.
- Simultaneous writes from different nodes can happen accidentally, but they are not the primary design center.
- Timely scheduled pull is enough for normal synchronization.
- When Git conflicts happen, manual resolution is acceptable.

This keeps the system closer to a personal workflow and avoids building a collaboration platform.

## Node Model

Every machine is a node:

- Work Mac
- Home Mac
- Cloud server
- Future mobile/cloud worker

Each node has:

- One `personal-assets` checkout.
- Local caches built from that checkout.
- A node identity for audit and commit metadata.
- Optional background sync.

Example node metadata:

```yaml
node_id: cloud-main
node_type: cloud
hostname: personal-cloud-01
default_actor: web
asset_repo_path: /srv/personal/personal-assets
cache_dir: /srv/personal/cache
cloud_writes_enabled: true
full_private_sync_enabled: true
```

Node metadata must not contain secrets.

## Operation Types

Each write must declare an operation type. The type determines allowed paths, validation, commit message, and cache rebuild scope.

Recommended initial operation types:

| Operation | Purpose | Allowed Target |
|---|---|---|
| `capture.source.create` | Captured source document | `资料/**` |
| `knowledge.ingest` | Source-backed synthesis | `知识/**`, `财富/审计/**` when finance-related |
| `finance.asset.upsert` | Create/update asset master data | `财富/资产/**` |
| `finance.snapshot.create` | Append asset snapshot | `财富/快照/**` |
| `finance.snapshot.correct` | Append replacement snapshot | `财富/快照/**` |
| `finance.snapshot.void` | Void an effective snapshot | `财富/作废/**` |
| `finance.transaction.create` | Append transaction | `财富/交易/**` |
| `finance.transaction.correct` | Append replacement transaction | `财富/交易/**` |
| `finance.transaction.void` | Void an effective transaction | `财富/交易作废/**` |
| `finance.target.update` | Update allocation targets | `财富/targets.yaml` |
| `report.create` | Create analysis/report output | `项目/**`, `财富/报表/**` |
| `skill.update` | Update reusable AI workflows | `技能/**` |
| `vault.rule.update` | Update repository rules or schemas | `AGENTS.md`, `README.md`, `财富/模式/**` |

Avoid generic "write file" operations in product surfaces. The operation type is the contract.

## Branch and Remote Policy

The default model is one primary branch, for example `main`.

Rules:

- Normal nodes should write to the primary branch.
- Background sync uses fast-forward only.
- Publish-enabled writes fetch remote state and pull fast-forward updates before
  writing when possible.
- If the local branch is ahead, a publish-enabled write may proceed and push.
- If the local and remote branches have diverged, stop and ask for manual resolution.
- No force push in normal operation.
- Local-only operations may commit without a configured upstream or without a
  remote publication step.
- Feature branches are allowed for deliberate Codex/Trae restructures, but
  product writes from macOS App/API/Agent clients should not create ad hoc
  branches.

This keeps routine writes simple while still allowing Codex/Trae to use branches for deliberate large changes when needed.

## Read Protocol

Reads should be fast, but must expose freshness.

Target policy (not every current consumer exposes every option yet):

1. Product clients read through API projections backed by local caches by default.
2. Cache metadata includes source commit SHA and rebuild time.
3. Background sync can fetch/pull and rebuild caches when clean.
4. A consumer that needs latest state can request `sync_mode=latest`, which attempts a safe sync first.
5. If sync is blocked, the read can still return cached data with `stale=true` and a reason.

Example read status:

```json
{
  "source_commit": "abc1234",
  "cache_built_at": "2026-05-23T20:30:00+08:00",
  "stale": false,
  "sync_status": "clean"
}
```

## Background Sync Protocol

Background sync is the normal multi-node synchronization mechanism.

Loop:

```text
git fetch
if working tree is clean and branch can fast-forward:
  pull --ff-only
  rebuild caches if HEAD changed
else:
  mark sync_blocked
  do not modify working tree
```

Rules:

- Background sync should run on a schedule, for example every 5-30 minutes depending on node type.
- Background sync may fetch anytime.
- Background sync may pull only when the worktree is clean and can fast-forward.
- Background sync must not auto-merge conflicts.
- Background sync must not run inside an active write lock.
- Background sync should record status for UI/doctor.

The UI should show sync state rather than hiding it:

- `clean`
- `behind`
- `ahead`
- `diverged`
- `dirty`
- `sync_blocked`
- `conflict`

## Write Protocol

Every durable write follows this common state machine; bracketed states are
operation-dependent.

```text
requested
  -> lock_acquired
  -> preflight_checked
  -> [remote_sync_checked]
  -> operation_validated
  -> audit_prepared
  -> files_written
  -> repo_validated
  -> committed
  -> [pushed]
  -> [caches_rebuilt]
  -> runtime_logged
  -> completed
```

Detailed steps:

1. **Acquire local lock**
   - Prevent two local writes from modifying the checkout at the same time.
   - Lock should include actor, operation type, start time, and optional request id.

2. **Preflight**
   - Verify repo exists.
   - Verify current branch.
   - Verify remote is configured when the operation requires publication.
   - Verify no unresolved merge state.
   - Verify path policy for the operation type.

3. **Sync check**
   - `git fetch`.
   - If worktree is clean and behind remote, pull fast-forward updates.
   - If branch is ahead of remote, continue; a later push publishes the local
     commit only for a publish-enabled operation.
   - If branch has diverged, stop and ask for manual resolution.
   - Unrelated unstaged changes may remain for path-scoped writes. Staged
     changes anywhere in the repository are rejected, and a conflict in a
     declared target path is rejected or surfaced by the structured merge.

4. **Validate operation input**
   - Validate schema.
   - Validate references.
   - Validate privacy class and path.
   - Validate caller permission if running on cloud.

5. **Write files**
   - Generate deterministic or unique paths.
   - Prefer append-only new files for high-frequency records.
   - Avoid editing large shared files unless the operation explicitly owns them.
   - Include durable audit files in the same operation when needed.

6. **Validate repository**
   - Run operation-specific validators.
   - Rebuild affected cache in dry-run or temp mode when feasible.
   - Confirm only allowed paths changed.

7. **Commit**
   - Stage only operation-owned paths.
   - Commit with structured message.
   - Include actor and operation metadata.

8. **Push when required**
   - Push to the configured upstream for publish-enabled operations.
   - If rejected because remote changed, fetch and fast-forward if possible, then retry once.
   - If branches have diverged, stop. Do not force push.
   - Local-only operations finish after commit.

9. **Rebuild caches**
   - Rebuild affected indexes/cache for local node.
   - If cache rebuild fails, durable commit remains valid but UI should show degraded cache status.

10. **Runtime log**
   - Durable audit entries should already be part of the commit when required.
   - Node-local runtime logs can record push/cache outcomes after the commit.
   - Return operation result to caller.

## Locking

Use a local lock file or OS-level file lock under a node-local state directory, not inside `personal-assets`.

Example:

```text
~/.local/state/personal-os/assetstore.lock
```

Lock metadata:

```json
{
  "request_id": "req_01HY...",
  "actor": "web",
  "operation": "finance.snapshot.create",
  "started_at": "2026-05-23T20:30:00+08:00",
  "pid": 12345
}
```

Rules:

- Active lock blocks other writes.
- Stale locks can be broken only after process liveness check and timeout.
- Background sync must respect the same lock.

## Commit Policy

Commit messages should be predictable and useful.

Format:

```text
<operation>: <short target>

actor: <actor>
node: <node_id>
request: <request_id>
```

Examples:

```text
finance.snapshot.create: ast_cmb_cash 2026-05-23

actor: web
node: cloud-main
request: req_01HY...
```

```text
knowledge.ingest: AI engineering practice map

actor: codex
node: work-mac
request: req_01HY...
sources:
- 资料/文章/2026/05/example.md
```

Avoid large mixed commits. One user action should normally produce one commit.

## Conflict Policy

The system must prefer refusal over silent corruption.

Conflict cases:

| Case | Behavior |
|---|---|
| Unrelated unstaged change | Allow path-scoped write; commit only declared paths |
| Staged change anywhere | Reject write; do not include existing staged content |
| Declared target path conflict | Reject or return a structured merge conflict |
| Remote updated before write | Fast-forward pull before writing |
| Local branch ahead | Allow write and push |
| Branches diverged | Stop and ask for manual Git resolution |
| Push rejected after commit | Re-check remote safety; retry once only if branches are not diverged |
| Schema validation failure | Abort before commit |
| Cache rebuild failure after commit | Keep commit, mark cache degraded |
| Cloud auth failure | Abort before write |

No force push or auto-merge in normal operation.

## Path Ownership

Every operation type has an allowlist. After writing, `AssetStore` checks the staged diff.

Example:

```yaml
operations:
  finance.snapshot.create:
    allow:
      - 财富/快照/**
      - 财富/审计/**
    deny:
      - "**/.env"
```

This should be enforced mechanically, not just documented.

## Validation

Validation happens at three levels:

1. **Input validation**
   - Request payload shape.
   - Required fields.
   - Enum values.
   - Date/money formats.

2. **Reference validation**
   - Snapshot asset exists.
   - Transaction asset exists.
   - Knowledge source refs exist.
   - Skill has `SKILL.md`.

3. **Repository validation**
   - Only allowed paths changed.
   - Files parse.
   - Schemas pass.
   - Cache rebuild can consume the new state.

For finance, schema validation should be strict. For knowledge, validation should focus on metadata, source refs, and path rules.

## Cache Rebuild

Caches are node-local and rebuildable.

Initial cache types:

| Cache | Built From | Used By |
|---|---|---|
| Finance SQLite | `财富/**` facts | macOS App/API responses, analytics, Agent tools |
| Wiki full-text index | `知识/**`, `技能/**` | Search and retrieval |
| Attachment metadata | `附件/**` | Capture/preview UI |
| Optional vector index | curated `知识/` and `资料/` subsets | Semantic retrieval |

Cache metadata should record:

- Source commit SHA.
- Build time.
- Build version.
- Failure state if degraded.

## Cloud Node Rules

Cloud writes are allowed, but they must not bypass protocol.

Minimum rules:

- External authentication is required.
- Cloud Git credential can access only `personal-assets`.
- Secrets may be committed since this is a fully private single-user system, but they should be placed in protected paths and excluded from external AI context.
- The cloud node may sync the full private asset repository if the host and access layer are trusted.
- Cloud node has its own `node_id`.
- Cloud writes are committed as a distinct actor, e.g. `web-cloud`.
- All writes go through `AssetStore`.

Recommended first authentication layer:

- Tailscale for v1.

Cloudflare Access or another trusted reverse-proxy identity layer can be added later if browser-based public-domain access becomes more useful than private-device access.

Avoid building a full user/account system at the start.

## AI Write Rules

AI writes must declare operation type and actor.

Recommended actors:

- `codex`
- `trae`
- `web-agent`
- `web`
- `capture-extension`
- `system`

Rules:

- AI cannot rewrite `资料/**`.
- AI durable knowledge writes should include source refs.
- AI writes involving L3 source material require the privacy policy to allow the model path.
- High-risk writes should create drafts or reports, not overwrite durable knowledge directly.
- Any future product-facing Agent write path should start read-only, then add
  low-risk operations, then explicit structured writes.

## Minimal API Shape

The actual API can be HTTP, CLI, or library calls. The conceptual request should look like this:

```json
{
  "request_id": "req_01HY0000000000000000000000",
  "actor": "web",
    "operation": "finance.snapshot.create",
    "payload": {
      "asset_id": "ast_cmb_cash",
      "snapshot_date": "2026-05-23",
      "market_value": {
        "amount": "12345.67",
        "currency": "CNY"
      },
      "source": {
        "method": "manual",
        "ref": null
      },
      "notes": ""
    },
  "options": {
    "sync": "required",
    "push": "required",
    "rebuild_cache": true
  }
}
```

The example above is a publish-enabled finance operation. A local-only
operation can omit remote publication, and an operation that does not own a
cache can omit cache rebuilding.

Response:

```json
{
  "ok": true,
  "operation": "finance.snapshot.create",
  "commit_sha": "abc1234",
  "files_written": [
    "财富/快照/2026/05/2026-05-23-cmb-cash-snap_01HY.json"
  ],
  "cache": {
    "rebuilt": true,
    "source_commit": "abc1234"
  },
  "sync": {
    "pushed": true,
    "remote": "origin"
  }
}
```

Error response:

```json
{
  "ok": false,
  "error_code": "SYNC_CONFLICT",
  "message": "Local and remote branches diverged while syncing personal-assets.",
  "conflicts": [
    "财富/targets.yaml"
  ],
  "next_action": "Resolve the Git conflict manually, then retry."
}
```

## CLI Surface

Status: target interface, not currently implemented. The repository does not
provide a `personal-os` CLI binary or the `sync` and `assetstore` subcommands
below. Current product operations are exposed through the HTTP API and shared
Go packages; readiness and cache rebuilds have separate Go tool entry points at
`tools/doctor` and `tools/cache-builders/finance`.

The following commands are retained as a possible future operator interface:

```bash
personal-os sync status
personal-os sync pull
personal-os sync rebuild
personal-os doctor

personal-os assetstore write --operation finance.snapshot.create --payload payload.json
personal-os assetstore validate
personal-os assetstore audit --since 2026-05-01
```

Any future CLI should call the same Go implementation as the HTTP API and Agent
integrations.

## Testing Strategy

Tests should focus on failure modes, not only happy paths.

Required scenarios:

1. A publish-enabled clean write creates the expected file, commit, optional
   push, and owned cache rebuild.
2. An unrelated unstaged change is preserved and excluded from the operation
   commit.
3. A staged change, merge state, or declared target-path conflict rejects the
   write.
4. A remote update is pulled before a publish-enabled write when fast-forward is
   safe.
5. A local branch ahead can publish when an upstream is configured.
6. Diverged branches stop without force push or automatic merge.
7. An invalid finance snapshot fails before commit.
8. An operation cannot modify a disallowed path.
9. A local-only research-card write creates a local commit without a push or
   finance cache rebuild.
10. Cache rebuild failure is reported without corrupting source facts.
11. Cloud write requires actor/auth metadata.
12. AI knowledge ingest requires source refs.

## Implementation Status and Remaining Sequence

The original staged recommendation has partially landed in a different order:

1. **Implemented:** shared Go packages and API-owned AssetStore operations.
2. **Implemented:** structured asset, snapshot, transaction, allocation target,
   research-card, official-fact, watchlist, and bounded Vault writes.
3. **Implemented:** finance cache rebuild from `财富/**`.
4. **Implemented:** HTTP API integration and the macOS product client.
5. **Not implemented:** a standalone AssetStore CLI or local service.
6. **Not implemented:** generic knowledge/capture operations, cloud-node writes,
   or a generic Agent write-permission system.

Future work should continue to add validated structured operations instead of a
generic file editor.
