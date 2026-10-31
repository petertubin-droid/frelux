#!/usr/bin/env python3
"""Replay a window of migrations into a throwaway schema to prove ordering.

Supabase Preview replays the chain into an empty database, so a statement that
reads a table or column created by a later version fails only there, never in
production. This runs a window of migration files against a scratch schema
seeded with copies of the live prerequisite tables, then rolls everything back.

Usage:
  python3 scripts/replay_migration_window.py --start 20261030182000 \
      --end 20261030191000 --prereq price_scan_sources,market_profiles,estimation_materials
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEMA = "ci_replay"


def live_query(sql: str) -> str:
    """Run SQL through the Supabase Management API.

    The project token lives in the agent secrets file in shell form
    ("export NAME=$'...'"), so the shell sources it rather than Python
    parsing it.
    """
    ref = "nfgaaohweygwydoelxnf"
    payload = json.dumps({"query": sql})
    cmd = (
        "set -a; . /app/.agents/.env; set +a; "
        "curl -s -X POST "
        f"'https://api.supabase.com/v1/projects/{ref}/database/query' "
        "-H \"Authorization: Bearer $SUPABASE_ANON_KEY\" "
        "-H 'Content-Type: application/json' "
        "--data @-"
    )
    out = subprocess.run(
        ["bash", "-c", cmd],
        input=payload, capture_output=True, text=True, check=True,
    ).stdout
    return out


def rewrite(sql: str) -> str:
    # Only the objects the window owns are re-pointed; auth/storage/extensions
    # stay as they are because those schemas exist in the real database.
    return re.sub(r"\bpublic\.", f"{SCHEMA}.", sql)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--prereq", default="")
    ap.add_argument(
        "--extra-file", action="append", default=[],
        help="extra SQL file included before the window, to seed objects a "
             "persisted branch already has",
    )
    ap.add_argument(
        "--strip-cols", default="",
        help="table:col,col;table:col - drop these columns from the seeded copies, "
             "to reproduce a branch whose database is behind the files",
    )
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(ROOT, "supabase/migrations/*.sql")))
    window = []
    for path in files:
        base = os.path.basename(path)
        if "_rollback" in base:
            continue
        m = re.match(r"(\d+)_", base)
        if not m:
            continue
        v = m.group(1)
        if args.start <= v <= args.end:
            window.append(path)

    if not window:
        print("no files in that window")
        return 2

    prereq = [t.strip() for t in args.prereq.split(",") if t.strip()]
    parts = ["begin;", f"drop schema if exists {SCHEMA} cascade;", f"create schema {SCHEMA};"]
    for table in prereq:
        # Views cannot be copied with LIKE; recreate them from their live
        # definition instead.
        parts.append(
            f"""do $seed$ declare d text; begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='{table}') then
    select pg_get_viewdef('public.{table}'::regclass, true) into d;
    execute 'create view {SCHEMA}.{table} as ' || d;
  else
    execute 'create table {SCHEMA}.{table} (like public.{table} including all)';
  end if;
end $seed$;"""
        )
    for spec in (x.strip() for x in args.strip_cols.split(";")):
        if not spec:
            continue
        table, _, cols = spec.partition(":")
        for col in (c.strip() for c in cols.split(",") if c.strip()):
            parts.append(f"alter table {SCHEMA}.{table} drop column if exists {col};")
    for extra in args.extra_file:
        with open(extra) as fh:
            parts.append(f"\n-- ===== seed {os.path.basename(extra)}\n")
            parts.append(rewrite(fh.read()))
    for path in window:
        with open(path) as fh:
            parts.append(f"\n-- ===== {os.path.basename(path)}\n")
            parts.append(rewrite(fh.read()))
    parts.append("select 'replayed' as result;")
    parts.append("rollback;")

    sql = "\n".join(parts)
    out = live_query(sql)
    try:
        payload = json.loads(out)
    except json.JSONDecodeError:
        print(out[:2000])
        return 1

    if isinstance(payload, dict) and payload.get("message"):
        print("FAILED:", payload["message"][:1500])
        return 1

    print(f"OK: replayed {len(window)} file(s) into {SCHEMA} and rolled back")
    for path in window:
        print("  -", os.path.basename(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
