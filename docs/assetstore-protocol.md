# AssetStore Protocol

## Purpose

`AssetStore` is the single write and sync protocol for `personal-assets`.

It exists because the system has many entry points: Web UI, Web Agent, Codex, Trae, cloud node, capture tools, and future automation. These entry points must not each invent their own Git behavior.

Every durable write should go through the same lifecycle:

```text
sync check -> validate -> prepare audit -> write -> validate repository -> commit -> push -> rebuild caches -> runtime log
```

`AssetStore` can be implemented as a library, local service, CLI, or internal package. The implementation shape may change; the protocol should stay stable.

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
2. Coordinate Git fetch, pull, commit, and push.
3. Enforce path and schema rules for each operation type.
4. Prevent concurrent local writes through locking.
5. Keep durable facts in Git-friendly files.
6. Rebuild local caches after successful sync/write.
7. Surface conflicts clearly.
8. Record minimal audit logs.

## System Boundary

```text
Entry Points
  - Web UI
  - Web Agent
  - Codex / Trae
  - Capture tools
  - Cloud Web
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
| `capture.inbox.create` | Quick note/link/text capture | `inbox/**` |
| `capture.raw.create` | Captured source document | `raw/general/**`, `raw/sensitive/**` |
| `knowledge.ingest` | Source-backed raw to knowledge synthesis | `knowledge/**`, `system/audit/**` |
| `finance.asset.upsert` | Create/update asset master data | `finance/assets/**` |
| `finance.snapshot.create` | Append asset snapshot | `finance/snapshots/**` |
| `finance.transaction.create` | Append transaction | `finance/transactions/**` |
| `finance.fact.void` | Void an invalid snapshot or transaction | `finance/voids/**` |
| `finance.target.update` | Update allocation targets | `finance/targets.yaml` |
| `report.create` | Create analysis/report output | `reports/**`, `finance/reports/**` |
| `draft.create` | Create review-buffer content | `drafts/**` |
| `draft.promote` | Promote reviewed draft into durable area | `drafts/**`, target allowlist by draft type |
| `skill.update` | Update reusable AI workflows | `skills/**` |
| `system.rule.update` | Update system rules/schemas | `system/rules/**`, `system/schemas/**` |

Avoid generic "write file" operations in product surfaces. The operation type is the contract.

## Branch and Remote Policy

The default model is one primary branch, for example `main`.

Rules:

- Normal nodes should write to the primary branch.
- Background sync uses fast-forward only.
- Write-time sync fetches remote state and pulls fast-forward updates before writing when possible.
- If the local branch is ahead, a write may proceed and push.
- If the local and remote branches have diverged, stop and ask for manual resolution.
- No force push in normal operation.
- Feature branches are allowed for deliberate Codex/Trae restructures, but product writes from Web/API/Agent should not create ad hoc branches.

This keeps routine writes simple while still allowing Codex/Trae to use branches for deliberate large changes when needed.

## Read Protocol

Reads should be fast, but must expose freshness.

Recommended policy:

1. Web pages read from local cache by default.
2. Cache metadata includes source commit SHA and rebuild time.
3. Background sync can fetch/pull and rebuild caches when clean.
4. A page that needs latest state can request `sync_mode=latest`, which attempts a safe sync first.
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

Every durable write follows this state machine.

```text
requested
  -> lock_acquired
  -> preflight_checked
  -> sync_checked
  -> operation_validated
  -> audit_prepared
  -> files_written
  -> repo_validated
  -> committed
  -> pushed
  -> caches_rebuilt
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
   - Verify remote is configured.
   - Verify no unresolved merge state.
   - Verify path policy for the operation type.

3. **Sync check**
   - `git fetch`.
   - If worktree is clean and behind remote, pull fast-forward updates.
   - If branch is ahead of remote, continue; the later push will publish the local commit.
   - If branch has diverged, stop and ask for manual resolution.
   - If worktree is dirty, reject by default for v1.

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

8. **Push**
   - Push to remote.
   - If rejected because remote changed, fetch and fast-forward if possible, then retry once.
   - If branches have diverged, stop. Do not force push.

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
- raw/general/2026/05/example.md
```

Avoid large mixed commits. One user action should normally produce one commit.

## Conflict Policy

The system must prefer refusal over silent corruption.

Conflict cases:

| Case | Behavior |
|---|---|
| Worktree dirty before write | Reject v1 write; show dirty paths |
| Remote updated before write | Fast-forward pull before writing |
| Local branch ahead | Allow write and push |
| Branches diverged | Stop and ask for manual Git resolution |
| Push rejected after commit | Fetch, fast-forward if possible, retry once |
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
      - finance/snapshots/**
      - system/audit/**
    deny:
      - system/secrets/**
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
| Finance SQLite | `finance/**` facts | Web tables, analytics, AI tools |
| Wiki full-text index | `knowledge/**`, selected `system/**`, `skills/**` | Search and retrieval |
| Attachment metadata | `raw/assets/**` | Capture/preview UI |
| Optional vector index | curated knowledge/raw subsets | Semantic retrieval |

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
- No secrets are committed.
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

- AI cannot rewrite `raw/**`.
- AI durable knowledge writes should include source refs.
- AI writes involving L3 source material require the privacy policy to allow the model path.
- High-risk writes should create drafts or reports, not overwrite durable knowledge directly.
- Web Agent starts with read-only, then low-risk writes, then structured writes.

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

Response:

```json
{
  "ok": true,
  "operation": "finance.snapshot.create",
  "commit_sha": "abc1234",
  "files_written": [
    "finance/snapshots/2026/05/2026-05-23-cmb-cash-snap_01HY.json"
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
    "finance/targets.yaml"
  ],
  "next_action": "Resolve the Git conflict manually, then retry."
}
```

## CLI Surface

Useful commands for development and operations:

```bash
personal-os sync status
personal-os sync pull
personal-os sync rebuild
personal-os doctor

personal-os assetstore write --operation finance.snapshot.create --payload payload.json
personal-os assetstore validate
personal-os assetstore audit --since 2026-05-01
```

The Web UI and Agent should call the same underlying implementation as the CLI.

## Testing Strategy

Tests should focus on failure modes, not only happy paths.

Required scenarios:

1. Clean write creates expected file, commit, push, and cache rebuild.
2. Dirty worktree rejects write.
3. Remote update is pulled before write.
4. Local branch ahead can push.
5. Diverged branches stop without force push.
6. Invalid finance snapshot fails before commit.
7. Operation cannot modify disallowed path.
8. Cache rebuild failure is reported without corrupting source facts.
9. Cloud write requires actor/auth metadata.
10. AI knowledge ingest requires source refs.

## Implementation Recommendation

Implement the protocol in stages:

1. Local CLI and library only.
2. Finance snapshot write path.
3. Cache rebuild from `finance/**`.
4. Web API integration.
5. Knowledge/capture operations.
6. Cloud node writes.
7. Agent write permissions.

Do not start with a generic file editor. Start with one validated structured write path.
