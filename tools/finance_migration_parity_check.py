#!/usr/bin/env python3
"""Check migrated personal-assets finance facts against legacy CSV exports."""

from __future__ import annotations

import argparse
import csv
from decimal import Decimal
import json
from pathlib import Path
import sys


ASSET_TYPE_MAP = {
    "cash-cny": "cash",
    "wealth-mgmt-product": "wealth_mgmt_product",
    "cn-stock": "securities_account",
    "etf-fund": "fund",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def parse_scalar(raw: str) -> object:
    raw = raw.strip()
    if raw == "null":
        return None
    if raw in {"[]", "{}"}:
        return raw
    if raw.startswith('"') and raw.endswith('"'):
        return json.loads(raw)
    return raw


def read_simple_yaml(path: Path) -> dict[str, object]:
    data: dict[str, object] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith(" ") or line.startswith("-"):
            continue
        key, sep, raw = line.partition(":")
        if not sep:
            continue
        data[key] = parse_scalar(raw)
    return data


def asset_id_from_code(code: str) -> str:
    return "ast_" + "".join(ch if ch.isalnum() else "_" for ch in code.lower()).strip("_")


def money_to_cents(amount: str) -> int:
    return int((Decimal(amount) * Decimal("100")).to_integral_exact())


def nullable_decimal(raw: object) -> Decimal | None:
    if raw is None or raw == "":
        return None
    return Decimal(str(raw))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-root", default="/Users/qiang.lilq/personal-system/personal-assets")
    parser.add_argument("--exports-dir", default="/Users/qiang.lilq/obsidian-wiki/finance/exports")
    parser.add_argument("--batch", default="2026-04-26")
    args = parser.parse_args()

    root = Path(args.assets_root)
    exports = Path(args.exports_dir)
    errors: list[str] = []

    legacy_assets = read_csv(exports / f"assets-{args.batch}.csv")
    legacy_snapshots = read_csv(exports / f"snapshots-{args.batch}.csv")
    legacy_holdings = read_csv(exports / f"holdings-{args.batch}.csv")
    legacy_targets = read_csv(exports / f"bucket_targets-{args.batch}.csv")

    migrated_assets = {
        item["code"]: item
        for item in (
            read_simple_yaml(path)
            for path in sorted((root / "finance" / "assets").glob("*.yaml"))
        )
    }

    if len(migrated_assets) != len(legacy_assets):
        errors.append(f"asset count mismatch: migrated={len(migrated_assets)} legacy={len(legacy_assets)}")

    legacy_codes = {row["code"] for row in legacy_assets}
    migrated_codes = set(migrated_assets)
    if legacy_codes != migrated_codes:
        errors.append(f"asset code set mismatch: missing={sorted(legacy_codes-migrated_codes)} extra={sorted(migrated_codes-legacy_codes)}")

    for row in legacy_assets:
        migrated = migrated_assets.get(row["code"])
        if not migrated:
            continue
        checks = {
            "id": asset_id_from_code(row["code"]),
            "asset_type": ASSET_TYPE_MAP[row["asset_type"]],
            "allocation_bucket": row["bucket"],
            "currency": row["currency"],
            "risk_level": row["risk_level"],
            "status": "active",
        }
        for field, expected in checks.items():
            if migrated.get(field) != expected:
                errors.append(f"asset {row['code']} {field} mismatch: {migrated.get(field)!r} != {expected!r}")
        if nullable_decimal(migrated.get("holding_cost_pct")) != nullable_decimal(row["holding_cost_pct"]):
            errors.append(f"asset {row['code']} holding_cost_pct mismatch")
        if nullable_decimal(migrated.get("expected_annual_yield_pct")) != nullable_decimal(row["expected_yield_pct"]):
            errors.append(f"asset {row['code']} expected_annual_yield_pct mismatch")

    snapshots: dict[tuple[str, str], dict[str, object]] = {}
    for path in sorted((root / "finance" / "snapshots").glob("*/*/*.json")):
        item = json.loads(path.read_text(encoding="utf-8"))
        snapshots[(item["asset_id"], item["snapshot_date"])] = item

    if len(snapshots) != len(legacy_snapshots):
        errors.append(f"snapshot count mismatch: migrated={len(snapshots)} legacy={len(legacy_snapshots)}")

    for row in legacy_snapshots:
        key = (asset_id_from_code(row["asset_code"]), row["snapshot_date"])
        snapshot = snapshots.get(key)
        if not snapshot:
            errors.append(f"missing snapshot for {row['asset_code']} {row['snapshot_date']}")
            continue
        if money_to_cents(snapshot["market_value"]["amount"]) != int(row["balance_cents"]):
            errors.append(f"snapshot balance mismatch for {row['asset_code']} {row['snapshot_date']}")
        if snapshot["market_value"]["currency"] != migrated_assets[row["asset_code"]]["currency"]:
            errors.append(f"snapshot currency mismatch for {row['asset_code']} {row['snapshot_date']}")
        if nullable_decimal(snapshot.get("expected_annual_yield_pct")) != nullable_decimal(row["expected_yield_pct"]):
            errors.append(f"snapshot expected yield mismatch for {row['asset_code']} {row['snapshot_date']}")

    latest_by_asset: dict[str, dict[str, object]] = {}
    for (asset_id, snapshot_date), snapshot in snapshots.items():
        current = latest_by_asset.get(asset_id)
        if current is None or snapshot_date > current["snapshot_date"]:
            latest_by_asset[asset_id] = snapshot

    for row in legacy_holdings:
        asset_id = asset_id_from_code(row["asset_code"])
        snapshot = latest_by_asset.get(asset_id)
        if not snapshot:
            errors.append(f"missing migrated holding snapshot for {row['asset_code']}")
            continue
        if money_to_cents(snapshot["market_value"]["amount"]) != int(row["balance_cents"]):
            errors.append(f"holding balance mismatch for {row['asset_code']}")
        migrated_asset = migrated_assets[row["asset_code"]]
        if migrated_asset["allocation_bucket"] != row["bucket"]:
            errors.append(f"holding bucket mismatch for {row['asset_code']}")
        if migrated_asset["currency"] != row["currency"]:
            errors.append(f"holding currency mismatch for {row['asset_code']}")

    target_sum = sum(Decimal(row["target_pct"]) for row in legacy_targets)

    if errors:
        for error in errors:
            print(f"ERROR {error}", file=sys.stderr)
        return 1

    print(f"assets={len(migrated_assets)}")
    print(f"snapshots={len(snapshots)}")
    print(f"holdings={len(legacy_holdings)}")
    print(f"target_sum={target_sum}")
    print("parity=ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
