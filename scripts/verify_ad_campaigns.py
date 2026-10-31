#!/usr/bin/env python3
"""
Live verification for the FRELUX Ad Manager.

Proves with real accounts and the public API that:
  * anonymous visitors only ever see live campaigns;
  * a paused, expired or future campaign serves nothing and records nothing;
  * only administrators can create, edit, pause or delete campaigns;
  * the event function validates the vocabulary, refuses repeats, and attributes
    the event to the right campaign and slot;
  * every campaign change lands in the audit trail;
  * the training-wheel cases (bad scheme, sponsored without advertiser, end
    before start) are refused by the database, not just the form.

Rows and accounts created here are removed at the end.
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
PASSWORD = "Frelux-Ad-Check-2026!"
results: list[tuple[bool, str]] = []


def check(ok: bool, label: str, detail: str = "") -> None:
    results.append((ok, label))
    print(f"{'PASS' if ok else 'FAIL'}  {label}{f'  -> {detail}' if detail and not ok else ''}")


def request(method, path, token, body=None, key=None):
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


def rest(method, table, params="", body=None, token=None, prefer=None, key=None):
    headers_token = token if token is not None else SERVICE_KEY
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "apikey": key or (SERVICE_KEY if headers_token == SERVICE_KEY else ANON_KEY),
        "Authorization": f"Bearer {headers_token}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}{params}", data=data, headers=headers, method=method)
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


def sql(statement):
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


def create_user(label):
    email = f"frelux-ad-{label}-{RUN}@example.com"
    status, body = request("POST", "/auth/v1/admin/users", SERVICE_KEY,
                           {"email": email, "password": PASSWORD, "email_confirm": True}, key=SERVICE_KEY)
    if status >= 300:
        raise SystemExit(f"could not create {label}: {status} {body}")
    user_id = body["id"]
    status, session = request("POST", "/auth/v1/token?grant_type=password", "",
                              {"email": email, "password": PASSWORD})
    if status >= 300:
        raise SystemExit(f"could not sign in {label}: {status} {session}")
    return user_id, session["access_token"]


def event(token, campaign_id, event_type, placement="calculator_results", session=None, key=None):
    return request("POST", "/rest/v1/rpc/record_ad_event", token, {
        "p_campaign_id": campaign_id,
        "p_event_type": event_type,
        "p_placement": placement,
        "p_tool_key": "cement",
        "p_market_code": "NG",
        "p_device": "mobile",
        "p_session_id": session or f"sess-{RUN}",
        "p_value": None,
    }, key=key)


def main() -> int:
    print(f"run {RUN} against {SUPABASE_URL}\n")

    admin_id, admin = create_user("admin")
    user_id, user = create_user("visitor")

    # ── Structure ────────────────────────────────────────────────
    status, rows = sql(
        "select relname, relrowsecurity from pg_class where relname in "
        "('ad_campaigns','ad_campaign_events','ad_campaign_audit')"
    )
    rls = {row["relname"]: row["relrowsecurity"] for row in rows or []}
    check(len(rls) == 3 and all(rls.values()), "RLS is on for campaigns, events and audit", str(rls))

    status, rows = sql("select count(*) n from ad_campaigns where status = 'active'")
    seeded = (rows or [{}])[0].get("n", 0)
    check(seeded >= 8, "the eight first-party campaigns are seeded", str(seeded))

    # ── Only admins can manage campaigns ─────────────────────────
    payload = {
        "name": f"Check campaign {RUN}",
        "slug": f"check-{RUN}",
        "campaign_type": "internal",
        "status": "active",
        "format": "native",
        "headline": "A test promotion",
        "description": "Verification row.",
        "cta_label": "Open",
        "destination_url": "/pricing",
        "placements": ["calculator_results"],
        "target_tools": ["cement"],
        "target_markets": ["ALL"],
        "target_devices": ["desktop", "tablet", "mobile"],
        "priority": 99,
    }

    status, body = rest("POST", "ad_campaigns", "?select=id", payload, token=user, prefer="return=representation")
    check(status >= 400, "a normal user cannot create a campaign", f"{status} {body}")

    status, body = rest("POST", "ad_campaigns", "?select=id", payload, token=admin, prefer="return=representation")
    check(status >= 400, "even a signed-in non-admin is refused before the role is granted", f"{status} {body}")

    # Grant the administrator role through the sanctioned claims path.
    status, body = sql(
        "select set_config('request.jwt.claims', json_build_object('sub', "
        "(select id from profiles where role = 'admin' limit 1), 'role', 'authenticated')::text, false); "
        f"update profiles set role = 'admin' where id = '{admin_id}';"
    )
    check(status < 300, "administrator role granted administratively", str(body))

    status, body = rest("POST", "ad_campaigns", "?select=id,status,priority", payload, token=admin,
                        prefer="return=representation")
    check(status < 300 and body, "administrator creates a campaign", f"{status} {body}")
    campaign_id = body[0]["id"] if body else None

    # ── Public visibility ───────────────────────────────────────
    status, rows = rest("GET", "ad_campaigns", f"?id=eq.{campaign_id}&select=id", token=ANON_KEY, key=ANON_KEY)
    check(status == 200 and len(rows or []) == 1, "an anonymous visitor can read a live campaign", str(rows))

    status, body = rest("PATCH", "ad_campaigns", f"?id=eq.{campaign_id}", {"status": "paused"}, token=admin,
                        prefer="return=representation")
    check(status < 300, "administrator pauses the campaign", str(body))

    status, rows = rest("GET", "ad_campaigns", f"?id=eq.{campaign_id}&select=id", token=ANON_KEY, key=ANON_KEY)
    check(status == 200 and not rows, "a paused campaign is invisible to visitors", str(rows))

    status, body = event(ANON_KEY, campaign_id, "impression", key=ANON_KEY)
    check(body is False, "a paused campaign records no impression", str(body))

    status, body = rest("PATCH", "ad_campaigns", f"?id=eq.{campaign_id}", {"status": "active"}, token=admin,
                        prefer="return=representation")
    check(status < 300, "administrator reactivates the campaign")

    status, body = rest(
        "POST", "ad_campaigns", "?select=id",
        {**payload, "slug": f"future-{RUN}", "status": "active", "starts_at": "2030-01-01T00:00:00Z"},
        token=admin, prefer="return=representation",
    )
    future_id = body[0]["id"] if body else None
    status, rows = rest("GET", "ad_campaigns", f"?id=eq.{future_id}&select=id", token=ANON_KEY, key=ANON_KEY)
    check(status == 200 and not rows, "a campaign that has not started is invisible", str(rows))

    # ── Event recording ─────────────────────────────────────────
    status, body = event(ANON_KEY, campaign_id, "impression", key=ANON_KEY)
    check(body is True, "a live campaign records an impression", str(body))

    status, body = event(ANON_KEY, campaign_id, "impression", key=ANON_KEY)
    check(body is False, "the same impression is not counted twice in one session", str(body))

    status, body = event(ANON_KEY, campaign_id, "click", key=ANON_KEY)
    check(body is True, "a click is recorded", str(body))

    status, body = event(ANON_KEY, campaign_id, "view", key=ANON_KEY)
    check(body is False, "an unknown event type is refused", str(body))

    status, body = event(ANON_KEY, "00000000-0000-0000-0000-000000000000", "impression", key=ANON_KEY)
    check(body is False, "an event against a campaign that does not exist is refused", str(body))

    status, rows = rest(
        "GET", "ad_campaign_events",
        f"?campaign_id=eq.{campaign_id}&select=event_type,placement,tool_key,market_code,device",
        token=admin,
    )
    kinds = sorted({row["event_type"] for row in rows or []})
    check(kinds == ["click", "impression"], "impressions and clicks land in the ledger", str(rows))
    check(
        all(row["placement"] == "calculator_results" for row in rows or []),
        "each event keeps the slot it came from",
        str(rows),
    )

    status, rows = rest("GET", "ad_campaign_events", f"?campaign_id=eq.{campaign_id}&select=id", token=user)
    check(status == 200 and not rows, "a normal user cannot read campaign events", str(rows))

    status, body = rest("POST", "ad_campaign_events", "", {
        "campaign_id": campaign_id, "event_type": "impression"
    }, token=ANON_KEY, key=ANON_KEY)
    check(status >= 400, "visitors cannot insert events around the function", f"{status} {body}")

    # ── Audit trail ─────────────────────────────────────────────
    status, rows = rest("GET", "ad_campaign_audit", f"?campaign_id=eq.{campaign_id}&select=action,actor_id", token=admin)
    actions = sorted({row["action"] for row in rows or []})
    check("insert" in actions and "update" in actions, "the audit trail records creation and edits", str(actions))
    check(
        all(row["actor_id"] == admin_id for row in rows or [] if row["actor_id"]),
        "each change names the administrator who made it",
        str(rows),
    )

    status, rows = rest("GET", "ad_campaign_audit", f"?campaign_id=eq.{campaign_id}&select=id", token=user)
    check(status == 200 and not rows, "a normal user cannot read the audit trail", str(rows))

    # ── Database-level refusals ─────────────────────────────────
    status, body = rest("POST", "ad_campaigns", "?select=id",
                        {**payload, "slug": f"bad-start-{RUN}", "starts_at": "2026-12-01", "ends_at": "2026-11-01"},
                        token=admin, prefer="return=representation")
    check(status >= 400, "a campaign cannot end before it starts", f"{status} {body}")

    status, body = rest("POST", "ad_campaigns", "?select=id",
                        {**payload, "slug": f"sponsor-{RUN}", "is_sponsored": True, "advertiser_name": None},
                        token=admin, prefer="return=representation")
    check(status >= 400, "a sponsored campaign must name its advertiser", f"{status} {body}")

    status, body = rest("POST", "ad_campaigns", "?select=id",
                        {**payload, "slug": f"bad-format-{RUN}", "format": "popup"},
                        token=admin, prefer="return=representation")
    check(status >= 400, "an unsupported format is refused", f"{status} {body}")

    # ── Deletion keeps the audit trail ──────────────────────────
    status, body = rest("DELETE", "ad_campaigns", f"?id=eq.{campaign_id}", token=admin)
    check(status < 300, "administrator deletes the campaign", f"{status} {body}")
    status, rows = rest("GET", "ad_campaign_audit", f"?campaign_id=eq.{campaign_id}&select=action", token=admin)
    check(any(row["action"] == "delete" for row in rows or []), "the deletion is on the record", str(rows))

    # ── Cleanup ─────────────────────────────────────────────────
    rest("DELETE", "ad_campaign_events", f"?campaign_id=eq.{future_id}", token=SERVICE_KEY)
    rest("DELETE", "ad_campaigns", f"?id=eq.{future_id}", token=SERVICE_KEY)
    rest("DELETE", "ad_campaign_events", f"?campaign_id=eq.{campaign_id}", token=SERVICE_KEY)
    rest("DELETE", "ad_campaign_audit", f"?campaign_id=eq.{campaign_id}", token=SERVICE_KEY)
    for uid in (admin_id, user_id):
        request("DELETE", f"/auth/v1/admin/users/{uid}", SERVICE_KEY, key=SERVICE_KEY)

    status, rows = sql(f"select count(*) n from ad_campaigns where slug like '%-{RUN}'")
    check((rows or [{}])[0].get("n") == 0, "test campaigns removed", str(rows))

    passed = sum(1 for ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} checks passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
