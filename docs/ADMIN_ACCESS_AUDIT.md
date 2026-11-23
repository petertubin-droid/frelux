# Admin access audit (2026-11-23)

Scope: every admin page, section and engine surface in the frontend, and whether
each is connected to admin control, to the calculator engine maths, and to a
gate. Question asked: which frontend surfaces have no admin connection and no
engine logic, yet should be password protected.

Evidence levels are marked per finding: **live** (database query against
nfgaaohweygwydoelxnf) or **static** (source inspection, not executed).

## 1. How the admin area is gated

- 114 admin pages in `src/pages/admin/` (excluding tests).
- All of them hang off one nested route tree at `/admin` in `src/App.tsx`, and
  that tree is wrapped in `RequireAdmin` (static). There is no second admin
  route tree, so no admin page is reachable outside the guard.
- `RequireAdmin` (src/components/admin/RequireAdmin.tsx) renders the admin login
  when there is no session, and a "Not authorized" screen when the session is
  not an admin. It does not redirect, so a non-admin never sees the shell.
- `isAdmin` comes from `profile?.role === "admin"` (src/lib/auth.tsx), read from
  `profiles` under RLS (static).

**Server side (live).** The client gate is not the protection; the policies are:

| table                | policy                    | using        | with check   |
| -------------------- | ------------------------- | ------------ | ------------ |
| estimation_prices    | est_prices_admin_write    | `is_admin()` | `is_admin()` |
| estimation_materials | est_materials_admin_write | `is_admin()` | `is_admin()` |

Read policies are public for both, which is correct: the price book is meant to
be readable.

## 2. Tables without row level security (live)

Four public tables have RLS disabled:

- `pro_category_merges`
- `pro_profile_category_moves`
- `product_category_merges`
- `product_category_moves`

They carry **no grants** to `anon` or `authenticated` (live), so they are not
reachable through the API today. Risk is latent: enabling RLS is defence in
depth, and any future grant would expose them immediately.

## 3. Frontend surfaces with no login gate (static)

Top-level routes that render without any `useAuth` check or login redirect.
Protection today is RLS alone, which means a logged-out visitor gets an empty or
broken page instead of a login prompt.

### 3a. Holds user data, should require a session

| route                                                     | component            | note                             |
| --------------------------------------------------------- | -------------------- | -------------------------------- |
| `/properties`                                             | PropertiesDashboard  | dashboard of a user's properties |
| `/project-workspace/:id`                                  | ProjectDetail        | single project, no auth check    |
| `/project-workspace/:id/client-estimate/new`              | ClientEstimateEditor | editor                           |
| `/project-workspace/:id/client-estimate/:estimateId/edit` | ClientEstimateEditor | editor                           |

These are the clearest gaps: they are not admin surfaces and not calculators,
they render another person's data if RLS were ever loosened, and they give a
logged-out user no path to sign in.

### 3b. Operational views, decide the policy

| route                   | component            | what it shows              |
| ----------------------- | -------------------- | -------------------------- |
| `/site-intelligence`    | SiteIntelligence     | site and soil screening    |
| `/material-price-index` | MaterialPriceIndex   | price index across markets |
| `/material-prices`      | MaterialPriceTracker | material price tracking    |

All three are readable and unguarded. The price book is public by design, so
this may be intentional transparency; if it is meant as internal analysis, it
needs a session gate.

### 3c. Costly or heavy compute, public

`/bim-ifc-import`, `/blueprint-takeoff` and `/quote-check` run engine work for
anonymous visitors with no rate limit at the route level. Not a data leak, a
spend and abuse question.

### 3d. Capability URL, correct as designed

`/estimate/:token` is unguarded on purpose: the token is the password. Worth
confirming token expiry and revocation, which is a separate audit.

## 4. What this audit could not establish

Which admin pages are frontend shells. A page can delegate all of its data work
to `@/lib/*` modules and `@/components/admin/*` components, so import-level
analysis produced false positives (for example `AdminEngineConfig` looks
"unconnected" by direct import yet drives `@/lib/engine-integration` and the
engine matrix components). Claiming a shell list from static imports would be a
guess. Settling it needs a runtime check per page with an admin session.

## 5. Recommendations, in order

1. Add a session gate to the four project workspace routes (3a). This is the
   only group where the absence of a gate is a defect rather than a policy
   choice.
2. Decide the policy for 3b and write it down; then either gate them or state
   they are public price transparency.
3. Put authenticated-user limits on 3c to protect compute.
4. Enable RLS on the four merge/move tables, even though they carry no grants.
5. Leave the `/admin` tree as it is: nested guard plus `is_admin()` policies is
   the correct shape.
