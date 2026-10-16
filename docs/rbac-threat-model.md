# Frelux RBAC Threat Model (Engine #12)

Status: **internal audit complete (2026-10-21); NOT independently reviewed.**
Until a qualified reviewer approves rows in `security_posture_reviews`,
the platform must not make high-assurance security claims. The findings
below are measured facts from the live database, not aspirations.

## 1. Authority model

| Authority | Source | Enforcement |
|---|---|---|
| Platform admin | `profiles.role = 'admin'` | `is_admin()` / `is_current_user_admin()` SECURITY DEFINER helpers; RLS policies; guarded RPCs |
| Workspace roles (8) | `workspace_members.role` CHECK constraint | RLS policies via `get_workspace_user_role()`, `can_manage_workspace()` (both filter `status = 'active'`) |
| Membership lifecycle | `status IN (active, suspended, revoked)` | Same helper functions; client matrix `canWithStatus()` mirrors it |
| Storage | Supabase storage bucket policies | bucket-scoped, owner-keyed |
| Edge functions | service-role key, server-side only | never expose keys; catalog/rate-limited (`award-credits`, `ai-building-estimation`, `iot-ingest`) |

Client-side gating (`src/lib/rbac/permission-matrix.ts`) is UX only.
The server (RLS + RPC guards) is the boundary; a tampered client gets
honest refusals, not privilege.

## 2. Live audit findings (2026-10-21, all verified against live state)

### Closed by migration 20261021100000 (FORCE RLS)

66 public tables had RLS enabled but NOT forced (table owner could
bypass policies). All were forced; zero public tables remain with RLS
off or enabled-not-forced. The migration list was generated FROM the
live database, not transcribed.

### Closed by migration 20261021200000 (RPC escalation hardening)

| Severity | Finding | Fix |
|---|---|---|
| CRITICAL | `promote_to_admin(email)` — SECURITY DEFINER, no check, executable by any authenticated user (default PUBLIC grant). Any signed-in user could become platform admin. | EXECUTE revoked from PUBLIC/anon/authenticated; owner-only (deliberate manual action). |
| CRITICAL | `admin_adjust_credits(_v2)` — admin check trusted caller-supplied `p_admin_id` (confused deputy). | Guard requires `auth.uid() = p_admin_id` AND admin role. Admin UI passes its own id — unaffected. |
| HIGH | `admin_approve_nin` / `admin_reject_nin` — same param-trusting pattern on identity verification. | Same guard. Call sites pass `user.id` — unaffected. |
| LOW | `seed_reward_catalogue()` — idempotent seed exposed to anon. | Client EXECUTE revoked; the `seed-rewards` edge function uses the service role. |

### Verified sound (no change needed)

- Self-escalation: `profiles_update_own` WITH CHECK pins the new role
  to the currently-stored role — a user cannot UPDATE their own
  `role` to admin. Confirmed live.
- All 25 write/ALL policies flagged by the scan are scoped by
  `is_current_user_admin()`, `can_manage_workspace()`,
  `is_workflow_document_owner/reviewer` or `auth.uid()`.
- The wide `pg_trgm` EXECUTE grants are PostgreSQL extension internals.
- Anon INSERT policies (`error_logs`, `analytics_events`,
  `calculation_reports`, `field_capture_log`) are append-only log
  surfaces; `field_capture_log` was hardened in engine #11
  (unattributed rows only).
- `award_credits` / `complete_credit_task` EXEC lockdown from the
  earlier monetization audit is intact.

### Known-open surfaces (disclosed, by design)

- `unlock_guest_daily_ai_allowance` (anon): guest AI allowance feature;
  bounded by the AI gateway's per-day allowance.
- `respond_to_client_estimate` (anon): share-token gated, token length
  enforced.
- `archie_*` service-role ALL policies: internal agent tables, service
  role only.
- Workspace owner transfer is not supported (refused honestly); the
  owner member row cannot be suspended or removed.
- Executable-by-authenticated RPCs that read shared estimate data
  (`fetch_shared_estimate`) are share-token scoped.

## 3. Workspace permission matrix

Single source: `src/lib/rbac/permission-matrix.ts` (sync-tested against
the DB CHECK constraints and the historical `WORKSPACE_ROLES` flags).
Managers = owner + project_manager. Revoked/suspended members have no
permissions; the DB helpers filter `status = 'active'`.

## 4. Audit trail

Workspace member mutations (invite, accept, role change, removal,
suspend/revoke/restore) write `workspace_activity_logs` rows with the
acting user's id. RPC admin actions on credits/NIN write their own
audit rows inside the guarded functions.

## 5. Independent review gate

`security_posture_reviews` (migration 20261021210000) holds per-surface
review records. Only platform admins can write them; an approved record
must carry the reviewer, date and findings. Until an approved record
exists for a surface, the UI discloses "not independently reviewed".
The app can never self-certify.
