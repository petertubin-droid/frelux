# ARCHIE footprint inside the FRELUX project

Audited 2026-11-05 against project `freluxproject` (`nfgaaohweygwydoelxnf`).
Read only: nothing in this audit changed ARCHIE code, functions or data.

## What is deployed there

Eighteen edge functions whose slugs start `archie-`, all at version 21, last
updated late September 2026, every one deployed with `verify_jwt = false`:

`archie-agent-worker`, `archie-anatomy`, `archie-chat`, `archie-core`,
`archie-credentials`, `archie-ears`, `archie-engines`, `archie-execute`,
`archie-ingestion`, `archie-legal`, `archie-maintenance`, `archie-owner-auth`,
`archie-social-connect`, `archie-status`, `archie-studio`, `archie-trading`,
`archie-voice-enroll`, `archie-wallet-recovery`.

None of them exist in this repository, so a FRELUX function deploy never
touches them. They are older copies shipped while ARCHIE was being built here.

## The only live dependency

`src/lib/social/social-client.ts` is the sole caller of any `archie-` endpoint.
It reaches `archie-social-connect` on three paths:

| FRELUX call                | Remote path           | What breaks without it                    |
| -------------------------- | --------------------- | ----------------------------------------- |
| `getSocialAuthorizeUrl`    | `authorize?platform=` | cannot start a platform OAuth connect     |
| `completeSocialConnection` | `callback`            | cannot exchange the code or vault a token |
| `revokeSocialAccess`       | `revoke`              | cannot destroy the vaulted token          |

`syncSocialAccount` and `disconnectSocialAccount` are plain Supabase updates on
`frelux_social_accounts` and do not touch ARCHIE. Analyses are local
(`frelux_social_analyses`).

The single UI surface is `src/pages/admin/AdminSocialBrandCenter.tsx`.
`public.frelux_social_accounts` currently holds **0 rows**, so no live account
depends on this today. The token table `frelux_social_tokens` is service role
only, and anonymous reads are denied on all three social tables.

## Confirmed non-dependencies

- No other FRELUX code calls an `archie-` endpoint. The remaining mentions are a
  local variable name (`archieRateLimit`, rate limit key `archie-ingest:` in
  `ai-ingestion`) and comments in `_shared/moderation/verdict.ts`.
- No FRELUX SQL function or trigger calls ARCHIE. The `archie_*` SQL functions
  in `public` belong to ARCHIE tables only.
- The scheduled job `archie-maintenance-hourly` is active in this database but
  posts to `hqhvlkunkdrxyuvziorm.supabase.co` (the separate ARCHIE project), not
  to any function here.

## Data footprint

- 107 tables in `public` start `archie_` or `frelux_archie_`.
- 20 of them are readable by the `anon` role, including `archie_offensive_*`,
  `archie_constitution`, `archie_global_authorizations` and
  `frelux_archie_conversations`.

That is the one item worth acting on first: those tables are reachable with the
public anon key from the FRELUX domain.

## Order of work to retire the ARCHIE coupling

1. **Lock the anonymous reads.** Revoke `select` from `anon` on the 20 tables
   and confirm no FRELUX query loses data. Touches ARCHIE data access, so it
   needs explicit sign off.
2. **Own the social connector.** Add a FRELUX edge function implementing
   `authorize`, `callback` and `revoke` against `frelux_social_tokens`, then
   repoint `social-client.ts` and its tests. Three paths, one table, no new UI.
3. **Retire the mirror functions.** With step 2 merged and a connect/revoke
   round trip proven, the eighteen `archie-*` mirrors can be deleted. Nothing in
   this repository imports them.
4. **Decide the tables separately.** Moving or dropping 107 tables, their
   triggers and the cross-project cron is its own migration with a backup and a
   rollback, not a cleanup done in passing.
