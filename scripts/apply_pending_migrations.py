#!/usr/bin/env python3
"""Apply pending Supabase migrations to production via the
Management API query endpoint (HTTPS only; sandbox blocks pooler
ports). Records each applied version in supabase_migrations so the
CLI history stays consistent. Stops at the first failure."""

import json
import os
import sys
import urllib.request

PROJECT = "nfgaaohweygwydoelxnf"
TOKEN = os.environ["SUPA_TOKEN"]
URL = f"https://api.supabase.com/v1/projects/{PROJECT}/database/query"
MIGRATIONS_DIR = "supabase/migrations"

PENDING = [
    "20261013000000_international_expansion_markets.sql",
    "20261013010000_expansion_finish_systems.sql",
    "20261013100000_expansion_price_books.sql",
    "20261013120000_production_catalog_sync.sql",
    "20261013130000_za_rhinolite_cashbuild.sql",
    "20261013140000_za_interior_paint.sql",
    "20261013150000_role_mappings_native_markets.sql",
    "20261014000000_international_expansion_markets_cn_id_mx_kr_it.sql",
    "20261014010000_frelux_centralized_ai_gateway_and_ad_monetization.sql",
    "20261014020000_frelux_ai_credit_economy_and_profile_rewards.sql",
    "20261014030000_unpaid_daily_ad_limit_and_guest_ad_unlock.sql",
    "20261014110000_price_intel_pipeline.sql",
    "20261014120000_market_rankings.sql",
]


def run_sql(sql: str):
    """Run one SQL script; return (ok, response_text)."""
    payload = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return True, resp.read().decode()[:2000]
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:2000]
        return False, f"HTTP {e.code}: {body}"


def already_applied(version: int) -> bool:
    ok, text = run_sql(
        "select count(*)::int as n from supabase_migrations.schema_migrations"
        f" where version = {version}"
    )
    return ok and json.loads(text)[0]["n"] > 0


def record(version: int, name: str, sql: str) -> bool:
    payload = json.dumps({"query": sql})
    ok, text = run_sql(
        "insert into supabase_migrations.schema_migrations (version, name) "
        f"values ({version}, '{name}')"
    )
    return ok


def main():
    failures = 0
    for fname in PENDING:
        version = int(fname.split("_")[0])
        short = fname.replace(".sql", "")
        if already_applied(version):
            print(f"SKIP {fname} (already recorded)")
            continue
        with open(os.path.join(MIGRATIONS_DIR, fname), "r") as f:
            sql = f.read()
        print(f"APPLY {fname} ({len(sql)} chars)…", flush=True)
        ok, text = run_sql(sql)
        if not ok:
            print(f"FAILED {fname}: {text}")
            failures += 1
            break
        if not record(version, short, sql):
            print(f"FAILED recording {fname}: history not updated")
            failures += 1
            break
        print(f"OK {fname}")
    if failures:
        sys.exit(1)
    print("ALL DONE")


if __name__ == "__main__":
    main()
