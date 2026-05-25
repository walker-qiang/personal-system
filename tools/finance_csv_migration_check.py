#!/usr/bin/env python3
"""Check whether legacy finance CSV exports can map into finance fact model v1."""

from __future__ import annotations

import argparse
import csv
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import sys


ASSET_TYPE_MAP = {
    "cash-cny": "cash",
    "wealth-mgmt-product": "wealth_mgmt_product",
    "cn-stock": "securities_account",
    "etf-fund": "fund",
}

VALID_BUCKETS = {"cash", "stable", "growth"}
VALID_RISK_LEVELS = {"R1", "R2", "R3", "R4", "R5"}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def cents_to_amount(cents: str) -> str:
    amount = (Decimal(cents) / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return format(amount, "f")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--exports-dir",
        default="/Users/qiang.lilq/obsidian-wiki/finance/exports",
        help="Directory containing latest legacy finance CSV exports.",
    )
    parser.add_argument("--batch", default="2026-04-26", help="CSV batch date suffix.")
    args = parser.parse_args()

    base = Path(args.exports_dir)
    paths = {
        "assets": base / f"assets-{args.batch}.csv",
        "snapshots": base / f"snapshots-{args.batch}.csv",
        "targets": base / f"bucket_targets-{args.batch}.csv",
        "holdings": base / f"holdings-{args.batch}.csv",
        "transactions": base / f"transactions-{args.batch}.csv",
    }

    errors: list[str] = []
    warnings: list[str] = []

    for name, path in paths.items():
        if not path.exists():
            errors.append(f"missing {name} export: {path}")

    if errors:
        for item in errors:
            print(f"ERROR {item}", file=sys.stderr)
        return 1

    assets = read_csv(paths["assets"])
    snapshots = read_csv(paths["snapshots"])
    targets = read_csv(paths["targets"])
    holdings = read_csv(paths["holdings"])
    transactions = read_csv(paths["transactions"])

    asset_codes = [row["code"] for row in assets]
    duplicate_codes = [code for code, count in Counter(asset_codes).items() if count > 1]
    if duplicate_codes:
        errors.append(f"duplicate asset codes: {duplicate_codes}")

    asset_by_code = {row["code"]: row for row in assets}

    unknown_asset_types = sorted({row["asset_type"] for row in assets} - set(ASSET_TYPE_MAP))
    if unknown_asset_types:
        errors.append(f"unsupported legacy asset_type values: {unknown_asset_types}")

    unknown_buckets = sorted({row["bucket"] for row in assets} - VALID_BUCKETS)
    if unknown_buckets:
        errors.append(f"unsupported legacy bucket values: {unknown_buckets}")

    bad_risk = sorted({row["risk_level"] for row in assets if row["risk_level"] and row["risk_level"] not in VALID_RISK_LEVELS})
    if bad_risk:
        errors.append(f"unsupported risk_level values: {bad_risk}")

    currencies = sorted({row["currency"] for row in assets})
    if currencies != ["CNY"]:
        warnings.append(f"source currencies are not all CNY: {currencies}")

    for row in snapshots:
        code = row["asset_code"]
        if code not in asset_by_code:
            errors.append(f"snapshot references missing asset_code={code}")
            continue
        if cents_to_amount(row["balance_cents"]) != row["balance_yuan"]:
            errors.append(
                f"balance mismatch for {code} {row['snapshot_date']}: "
                f"{row['balance_cents']} cents != {row['balance_yuan']} yuan"
            )
        asset_expected = asset_by_code[code]["expected_yield_pct"] or ""
        snapshot_expected = row["expected_yield_pct"] or ""
        if asset_expected != snapshot_expected:
            warnings.append(
                f"expected yield differs for {code}: asset={asset_expected!r} snapshot={snapshot_expected!r}"
            )

    snapshot_codes = {row["asset_code"] for row in snapshots}
    missing_snapshot = sorted(set(asset_codes) - snapshot_codes)
    if missing_snapshot:
        warnings.append(f"assets without snapshot rows: {missing_snapshot}")

    holding_codes = {row["asset_code"] for row in holdings}
    if holding_codes != set(asset_codes):
        errors.append(
            "holdings asset_code set differs from assets: "
            f"missing={sorted(set(asset_codes)-holding_codes)} extra={sorted(holding_codes-set(asset_codes))}"
        )

    target_buckets = [row["bucket"] for row in targets]
    unknown_target_buckets = sorted(set(target_buckets) - VALID_BUCKETS)
    if unknown_target_buckets:
        errors.append(f"unsupported target bucket values: {unknown_target_buckets}")
    if len(target_buckets) != len(set(target_buckets)):
        errors.append("duplicate target bucket rows")

    target_sum = sum(Decimal(row["target_pct"]) for row in targets)
    if target_sum != Decimal("100"):
        warnings.append(f"target percentages sum to {target_sum}, not 100")

    if transactions:
        warnings.append(f"transactions export has {len(transactions)} rows; migration script must handle them explicitly")

    print(f"batch={args.batch}")
    print(f"assets={len(assets)} snapshots={len(snapshots)} targets={len(targets)} holdings={len(holdings)} transactions={len(transactions)}")
    print("asset_type_counts=", dict(Counter(row["asset_type"] for row in assets)))
    print("bucket_counts=", dict(Counter(row["bucket"] for row in assets)))
    print("asset_type_mapping=", ASSET_TYPE_MAP)
    print(f"target_sum={target_sum}")

    for item in warnings:
        print(f"WARN {item}")
    for item in errors:
        print(f"ERROR {item}", file=sys.stderr)

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
