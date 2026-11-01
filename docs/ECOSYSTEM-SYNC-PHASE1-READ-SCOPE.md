# Phase 1 read-scope audit, 2026-11-01 19:00

## What was audited

All 45 callable functions that `anon` could execute as SECURITY DEFINER. For
each one: does the body check `auth.uid()`, `is_admin()`, or a share token, and
what does it read or write.

Classification:

- 33 check `auth.uid()` or `is_admin()`/`is_current_user_admin()`. These are
  safe for `anon` in the sense that the check fails closed: `auth.uid()` is
  null for an anonymous caller, and `is_admin()` returns false.
- 2 are gated by a share token (`fetch_shared_estimate`,
  `respond_to_client_estimate`), now with a UUID shape requirement.
- 10 carry no check at all.

## The 10 unchecked, judged one by one

| Function                                                    | Verdict                                                                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_marketplace_products`                               | Public by design. Filters `status = 'active'` and `admin_removed = false`, returns seller name and avatar only, never email or phone.                                                              |
| `find_nearby_listings` / `_products` / `_professionals`     | Public browse, same intent.                                                                                                                                                                        |
| `get_public_shared_project`                                 | Requires `is_active = true` and an unexpired `expires_at` on the shareable link, then returns that project only.                                                                                   |
| `get_published_translations` / `get_translation_alternates` | Published content rows only.                                                                                                                                                                       |
| `frelux_community_size`                                     | A single count, thresholded at 100 in the UI.                                                                                                                                                      |
| `increment_view_count` / `increment_product_view_count`     | Anonymous visitors are meant to drive these. Residual risk: the count can be inflated by repeated calls. Accepted, not fixed, because the fix means a rate limiter in front of a public page view. |
| `generate_marketplace_order_number`                         | No caller anywhere in `src/` or `supabase/functions`. Closed.                                                                                                                                      |
| `contact_messages_rate_ok`                                  | Answered whether an address had already written in, which is an oracle on a table `anon` cannot read. No caller. Closed.                                                                           |

Correction to my previous report: I described the 45 as unaudited. They are now
audited, and no privilege escalation or private-data path was found among them.

## Closed in this pass

`supabase/migrations/20261101190000_close_dead_public_rpcs.sql` revokes
`anon` and `authenticated` on the two unused functions above and leaves
`service_role`. Verified live: `still_open = 0`, and anon-executable definer
functions fell from 86 to 43.

## Remaining low-severity items

- The two view counters can be inflated. Real fix is edge rate limiting.
- `catalogue_products`, `material_aliases` and `site_health_probes` have RLS
  disabled and are readable by `anon`. The first two are public catalogue data
  by intent; `site_health_probes` should be checked for operational detail
  before the next pass.
