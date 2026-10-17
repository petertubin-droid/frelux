#!/usr/bin/env python3
"""Apply pending Supabase migrations to production via the
Management API query endpoint (HTTPS only; sandbox blocks pooler
ports). Derives the pending list dynamically: repo migration files
under supabase/migrations/ that are NOT yet recorded in
supabase_migrations.schema_migrations, applied in filename order.
Each file is idempotent or guarded, so a file that was applied
without being recorded simply re-applies safely and gets recorded.
Stops at the first failure."""

import glob
import json
import os
import sys
import urllib.request

PROJECT = "nfgaaohweygwydoelxnf"
TOKEN = os.environ.get("SUPA_TOKEN") or os.environ["SUPABASE_ACCESS_TOKEN"]
URL = f"https://api.supabase.com/v1/projects/{PROJECT}/database/query"
MIGRATIONS_DIR = "supabase/migrations"


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


def applied_versions():
    """All versions recorded in supabase_migrations.schema_migrations."""
    ok, text = run_sql(
        "select version from supabase_migrations.schema_migrations"
    )
    if not ok:
        print(f"Cannot read migration history: {text}")
        sys.exit(2)
    return {row["version"] for row in json.loads(text)}


def repo_files():
    """[(version, filename)] for every repo migration, in order."""
    out = []
    for path in sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql"))):
        fname = os.path.basename(path)
        out.append((int(fname.split("_")[0]), fname))
    return out


def main():
    applied = applied_versions()
    files = repo_files()
    pending = [(v, f) for v, f in files if v not in applied]
    print(f"Repo: {len(files)} migrations, live-applied: {len(applied)}, pending: {len(pending)}")
    if not pending:
        print("ALL DONE — migration chain is fully in sync")
        return
    for v, fname in pending:
        short = fname.replace(".sql", "")
        with open(os.path.join(MIGRATIONS_DIR, fname), "r") as f:
            sql = f.read()
        print(f"APPLY {fname} ({len(sql)} chars)…", flush=True)
        ok, text = run_sql(sql)
        if not ok:
            print(f"FAILED {fname}: {text}")
            sys.exit(1)
        ok, text = run_sql(
            "insert into supabase_migrations.schema_migrations (version, name) "
            f"values ({v}, '{short}')"
        )
        if not ok:
            print(f"FAILED recording {fname}: history not updated: {text}")
            sys.exit(1)
        print(f"OK {fname}")
    print("ALL DONE")


if __name__ == "__main__":
    main()
