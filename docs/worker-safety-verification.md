---
title: Worker safety rules, what is verified and what is not
summary: What was proven live for the five safety rules, including the 48 hour payout clock and rule 4 travel approvals, and the one path that still needs a real marketplace order before it can be called verified.
---

# Worker safety verification

The rules live in `supabase/migrations/20261112170000_worker_safety_rules.sql`.
This note records what was actually exercised against the live database, so
nobody later reads a passing test suite and assumes more than it covers.

## Verified against the live database

Each check below ran inside a transaction that was rolled back, so the
production rows were left untouched.

**Rule 4, cross state blocking.** A marketplace sourced escrow contract whose
professional lists a different state and holds no location there is refused with
`CROSS_STATE_JOB_BLOCKED`. The same insert succeeds once a
`cross_state_approvals` row exists for that professional, client and state. After
`revoke_cross_state_approval` expires that row, the insert is refused again.
`approve_cross_state_job` called with a non admin identity raises `ADMIN_ONLY`
before it looks anything up.

**Rule 5, the 48 hour payout clock.** Three proof photos set
`auto_release_due_at` 48 hours out. An unexpired milestone is not returned by
`escrow_auto_release_due`. A milestone whose clock has run out is returned. A
`client_objected_at` timestamp removes it from the queue. A second proof upload
adds to `work_proof_count` without resetting the deadline.

**Storage for both pieces of evidence.** Uploads to `client-ids` and
`work-proofs` succeed only inside the caller's own folder: `200` for the owner,
`403` for another user's folder and `403` for an anonymous caller.

## One detail that catches people out

`enforce_worker_safety_on_contract` returns immediately unless
`escrow_contracts.source` is `marketplace` or `pro_connect`, by design: a direct
escrow between two people who already know each other is out of scope. A test
insert that leaves `source` at its default proves nothing, because every rule is
skipped. Any future test of these rules must set the source.

## Not yet verified

`approve_cross_state_job` derives the professional and the client from a
`marketplace_orders` row. The platform currently has no marketplace orders at
all, so that lookup has only been proven to raise `ORDER_NOT_FOUND`. The row it
writes has the same shape the guard accepts, which is what the tests above
confirm, but the first real booking should be watched end to end before the
travel approval is treated as fully exercised.
