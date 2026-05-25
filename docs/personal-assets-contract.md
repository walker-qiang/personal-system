# personal-assets Contract

## Purpose

`personal-assets` is the long-term source-of-truth repository for personal knowledge and assets.

It is not a backend implementation, not a database dump, and not a cache directory. It is the durable asset layer shared by local machines, cloud nodes, Codex, Trae, the Web UI, and future capture tools.

The repository should remain useful if every current application is deleted and rebuilt.

This is a fully private, single-user repository. It may store and sync personal data, including finance, journal, decisions, and sensitive raw materials. The main hard exclusion is secrets and credentials.

## Design Principles

1. **Git-backed text is the truth.** Durable facts and knowledge are stored in open, reviewable, Git-friendly formats.
2. **Caches are rebuildable.** SQLite, full-text indexes, vector indexes, thumbnails, and generated API projections are node-local caches.
3. **Write small files.** High-frequency facts should avoid shared large files. Prefer append-only records or object/date sharding.
4. **Raw is preserved.** Original materials should be captured with minimal transformation. AI should not rewrite raw source files.
5. **Knowledge is source-backed.** Durable knowledge pages should link to raw materials, decisions, reports, or other traceable sources.
6. **Single-user sync stays simple.** Nodes pull on a schedule; product writes do a final sync check; rare conflicts are resolved manually.
7. **Cloud is a node.** A cloud checkout can read and write through the same protocol, but it is not a special source of truth.
8. **Private does not mean careless.** Personal data may be stored and synced, but secrets and credentials stay outside Git, and external model egress is still controlled.

## Repository Shape

```text
personal-assets/
  README.md
  AGENTS.md                  # Runtime rules for AI agents operating this repo

  inbox/                     # Fast capture entry point
    2026/
      05/
        <timestamp>-<slug>.md

  raw/                       # Original materials, append-mostly
    general/
    sensitive/
    assets/                  # Attachments referenced by raw files

  knowledge/                 # Structured durable knowledge
    concepts/
    domains/
    entities/
    syntheses/
    queries/
    maps/
    _index.md
    _log.md

  skills/                    # Reusable AI workflows, portable across Codex/Trae/Web Agent
    <skill-name>/
      SKILL.md
      scripts/
      references/
      assets/

  finance/                   # Structured financial facts and reports
    assets/
    snapshots/
    transactions/
    targets.yaml
    reports/
    schemas/

  decisions/                 # Decision records
  journal/                   # Reflection and personal trajectory
  drafts/                    # Review buffer for uncertain or high-risk AI/user outputs
  reports/                   # Cross-domain generated or human-written reports

  system/
    rules/                   # Human-readable rules and conventions
    schemas/                 # JSON Schema / YAML schema / data contracts
    audit/                   # Durable write and AI-operation logs
    sync/                    # Node metadata, not secrets
```

This tree is a target shape, not a migration requirement. Existing `obsidian-wiki` content can be mapped into it gradually.

## Top-level Areas

### `inbox/`

Low-friction capture area for notes, links, pasted text, and quick thoughts.

Rules:

- Writes should be append-only and low ceremony.
- Files should be timestamped to avoid conflicts.
- Inbox content is not yet structured knowledge.
- AI may triage or move content only through an explicit ingest workflow.

### `raw/`

Original source material.

Rules:

- AI must not rewrite raw files.
- Capture tools write here or to `inbox/`, not directly to `knowledge/`.
- Attachments go under `raw/assets/` unless a source format needs colocated files.
- Raw files should include source URL, capture time, and capture method when available.

Privacy defaults:

| Path | Default Class | Cloud Policy |
|---|---|---|
| `raw/general/` | L2 Personal | Can sync to cloud node |
| `raw/sensitive/` | L3 Sensitive | Can sync to private cloud node |
| `raw/assets/` | Inherits referencing document | Depends on references |

### `knowledge/`

Structured knowledge maintained by humans and AI.

Rules:

- Durable pages should be source-backed.
- Major AI changes should update `knowledge/_log.md` or `system/audit/`.
- Pages should avoid pretending to be raw facts; they are interpretation, synthesis, or curated structure.
- If source support is weak, write to a draft/report first instead of durable knowledge.

Recommended page metadata:

```yaml
---
type: synthesis
status: active
source_refs:
  - raw/general/2026/05/example.md
updated_at: 2026-05-23T00:00:00+08:00
updated_by: codex
---
```

### `skills/`

Portable AI workflows.

Rules:

- `SKILL.md` is the workflow entry point.
- Scripts and references stay inside the skill directory unless they are shared runtime utilities.
- Skills should be written for portability across Codex, Trae, and Web Agent where practical.
- Global installation should use symlinks, not copied directories, when supported.

### `finance/`

Structured financial facts. Finance is the first strong module, not the center of the system.

Long-term truth lives in Git-friendly text records. Node-local SQLite is a cache built from these files.

Recommended shape:

```text
finance/
  assets/
    cmb-cash.yaml
    ths-a-share.yaml
  snapshots/
    2026/
      05/
        2026-05-23-cmb-cash-01HY....json
  transactions/
    2026/
      05/
        2026-05-23-01HY....json
  voids/
    2026/
      05/
        2026-05-23-snap_01HY....-void_01HY....json
  targets.yaml
  reports/
  schemas/
```

Asset record example:

```yaml
schema_version: 1
id: ast_cmb_cash
code: cmb-cash
name: 招商银行朝朝宝
asset_type: cash
allocation_bucket: cash
currency: CNY
risk_level: R1
channel: 招商银行
expected_annual_yield_pct: 1.5
status: active
created_at: "2026-05-23T00:00:00+08:00"
updated_at: "2026-05-23T00:00:00+08:00"
```

Snapshot record example:

```json
{
  "schema_version": 1,
  "id": "snap_01HY0000000000000000000000",
  "asset_id": "ast_cmb_cash",
  "snapshot_date": "2026-05-23",
  "market_value": {
    "amount": "12345.67",
    "currency": "CNY"
  },
  "quantity": null,
  "unit_price": null,
  "cost_basis": null,
  "source": {
    "method": "manual",
    "ref": null
  },
  "correction_of": null,
  "correction_reason": null,
  "notes": "",
  "created_at": "2026-05-23T20:30:00+08:00",
  "created_by": "web"
}
```

Finance rules:

- Finance v1 is snapshot-authoritative: current holdings come from the latest effective snapshot for each asset.
- Transaction records are supplementary facts for cashflow and reconciliation; v1 holdings are not derived from transactions.
- Snapshot and transaction records should be append-only by default.
- Corrections are complete replacement facts of the same type linked by `correction_of`.
- Voids are tombstone facts that exclude target facts from effective projections while preserving audit history.
- Asset master data can be edited, but updates must validate references and rebuild caches.
- Reports are interpretation, not source facts.

### `decisions/`

Durable decision records.

Rules:

- Decisions should capture context, options, decision, consequences, and review triggers.
- AI may draft, but the final decision should reflect the user's judgment.
- Major system architecture choices should be recorded here or under `system/rules/`.

### `journal/`

Personal reflection and trajectory.

Rules:

- Default privacy is sensitive.
- AI should not invent feelings or conclusions.
- Generated drafts should be clearly marked until reviewed.

### `drafts/`

Review buffer for uncertain, high-risk, or not-yet-promoted work.

Suggested shape:

```text
drafts/
  knowledge/
  decisions/
  journal/
  reports/
  system/
  archive/
```

Rules:

- Drafts are for work that is not ready to become durable knowledge or records.
- AI should use drafts when source support is weak, privacy risk is high, or the requested change would rewrite important durable content.
- Promotion from drafts should validate that the target has not changed unexpectedly.
- Archived drafts should preserve review history when useful, but drafts are not the primary source of truth.

### `reports/`

Cross-domain analysis outputs.

Rules:

- Reports must distinguish facts, interpretation, and recommendations.
- Generated reports should include source references and generation metadata.
- Reports can be regenerated; source facts should not depend on them.

### `system/`

Rules, schemas, audit, and sync metadata.

Suggested subdirectories:

```text
system/
  rules/
    operating-principles.md
    ai-write-policy.md
    privacy-policy.md
  schemas/
    finance.snapshot.schema.json
    finance.transaction.schema.json
    finance.asset.schema.json
  audit/
    2026/
      05/
        ai-write-log.jsonl
        assetstore-write-log.jsonl
  sync/
    nodes.yaml
```

No secrets belong here.

## Data Format Policy

Use these defaults:

| Data Type | Format | Reason |
|---|---|---|
| Human-readable knowledge | Markdown + YAML frontmatter | Easy review and editing |
| Small config/master data | YAML | Human-editable |
| High-frequency facts | One JSON file per record, or JSONL by shard | Low conflict and schema validation |
| Generated reports | Markdown | Reviewable and portable |
| Schemas | JSON Schema / OpenAPI | Tooling support |
| Caches/indexes | Not committed | Rebuildable |

Avoid committing:

- SQLite databases.
- Vector indexes.
- Local app state.
- Secrets or tokens.
- Large generated bundles.

## Sync Model

`personal-assets` is designed for one user operating several nodes, not for multi-user concurrent editing.

Expected sync behavior:

- Each node pulls on a schedule.
- Product writes perform a final sync check before changing durable files.
- High-frequency writes use timestamped or ID-based paths to avoid accidental conflicts.
- If branches diverge or files conflict, stop and resolve manually with Git.
- Do not add complex auto-merge or real-time collaboration behavior until real usage proves it is needed.

## Privacy and Secrets

Because this is a fully private single-user system, personal data can live in `personal-assets` and sync across trusted nodes. Privacy classes still matter for model egress and UI behavior, not for deciding whether a file can exist in the repository.

Use a small fixed classification:

| Class | Meaning | Default Handling |
|---|---|---|
| L1 Public-ish | Safe if accidentally seen | External AI allowed |
| L2 Personal | Personal but not highly sensitive | External AI allowed with minimization |
| L3 Sensitive | Finance, private reflection, personal identity data | External AI requires explicit policy or confirmation |
| L4 Secret | Credentials, API keys, passwords, recovery codes | Do not store in Git |

Each top-level area should have a default class, but individual files may override with frontmatter.

Rules:

- Financial data, journal entries, decisions, and private raw materials may be stored and synced.
- Secrets and credentials must stay outside Git, for example in Keychain, 1Password, environment files outside the repo, or cloud secret stores.
- If a document references a secret location, store only a reminder or pointer, not the secret value.
- External model calls should still minimize context, especially for L3 content.

## AI Write Policy

AI may help maintain durable assets only through explicit workflows.

Allowed by default:

- Search and answer from assets.
- Draft reports or knowledge pages with sources.
- Update skills when asked.
- Append capture/inbox material when asked.
- Create structured finance records through validated tools.

Not allowed by default:

- Rewrite `raw/**`.
- Silently overwrite human edits.
- Store secrets.
- Send L3 content to external models without policy approval.
- Convert unsourced guesses into durable knowledge.

Durable AI writes should include audit metadata:

```json
{
  "time": "2026-05-23T20:30:00+08:00",
  "actor": "codex",
  "operation": "knowledge_ingest",
  "inputs": ["raw/general/2026/05/example.md"],
  "outputs": ["knowledge/syntheses/example.md"],
  "model": "gpt-5",
  "notes": "source-backed synthesis"
}
```

## Migration Notes

Likely mapping from current repos:

| Current | Target |
|---|---|
| `obsidian-wiki/raw/` | `personal-assets/raw/` |
| `obsidian-wiki/wiki/` | `personal-assets/knowledge/` |
| `obsidian-wiki/skills/` | `personal-assets/skills/` |
| `obsidian-wiki/finance/exports/` | Replaced by `personal-assets/finance/` fact records |
| `obsidian-wiki/_system/` | `personal-assets/system/` |
| `personal-finance/state/finance.db` | Rebuildable node-local cache |
| `personal-tools/weixin-clip` | External adapter, may remain separate or move under `personal-os` later |

Do not migrate everything at once. First freeze the target contract, then migrate one module at a time.
