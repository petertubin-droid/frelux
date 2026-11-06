# FRELUXTOOLS platform audit, 6 November 2026

Scope: public site at https://freluxtools.com/, the production repository, and
the deployed artefact. Every figure below was measured in this session. Items
that could not be measured are listed as outstanding rather than assumed.

## 1. Authoritative codebase

| Check               | Result                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| Local worktree      | `petertubin-droid/frelux`, branch `main`, clean before this batch                       |
| Production deployer | same repository; `netlify.toml` and `scripts/lib/site-url.mjs` set the canonical origin |
| Second repository   | `Petertubin/frelux` not inspected: no access from this environment                      |

The two GitHub URLs named in the brief resolve to one deployment path, not two
active codebases. Confirmation that `Petertubin/frelux` is archived or a mirror
needs repository access.

## 2. Platform inventory (measured)

| Surface                             | Count                       |
| ----------------------------------- | --------------------------- |
| Route declarations in `src/App.tsx` | 362                         |
| Page modules under `src/pages`      | 577 files, 319 non-test     |
| Components                          | 459                         |
| Library modules under `src/lib`     | 1371                        |
| Test files                          | 1196 (685 inside `src/lib`) |
| Database migrations                 | 678                         |
| Edge functions                      | 80                          |

### Engine connectivity

319 non-test pages were parsed for imports from `@/lib`:

- 267 pages import at least one engine, 52 do not.
- Concentration of shared cores: estimation 179 pages, international 146,
  safeError 66, suppliers 29, market-intelligence 27, price-index 18, boq 16,
  calculator-monitor 15, measurement 14, engineering 14, project-intelligence
  13, pro-connect 13, marketplace 11, location-intelligence 10, wallfinishing 10.

The dependency graph is already centralised rather than a set of independent
calculators: most pages reach the same estimation and international cores.

### Pages with no engine import

52 pages, of which most are non-calculating surfaces (Contact, Credits, Faq,
Metrics, NotFound, Partners, Printables). Three are calculator-related and need
individual review:

- `src/pages/SmartCalculator.tsx`, 91 lines, no library import.
- `src/pages/MineralStoneCalculator.tsx`, 30 lines, no library import.
- `src/pages/MathematicalPlanElevation.tsx`, 253 lines, no library import, so
  any formula in it is local to the page and cannot be shared or regression
  tested through the common cores.

Classification of every one of the 267 engine-backed pages as fully or partly
functional needs per-engine output checks, which is the next audit stage (see
section 8). A visible interface was not treated as proof of a working backend.

## 3. Deployment state

The live HTML loads `/assets/js/index-BLA0sjDR.js`. The current worktree builds
`index-Z1x-3t73.js`. The production artefact therefore predates the commits
from this week, including the map, article and navigation work. Deployment is
tracked as an open action, not a code defect; no Netlify API credential is
available here.

Live sitemap carries 3067 URLs against 1638 in a local build. The difference is
not a regression: article, colour and market-template URLs are fetched from
Supabase during the Netlify build, and a local build without the Supabase
environment variables falls back to the static route list. Measured split of the
live file: 1344 `/market`, 794 `/colors`, 443 `/learn`, 157 `/es`, 79
`/templates`, 66 `/faq`, 44 `/building-types`.

## 4. Domain and indexation

| Probe                              | Result                                                |
| ---------------------------------- | ----------------------------------------------------- |
| `https://freluxtools.com/`         | 200, canonical `https://freluxtools.com/`             |
| `https://www.freluxtools.com/`     | 301 to apex                                           |
| `https://freluxtools.netlify.app/` | 301 to `https://freluxtools.com/`                     |
| `http://freluxtools.com/`          | not verified, port 80 is blocked in this sandbox      |
| `robots.txt`, `sitemap.xml`        | 200                                                   |
| Sitemap URLs                       | 3067, all unique; a 12 URL random sample returned 200 |
| Structured data on home            | Organization, WebSite, ItemList with 9 ListItems      |
| hreflang tags anywhere             | none                                                  |

### Defect found and fixed in this batch

`/es/` was the only locale prefix missing its `X-Robots-Tag: noindex` header.
Live headers for `/fr/`, `/de/`, `/pt/`, `/ru/`, `/id/`, `/sw/`, `/ar/`, `/hi/`,
`/zh/`, `/ja/` and `/nl/` return `noindex, nofollow`; `/es/` returned nothing.
At the same time 157 `/es/` URLs were published in `sitemap.xml`, and the
prerendered `/es/` page was byte-identical to its English original
(`/es/learn/pop-ceiling-maintenance-and-repair-tips/` and the English page both
39413 bytes, identical text, zero Spanish markers), declared `lang="en"` and
canonicalised to the English root.

That combination is the worst of both policies: duplicate English pages
submitted for indexing while the other eleven locales are excluded. The static
route list in the sitemap generator already enforced English-only, but the
Supabase-fed article and template lists did not, so locale rows reached
production.

Fixed: `/es` and `/es/*` now carry the same noindex header as every other
locale, and the sitemap generator filters locale-prefixed paths at assembly
time instead of trusting the static list. `src/lib/locale-url-policy.test.ts`
asserts that every locale declared in `LANGUAGES` has both header rules, that
the generator applies the filter, and that no locale URL ships in the sitemap.
The filter is prefix-exact, so English routes such as `/escrow` and
`/estimate-refresh` are unaffected.

Removal of the 157 URLs is confirmed only by the next production build, because
the list originates from Supabase at build time.

## 5. Prices and market data

`market_material_prices`, `market_price_observations` and `price_submissions`
exist in the schema. Freshness could not be measured: the Supabase management
token in the conversation environment returns `Invalid access token`, and the
repository carries no anon key. Verifying staleness, duplicates and outliers
(section 4 of the brief) requires a working token.

No price was asserted as live in this report. The interface labels and the
"last verified" rendering must be checked against real rows before any claim of
price intelligence is made.

## 6. Security

- Database RLS and grant state not re-verified this session for the reason in
  section 5.
- No credential was read from or written to the client bundle during this batch.
- `/es/` header gap was an indexation defect, not an exposure.

## 7. Performance

Not measured in this batch. A local build emits 637 JavaScript chunks; Core Web
Vitals, Lighthouse and slow-network behaviour need a dedicated run against the
deployed artefact, after the pending deploy.

## 8. Prioritised roadmap

1. Deploy the pending build, then re-probe the `/es/` headers, sitemap and
   canonical values in production. (blocked on Netlify credential)
2. Price freshness audit: issue a valid Supabase token, then measure staleness
   per market and city, duplicate keys and outliers before touching the UI.
3. Per-engine output verification: reference inputs with independently computed
   expected values for the paint, block, tile, roofing, POP, borehole and
   structural cores, recording every disagreement.
4. Bring the three engine-free calculator pages onto shared cores, starting with
   `MathematicalPlanElevation.tsx` because it is the largest.
5. Cross-tool consistency tests so one quantity cannot be computed two ways.
6. Search Console and analytics verification with the owner's credentials, to
   confirm which of the 3067 submitted URLs are actually indexed.
7. Learn content integrity: empty categories, internal links to calculators,
   duplicate topics.
8. Monetisation and admin audit after the above correctness work, not before.

## 9. Changes in this batch

- `public/_headers`: `/es` and `/es/*` noindex rules, completing the twelve
  locale prefixes.
- `scripts/lib/locale-paths.mjs`: single source of truth for locale prefixes and
  the prefix test.
- `scripts/generate-sitemap.mjs`: locale paths dropped at assembly, with a
  logged count.
- `src/lib/locale-url-policy.test.ts`: five assertions covering header
  completeness per locale, prefix matching, generator wiring and sitemap output.

Verification: `vitest run src/lib/locale-url-policy.test.ts
src/lib/sitemap-namespace.test.ts src/lib/ads-txt.test.ts` 27 passed; `tsc`
clean; production build prerenders 1638 routes.

## 10. Outstanding

- Valid Supabase token for database evidence.
- Netlify deploy confirmation and a live re-probe.
- Per-engine functional classification, which this batch did not complete.
- Second repository disposition.
- Performance and accessibility measurement.
- Search Console access.
