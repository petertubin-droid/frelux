# Phase 1: executions that stopped halfway get resolved, 2026-11-01 20:15

## The gap

An agent action moves to `executed` when its write begins. If the process doing
it dies, nothing records a result and the row stays in `executed` permanently.
It never blocks other work, and the next run refuses rather than double-writing,
so it was not dangerous. It was simply unresolved: the thread showed an action
that neither finished nor failed, and no sweep existed to close it. No test
covered that path either.

## What now exists

`recover_interrupted_agent_executions(quiet_minutes)` resolves those rows to
`failed` after a quiet window of 30 minutes, which is far longer than any write
here takes, so a slow but healthy execution is never swept. It follows the same
lifecycle the application enforces (`executed` to `failed` is the only terminal
transition allowed from that state) and writes the explanation into
`execution_result` so the row explains itself later.

The note says what is actually known: the execution started, nothing recorded a
result, whether the write landed is unknown, and the record should be checked
before preparing a replacement. It does not claim the write failed.

Two ways to run it:

- `recover-agent-executions` edge function, which requires the scheduler token
  and calls the database function. It writes across every user's actions, so it
  refuses unauthenticated calls.
- pg_cron, calling the function directly.

Execution rights are service role only. Verified against production: `anon`
false, `authenticated` false, `service_role` true.

## Planning logic in application code

`src/lib/project-agent/recovery.ts` holds the same rule as a pure planner plus a
guarded executor, so the app can explain what a sweep would do without writing.
Every update is conditioned on the row still being in `executed`, so a sweep
overlapping a live execution cannot overwrite a real result. A row with no
usable timestamp is left alone: guessing which rows were interrupted from
missing data would invent state, which is the thing this module exists to
remove.

## Tests

Ten tests. Seven cover the planner: stale execution fails, recent execution is
left, non-executions are left, missing timestamps are refused, `updated_at` is
used when `executed_at` is absent, the window is honoured, and no em dash
reaches text a person could read. Three cover the executor against a stubbed
client: it counts only writes that changed a row, reports a read failure instead
of claiming a clean sweep, and stays honest when a write is refused.

## Live state

`project_agent_actions` currently holds no rows at all, so the sweep had nothing
to recover: the stale count is 0. The mechanism is in place before the data that
needs it, which is the right order for this one.

The migration run also applied two repo migrations that had been written but not
yet applied to production: `20261101183000_close_phase1_authz_gaps.sql` and
`20261101190000_close_dead_public_rpcs.sql`. Both succeeded.
