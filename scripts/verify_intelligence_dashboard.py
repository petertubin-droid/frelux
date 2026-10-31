#!/usr/bin/env python3
"""
Live verification for the FRELUX construction intelligence dashboard.

Builds a real project with real members, expenses, milestones, deliveries,
estimate revisions, alert preferences and report runs, then proves the
boundaries with each account's own token:

  * the owner sees their project, a stranger sees nothing;
  * project members keep access, non-members do not;
  * estimate revisions number themselves and cannot be rewritten or deleted;
  * one user's alert settings and report history are invisible to another;
  * role escalation is refused by the database, not just the interface.

Every row and account this script creates is tagged with a run id and removed at
the end. Exits non-zero if any check fails.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
import uuid

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or "https://nfgaaohweygwydoelxnf.supabase.co"


def _keys() -> tuple[str, str]:
    path = os.environ.get("SUPABASE_KEYS_FILE")
    if path and os.path.exists(path):
        by_name = {f"{k['name']}/{k['type']}": k["api_key"] for k in json.load(open(path))}
        return by_name["anon/legacy"], by_name["service_role/legacy"]
    return os.environ["SUPABASE_ANON_KEY"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]


ANON_KEY, SERVICE_KEY = _keys()

RUN = uuid.uuid4().hex[:8]
PASSWORD = "Frelux-Intelligence-Check-2026!"
results: list[tuple[bool, str]] = []


def check(ok: bool, label: str, detail: str = "") -> None:
    results.append((ok, label))
    print(f"{'PASS' if ok else 'FAIL'}  {label}{f'  -> {detail}' if detail and not ok else ''}")


def request(method: str, path: str, token: str, body=None, key: str | None = None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"apikey": key or ANON_KEY, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(SUPABASE_URL + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as err:
        raw = err.read().decode()
        try:
            return err.code, json.loads(raw)
        except json.JSONDecodeError:
            return err.code, {"raw": raw}


def rest(
    method: str,
    table: str,
    params: str = "",
    body=None,
    token: str | None = None,
    prefer: str | None = None,
):
    headers_token = token if token is not None else SERVICE_KEY
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "apikey": SERVICE_KEY if headers_token == SERVICE_KEY else ANON_KEY,
        "Authorization": f"Bearer {headers_token}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{table}{params}", data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as err:
        raw = err.read().decode()
        try:
            return err.code, json.loads(raw)
        except json.JSONDecodeError:
            return err.code, {"raw": raw}


def sql(statement: str):
    """Owner-authorized SQL, only for fixtures and structural checks the API refuses."""
    token = os.environ["SUPABASE_MGMT_TOKEN"]
    req = urllib.request.Request(
        "https://api.supabase.com/v1/projects/nfgaaohweygwydoelxnf/database/query",
        data=json.dumps({"query": statement, "read_only": False}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw.strip() else None
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode()[:300]


def create_user(label: str) -> tuple[str, str, str]:
    email = f"frelux-intel-{label}-{RUN}@example.com"
    status, body = request(
        "POST",
        "/auth/v1/admin/users",
        SERVICE_KEY,
        {"email": email, "password": PASSWORD, "email_confirm": True},
        key=SERVICE_KEY,
    )
    if status >= 300:
        raise SystemExit(f"could not create {label}: {status} {body}")
    user_id = body["id"]
    status, session = request(
        "POST", "/auth/v1/token?grant_type=password", "", {"email": email, "password": PASSWORD}
    )
    if status >= 300:
        raise SystemExit(f"could not sign in {label}: {status} {session}")
    return user_id, email, session["access_token"]


def main() -> int:
    print(f"run {RUN} against {SUPABASE_URL}\n")

    owner_id, owner_email, owner = create_user("owner")
    client_id, _, client = create_user("contractor")
    stranger_id, _, stranger = create_user("stranger")
    admin_id, _, admin = create_user("admin")

    # ── Structure ────────────────────────────────────────────────────
    status, rows = sql(
        "select relname, relrowsecurity from pg_class "
        "where relname in ('project_estimate_revisions','intelligence_preferences','intelligence_report_runs')"
    )
    rls = {row["relname"]: row["relrowsecurity"] for row in rows or []}
    check(all(rls.get(t) for t in rls) and len(rls) == 3, "RLS is enabled on all three intelligence tables", str(rls))

    status, rows = sql(
        "select grantee, privilege_type from information_schema.role_table_grants "
        "where table_name in ('project_estimate_revisions','intelligence_preferences','intelligence_report_runs') "
        "and grantee = 'authenticated' and privilege_type in ('SELECT','INSERT')"
    )
    granted = {(row["privilege_type"]) for row in rows or []}
    check({"SELECT", "INSERT"} <= granted, "authenticated has select and insert grants", str(granted))

    status, rows = sql(
        "select tgname from pg_trigger where tgname = 'project_estimate_revisions_guard'"
    )
    check(bool(rows), "append-only trigger exists", str(rows))

    status, rows = sql(
        "select indexname from pg_indexes where indexname = 'project_estimate_revisions_project_idx'"
    )
    check(bool(rows), "revision ledger is indexed by project", str(rows))

    # ── Fixtures, through the owner's own session where the API allows it ──
    status, project = rest(
        "POST",
        "contractor_projects",
        "?select=id",
        {
            "user_id": owner_id,
            "name": f"Intel check {RUN}",
            "project_type": "site_tracker",
            "building_type": "residential",
            "status": "in_progress",
            "budget": 10_000_000,
            "currency": "NGN",
            "total_material_cost": 4_000_000,
            "total_labour_cost": 2_000_000,
            "total_transport_cost": 500_000,
            "total_misc_cost": 300_000,
            "total_markup": 200_000,
            "progress_percentage": 40,
            "start_date": "2026-01-05",
            "end_date": "2026-06-30",
        },
        token=owner,
        prefer="return=representation",
    )
    if status >= 300:
        raise SystemExit(f"could not create project: {status} {project}")
    project_id = project[0]["id"]

    status, member = rest(
        "POST",
        "project_members",
        "?select=id",
        {
            "project_id": project_id,
            "user_id": client_id,
            "role": "contractor",
            "status": "active",
            "invited_by": owner_id,
        },
        token=SERVICE_KEY,
        prefer="return=representation",
    )
    check(status < 300, "contractor added to the project", str(member) if status >= 300 else "")

    for name, amount, spend_status in [
        ("Cement and blocks", 3_000_000, "approved"),
        ("Roofing sheets", 500_000, "approved"),
        ("Plumbing first fix", 1_500_000, "submitted"),
    ]:
        exp_status, exp_body = rest(
            "POST",
            "project_expenses",
            "",
            {
                "project_id": project_id,
                "category": "material",
                "name": name,
                "amount": amount,
                "currency": "NGN",
                "status": spend_status,
                "spent_at": "2026-03-01",
                "submitted_by": client_id,
            },
            token=SERVICE_KEY,
        )
        if exp_status >= 300:
            print(f"  expense fixture failed: {exp_status} {exp_body}")

    for stage, stage_status, completed in [
        ("Foundation", "approved", True),
        ("Roof", "pending", False),
    ]:
        rest(
            "POST",
            "project_progress_stages",
            "",
            {
                "project_id": project_id,
                "stage_key": stage.lower(),
                "stage_name": stage,
                "status": stage_status,
                "is_completed": completed,
                "submitted_by": client_id,
            },
            token=SERVICE_KEY,
        )

    rest(
        "POST",
        "project_material_deliveries",
        "",
        {
            "project_id": project_id,
            "description": "Blocks 9 inch",
            "unit": "pcs",
            "quantity_ordered": 1200,
            "quantity_delivered": 1200,
            "quantity_accepted": 1150,
            "supplier": "Run supplier",
            "delivery_date": "2026-03-04",
            "created_by": client_id,
        },
        token=SERVICE_KEY,
    )

    rest(
        "POST",
        "project_site_logs",
        "",
        {
            "project_id": project_id,
            "created_by": client_id,
            "log_date": "2026-03-05",
            "work_performed": "Blockwork to first floor",
            "workers_count": 14,
            "weather_condition": "clear",
            "status": "approved",
        },
        token=SERVICE_KEY,
    )

    # ── Access boundaries ────────────────────────────────────────────
    status, rows = rest("GET", "contractor_projects", f"?id=eq.{project_id}&select=id", token=owner)
    check(status == 200 and len(rows or []) == 1, "owner reads their project")

    status, rows = rest("GET", "contractor_projects", f"?id=eq.{project_id}&select=id", token=stranger)
    check(status == 200 and not rows, "stranger cannot see the project", str(rows))

    status, rows = rest(
        "GET", "contractor_projects", f"?id=eq.{project_id}&select=id", token=client
    )
    check(status == 200 and len(rows or []) == 1, "project member still sees the project")

    status, rows = rest(
        "GET", "project_expenses", f"?project_id=eq.{project_id}&select=amount,status", token=stranger
    )
    check(status == 200 and not rows, "stranger cannot read project expenditure", str(rows))

    status, rows = rest(
        "GET", "project_expenses", f"?project_id=eq.{project_id}&select=amount,status", token=owner
    )
    approved = sum(r["amount"] for r in rows or [] if r["status"] == "approved")
    pending = sum(r["amount"] for r in rows or [] if r["status"] == "submitted")
    check(approved == 3_500_000 and pending == 1_500_000, "approved and pending spend read back correctly", f"{approved}/{pending}")

    # ── Estimate revision ledger ─────────────────────────────────────
    def add_revision(token: str, user: str, total: int, label: str):
        return rest(
            "POST",
            "project_estimate_revisions",
            "?select=id,revision_no,total,user_id",
            {
                "project_id": project_id,
                "user_id": user,
                "label": label,
                "source": "manual",
                "materials_cost": total - 100_000,
                "labour_cost": 50_000,
                "transport_cost": 30_000,
                "misc_cost": 20_000,
                "markup_amount": 0,
                "total": total,
                "currency": "NGN",
                "note": f"run {RUN}",
            },
            token=token,
            prefer="return=representation",
        )

    status, first = add_revision(owner, owner_id, 7_400_000, "Revision 1")
    check(status < 300 and first and first[0]["revision_no"] == 1, "first revision is numbered 1", str(first))
    revision_id = first[0]["id"] if first else None

    status, second = add_revision(owner, owner_id, 8_200_000, "Revision 2")
    check(status < 300 and second and second[0]["revision_no"] == 2, "second revision is numbered 2", str(second))

    status, body = rest(
        "PATCH",
        "project_estimate_revisions",
        f"?id=eq.{revision_id}",
        {"total": 1},
        token=owner,
        prefer="return=representation",
    )
    check(status >= 400, "a recorded revision cannot be edited", f"{status} {body}")

    status, body = rest("DELETE", "project_estimate_revisions", f"?id=eq.{revision_id}", token=owner)
    check(status >= 400 or body in (None, []), "a recorded revision cannot be deleted", f"{status} {body}")

    status, rows = rest(
        "GET", "project_estimate_revisions", f"?project_id=eq.{project_id}&select=revision_no", token=owner
    )
    check(len(rows or []) == 2, "both revisions survive the attempted rewrite", str(rows))

    status, body = add_revision(owner, client_id, 9_000_000, "Someone else's revision")
    check(status >= 400, "a revision cannot be filed under another person's id", f"{status} {body}")

    status, body = add_revision(stranger, stranger_id, 9_000_000, "Stranger revision")
    check(status >= 400, "a non-member cannot write a revision", f"{status} {body}")

    status, rows = rest(
        "GET", "project_estimate_revisions", f"?project_id=eq.{project_id}&select=id", token=client
    )
    check(status == 200 and len(rows or []) == 2, "a project member can read the revision ledger", str(rows))

    status, rows = rest(
        "GET", "project_estimate_revisions", f"?project_id=eq.{project_id}&select=id", token=stranger
    )
    check(status == 200 and not rows, "a non-member reads no revisions", str(rows))

    # ── Notification preferences ────────────────────────────────────
    status, body = rest(
        "POST",
        "intelligence_preferences",
        "?on_conflict=user_id",
        {
            "user_id": owner_id,
            "market_code": "NG",
            "price_alerts": True,
            "budget_alerts": True,
            "price_move_threshold": 10,
            "digest_frequency": "daily",
        },
        token=owner,
        prefer="return=representation,resolution=merge-duplicates",
    )
    check(status < 300, "owner saves alert settings", f"{status} {body}")

    status, rows = rest(
        "GET", "intelligence_preferences", f"?user_id=eq.{owner_id}&select=price_move_threshold", token=owner
    )
    check(rows and rows[0]["price_move_threshold"] == 10, "saved threshold reads back", str(rows))

    status, rows = rest(
        "GET", "intelligence_preferences", f"?user_id=eq.{owner_id}&select=user_id", token=stranger
    )
    check(status == 200 and not rows, "another user cannot read these alert settings", str(rows))

    status, body = rest(
        "POST",
        "intelligence_preferences",
        "?on_conflict=user_id",
        {"user_id": owner_id, "price_move_threshold": 1},
        token=stranger,
        prefer="resolution=merge-duplicates",
    )
    check(status >= 400, "another user cannot overwrite these alert settings", f"{status} {body}")

    # ── Report runs ─────────────────────────────────────────────────
    status, body = rest(
        "POST",
        "intelligence_report_runs",
        "?select=id,report_type,row_count",
        {
            "user_id": owner_id,
            "report_type": "project_cost",
            "format": "xlsx",
            "scope_id": project_id,
            "row_count": 1,
        },
        token=owner,
        prefer="return=representation",
    )
    check(status < 300, "a report run is recorded", f"{status} {body}")

    status, rows = rest("GET", "intelligence_report_runs", "?select=id", token=stranger)
    check(status == 200 and not rows, "another user sees no report history", str(rows))

    status, body = rest(
        "POST",
        "intelligence_report_runs",
        "",
        {"user_id": owner_id, "report_type": "profit_leak", "format": "pdf", "row_count": 1},
        token=owner,
    )
    check(status >= 400, "an unknown report type is refused by the database", f"{status} {body}")

    status, body = rest(
        "POST",
        "intelligence_report_runs",
        "",
        {"user_id": owner_id, "report_type": "progress", "format": "csv", "row_count": 1},
        token=owner,
    )
    check(status >= 400, "an unsupported export format is refused", f"{status} {body}")

    # ── Role escalation ─────────────────────────────────────────────
    status, body = rest(
        "PATCH", "profiles", f"?id=eq.{stranger_id}", {"role": "admin"}, token=stranger,
        prefer="return=representation",
    )
    check(status >= 400 or not body, "a user cannot make themselves an administrator", f"{status} {body}")

    status, body = sql(
        "select set_config('request.jwt.claims', "
        "json_build_object('sub', (select id from profiles where role = 'admin' limit 1), 'role', 'authenticated')::text, false); "
        f"update profiles set role = 'admin' where id = '{admin_id}';"
    )
    check(status < 300, "an authorized administrator role is set administratively")

    status, rows = rest("GET", "profiles", "?select=id&role=eq.admin&limit=200", token=admin)
    check(status == 200 and len(rows or []) >= 1, "administrator can read the admin roster")

    status, rows = rest("GET", "profiles", "?select=id&role=eq.admin&limit=200", token=stranger)
    check(status == 200 and not rows, "a normal user reads no administrator accounts", str(rows))

    # ── Progress and price plumbing the dashboard reads ─────────────
    status, rows = rest(
        "GET", "project_progress_stages", f"?project_id=eq.{project_id}&select=stage_name,status", token=owner
    )
    check(len(rows or []) == 2, "milestones are readable for the dashboard", str(rows))

    status, rows = rest(
        "GET", "project_material_deliveries", f"?project_id=eq.{project_id}&select=quantity_ordered,quantity_accepted", token=owner
    )
    check(
        rows and rows[0]["quantity_ordered"] - rows[0]["quantity_accepted"] == 50,
        "delivery discrepancy is visible to the owner",
        str(rows),
    )

    status, rows = rest("GET", "estimation_prices", "?select=id&limit=1", token=owner)
    check(status == 200, "price index is readable for the price board", str(status))

    # ── Cleanup ─────────────────────────────────────────────────────
    rest("DELETE", "intelligence_report_runs", f"?user_id=eq.{owner_id}", token=SERVICE_KEY)
    rest("DELETE", "intelligence_preferences", f"?user_id=eq.{owner_id}", token=SERVICE_KEY)
    rest("DELETE", "project_estimate_revisions", f"?project_id=eq.{project_id}", token=SERVICE_KEY)
    rest("DELETE", "project_expenses", f"?project_id=eq.{project_id}", token=SERVICE_KEY)
    rest("DELETE", "project_material_deliveries", f"?project_id=eq.{project_id}", token=SERVICE_KEY)
    rest("DELETE", "project_site_logs", f"?project_id=eq.{project_id}", token=SERVICE_KEY)
    rest("DELETE", "project_progress_stages", f"?project_id=eq.{project_id}", token=SERVICE_KEY)
    rest("DELETE", "project_members", f"?project_id=eq.{project_id}", token=SERVICE_KEY)
    rest("DELETE", "contractor_projects", f"?id=eq.{project_id}", token=SERVICE_KEY)
    for user_id in (owner_id, client_id, stranger_id, admin_id):
        request("DELETE", f"/auth/v1/admin/users/{user_id}", SERVICE_KEY, key=SERVICE_KEY)

    status, rows = sql(
        "select count(*) as n from project_estimate_revisions where note like 'run %' "
        f"and note = 'run {RUN}'"
    )
    check(rows and rows[0]["n"] == 0, "test revisions removed", str(rows))

    passed = sum(1 for ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} checks passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
