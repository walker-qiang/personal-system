# Finance Fact Model V1

## Purpose

This document defines the first durable finance fact model for `personal-assets`.

The goal is to support daily personal asset tracking without turning v1 into a full accounting system. Finance validates the system architecture: Git-backed text facts, local rebuildable SQLite cache, Web/API/Agent reads, and structured writes through AssetStore.

Existing finance code and exports are useful inputs, but they are not compatibility constraints.

## Core Decision

Finance v1 uses a snapshot-authoritative model.

Current holdings are derived from the latest effective snapshot for each active asset. Transactions are event facts for explanation, cashflow, reconciliation, and future performance analysis, but v1 holdings must not be derived from transactions.

This keeps v1 aligned with real personal usage: entering periodic asset values is more reliable than reconstructing every account balance from perfect ledger history.

## Fact Types

### Asset

An asset is a stable trackable valuation unit.

It can represent:

- a cash account or deposit.
- a wealth management product.
- a fund or ETF holding.
- a stock holding.
- a liability.
- another personal financial item worth tracking.

Rules:

- Asset records do not store current balance.
- `id` is the stable machine reference.
- `code` is the stable human-readable slug and path fragment.
- `asset_type` describes the product or instrument type.
- `allocation_bucket` describes the personal allocation bucket.
- External identifiers live under `identifiers`.

`asset_type` and `allocation_bucket` are separate because product type and allocation intent are different concepts.

### Snapshot

A snapshot is an observed valuation of one asset at one date.

Rules:

- Snapshot records are append-only by default.
- The latest effective snapshot per asset is the current holding.
- `market_value` is the durable valuation fact.
- `source.method` is required.
- `quantity`, `unit_price`, and `cost_basis` are optional supporting fields.

Effective-state rule:

- For a given `asset_id + snapshot_date`, there should be one effective head.
- If a snapshot corrects another snapshot, the correction chain tail is the effective record.
- If a chain branches, repository validation should fail.
- If a snapshot is voided, it is excluded from effective projections.

### Transaction

A transaction is an event fact.

Examples:

- deposit.
- withdraw.
- buy.
- sell.
- dividend.
- interest.
- fee.
- transfer in/out.
- adjustment.

Rules:

- Transactions are append-only by default.
- Transactions do not drive v1 holdings.
- Transactions can explain changes between snapshots.
- Transactions can support future cashflow and performance analysis.

### Correction

Corrections are full replacement facts of the same type.

Rules:

- Do not use partial patch records.
- A corrected snapshot is still a complete snapshot record under `finance/snapshots/**`.
- A corrected transaction is still a complete transaction record under `finance/transactions/**`.
- Use `correction_of` to link to the previous fact.
- Use `correction_reason` to explain the correction.
- Synced original facts should not be edited unless they are clearly unsynced local mistakes.

### Void

A void is a tombstone fact that excludes another fact from effective projections.

Rules:

- Use voids for invalid facts that should remain auditable.
- Do not delete synced facts just because they are wrong.
- A void is not a secret-removal mechanism. If a secret is committed, rotate the secret and handle Git history deliberately.

Recommended path:

```text
finance/voids/YYYY/MM/YYYY-MM-DD-<target-id>-<void-id>.json
```

## Money

All durable money values use:

```json
{
  "amount": "12345.67",
  "currency": "CNY"
}
```

Rules:

- `amount` is a decimal string, not a JSON number.
- `currency` is an ISO 4217 code.
- V1 stores original-currency facts.
- Base-currency conversion is derived cache state unless a future FX fact model is added.
- For v1 repository validation, `snapshot.market_value.currency` should match the referenced asset `currency`.

For liabilities, `market_value.amount` represents net worth contribution and should be negative. Non-liability assets should have non-negative `market_value.amount`.

## Allocation Buckets

V1 buckets represent personal allocation intent, not strict instrument taxonomy.

Use:

- `cash`: immediately available cash-like assets.
- `stable`: lower-volatility assets intended for stability or income.
- `growth`: higher-volatility assets intended for growth.
- `liability`: debts and negative net-worth items.
- `other`: temporary bucket for items that do not fit yet.

Do not use `allocation_bucket` as a market instrument type. That is `asset_type`.

## Deferred

Do not build these in v1:

- full double-entry ledger.
- FX rate facts and historical conversion.
- tax lots, fees, tax, and complex performance attribution.
- independent security/instrument master.
- multi-owner or account permission model.
- historical classification dimensions.
- automatic market data ingestion as a required dependency.
- existing admin/management page refactors.

## Migration Notes

Existing finance concepts worth keeping:

- Asset catalog.
- Snapshots.
- Transactions as supplementary facts.
- Current holdings as a derived view.
- Allocation targets.
- Publish/status indicators as runtime state.

Existing implementation boundaries to discard:

- SQLite as source of truth.
- Direct DB writes as durable writes.
- CSV publish as the main write path.
- Agent write tools.

Migration should first produce a baseline `personal-assets` commit without real data, then align taxonomy and schemas, then migrate the latest finance CSV exports into text facts.
