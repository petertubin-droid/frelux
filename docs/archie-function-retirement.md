---
title: ARCHIE edge function retirement
summary: The eighteen ARCHIE edge functions left deployed on the FRELUX project were removed on 12 November 2026 after confirming nothing in the app, the database or the scheduler calls them. The tables and their data were kept.
---

# ARCHIE edge function retirement

ARCHIE was separated from FRELUX in October 2026: its code moved to
`github.com/petertubin-droid/ARCHIE` and the `archie/` paths left this repo. What
did not move was the deployment. Eighteen ARCHIE functions stayed live on the
FRELUX project (nfgaaohweygwydoelxnf), taking eighteen of the hundred function
slots and doing nothing for the product.

They were removed on 12 November 2026.

## What was removed

| Function | Version at removal | verify_jwt | Status |
| --- | --- | --- | --- |
| `archie-owner-auth` | 25 | True | ACTIVE |
| `archie-social-connect` | 25 | True | ACTIVE |
| `archie-core` | 25 | True | ACTIVE |
| `archie-status` | 25 | True | ACTIVE |
| `archie-ingestion` | 25 | True | ACTIVE |
| `archie-chat` | 25 | True | ACTIVE |
| `archie-studio` | 25 | True | ACTIVE |
| `archie-execute` | 25 | True | ACTIVE |
| `archie-anatomy` | 25 | True | ACTIVE |
| `archie-credentials` | 25 | True | ACTIVE |
| `archie-agent-worker` | 25 | True | ACTIVE |
| `archie-ears` | 25 | True | ACTIVE |
| `archie-legal` | 25 | True | ACTIVE |
| `archie-voice-enroll` | 25 | True | ACTIVE |
| `archie-engines` | 25 | True | ACTIVE |
| `archie-trading` | 25 | True | ACTIVE |
| `archie-wallet-recovery` | 25 | True | ACTIVE |
| `archie-maintenance` | 25 | True | ACTIVE |

## Why each one qualified as having no effect

Checked on the live project, not assumed:

- **No application caller.** No `src/`, `scripts/` or `supabase/functions/`
  reference to any of these slugs exists in this repo.
- **No local source.** `supabase/functions/` has no `archie-*` directory, so
  these were orphaned deploys whose source lives only in the ARCHIE repo.
- **No cron target.** The only ARCHIE job on the database is
  `archie-maintenance-hourly`, and it posts to the ARCHIE project host
  (`hqhvlkunkdrxyuvziorm.supabase.co`), deliberately, not to this project.
- **No database caller.** No `pg_proc` definition on this project contains
  `functions/v1/archie`, and `net._http_response` holds no ARCHIE request.
- **Dormant by usage.** `frelux_archie_execution_runs` had two rows, the newest
  on 13 September 2026. `frelux_archie_conversations` had ten, the newest on
  19 September 2026. `archie_scheduler_state` and `archie_scheduler_runs` were
  empty.

## What was deliberately kept

- `archie-maintenance-hourly`, the cross project cron job. It is what keeps
  ARCHIE maintained, and disabling it would break ARCHIE silently.
- Every `archie_*` and `frelux_archie_*` table, with its data. Those are records,
  not execution paths, and they are the only copy on this project.
- `health` and `sitemap`, which are FRELUX functions, not ARCHIE ones, even
  though the ARCHIE execution registry pointed at them.

## Registry rows removed with them

`frelux_archie_execution_targets` held two EDGE_FUNCTION rows whose
`function_name` was `archie-status` and `archie-agent-worker`. Both were STAGING
targets reachable only from `ARCHIE_CHAT`, so they were removed rather than left
pointing at functions that no longer exist. The `health-check` and
`sitemap-regenerate` rows were left alone.

## To restore one

The definitions are in the ARCHIE repo. Redeploy from there with the functions
CLI. The metadata captured at removal (version 25 for all eighteen, `verify_jwt`
true, entrypoint `supabase/functions/<slug>/index.ts`) is recorded in the table
above so a restore matches the old configuration.
