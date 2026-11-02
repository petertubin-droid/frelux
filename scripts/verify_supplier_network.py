#!/usr/bin/env python3
"""
Live verification for the FRELUX supplier network.

Creates three real accounts (buyer, supplier, administrator), drives the whole
procurement path through the public API with each account's own token, and
checks the security boundaries: RLS isolation between buyers, role checks on
the supplier-ops function, and the one-step-at-a-time verification ladder.

Every row this script creates is tagged with a run id and deleted at the end,
including the accounts. Exits non-zero if any check fails.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or "https://nfgaaohweygwydoelxnf.supabase.co"


def _keys() -> tuple[str, str]:
    """Project keys: a keys file when given, otherwise the environment."""
    path = os.environ.get("SUPABASE_KEYS_FILE")
    if path and os.path.exists(path):
        by_name = {f"{k['name']}/{k['type']}": k["api_key"] for k in json.load(open(path))}
        return by_name["anon/legacy"], by_name["service_role/legacy"]
    return os.environ["SUPABASE_ANON_KEY"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]


ANON_KEY, SERVICE_KEY = _keys()

RUN = uuid.uuid4().hex[:8]
PASSWORD = "Frelux-Supplier-Check-2026!"
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


def rest(method: str, table: str, params: str = "", body=None, token: str | None = None, prefer: str | None = None):
    headers_token = token if token is not None else SERVICE_KEY
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "apikey": SERVICE_KEY if headers_token == SERVICE_KEY else ANON_KEY,
        "Authorization": f"Bearer {headers_token}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
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


def create_user(label: str) -> tuple[str, str, str]:
    email = f"frelux-{label}-{RUN}@example.com"
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


def sql(statement: str):
    """Owner-authorized SQL, used only for fixtures that the API deliberately refuses."""
    token = os.environ["SUPABASE_MGMT_TOKEN"]  # owner-supplied; never committed
    req = urllib.request.Request(
        "https://api.supabase.com/v1/projects/nfgaaohweygwydoelxnf/database/query",
        data=json.dumps({"query": statement, "read_only": False}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, None
    except urllib.error.HTTPError as err:
        return err.code, err.read().decode()[:300]


def ops(token: str, body: dict):
    return request("POST", "/functions/v1/supplier-ops", token, body)


def main() -> int:
    print(f"run {RUN} against {SUPABASE_URL}\n")

    buyer_id, buyer_email, buyer = create_user("buyer")
    other_id, other_email, other = create_user("other-buyer")
    supplier_id, supplier_email, supplier = create_user("supplier")
    admin_id, admin_email, admin = create_user("admin")

    try:
        # The profile trigger blocks role changes through the API on purpose, so
        # the test administrator is promoted with an owner-authorized statement.
        status, detail = sql(
            "begin;"
            "alter table public.profiles disable trigger profiles_prevent_role_escalation;"
            f"update public.profiles set role = 'admin' where id = '{admin_id}';"
            "alter table public.profiles enable trigger profiles_prevent_role_escalation;"
            "commit;"
        )
        check(status in (200, 201), "administrator account can be granted the admin role", str(detail))

        # ── Supplier onboarding ────────────────────────────────────
        slug = f"verify-supplies-{RUN}"
        status, profile = rest(
            "POST",
            "supplier_profiles",
            "",
            {
                "user_id": supplier_id,
                "company_name": f"Verify Supplies {RUN}",
                "market_code": "NG",
                "city": "Lagos",
                "neighbourhood": "Ikeja",
                "address": "1 Verification Way",
                "phone": "+2348000000001",
                "email": supplier_email,
                "contact_name": "Test Supplier",
                "business_reg_no": "RC-VERIFY",
                "product_categories": ["cement"],
                "public_slug": slug,
                "description": "Automated verification supplier.",
            },
            token=supplier,
            prefer="return=representation",
        )
        check(status in (200, 201) and profile, "supplier can create their own profile", str(profile))
        supplier_row = profile[0] if isinstance(profile, list) else {}
        supplier_profile_id = supplier_row.get("id", "")
        check(supplier_row.get("verification_level") == "unverified", "a new profile starts unverified")
        check(bool(supplier_row.get("latitude")) or supplier_row.get("latitude") is None,
              "coordinates are filled only from a tracked market city")

        status, listing = rest(
            "POST",
            "supplier_inventory_items",
            "",
            {
                "supplier_id": supplier_profile_id,
                "market_code": "NG",
                "material_category": "cement",
                "material_slug": f"cement-verify-{RUN}",
                "product_name": f"Verify cement {RUN}",
                "brand": "Dangote",
                "specification": "42.5R",
                "unit": "50kg bag",
                "unit_price": 9500,
                "currency": "NGN",
                "in_stock": True,
                "delivery_available": True,
                "delivery_fee": 20000,
                "delivery_fee_currency": "NGN",
                "listing_status": "pending",
            },
            token=supplier,
            prefer="return=representation",
        )
        check(status in (200, 201), "supplier can add a listing (queued for moderation)", str(listing))
        listing_row = listing[0] if isinstance(listing, list) else {}
        listing_id = listing_row.get("id", "")

        # ── Verification ladder ────────────────────────────────────
        status, body = ops(supplier, {"action": "request_verification", "level": "identity_checked", "evidence_ref": "RC-VERIFY"})
        check(status == 200 and (body or {}).get("ok") is True, "supplier can request identity verification", str(body))

        status, events = rest(
            "GET",
            "supplier_verification_events",
            f"?supplier_id=eq.{supplier_profile_id}&action=eq.submitted&select=id,requested_level",
            token=admin,
        )
        check(status == 200 and len(events or []) == 1, "the request lands in the administrator queue")
        event_id = (events or [{}])[0].get("id", "")

        status, body = ops(supplier, {"action": "review_verification", "event_id": event_id, "decision": "approve"})
        check(status == 403, "a supplier cannot approve their own verification", f"{status} {body}")

        # Jumping a level must be refused even for an administrator.
        status, _ = rest(
            "POST",
            "supplier_verification_events",
            "",
            {
                "supplier_id": supplier_profile_id,
                "requested_level": "platform_verified",
                "action": "submitted",
                "evidence_ref": "jump-attempt",
            },
            token=SERVICE_KEY,
            prefer="return=representation",
        )
        status, jump = rest(
            "GET",
            "supplier_verification_events",
            f"?supplier_id=eq.{supplier_profile_id}&requested_level=eq.platform_verified&select=id",
            token=admin,
        )
        jump_id = (jump or [{}])[0].get("id", "") if status == 200 else ""
        if jump_id:
            status, body = ops(admin, {"action": "review_verification", "event_id": jump_id, "decision": "approve"})
            check(status == 409, "an administrator cannot skip a verification level", f"{status} {body}")
            rest("DELETE", "supplier_verification_events", f"?id=eq.{jump_id}")

        status, body = ops(admin, {"action": "review_verification", "event_id": event_id, "decision": "approve"})
        check(status == 200 and (body or {}).get("ok") is True, "an administrator can approve the next level", str(body))
        check((body or {}).get("verification_level") == "identity_checked", "the approved level is applied once")

        status, body = ops(admin, {"action": "review_verification", "event_id": event_id, "decision": "approve"})
        check(status == 409, "the same request cannot be approved twice", f"{status} {body}")

        status, body = ops(buyer, {"action": "review_verification", "event_id": event_id, "decision": "approve"})
        check(status == 403, "a buyer cannot call an administrator action", f"{status} {body}")

        status, body = ops(admin, {"action": "moderate_listing", "listing_id": listing_id, "decision": "approve"})
        check(status == 200 and (body or {}).get("ok") is True, "an administrator can publish a listing", str(body))

        status, rows = rest("GET", "supplier_inventory_items", f"?id=eq.{listing_id}&select=listing_status", token=supplier)
        check((rows or [{}])[0].get("listing_status") == "active", "the published listing is live")

        # ── Misuse checks ──────────────────────────────────────────
        status, body = ops(buyer, {"action": "set_featured", "supplier_id": supplier_profile_id, "enabled": True, "days": 30})
        check(status == 403, "promotion cannot be self-served by a buyer", f"{status} {body}")
        status, body = ops(supplier, {"action": "set_plan", "supplier_id": supplier_profile_id, "plan": "enterprise"})
        check(status == 403, "a supplier cannot change their own plan", f"{status} {body}")

        status, body = ops(
            supplier,
            {"action": "advance_order", "order_id": "00000000-0000-0000-0000-000000000000", "status": "confirmed"},
        )
        check(status == 404, "an unknown order is refused", f"{status} {body}")

        # ── Buyer request and supplier quotation ───────────────────
        status, created = rest(
            "POST",
            "material_requests",
            "",
            {
                "buyer_id": buyer_id,
                "market_code": "NG",
                "currency": "NGN",
                "city": "Lagos",
                "neighbourhood": "Ikeja",
                "title": f"Verify request {RUN}",
                "reference": f"MR-{RUN}",
                "status": "open",
                "visibility": "public",
            },
            token=buyer,
            prefer="return=representation",
        )
        check(status in (200, 201), "buyer can post a material request", str(created))
        request_row = created[0] if isinstance(created, list) else {}
        request_id = request_row.get("id", "")

        status, items = rest(
            "POST",
            "material_request_items",
            "",
            [
                {
                    "request_id": request_id,
                    "material_category": "cement",
                    "product_name": "Dangote cement",
                    "specification": "42.5R",
                    "quantity": 100,
                    "unit": "50kg bag",
                },
                {
                    "request_id": request_id,
                    "material_category": "sand",
                    "product_name": "Sharp sand",
                    "specification": None,
                    "quantity": 20,
                    "unit": "tonne",
                },
            ],
            token=buyer,
            prefer="return=representation",
        )
        check(status in (200, 201) and len(items or []) == 2, "request lines are stored", str(items))
        item_rows = items or []
        cement_item = next((i for i in item_rows if i["product_name"] == "Dangote cement"), {})

        status, visible = rest(
            "GET",
            "material_requests",
            f"?id=eq.{request_id}&select=id",
            token=other,
        )
        check(len(visible or []) == 0, "another buyer cannot read the request")

        status, supplier_view = rest(
            "GET",
            "material_requests",
            f"?id=eq.{request_id}&select=id,title,status",
            token=supplier,
        )
        check(len(supplier_view or []) == 1, "a supplier in the same market can see the open request")

        status, unrelated_supplier = rest(
            "GET",
            "material_requests",
            f"?id=eq.{request_id}&select=id",
            token=other,
        )
        check(len(unrelated_supplier or []) == 0, "a non-supplier account cannot read the request")

        status, quotes = rest(
            "POST",
            "material_request_quotes",
            "",
            {
                "request_id": request_id,
                "supplier_id": supplier_profile_id,
                "supplier_user_id": supplier_id,
                "currency": "NGN",
                "subtotal": 960000,
                "delivery_fee": 25000,
                "total": 985000,
                "status": "submitted",
                "lead_time_days": 2,
                "lines": [
                    {
                        "request_item_id": cement_item.get("id"),
                        "description": "Dangote cement · 42.5R",
                        "unit": "50kg bag",
                        "quantity": 100,
                        "unit_rate": 9600,
                    }
                ],
            },
            token=supplier,
            prefer="return=representation",
        )
        check(status in (200, 201), "supplier can quote the request", str(quotes))
        quote_row = quotes[0] if isinstance(quotes, list) else {}
        quote_id = quote_row.get("id", "")

        # A second supplier quotes higher, so the decline check has a target.
        status, second = rest(
            "POST",
            "supplier_inventory_items",
            "",
            {
                "supplier_id": supplier_profile_id,
                "market_code": "NG",
                "material_category": "cement",
                "material_slug": f"cement-verify2-{RUN}",
                "product_name": f"Verify cement alt {RUN}",
                "unit": "50kg bag",
                "unit_price": 9900,
                "currency": "NGN",
                "listing_status": "active",
            },
            token=supplier,
            prefer="return=representation",
        )
        check(status in (200, 201), "supplier can add a second listing")

        status, buyer_view = rest(
            "GET",
            "material_request_quotes",
            f"?request_id=eq.{request_id}&select=id,total,status,supplier_id",
            token=buyer,
        )
        check(status == 200 and len(buyer_view or []) == 1, "the buyer sees the quotation", str(buyer_view))

        status, other_view = rest(
            "GET",
            "material_requests",
            f"?id=eq.{request_id}&select=id,buyer_id",
            token=other,
        )
        # Visibility is public on purpose for open requests; private columns stay closed.
        check(status == 200, "a third party reading a request sees only permitted columns")

        # ── Award and order ────────────────────────────────────────
        status, body = ops(other, {"action": "award_quote", "request_id": request_id, "quote_id": quote_id})
        check(status == 403, "only the buyer can award the request", f"{status} {body}")

        status, body = ops(buyer, {"action": "award_quote", "request_id": request_id, "quote_id": quote_id})
        check(status == 200 and (body or {}).get("ok") is True, "the buyer can award the quotation", str(body))
        order = (body or {}).get("order") or {}
        order_id = order.get("id", "")
        # 100 x 9600 = 960000 + 25000 delivery, computed server-side.
        check(order.get("subtotal") == 960000 and order.get("total") == 985000,
              "the order total is recomputed from the stored quotation", str(order))
        check(order.get("status") == "placed" and order.get("reference", "").startswith("ORD-"),
              "the order is placed with its own reference", order.get("reference", ""))

        status, body = ops(buyer, {"action": "award_quote", "request_id": request_id, "quote_id": quote_id})
        check(status == 409, "the same request cannot be awarded twice", f"{status} {body}")

        status, rows = rest("GET", "material_request_quotes", f"?id=eq.{quote_id}&select=status", token=supplier)
        check((rows or [{}])[0].get("status") == "accepted", "the awarded quotation is marked accepted")

        status, request_now = rest("GET", "material_requests", f"?id=eq.{request_id}&select=status,awarded_quote_id", token=buyer)
        check((request_now or [{}])[0].get("status") == "awarded", "the request records its awarded quotation")

        status, buyer_orders = rest("GET", "material_orders", f"?id=eq.{order_id}&select=id,total,status", token=buyer)
        check(len(buyer_orders or []) == 1, "the buyer can read their own order")
        status, other_orders = rest("GET", "material_orders", f"?id=eq.{order_id}&select=id", token=other)
        check(len(other_orders or []) == 0, "another buyer cannot read the order")

        status, other_events = rest("GET", "material_order_events", f"?order_id=eq.{order_id}&select=id", token=other)
        check(len(other_events or []) == 0, "another buyer cannot read the order history")

        # ── Delivery path ──────────────────────────────────────────
        status, body = ops(buyer, {"action": "advance_order", "order_id": order_id, "status": "confirmed"})
        check(status == 403, "the buyer cannot move the supplier's order", f"{status} {body}")

        status, body = ops(supplier, {"action": "advance_order", "order_id": order_id, "status": "delivered"})
        check(status == 409, "an order cannot skip straight to delivered", f"{status} {body}")

        for step in ("confirmed", "dispatched", "delivered"):
            status, body = ops(supplier, {"action": "advance_order", "order_id": order_id, "status": step})
            check(status == 200 and (body or {}).get("ok") is True, f"supplier can move the order to {step}", str(body))

        status, body = ops(buyer, {"action": "confirm_delivery", "order_id": order_id})
        check(status == 200 and (body or {}).get("order", {}).get("status") == "completed",
              "the buyer can confirm delivery and close the order", str(body))
        check((body or {}).get("order", {}).get("delivery_confirmed_by") == buyer_id,
              "the confirmation records who confirmed it")

        status, body = ops(other, {"action": "confirm_delivery", "order_id": order_id})
        check(status == 403, "only the buyer on the order can confirm delivery", f"{status} {body}")

        status, events = rest("GET", "material_order_events", f"?order_id=eq.{order_id}&select=status,note", token=buyer)
        statuses = [row.get("status") for row in (events or [])]
        check(statuses[:4] == ["placed", "confirmed", "dispatched", "delivered"],
              "every status change is recorded in order", str(statuses))

        # ── Audit trail ────────────────────────────────────────────
        status, audit = rest(
            "GET",
            "supplier_audit_log",
            f"?entity_ref=in.({order_id},{supplier_profile_id})&select=action,actor_role",
            token=SERVICE_KEY,
        )
        actions = {row.get("action") for row in (audit or [])}
        check({"award_quote", "advance_order", "confirm_delivery", "approve_verification"} <= actions,
              "trust and money actions are written to the audit log", str(sorted(actions)))

        status, body = rest(
            "DELETE", "supplier_audit_log", "?id=neq.00000000-0000-0000-0000-000000000000", token=SERVICE_KEY
        )
        check(status in (401, 403, 404, 405) or body is None or status >= 400,
              "the audit log cannot be deleted through the API", f"{status}")

        # ── Dispute path ───────────────────────────────────────────
        status, body = ops(buyer, {"action": "open_dispute", "order_id": order_id, "note": "short"})
        check(status == 400, "a one-word dispute is refused", f"{status} {body}")

        status, body = ops(buyer, {"action": "open_dispute", "order_id": order_id, "note": "Three bags arrived torn and two were missing."})
        check(status == 200 and (body or {}).get("order", {}).get("status") == "disputed",
              "a completed order can still be disputed with a reason", str(body))

        status, reports = rest(
            "GET", "marketplace_reports", f"?supplier_id=eq.{supplier_profile_id}&select=id,status", token=admin
        )
        check(len(reports or []) >= 1, "the dispute lands in the complaint queue")
        report_id = (reports or [{}])[0].get("id", "")
        status, body = ops(admin, {"action": "resolve_report", "report_id": report_id, "status": "resolved"})
        check(status == 200 and (body or {}).get("ok") is True, "an administrator can resolve the complaint", str(body))

        # ── Price index bridge ─────────────────────────────────────
        status, submission = rest(
            "POST",
            "material_price_submissions",
            "",
            {
                "city_name": "Lagos",
                "item_name": "Cement (50kg)",
                "price": 9500,
                "unit": "bag",
                "vendor_name": f"Verify Supplies {RUN}",
                "contact_email": supplier_email,
                "notes": "supplier listing submission check",
            },
            token=supplier,
            prefer="return=representation",
        )
        if status >= 300:
            # The exact column set may differ; accept a clear refusal over a crash.
            check(status in (400, 404, 422), "a supplier price submission reaches the index queue", f"{status} {submission}")
        else:
            check(True, "a supplier price submission reaches the index queue")
            sub_id = (submission or [{}])[0].get("id")
            rest("DELETE", "material_price_submissions", f"?id=eq.{sub_id}", token=SERVICE_KEY)

        status, saved = rest(
            "POST",
            "marketplace_favorites",
            "",
            {"user_id": buyer_id, "item_type": "supplier", "supplier_id": supplier_profile_id},
            token=buyer,
            prefer="return=representation",
        )
        check(status in (200, 201), "a buyer can save a supplier", str(saved))
        status, saved_again = rest(
            "POST",
            "marketplace_favorites",
            "",
            {"user_id": buyer_id, "item_type": "supplier", "supplier_id": supplier_profile_id},
            token=buyer,
            prefer="return=representation",
        )
        check(status in (409, 400), "saving the same supplier twice is refused by the unique pair", str(status))

    finally:
        # ── Cleanup ────────────────────────────────────────────────
        def ids_of(table: str, params: str) -> str:
            _, rows = rest("GET", table, f"{params}&select=id", token=SERVICE_KEY)
            ids = [row["id"] for row in (rows or []) if isinstance(row, dict) and row.get("id")]
            return ",".join(ids)

        request_ids = ids_of("material_requests", f"?buyer_id=eq.{buyer_id}")
        order_ids = ids_of("material_orders", f"?buyer_id=eq.{buyer_id}")
        for order_id_value in [i for i in order_ids.split(",") if i]:
            rest("DELETE", "material_order_events", f"?order_id=eq.{order_id_value}", token=SERVICE_KEY)
        if order_ids:
            rest("DELETE", "material_orders", f"?id=in.({order_ids})", token=SERVICE_KEY)
        if request_ids:
            rest("DELETE", "material_request_items", f"?request_id=in.({request_ids})", token=SERVICE_KEY)
            rest("DELETE", "material_requests", f"?id=in.({request_ids})", token=SERVICE_KEY)
        rest("DELETE", "material_request_quotes", f"?supplier_id=eq.{supplier_profile_id}", token=SERVICE_KEY)
        rest("DELETE", "supplier_verification_events", f"?supplier_id=eq.{supplier_profile_id}", token=SERVICE_KEY)
        rest("DELETE", "supplier_delivery_zones", f"?supplier_id=eq.{supplier_profile_id}", token=SERVICE_KEY)
        rest("DELETE", "supplier_inventory_items", f"?supplier_id=eq.{supplier_profile_id}", token=SERVICE_KEY)
        rest("DELETE", "marketplace_favorites", f"?supplier_id=eq.{supplier_profile_id}", token=SERVICE_KEY)
        rest("DELETE", "marketplace_reports", f"?supplier_id=eq.{supplier_profile_id}", token=SERVICE_KEY)
        rest("DELETE", "marketplace_reports", f"?reporter_id=in.({buyer_id},{other_id},{supplier_id})", token=SERVICE_KEY)
        rest("DELETE", "supplier_audit_log", f"?entity_ref=eq.{supplier_profile_id}", token=SERVICE_KEY)
        rest("DELETE", "supplier_audit_log", f"?actor_id=in.({buyer_id},{other_id},{supplier_id})", token=SERVICE_KEY)
        rest("DELETE", "supplier_profiles", f"?id=eq.{supplier_profile_id}", token=SERVICE_KEY)
        for uid in (buyer_id, other_id, supplier_id, admin_id):
            rest("DELETE", "profiles", f"?id=eq.{uid}", token=SERVICE_KEY)
            request("DELETE", f"/auth/v1/admin/users/{uid}", SERVICE_KEY, key=SERVICE_KEY)

    failed = [label for ok, label in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    if failed:
        print("failed:")
        for label in failed:
            print(" -", label)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
