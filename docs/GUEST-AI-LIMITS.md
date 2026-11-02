# Guest AI limits, where to set them

## Where the numbers live

One table: `public.rewarded_ad_credit_config`, row `id = 1`.

| Column                         | Controls                                           | Default |
| ------------------------------ | -------------------------------------------------- | ------- |
| `guest_operations_per_day`     | AI operations one guest may consume per day        | 1       |
| `guest_global_unlocks_per_day` | Guest ad unlocks per day across ALL client hashes  | 200     |
| `credits_per_ad`               | Credits per verified ad for signed-in unpaid users | 5       |
| `daily_earn_limit`             | Ads per day for signed-in unpaid users             | 4       |
| `is_enabled`                   | Master switch                                      | true    |

To change them: Supabase Dashboard, Table Editor, `rewarded_ad_credit_config`,
row `id = 1`. Or `UPDATE public.rewarded_ad_credit_config SET ... WHERE id = 1;`.
Set `guest_global_unlocks_per_day = 0` to switch guest AI off entirely without a
code change.

The migration that creates the two guest columns is
`20261031150000_guest_ai_cost_ceiling.sql`. It needs `supabase db push`, which
is still manual, so the columns and the ceiling are not live in production yet.

## What the guest limits are, relative to a subscriber

A guest gets one AI operation per day and one ad unlock, against four ads
totalling 20 credits for a signed-in unpaid user. A subscribed user's allowance
is set by their plan, not by this table.

## What this does and does not fix

`unlock_guest_daily_ai_allowance` is anon-callable and trusts a caller-supplied
`p_client_hash` with no ad verification. Every per-guest guard keys on that
hash, so sending a fresh hash each time walked past all of them.

The global ceiling is the part that survives that. Total guest unlocks per day
now have a hard maximum, so total guest AI spend per day has a hard maximum,
regardless of how many hashes arrive. That is a cost bound, not an identity
check, and it should be described as such.

Still open, and needing an owner decision because it changes the guest
experience: revoke the anon grant and route unlocking through the existing
authenticated `verify-rewarded-ad` edge function, so a credit is only minted
after the provider confirms the ad. Until then the ceiling is what keeps the
exposure finite.
