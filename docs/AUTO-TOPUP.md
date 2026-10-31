# API wallet auto top-up

The API wallet is prepaid. When it runs out, requests are refused with a 402.
Auto top-up charges a saved card so that does not happen while nobody is
watching.

## How a card gets saved

No card number ever reaches FRELUX. The owner tops up once through the normal
hosted checkout, and Flutterwave's verification response for that payment
contains a reusable token (`data.card.token`). The webhook reads that token
after the top-up settles and stores it with `register_api_payment_method`.

Consequences worth knowing:

- The site stays out of card-data scope. There is no card form, no encryption
  key, and no card number in any request we make.
- A card only exists once a real payment has succeeded, so a stored card is a
  card that has worked.
- Provider tokens last one year. After that the card must be re-tokenized by
  topping up again, which happens naturally.
- If the account does not have tokenization enabled, no token comes back, no
  card is stored, and the panel says top-up is manual. Nothing claims
  otherwise.

## The guards

Auto top-up moves money unattended, so every uncertain state resolves to no
charge. The rules exist twice on purpose: as pure functions in
`supabase/functions/_shared/auto-topup.ts`, which the tests pin, and as SQL in
the sweep query and `begin_api_autotopup`, which the database enforces.

| Guard                            | Effect                                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Consent recorded                 | `set_api_auto_topup` refuses without a consent version. A saved card is not consent.                                                          |
| Threshold below amount           | One charge must lift the balance above the threshold, or the next sweep charges immediately and the net becomes a subscription.               |
| Amount between 5 and 200 USD     | Small repeated charges only. Larger amounts are a deliberate act by a human.                                                                  |
| Strict balance test              | Charges only when `balance < threshold`.                                                                                                      |
| Ten minute cooldown              | A failing sweep cannot hammer a card.                                                                                                         |
| Two declines in a row            | Switches itself off with a reason shown in the portal.                                                                                        |
| One charge in flight             | A partial unique index on pending attempts, plus a per-wallet advisory lock in `begin_api_autotopup`.                                         |
| Fifteen minute expiry            | A pending attempt whose process died is failed, not left blocking the wallet forever.                                                         |
| Only an explicit success credits | `pending`, `processing` and unknown all mean no credit, because a wallet credited on a maybe is credited twice once the webhook also arrives. |

Crediting goes through `credit_api_wallet_topup`, keyed by `auto:<tx_ref>`, so a
double settle cannot pay twice.

## The sweep

`frelix-wallet-autotopup` is called by pg_cron every ten minutes through
`pg_net`. Its callers must present `x-frelux-cron-secret`, which pg_cron reads
from `frelux_internal_config` (unreadable from a browser) and which the function
compares against `AUTOTOPUP_CRON_SECRET`. Without either, the function refuses
before it touches the database.

It charges at most ten wallets per run, reads the token server side only, and
settles each attempt in the database before and after the provider call.

## 3DS cards

A card whose subsequent charges require authentication cannot be charged by a
sweep, because there is nobody to answer the prompt. The provider response is
recorded as a decline with the reason, and after two the owner's auto top-up
switches off with a message to check the card.

Unattended charging of those cards needs Flutterwave to enable no-authentication
subsequent charges on the account (a support request), or the owner tops up by
hand.

## Operating it

Check what the sweep would consider:

```sql
select * from public.api_autotopup_candidates(20);
```

See recent attempts and why any failed:

```sql
select user_id, amount_usd, status, failure_reason, created_at
from public.frelux_api_autotopup_attempts
order by created_at desc limit 20;
```

Rotate the secret (both places, in this order):

```sql
insert into public.frelux_internal_config (name, value)
values ('autotopup_cron_secret', '<new secret>')
on conflict (name) do update set value = excluded.value, updated_at = now();
```

Then set `AUTOTOPUP_CRON_SECRET` to the same value in project secrets.

Pause the sweep without touching code:

```sql
select cron.unschedule('frelux-autotopup-sweep');
```

## What is not built

- Card management beyond auto top-up: no removing a saved card from the portal
  yet, and no choosing between several cards. `register_api_payment_method`
  makes the first card default.
- A notice when a charge fails. The reason is stored and shown in the portal,
  but nobody is told while they are away.
