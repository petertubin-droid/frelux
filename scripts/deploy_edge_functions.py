#!/usr/bin/env python3
"""Deploy edge functions that are actually pending.

"Pending" is computed, not guessed: a function is deployed when it does not
exist remotely, or when its source directory has a commit newer than the
remote `updated_at`.

Each function is deployed with the `verify_jwt` value it already has in
production, passed explicitly. A bare `supabase functions deploy` (all
functions) would apply config.toml instead, and config.toml only pins the 23
functions that need `verify_jwt = false`; the other 56 would silently be
switched to requiring a JWT, which would break every anonymous endpoint.

Usage:
    SUPABASE_ACCESS_TOKEN=... python3 scripts/deploy_edge_functions.py [--dry-run]
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT = os.environ.get("PROJECT_REF", "nfgaaohweygwydoelxnf")
FUNCTIONS_DIR = "supabase/functions"


def api(path: str):
    token = os.environ.get("SUPABASE_ACCESS_TOKEN") or os.environ.get("SUPA_TOKEN")
    if not token:
        print("No SUPABASE_ACCESS_TOKEN in the environment.", file=sys.stderr)
        sys.exit(2)
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT}{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode() or "[]")
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:300]
        print(f"Cannot list functions (HTTP {e.code}): {detail}", file=sys.stderr)
        if e.code in (401, 403):
            print("The access token is invalid or lacks access to this project.", file=sys.stderr)
        sys.exit(2)


def remote_functions():
    """{slug: {verify_jwt, updated_at}}"""
    out = {}
    for fn in api("/functions"):
        out[fn["slug"]] = {
            "verify_jwt": fn.get("verify_jwt", True),
            "updated_at": fn.get("updated_at") or "",
        }
    return out


def local_functions():
    return sorted(
        d
        for d in os.listdir(FUNCTIONS_DIR)
        if os.path.isdir(os.path.join(FUNCTIONS_DIR, d)) and not d.startswith("_")
    )


def last_commit(path: str) -> str:
    """ISO date of the newest commit touching this path, or empty."""
    try:
        return subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", path],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except subprocess.CalledProcessError:
        return ""


def cli() -> list:
    if subprocess.run(["which", "supabase"], capture_output=True).returncode == 0:
        return ["supabase"]
    return ["npx", "--yes", "supabase@latest"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    remote = remote_functions()
    local = local_functions()
    todo = []

    for slug in local:
        info = remote.get(slug)
        if info is None:
            todo.append((slug, True, None, "missing remotely"))
            continue
        newest = last_commit(os.path.join(FUNCTIONS_DIR, slug))
        # Remote timestamps are UTC with a Z suffix; commits carry an offset.
        # Comparing the date prefixes is enough to decide "changed since".
        if newest and info["updated_at"] and newest[:19] > info["updated_at"][:19]:
            todo.append((slug, False, info["verify_jwt"], f"source {newest}"))

    print(f"Remote: {len(remote)} | local: {len(local)} | pending: {len(todo)}")
    for slug, missing, verify, why in todo:
        print(f"  {'NEW ' if missing else 'UPD '} {slug:34} verify_jwt={verify}  ({why})")

    orphan = sorted(set(remote) - set(local))
    if orphan:
        print(f"Remote-only (not deployed from this repo): {len(orphan)}")
        for slug in orphan:
            print(f"  --  {slug}")

    if not todo:
        print("ALL DONE — no edge function is pending")
        return 0
    if args.dry_run:
        print("DRY RUN — nothing deployed")
        return 0

    base = cli()
    failed = []
    for slug, missing, verify, _ in todo:
        cmd = base + [
            "functions",
            "deploy",
            slug,
            "--project-ref",
            PROJECT,
            # Bundle server-side: no Docker dependency on the runner.
            "--use-api",
        ]
        if verify is False:
            # Keep the anonymous-endpoint contract this function already has.
            cmd.append("--no-verify-jwt")
        print(f"\nDEPLOY {slug}", flush=True)
        result = subprocess.run(cmd)
        if result.returncode != 0:
            failed.append(slug)
            print(f"FAILED {slug}", file=sys.stderr)
            break
        print(f"OK {slug}")

    if failed:
        print(f"\n{len(failed)} function(s) failed: {failed}", file=sys.stderr)
        return 1
    print(f"\nALL DONE — deployed {len(todo)} function(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
