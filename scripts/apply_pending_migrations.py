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
    "20261013230000_electrical_books_ng_ca_au_in.sql",
    "20261013240000_electrical_books_gh_ke_za.sql",
    "20261013250000_electrical_books_fr_br_sa_ae.sql",
    "20261013260000_electrical_books_it_mx_jp.sql",
    "20261013270000_electrical_books_cn_id_kr.sql",
    "20261014040000_wall_finishing_project_type.sql",
    "20261014130000_engine_capability_registry.sql",
    "20261014140000_construction_standards_evidence.sql",
    "20261014150000_comprehensive_engine_inventory.sql",
    "20261014160000_reconcile_engine_registry.sql",
    "20261014170000_doors_windows_books_us_gb_de.sql",
    "20261014230000_doors_windows_books_ca.sql",
    "20261015010000_doors_windows_books_za_fr.sql",
    "20261015020000_doors_windows_books_ke.sql",
    "20261015030000_doors_windows_books_au.sql",
    "20261015040000_doors_windows_books_in.sql",
    "20261015050000_doors_windows_books_gh.sql",
    "20261015120000_doors_windows_book_ng.sql",
    "20261015130000_doors_windows_book_it.sql",
    "20261015140000_doors_windows_book_br.sql",
    "20261015150000_doors_windows_book_sa.sql",
    "20261015160000_doors_windows_book_ae.sql",
    "20261015170000_doors_windows_book_mx.sql",
    "20261015180000_doors_windows_book_jp.sql",
    "20261015190000_doors_windows_book_id.sql",
    "20261015200000_doors_windows_book_kr.sql",
    "20261015210000_doors_windows_book_cn.sql",
    "20261015220000_monetization_rpc_hardening.sql",
    "20261015230000_plumbing_book_gh.sql",
    "20261015240000_plumbing_book_ke.sql",
    "20261015250000_plumbing_book_za.sql",
    "20261015260000_plumbing_book_in.sql",
    "20261015270000_plumbing_book_jp.sql",
    "20261015280000_plumbing_book_fr.sql",
    "20261015290000_plumbing_book_it.sql",
    "20261015300000_plumbing_book_br.sql",
    "20261015310000_plumbing_book_mx.sql",
    "20261015320000_plumbing_book_au.sql",
    "20261015330000_plumbing_book_ca.sql",
    "20261015340000_plumbing_book_sa.sql",
    "20261015350000_plumbing_book_ae.sql",
    "20261015360000_plumbing_book_cn.sql",
    "20261015370000_plumbing_book_id.sql",
    "20261015380000_plumbing_book_kr.sql",
    "20261015390000_project_expenses.sql",
    "20261015400000_boq_revisions_bank.sql",
    "20261015410000_workflow_rfi_submittals_co.sql",
    "20261015420000_integration_secrets.sql",
    "20261015430000_revoke_anon_integration_secrets.sql",
    "20261015440000_workflow_notify.sql",
    "20261015450000_workflow_push.sql",
    "20261015460000_keys_public_disclosure.sql",
    "20261016020000_workflow_participants.sql",
    "20261016030000_workflow_attachments.sql",
    "20261015000000_us_construction_standards.sql",
    "20261015161000_gb_construction_standards.sql",
    "20261015162000_rollout_standards_cn_it_ng_ae.sql",
    "20261015163000_it_engine_capability_verified.sql",
    "20261015164000_it_capability_pair_fix.sql",
    "20261015700000_gh_construction_standards.sql",
    "20261015710000_ke_construction_standards.sql",
    "20261015720000_za_construction_standards.sql",
    "20261016040000_hybrid_pricing_systems.sql",
    "20261016050000_materials_pricing_automation_columns.sql",
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
