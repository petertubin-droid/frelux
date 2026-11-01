# Phase 1 audit correction, 2026-11-01 17:20

## The claim I reported first was wrong

My first audit query counted SECURITY DEFINER functions executable by `anon`
that contain a write and no `auth.uid()`/`is_admin`/`service_role` check. It
returned 9 and I reported that an anonymous caller could inject price evidence
through `market_scan_note_price`.

Reading the bodies showed the flaw in that query: it ignored the return type.
Seven of the nine are **trigger functions** (`returns trigger`). PostgREST
cannot call a function whose return type is `trigger`, so they were never an
RPC surface. The three `market_scan_note_*` functions are triggers fired by
writes to `estimation_prices` and `mi_sources`; the attack surface there is the
table's RLS, not the trigger.

Measured again, with the return type checked:

| Measure                                       | Count |
| --------------------------------------------- | ----- |
| anon-executable definer functions             | 86    |
| of those, trigger functions                   | 41    |
| of those, callable RPCs                       | 45    |
| callable RPCs that write                      | 14    |
| callable RPCs that write with no guard at all | 2     |

The two are `fetch_shared_estimate` and `respond_to_client_estimate`. Both are
authorized by a share token, which is the right model for a client-facing share
link, so neither is an authorization hole. Their weakness was the token floor:
8 characters. That is guessable, and either function mutates the estimate.

## What was closed

`supabase/migrations/20261101183000_close_phase1_authz_gaps.sql`:

1. Revokes EXECUTE from `public, anon, authenticated` on all 41 trigger
   functions. A trigger never needs the privilege, so the grant was pure attack
   surface: if one of them is ever rewritten to return a callable type, it
   becomes an open RPC.
2. Requires the 32-character UUID shape on both share functions. Safe to
   tighten: `client_estimates` holds zero rows, so no live link breaks.

Verified live after applying: 0 anon-executable trigger functions, 0 callable
writers without a guard, token shape enforced.

## Still open in Phase 1

- `complete_credit_task` has its `auth.uid()` guard, confirmed in the deployed
  body.
- `handle_new_user` is a signup trigger; it needs no grant, which the migration
  removed.
- `archie_touch_conversation` is ARCHIE and excluded from all operations.
- The remaining 45 anon-executable RPCs are mostly reads. Auditing each one's
  read scope is Phase 1 work that has not started.
