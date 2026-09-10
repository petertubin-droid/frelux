-- =========================================================
-- ARCHIE OFFENSIVE-SECURITY REGISTRY — FIRST REAL AUTHORIZATION
--
-- Owner directive (2026-09-10): register a real, in-scope
-- authorization so the consolidated SECURITY VERDICT GATE
-- (supabase/functions/_shared/archie-ai/security/verdict.ts,
-- wired into archie-chat) has a live authorization to
-- exercise — and so the authorization-gated intrusive path
-- has a genuine, owner-registered target.
--
-- What is being authorized (honestly):
--   Target: the live FRELUX/ARCHIE Supabase project's public
--   API surface — the edge-function gateway and the anon REST
--   surface of the project the owner owns (hqhvlkunkdrxyuvziorm).
--   This is ARCHIE's own infrastructure, registered by the
--   owner for authorized security testing.
--
--   Scope: ONLY the public API surface. Direct database access,
--   auth admin endpoints, security/registry tables, and any
--   write path to production data are EXCLUDED — exclusions
--   always win over scope.
--
--   Phase: DISCOVER — the engagement begins at the start of the
--   8-phase lifecycle. No intrusive phase has been claimed.
--
-- Idempotent: safe to re-run.
-- =========================================================

INSERT INTO public.archie_offensive_targets (
  id, kind, identifier, scope, exclusions, registered_by
) VALUES (
  'tgt-archie-api-lab',
  'ARCHIE_INFRASTRUCTURE',
  'hqhvlkunkdrxyuvziorm.supabase.co',
  '["https://hqhvlkunkdrxyuvziorm.supabase.co/functions/v1 — edge-function gateway (public endpoints)", "https://hqhvlkunkdrxyuvziorm.supabase.co/rest/v1 — anon-accessible REST surface"]'::jsonb,
  '["direct database connections (Postgres/psql)", "auth admin endpoints and user management", "all archie_* registry/audit tables", "frelux_security_events", "any write path to production user or business data", "service-role credentials"]'::jsonb,
  'd74ffbd7-281b-4445-9728-ad87c287e0b9'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.archie_offensive_engagements (
  id, target_id, current_phase, phases
) VALUES (
  'eng-archie-api-lab-1',
  'tgt-archie-api-lab',
  'DISCOVER',
  '{"DISCOVER": {"started": "2026-09-10", "note": "Authorized engagement on ARCHIE''s own API surface. Owner-registered; verdict-gate integration verified 2026-09-10."}}'::jsonb
) ON CONFLICT (id) DO NOTHING;
