# Live Site Audit — freluxtools.netlify.app

**Date:** October 17, 2026 (Africa/Lagos)
**Scope:** Live production deployment (Netlify), Supabase project `freluxproject` (`nfgaaohweygwydoelxnf`), SEO/crawlability, article pipeline, marketplace, auth.
**Audited by:** Vesper (agent), at owner direction.

---

## Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Deployed build is **stale** — today's fixes (footer duplication, sitemap 301 cleanup, type repairs) are not live | **High** | Needs redeploy |
| 2 | ~~US knowledge library unpublished~~ **RESOLVED Oct 17:** all 50 articles published under petertubin byline, verified rendering live | — | Done |
| 3 | Google OAuth **not configured** on freluxproject — "Continue with Google" will fail | **High** | Owner: Supabase dashboard |
| 4 | Unknown routes return **soft 200** (generic SPA shell, homepage canonical) instead of 404 | Medium | Fix in repo |
| 5 | /learn/ hub article listing is JS-driven (not in prerendered HTML) | Medium | Fix in repo |
| 6 | Marketplace hero copy still Nigeria-only ("Nigeria's #1… 36 States Covered") vs 39 markets | Low | Admin panel edit |
| 7 | Marketplace shows 0 active listings / "No jobs found" | Low | Content seeding |
| 8 | /api/heartbeat 200 ✓, security headers present ✓, article prerender ✓, cookie consent ✓ | — | Healthy |
| 9 | Live `/sitemap.xml` function env still queries the **old** Supabase project — the 50 new US articles are missing from the sitemap (deployed SPA bundle already targets freluxproject) | **High** | Fix Netlify site env |

---

## Verified healthy

- **Security headers** on homepage: `strict-transport-security max-age=31536000; includeSubDomains; preload`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, CSP present.
- **Article prerender is real**: `/learn/what-is-stucco-a-complete-guide/` serves correct `<title>`, `<h1>`, self-canonical, and 32 in-HTML body mentions of "stucco" — no JS required.
- **Trailing-slash canonicalization consistent**: non-slash paths (e.g. `/learn`, `/material-prices`, `/glossary`) 301 to slash versions; slash versions return 200.
- **Legacy calculator 301s work**: `/painting-estimator` → `/paint-calculator/?mode=room-estimate` (301).
- **Netlify functions respond**: `/api/heartbeat` 200, `/api/articles` 200.
- **Login page renders** (email/password form present); cookie preferences modal functional (Reject Non-Essential accepted without error).
- **Sitemap reachable**, 240 URLs, all Learn article URLs in the sitemap return 200 with prerendered content.

---

## Issues

### 1. Deployed build is stale (High)

Evidence: `/marketplace/` still renders **two stacked full footers** (site chrome duplicated) — fixed in repo at `24106a39` (MarketplaceLayout no longer renders Navbar/Footer/SupportChatWidget; regression test added). The live `/sitemap.xml` still lists the **6 legacy calculator slugs** (`cost-estimator`, `painting-estimator`, `pop-ceiling-cost-estimator`, `screeding-cost-estimator`, `tile-cost-estimator`, `tyrolene-estimator`) that were removed from sitemap sources in `015afabe` — Google Search Console will keep flagging 6 redirect URLs while this deploy is live.

Netlify auto-build is off (owner directive). **Action: owner triggers one manual deploy of `main` (now `cc13a14e`).** That single deploy picks up: the footer duplication fix, sitemap legacy-slug removal, the naira-sweep type fixes, and this audit doc.

### 2. US knowledge library published (RESOLVED Oct 17)

Fresh `sbp_` token supplied by owner. Applied `20261024200000_publish_us_articles_petertubin.sql` (with a fix: `SET LOCAL request.jwt.claims` cannot take a subquery; replaced with `set_config(..., is_local=true)`). Verified in DB: **50/50 US articles `published`, author `petertubin`**, 10 topics `verified`, 86 sources `accepted` with genuine reviewer attribution. Total published on freluxproject: 150.

Verified live in a real browser: `/learn/us-timber-stud-drywall-installation/` renders full content with petertubin byline and Oct 17 2026 date (SPA fetch + RLS working).

**Remaining gaps from this item:**
- **Sitemap:** the live `/sitemap.xml` function still returns only the old 100 articles — its runtime env on Netlify queries the old Supabase project while the deployed SPA bundle targets freluxproject. Fix: set `SUPABASE_URL` + `SUPABASE_ANON_KEY` (freluxproject values) in the Netlify site env and redeploy. Committed `public/sitemap.xml` regeneration already drops the 6 legacy calculator slugs.
- **Crawler HTML:** the 50 new articles serve the generic SPA shell to crawlers (no build-time prerender entries — `scripts/seo-content-map.mjs` covers only pre-existing pages). Google indexes them via JS rendering, but prerendering or a dynamic article-render function would speed indexing. Recommend after redeploy.

### 3. Google OAuth not configured (High)

`/auth/v1/settings` on `nfgaaohweygwydoelxnf` returns **no external providers** — the Google button on `/login` will error. **Action: owner enables the Google provider** in Supabase dashboard (Authentication → Providers) with the production client ID/secret, and adds `https://freluxtools.netlify.app/**` to the redirect allow-list.

### 4. Soft 200 on unknown routes (Medium)

Any unknown path (e.g. `/this-page-does-not-exist-xyz`, or the legacy `/learn/articles/<slug>` pattern — not a defined route) returns HTTP 200 with the generic SPA shell whose canonical is the homepage. Duplicate-content/soft-404 SEO risk. Fix direction: return real 404 status (and render NotFound) for paths that match no route and have no prerendered file — implement in the Netlify edge function route logic.

### 5. Learn hub listing not prerendered (Medium)

`/learn/` serves correct title/meta, but the article listing itself is fetched client-side from `/api/articles` (crawlers relying on the sitemap still reach all articles directly, so impact is limited to hub-level discovery). Fix direction: prerender the hub listing or ensure the hub links to article URLs in HTML.

### 6. Marketplace hero copy not globalized (Low)

Hero reads "Nigeria's #1 marketplace… 36 States Covered" while the site footer advertises 39 markets with local currency pricing. Hero content is DB-managed (tamper-proof by design): update copy in the admin panel when globalizing.

### 7. Marketplace has zero listings (Low)

"0 Active Listings", "No jobs found". Expected for a fresh DB on the new project; needs content seeding / launch plan before public launch.

---

## Change log from this audit session

| Commit | Change |
|--------|--------|
| `24106a39` | Fix marketplace duplicated site chrome (footer ×2, navbar ×2) + regression test |
| `015afabe` | Drop 6 legacy calculator slugs from sitemap sources (GSC redirect flags) |
| `cc13a14e` | Publish US knowledge library under petertubin byline + RUNBOOK editorial recipe + this audit |
| (this) | `set_config` fix in publication migration; regenerated public/sitemap.xml (legacy slugs dropped); audit updated after live publication |

---

## Owner action checklist (shortest path to fully healthy)

1. **Set Netlify site env vars** `SUPABASE_URL` + `SUPABASE_ANON_KEY` to the freluxproject values (fixes the sitemap function, item 9).
2. **Deploy** latest `main` on Netlify (manual — auto-build is off).
3. **Enable Google OAuth** on freluxproject + redirect URLs.
4. After 1–3: agent re-runs the verification pass (footer, sitemap with 150 articles, live articles, login) and updates this document.

*(Done this session: fresh `sbp_` token supplied and used; US library published and verified live.)*
