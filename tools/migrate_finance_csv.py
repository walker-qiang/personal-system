#!/usr/bin/env python3
"""Migrate legacy finance CSV exports into personal-assets finance facts."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
from pathlib import Path
import re
import sys


ASSET_TYPE_MAP = {
    "cash-cny": "cash",
    "wealth-mgmt-product": "wealth_mgmt_product",
    "cn-stock": "securities_account",
    "etf-fund": "fund",
}

VALID_BUCKETS = {"cash", "stable", "growth"}
VALID_RISK_LEVELS = {"R1", "R2", "R3", "R4", "R5"}
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def slug_to_id(prefix: str, code: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", code.lower()).strip("_")
    return f"{prefix}_{slug}"


def hash_id(prefix: str, key: str, length: int = 26) -> str:
    value = int.from_bytes(hashlib.sha256(key.encode("utf-8")).digest(), "big")
    chars: list[str] = []
    for _ in range(length):
        chars.append(CROCKFORD[value & 31])
        value >>= 5
    return f"{prefix}_{''.join(reversed(chars))}"


def cents_to_amount(cents: str) -> str:
    amount = (Decimal(cents) / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return format(amount, "f")


def nullable_number(raw: str) -> Decimal | None:
    if raw == "":
        return None
    return Decimal(raw)


def yaml_scalar(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(str(value), ensure_ascii=False)


def render_asset_yaml(row: dict[str, str]) -> str:
    asset_id = slug_to_id("ast", row["code"])
    asset_type = ASSET_TYPE_MAP[row["asset_type"]]
    expected = nullable_number(row["expected_yield_pct"])
    holding_cost = nullable_number(row["holding_cost_pct"])
    risk_level = row["risk_level"] or None
    notes = row["notes"] or ""

    lines = [
        "schema_version: 1",
        f"id: {asset_id}",
        f"code: {row['code']}",
        f"name: {yaml_scalar(row['name'])}",
        f"asset_type: {asset_type}",
        f"allocation_bucket: {row['bucket']}",
        f"currency: {row['currency']}",
        f"risk_level: {yaml_scalar(risk_level)}",
        f"channel: {yaml_scalar(row['channel'])}",
        "identifiers: {}",
        f"expected_annual_yield_pct: {yaml_scalar(expected)}",
        f"holding_cost_pct: {yaml_scalar(holding_cost)}",
        "status: active",
        "tags: []",
        f"notes: {yaml_scalar(notes)}",
        f"created_at: {yaml_scalar(row['created_at'])}",
        f"updated_at: {yaml_scalar(row['created_at'])}",
        "",
    ]
    return "\n".join(lines)


def render_snapshot(row: dict[str, str], asset: dict[str, str], source_path: Path, row_number: int) -> dict[str, object]:
    asset_id = slug_to_id("ast", row["asset_code"])
    snapshot_id = hash_id("snap", f"snapshot:{row['asset_code']}:{row['snapshot_date']}")
    return {
        "schema_version": 1,
        "id": snapshot_id,
        "asset_id": asset_id,
        "snapshot_date": row["snapshot_date"],
        "market_value": {
            "amount": cents_to_amount(row["balance_cents"]),
            "currency": asset["currency"],
        },
        "quantity": None,
        "unit_price": None,
        "cost_basis": None,
        "expected_annual_yield_pct": float(row["expected_yield_pct"]) if row["expected_yield_pct"] else None,
        "actual_yield_pct": float(row["actual_yield_pct"]) if row["actual_yield_pct"] else None,
        "source": {
            "method": "import",
            "ref": f"csv:{source_path}#row={row_number}",
        },
        "correction_of": None,
        "correction_reason": None,
        "notes": row["notes"] or "",
        "created_at": row["created_at"],
        "created_by": "migration",
    }


def render_targets(rows: list[dict[str, str]], source_batch: str) -> str:
    updated_at = max((row["updated_at"] for row in rows), default="")
    lines = [
        "schema_version: 1",
        "base_currency: CNY",
        "targets:",
    ]
    for row in sorted(rows, key=lambda item: item["bucket"]):
        lines.extend(
            [
                f"  - allocation_bucket: {row['bucket']}",
                f"    target_pct: {row['target_pct']}",
                f"    notes: {yaml_scalar(row['notes'] or '')}",
                f"    updated_at: {yaml_scalar(row['updated_at'])}",
            ]
        )
    lines.extend(
        [
            f"updated_at: {yaml_scalar(updated_at or None)}",
            f"notes: {yaml_scalar(f'Migrated from bucket_targets-{source_batch}.csv')}",
            "",
        ]
    )
    return "\n".join(lines)


def validate_inputs(assets: list[dict[str, str]], snapshots: list[dict[str, str]], targets: list[dict[str, str]]) -> list[str]:
    errors: list[str] = []
    asset_codes = [row["code"] for row in assets]
    duplicates = sorted({code for code in asset_codes if asset_codes.count(code) > 1})
    if duplicates:
        errors.append(f"duplicate asset codes: {duplicates}")

    asset_by_code = {row["code"]: row for row in assets}
    for row in assets:
        if row["asset_type"] not in ASSET_TYPE_MAP:
            errors.append(f"unsupported asset_type {row['asset_type']} for {row['code']}")
        if row["bucket"] not in VALID_BUCKETS:
            errors.append(f"unsupported bucket {row['bucket']} for {row['code']}")
        if row["risk_level"] and row["risk_level"] not in VALID_RISK_LEVELS:
            errors.append(f"unsupported risk_level {row['risk_level']} for {row['code']}")

    for row in snapshots:
        asset = asset_by_code.get(row["asset_code"])
        if not asset:
            errors.append(f"snapshot references missing asset {row['asset_code']}")
            continue
        if cents_to_amount(row["balance_cents"]) != row["balance_yuan"]:
            errors.append(f"balance mismatch for {row['asset_code']} {row['snapshot_date']}")
        if row["expected_yield_pct"] != asset["expected_yield_pct"]:
            errors.append(f"expected yield mismatch for {row['asset_code']}")

    for row in targets:
        if row["bucket"] not in VALID_BUCKETS:
            errors.append(f"unsupported target bucket {row['bucket']}")
        target_pct = Decimal(row["target_pct"])
        if target_pct < 0 or target_pct > 100:
            errors.append(f"target_pct out of range for {row['bucket']}: {target_pct}")

    return errors


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets-root", default="/Users/qiang.lilq/personal-system/personal-assets")
    parser.add_argument("--exports-dir", default="/Users/qiang.lilq/obsidian-wiki/finance/exports")
    parser.add_argument("--batch", default="2026-04-26")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    assets_root = Path(args.assets_root)
    exports_dir = Path(args.exports_dir)
    source_paths = {
        "assets": exports_dir / f"assets-{args.batch}.csv",
        "snapshots": exports_dir / f"snapshots-{args.batch}.csv",
        "targets": exports_dir / f"bucket_targets-{args.batch}.csv",
        "transactions": exports_dir / f"transactions-{args.batch}.csv",
    }

    for path in source_paths.values():
        if not path.exists():
            print(f"missing source file: {path}", file=sys.stderr)
            return 1

    assets = read_csv(source_paths["assets"])
    snapshots = read_csv(source_paths["snapshots"])
    targets = read_csv(source_paths["targets"])
    transactions = read_csv(source_paths["transactions"])
    errors = validate_inputs(assets, snapshots, targets)
    if transactions:
        errors.append("transactions source has rows; transaction migration is intentionally not implemented yet")
    if errors:
        for error in errors:
            print(f"ERROR {error}", file=sys.stderr)
        return 1

    asset_by_code = {row["code"]: row for row in assets}
    writes: list[tuple[Path, str]] = []

    for row in assets:
        writes.append((assets_root / "finance" / "assets" / f"{row['code']}.yaml", render_asset_yaml(row)))

    for row_number, row in enumerate(snapshots, start=2):
        snapshot = render_snapshot(row, asset_by_code[row["asset_code"]], source_paths["snapshots"], row_number)
        year, month, _day = row["snapshot_date"].split("-")
        path = (
            assets_root
            / "finance"
            / "snapshots"
            / year
            / month
            / f"{row['snapshot_date']}-{row['asset_code']}-{snapshot['id']}.json"
        )
        writes.append((path, json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n"))

    writes.append((assets_root / "finance" / "targets.yaml", render_targets(targets, args.batch)))

    audit = {
        "schema_version": 1,
        "operation": "finance.csv_migration",
        "source_batch": args.batch,
        "source_files": {name: str(path) for name, path in source_paths.items()},
        "counts": {
            "assets": len(assets),
            "snapshots": len(snapshots),
            "targets": len(targets),
            "transactions": len(transactions),
        },
        "asset_type_mapping": ASSET_TYPE_MAP,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "notes": "Generated deterministic finance facts from legacy CSV exports.",
    }
    writes.append(
        (
            assets_root / "system" / "audit" / "2026" / "05" / f"finance-csv-migration-{args.batch}.json",
            json.dumps(audit, ensure_ascii=False, indent=2) + "\n",
        )
    )

    if args.dry_run:
        print(f"dry_run writes={len(writes)}")
        for path, _content in writes[:10]:
            print(path)
        if len(writes) > 10:
            print(f"... {len(writes) - 10} more")
        return 0

    for path, content in writes:
        write_text(path, content)

    print(f"wrote {len(assets)} assets")
    print(f"wrote {len(snapshots)} snapshots")
    print(f"wrote {len(targets)} targets")
    print(f"wrote audit {args.batch}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
