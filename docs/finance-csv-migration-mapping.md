# Finance CSV Migration Mapping

## Purpose

This document maps the latest legacy finance CSV exports into the `personal-assets` finance fact model.

It is a migration contract, not a final app API. The migration should run only after this mapping and repository-level validation pass.

## Source Batch

Latest source batch:

```text
/Users/qiang.lilq/obsidian-wiki/finance/exports/*-2026-04-26.csv
```

Observed files:

| File | Rows | Role |
|---|---:|---|
| `assets-2026-04-26.csv` | 37 | Asset master source |
| `snapshots-2026-04-26.csv` | 37 | Snapshot fact source |
| `bucket_targets-2026-04-26.csv` | 3 | Allocation target source |
| `holdings-2026-04-26.csv` | 37 | Derived parity check only |
| `transactions-2026-04-26.csv` | 0 | No event facts to migrate |

The export batch date is `2026-04-26`, but the latest snapshot date in the files is `2026-03-01`. Treat this as a freshness gap, not a format error.

## Asset Mapping

Legacy columns:

```text
code,name,asset_type,bucket,channel,currency,risk_level,holding_cost_pct,expected_yield_pct,notes,created_at
```

Target mapping:

| Legacy Column | Target Field | Rule |
|---|---|---|
| `code` | `code` | Preserve exactly |
| `code` | `id` | Deterministic: `ast_` + slug normalized from `code` |
| `name` | `name` | Preserve exactly |
| `asset_type` | `asset_type` | Use mapping table below |
| `bucket` | `allocation_bucket` | Preserve `cash/stable/growth` |
| `channel` | `channel` | Preserve exactly |
| `currency` | `currency` | Preserve exactly; current source is all `CNY` |
| `risk_level` | `risk_level` | Preserve `R1..R5`; blank becomes `null` |
| `holding_cost_pct` | `holding_cost_pct` | Preserve as number or `null` |
| `expected_yield_pct` | `expected_annual_yield_pct` | Preserve as percentage number or `null` |
| `notes` | `notes` | Preserve exactly |
| `created_at` | `created_at` | Preserve as string |
| missing | `updated_at` | Use `created_at` for migration baseline |
| missing | `status` | Default to `active` |
| missing | `identifiers` | `{}` unless known; do not invent securities IDs |

Asset type mapping:

| Legacy `asset_type` | New `asset_type` | Reason |
|---|---|---|
| `cash-cny` | `cash` | Cash-like CNY accounts |
| `wealth-mgmt-product` | `wealth_mgmt_product` | Wealth management products |
| `cn-stock` | `securities_account` | Existing rows are account/portfolio-level A-share assets, not single tickers |
| `etf-fund` | `fund` | Legacy value is too broad; do not fake precision by splitting into bond/equity/mixed fund |

Do not map `cn-stock` to `a_share_stock` during this migration. The two existing rows do not have market/ticker identifiers and represent account-level holdings.

Do not split `etf-fund` based on name heuristics in v1. The reliable allocation signal is already preserved in `allocation_bucket`.

## Snapshot Mapping

Legacy columns:

```text
asset_code,asset_name,snapshot_date,balance_yuan,balance_cents,expected_yield_pct,actual_yield_pct,notes,created_at
```

Target mapping:

| Legacy Column | Target Field | Rule |
|---|---|---|
| `asset_code` | `asset_id` | Join through migrated asset code |
| `snapshot_date` | `snapshot_date` | Preserve exactly |
| `balance_cents` | `market_value.amount` | Convert cents to decimal string with 2 places |
| joined `asset.currency` | `market_value.currency` | Current source is all `CNY` |
| missing | `quantity` | `null` |
| missing | `unit_price` | `null` |
| missing | `cost_basis` | `null` |
| `expected_yield_pct` | `expected_annual_yield_pct` | Preserve as percentage number or `null` |
| `actual_yield_pct` | `actual_yield_pct` | Preserve as percentage number or `null` |
| `notes` | `notes` | Preserve exactly |
| `created_at` | `created_at` | Preserve exactly |
| missing | `created_by` | `migration` |
| missing | `source.method` | `import` |
| source file path | `source.ref` | Path to CSV export |
| missing | `correction_of` | `null` |
| missing | `correction_reason` | `null` |

Snapshot IDs should be deterministic for migration:

```text
snap_<26-char Crockford-base32 hash of asset code + snapshot date>
```

This keeps IDs stable across repeated migrations while matching the v1 snapshot schema.

## Target Mapping

Legacy file:

```text
bucket_targets-2026-04-26.csv
```

Target `finance/targets.yaml` should use:

```yaml
schema_version: 1
base_currency: CNY
targets:
  - allocation_bucket: cash
    target_pct: 10
    notes: 稳健进取 v0.1 adopted 2026-04-26
    updated_at: "2026-04-26T13:25:47.360Z"
updated_at: "2026-04-26T13:25:47.360Z"
notes: "Migrated from bucket_targets-2026-04-26.csv"
```

Rules:

- Preserve target rows for `cash`, `stable`, and `growth`.
- A missing target means "not set", not `0%`.
- Do not force sum to equal 100 in the schema, but the migration check should report the sum.

## Holdings Parity

`holdings-2026-04-26.csv` is not a source fact.

Use it only as a parity check:

- Migrated holdings should have 37 rows.
- For each active asset, holding value should come from the latest effective snapshot.
- `expected_annual_yield_pct` in holdings parity should come from the latest snapshot, matching legacy behavior.
- `allocation_bucket`, `asset_type`, `channel`, `currency`, and `risk_level` should match migrated asset metadata.

## Known Gaps

- No transaction facts exist in the latest batch.
- Legacy CSV has no asset `status`; migration defaults to `active`.
- Legacy CSV has no asset `updated_at`; migration uses `created_at`.
- Legacy CSV has no external identifiers; migration should not invent them.
- Latest export date and latest snapshot date differ.

These gaps do not block migration if they are recorded and validator checks pass.
