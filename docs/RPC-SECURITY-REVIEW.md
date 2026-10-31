# RPC security review

Reviewed the tree at `39d5ed6a`. 155 functions in `public`, 104 of them
`SECURITY DEFINER`, 5 of those write platform tables.

## Correction to an earlier conclusion

My Phase 0 note said no price or supplier function was anon-reachable, based on
reading the explicit `GRANT EXECUTE ... TO anon` statements. That was
incomplete. Postgres grants `EXECUTE` to `PUBLIC` by default, and `anon` inherits
`PUBLIC`, so a function with no explicit grant is callable by anonymous visitors
unless something revoked it. Only 13 `REVOKE` statements exist across every
migration.

Reachability has to be judged from default privileges and revocations, not from
grants alone. This review redoes it that way.

## Finding 1, fixed: anon could reset reward pricing

`seed_reward_catalogue()` was explicitly granted to `anon`, is
`SECURITY DEFINER`, does not pin `search_path`, and runs
`INSERT ... ON CONFLICT (reward_key) DO UPDATE` setting `credit_cost`,
`name`, `description`, `is_enabled` and `updated_at` from hardcoded literals.

Any visitor could call it and reset the reward catalogue to those literals,
overriding whatever an administrator had configured, at no cost and with no
account. It is a seeder, not a user action: it has no business being reachable
from a client at all.

Fixed by `20261031160000_harden_privileged_writers.sql`, which also restricts
the other four client-reachable writers to `service_role`:

- `seed_reward_catalogue`
- `store_social_token`
- `log_estimation_price_change`
- `frelux_release_engine_lock`
- `frelux_archie_snapshot_knowledge`

None of the five has a caller anywhere in `src/`, verified by search, so
restricting them costs no functionality. The migration resolves them by name
rather than signature so it cannot drift from the live schema, and revokes from
`PUBLIC`, `anon` and `authenticated` rather than only the role that was named.

## Finding 2, tracked, not fixed: 34 unpinned search_path

34 `SECURITY DEFINER` functions do not set `search_path`. For a function that
writes, an attacker who can create objects in a schema earlier in the path can
redirect an unqualified `INSERT` or `UPDATE` to their own table. This is a
standard privilege-escalation shape, and the fix is normally
`SET search_path = public, pg_temp`.

I did not blanket-apply it, and that is deliberate. These functions call
extension symbols, and on Supabase extensions live in the `extensions` schema.
Pinning to `public, pg_temp` would make any function that resolves `crypt`,
`gen_random_uuid` or a pg_cron symbol fail at runtime, converting a theoretical
escalation into a live outage. Every function needs its dependencies checked
before its path is pinned.

Reproduce the list:

```sql
SELECT p.oid::regprocedure
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND NOT EXISTS (
    SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c
    WHERE c LIKE 'search_path=%'
  );
```

Plan: pin in batches grouped by dependency, with a test per batch. Not started,
because it needs the live database to verify against and production is paused.

## Status

The migration is written but not applied. `supabase db push` is still manual, so
production still has the anon-callable seeder until the owner deploys.
