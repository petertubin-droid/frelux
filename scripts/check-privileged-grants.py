#!/usr/bin/env python3
"""Fail when a privileged function is created after the migration that locked it.

Postgres grants EXECUTE to PUBLIC on CREATE FUNCTION. A later migration that
recreates a protected function therefore reopens the anonymous path silently,
which is exactly how log_estimation_price_change came back open after
20261031160000_harden_privileged_writers.sql revoked it.

This is the CI half of the guard. The hourly public.security_grant_findings
monitor is the production half, for grants applied by hand.

Rule per protected function: the newest migration that contains a REVOKE for it
must not be older than the newest migration that creates it.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

MIGRATIONS = Path("supabase/migrations")

# Every function locked to service_role, or to authenticated plus service_role,
# by the 2026-11-01 hardening set.
PROTECTED = [
    # service_role only
    "apply_market_material_prices",
    "apply_community_prices",
    "mark_stale_material_prices_placeholder",  # guards against a typo'd rename
    "mark_stale_market_prices",
    "dispatch_market_scans",
    "close_stale_scan_runs",
    "refresh_market_material_price",
    "log_estimation_price_change",
    "store_social_token",
    "seed_reward_catalogue",
    "frelux_release_engine_lock",
    "frelux_archie_snapshot_knowledge",
    "apply_subscription_purchase",
    "credit_token_purchase",
    "award_ad_credits",
    "award_offerwall_credits",
    "reverse_offerwall_credits",
    "redeem_reward",
    "unlock_ai_feature_via_ad",
    "unlock_guest_daily_ai_allowance",
    "spend_credits",
    "update_mission_progress",
    "record_activity",
    "api_wallet_for",
    "refresh_subscription_local_prices",
    "cleanup_old_errors",
    "ensure_user_default_workspace",
    "diaspora_notify",
    "frelux_try_engine_lock",
    "generate_weekly_mission_if_needed",
    "apply_catalogue_aliases",
    "request_catalogue_sync",
    "stage_catalogue_product",
    "automap_catalogue_products",
    "classify_catalogue_backlog",
    "process_catalogue_responses",
    "recompute_source_reliability",
    "mark_observation_outliers",
    "sync_price_evidence_counts",
    "market_price_observation_guard",
    "charge_api_request",
    "consume_reward_grant",
    "get_user_push_subscriptions",
    "get_message_recipient_subscriptions",
    "get_verification_tier",
    "is_project_member",
    "audit_privileged_execute_grants",
    # authenticated plus service_role
    "approve_verification",
    "market_scan_overview",
    "get_price_update_summaries",
    "get_user_verification_tier",
    "check_pro_level_eligibility",
    "price_group_progress",
    "complete_credit_task",
    "price_scan_coverage",
    "price_market_readiness",
]

# Names that were never real functions. They are skipped so a rename cannot
# pass CI by looking "already handled".
IGNORE = {"mark_stale_material_prices_placeholder"}

CREATE = r"create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?%s\b"
# A lock is either a direct REVOKE naming the function, or the function's name
# inside a migration that performs REVOKEs dynamically in a DO block, which is
# how these migrations are written (they resolve the signature from pg_proc so
# they cannot drift from the live schema).
REVOKE_DYNAMIC = r"revoke\s+(?:all\s+)?on\s+function"


def version_of(path: Path) -> int:
    head = path.name.split("_", 1)[0]
    return int(head) if head.isdigit() else 0


def main() -> int:
    if not MIGRATIONS.is_dir():
        print(f"missing {MIGRATIONS}", file=sys.stderr)
        return 2

    files = sorted(MIGRATIONS.glob("*.sql"), key=version_of)
    texts = [(version_of(p), p.name, p.read_text(encoding="utf-8", errors="ignore")) for p in files]

    problems: list[str] = []
    for name in PROTECTED:
        if name in IGNORE:
            continue
        create_pat = re.compile(CREATE % re.escape(name), re.IGNORECASE)
        name_pat = re.compile(r"\b%s\b" % re.escape(name), re.IGNORECASE)
        dynamic_pat = re.compile(REVOKE_DYNAMIC, re.IGNORECASE)

        created = [v for v, _, t in texts if create_pat.search(t)]
        revoked = [
            v
            for v, _, t in texts
            if dynamic_pat.search(t) and name_pat.search(t)
        ]

        if not revoked:
            problems.append(
                f"{name}: no migration revokes PUBLIC/anon EXECUTE, so anon keeps the default grant"
            )
            continue

        if created and max(created) > max(revoked):
            problems.append(
                f"{name}: recreated in {max(created)} after its last lock in {max(revoked)}; "
                "add a REVOKE in a later migration"
            )

    if problems:
        print("Privileged grant check failed:\n", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1

    print(f"Privileged grant check passed for {len(PROTECTED) - len(IGNORE)} functions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
