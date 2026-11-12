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
from datetime import datetime, timezone
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


def config_verify_jwt() -> dict:
    """verify_jwt per function from supabase/config.toml.

    A brand-new function has no production value to inherit, so the pinned
    config is the only statement of whether it may be called anonymously.
    """
    path = os.path.join("supabase", "config.toml")
    values: dict = {}
    current = None
    try:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line.startswith("[functions.") and line.endswith("]"):
                    current = line[len("[functions.") : -1]
                    continue
                if line.startswith("[") and current:
                    current = None
                    continue
                if (
                    current
                    and line.startswith("verify_jwt")
                    and "=" in line
                ):
                    value = line.split("=", 1)[1].strip().lower()
                    values[current] = value == "true"
    except FileNotFoundError:
        pass
    return values


def local_functions():
    return sorted(
        d
        for d in os.listdir(FUNCTIONS_DIR)
        if os.path.isdir(os.path.join(FUNCTIONS_DIR, d)) and not d.startswith("_")
    )


def to_dt(value):
    """Parse a remote timestamp (epoch ms) or a commit date (ISO) to UTC."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


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

    pinned = config_verify_jwt()

    for slug in local:
        info = remote.get(slug)
        if info is None:
            # Prefer the pinned config over the CLI default (which requires a JWT
            # and would break an anonymous endpoint).
            todo.append((slug, True, pinned.get(slug), "missing remotely"))
            continue
        newest = to_dt(last_commit(os.path.join(FUNCTIONS_DIR, slug)))
        deployed = to_dt(info["updated_at"])
        # The Management API reports updated_at as epoch milliseconds, while git
        # gives an ISO date with an offset, so both are normalised to aware UTC
        # datetimes before comparing.
        if newest and deployed and newest > deployed:
            todo.append(
                (slug, False, info["verify_jwt"], f"source {newest.isoformat()}")
            )

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
            # CLI v3 refuses hosted mutations in non-interactive/agent runs
            # without this. Calling this script IS the decision to deploy; the
            # pending list is printed above before anything is touched.
            "--yes",
        ]
        if verify is False:
            # Keep the anonymous-endpoint contract this function already has
            # (or has just been given in config.toml, for a new function).
            cmd.append("--no-verify-jwt")
        elif verify is None:
            print(
                f"WARNING {slug}: verify_jwt not pinned in config.toml; the CLI "
                "default (JWT required) will apply.",
                file=sys.stderr,
            )
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
