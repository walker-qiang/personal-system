# Finance Fact Model V1

## Purpose

This document defines the first durable finance fact model for `personal-assets`.

The goal is to support daily personal asset tracking without turning v1 into a full accounting system. Finance validates the system architecture: Git-backed text facts, local rebuildable SQLite cache, macOS App/API/Agent reads, and structured writes through AssetStore.

Existing finance code and exports are useful inputs, but they are not compatibility constraints.

## Core Decision

Finance v1 uses a snapshot-authoritative valuation model with
transaction-derived position fields.

The latest effective snapshot for each active asset supplies current market
value. For quantity-based assets such as funds and stocks, effective
transactions supply quantity, weighted-average cost basis, realized profit,
dividends, fees, and taxes. Cash and other non-quantity assets remain
snapshot-driven. Transactions therefore participate in the derived position
view and holding-return calculation, but v1 is still not a full accounting
ledger.

This keeps v1 aligned with real personal usage: periodic valuation remains the
reliable source for current market value, while recorded transactions add the
quantity and cost information needed for securities.

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
- `balance_side` distinguishes assets from liabilities.
- `risk_level` and `channel` describe the current risk and account/channel
  context.
- `expected_annual_yield_pct` and `holding_cost_pct` are reference metadata,
  not guaranteed returns or realized performance.
- `status` describes the asset lifecycle, such as active or archived.
- External identifiers live under `identifiers`.

`asset_type` and `allocation_bucket` are separate because product type and allocation intent are different concepts.

### Snapshot

A snapshot is an observed valuation of one asset at one timestamp. `snapshot_date`
keeps the business date for reporting; `observed_at` records the precise
observation time.

Rules:

- Snapshot records are append-only by default.
- The latest effective snapshot per asset by `observed_at` is the source of
  current market value.
- `market_value` is the durable valuation fact.
- `source.method` is required.
- `quantity`, `unit_price`, and `cost_basis` are optional supporting fields.

Effective-state rule:

- Multiple observations for the same `asset_id + snapshot_date` are allowed.
- For a given `asset_id + observed_at`, there should be one effective head.
- If a snapshot corrects another snapshot, the correction chain tail is the effective record.
- The current loader rejects unknown correction targets but does not yet reject
  correction-chain branches; branch validation remains a follow-up hardening
  item.
- If a snapshot is voided, it is excluded from effective projections.

### Transaction

A transaction is an event fact.

Current V1 durable transaction types:

- `buy`.
- `sell`.
- `dividend`.
- `fee`.
- `tax`.
- `transfer_in`.
- `transfer_out`.
- `adjustment`.

The daily create endpoint currently exposes only `buy`, `sell`, and `dividend`.
The remaining types are retained for correction, reconciliation, or future
multi-account workflows; they are not ordinary manual-entry types.

Rules:

- Transactions are append-only by default.
- For quantity-based assets, effective transactions drive derived quantity,
  weighted-average cost basis, realized profit, dividends, fees, and taxes.
- Transactions do not replace snapshots as the source of current market value.
- Transactions can explain changes between snapshots and support holding-return
  cashflow analysis.
- `source.method` is required for every durable transaction fact.

### Correction

Corrections are complete replacement facts linked to the previous fact. Snapshot
corrections remain snapshot facts; transaction corrections currently accept any
of the eight durable transaction types for historical and back-office
compatibility, so the implementation does not require the replacement type to
match the original type.

Rules:

- Do not persist partial patch records. The snapshot correction API accepts
  omitted or JSON `null` optional fields as "keep the original value", then
  writes a complete replacement fact. For correction requests, `notes: ""`
  explicitly clears notes.
- A corrected snapshot is still a complete snapshot record under `13-财富/快照/**`.
- A corrected transaction is still a complete transaction record under `13-财富/交易/**`.
- Use `correction_of` to link to the previous fact.
- Use `correction_reason` to explain the correction.

Idempotency boundary:

- `snapshot.create` requires `Idempotency-Key` and stores a request hash for
  replay and conflict detection.
- `transaction.create`, `transaction.correct`, and `transaction.void` require
  `Idempotency-Key` and store request hashes for replay and conflict detection.
- `snapshot.correct` and `snapshot.void` currently do not accept an
  `Idempotency-Key`.
- Asset and allocation-target writes are controlled durable operations but do
  not currently provide idempotent replay protection.
- Synced original facts should not be edited unless they are clearly unsynced local mistakes.

### Void

A void is a tombstone fact that excludes another fact from effective projections.

Rules:

- Use voids for invalid facts that should remain auditable.
- Do not delete synced facts just because they are wrong.
- A void is not a secret-removal mechanism. If a secret is committed, rotate the secret and handle Git history deliberately.

Snapshot void path:

```text
13-财富/作废/YYYY/MM/<snapshot_date>-<asset_code>-<snap_void_id>.json
```

Transaction void path:

```text
13-财富/交易作废/YYYY/MM/<occurred_date>-<asset_code>-<txn_void_id>.json
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

Snapshot `market_value.amount` is stored as a non-negative decimal for both
assets and liabilities. For a liability, it represents the positive outstanding
amount; the holdings summary subtracts `total_liability` from `total_balance`
to produce net assets. The repository and API reject negative snapshot amounts.
Transaction `amount` remains a separate compatibility boundary: its decimal
shape and currency are validated, but negative transaction amounts are not
currently rejected.

## Allocation Buckets

V1 buckets represent personal allocation intent, not strict instrument taxonomy.

Use:

- `cash`: immediately available cash-like assets.
- `stable`: lower-volatility assets intended for stability or income.
- `growth`: higher-volatility assets intended for growth.
- `liability`: debts and negative net-worth items.
- `non-investment`: non-investment assets such as personal property or other
  tracked items outside the investment allocation buckets.

Do not use `allocation_bucket` as a market instrument type. That is `asset_type`.

## Deferred

Do not build these in v1:

- full double-entry ledger.
- FX rate facts and historical conversion.
- tax lots, FIFO/LIFO or other lot-selection methods, and complex performance
  attribution.
- independent security/instrument master.
- multi-owner or account permission model.
- historical classification dimensions.
- automatic market data ingestion as a required dependency.
- existing admin/management page refactors.

## Migration Notes

The initial baseline and CSV migration have been completed. The following list
records the finance concepts retained by the current implementation:

- Asset catalog.
- Snapshots.
- Transactions as event facts; for quantity-based assets they also provide
  derived position and holding-return inputs.
- Current holdings as a derived view.
- Allocation targets.
- Publish/status indicators as runtime state.

Existing implementation boundaries to discard:

- SQLite as source of truth.
- Direct DB writes as durable writes.
- CSV publish as the main write path.
- Agent write tools.

The current durable source is `personal-assets`; SQLite remains a rebuildable
cache and old CSV exports remain historical source material rather than an
active write path.
