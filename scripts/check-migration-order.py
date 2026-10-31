#!/usr/bin/env python3
"""Static replay-order check for the migration chain.

Supabase Preview replays every migration against an empty database, so a file
that touches an object created by a LATER version fails there even though
production accepted it (the object already existed there from an earlier
manual change). This walks the chain in version order and reports every
explicitly `public.`-qualified reference to an object that no earlier file
creates.

Objects already present in the live database but never created by any file in
the repo are treated as pre-existing, not as errors. Only `public.`-qualified
names are checked, so system schemas (auth, storage, pg_catalog) and bare
aliases are ignored.

Usage:
  python3 scripts/check-migration-order.py [--live /tmp/live_objs.json]
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CREATE_RE = re.compile(
    r"create\s+(?:or\s+replace\s+)?(?:table|view|materialized\s+view|function|type)\s+"
    r"(?:if\s+not\s+exists\s+)?(?:public\.)?\"?([a-z_][a-z0-9_]*)\"?",
    re.I,
)

# Statements that require an already-existing public object.
REFERENCE_PATTERNS = [
    re.compile(r"alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"insert\s+into\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"delete\s+from\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"update\s+public\.\"?([a-z_][a-z0-9_]*)\"?\s+[a-z]*\s*set\b", re.I),
    re.compile(r"create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?[a-z0-9_]+\s+on\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"create\s+policy\s+(?:\"[^\"]+\"|[a-z0-9_]+)\s+on\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"references\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"\bfrom\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"\bjoin\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"create\s+trigger\s+[a-z0-9_]+\s+.*?\bon\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I | re.S),
    re.compile(r"grant\s+[a-z ,]+on\s+(?:table\s+)?public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
    re.compile(r"comment\s+on\s+(?:table|view|column)\s+public\.\"?([a-z_][a-z0-9_]*)\"?", re.I),
]


def strip_comments(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)
    return re.sub(r"--[^\n]*", " ", sql)


def strip_dollar_blocks(sql: str) -> str:
    """Drop function bodies: identifiers inside PL/pgSQL are not replay hazards."""
    return re.sub(r"\$\$.*?\$\$", " $$ $$ ", sql, flags=re.S)


def migration_files() -> list[tuple[str, str]]:
    out = []
    for path in sorted(glob.glob(os.path.join(ROOT, "supabase/migrations/*.sql"))):
        base = os.path.basename(path)
        if "_rollback" in base:
            continue
        m = re.match(r"(\d+)_", base)
        if m:
            out.append((m.group(1), path))
    return out


def main() -> int:
    live_path = "/tmp/live_objs.json"
    if "--live" in sys.argv:
        live_path = sys.argv[sys.argv.index("--live") + 1]
    live: set[str] = set()
    if os.path.exists(live_path):
        with open(live_path) as fh:
            live = {r["table_name"].lower() for r in json.load(fh)}

    files = migration_files()

    # Pass 1: which version creates each object, across the whole chain. An
    # object that some migration creates is never "pre-existing", no matter
    # that it exists in the live database - it got there by that migration.
    creator: dict[str, str] = {}
    for version, path in files:
        with open(path) as fh:
            sql = strip_dollar_blocks(strip_comments(fh.read()))
        for m in CREATE_RE.finditer(sql):
            creator.setdefault(m.group(1).lower(), version)

    created: dict[str, str] = {}
    problems: list[tuple[str, str, str]] = []

    for version, path in files:
        with open(path) as fh:
            sql = strip_dollar_blocks(strip_comments(fh.read()))

        local = {m.group(1).lower() for m in CREATE_RE.finditer(sql)}
        # Objects with no creating migration at all are genuine legacy
        # furniture (created by hand before the chain existed).
        legacy = {name for name in live if name not in creator}
        known = set(created) | legacy | local

        # ARCHIE lives in its own project and its files must not be touched
        # from here (owner instruction), so they are not part of this gate.
        if "archie" in os.path.basename(path).lower() and "--include-archie" not in sys.argv:
            for name in local:
                created.setdefault(name, version)
            continue

        for pattern in REFERENCE_PATTERNS:
            for m in pattern.finditer(sql):
                name = m.group(1).lower()
                if name in known:
                    continue
                snippet = " ".join(sql[max(0, m.start() - 50): m.end() + 50].split())
                problems.append((os.path.basename(path), name, snippet[:170]))

        for name in local:
            created.setdefault(name, version)

    if problems:
        print(f"{len(problems)} replay-order problem(s):\n")
        for base, name, snippet in problems:
            print(f"  {base} -> public.{name}")
            print(f"    ...{snippet}...")
        return 1
    print(f"OK: {len(created)} public objects, no forward references across the chain")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
