# Security Policy

FRELUX takes the security of the platform and its users seriously. This document explains how to report a vulnerability and what to expect.

## Supported Versions

FRELUX is deployed as a single continuously-updated production application (no parallel maintained release branches). Security fixes are applied to `main` and deployed as soon as they're verified.

| Component            | Supported          |
| --------------------- | ------------------- |
| `main` branch / production | ✅ Yes |
| Older commits / forks | ❌ No — please update to the latest `main` |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report it privately:

1. Email the maintainers with a description of the issue, steps to reproduce, and potential impact. If you don't have a direct contact, use the repository owner's GitHub profile email or open a [private security advisory](../../security/advisories/new) on GitHub (Security tab → "Report a vulnerability").
2. Include as much detail as possible: affected URL/endpoint, request/response samples (with secrets redacted), and any proof-of-concept code.
3. Allow up to **5 business days** for an initial response acknowledging the report.

We will keep you updated as we investigate and fix confirmed issues, and we're happy to credit reporters (with permission) once a fix ships.

## Scope

In scope:

- The FRELUX web application (`src/`)
- Supabase Edge Functions (`supabase/functions/`)
- Database migrations / RLS policies (`supabase/migrations/`)
- Authentication, authorization, and payment flows (Paystack integration)

Out of scope:

- Third-party services FRELUX depends on (Supabase, Netlify, Paystack, Sentry, OpenWeather) — please report those directly to the respective vendor
- Denial-of-service or volumetric attacks against hosting infrastructure
- Social engineering, physical security, or issues requiring physical access to a user's device
- Automated scanner output without a demonstrated, exploitable impact

## Known Issues & Accepted Risk

- **Dev-dependency vulnerabilities (Vite / esbuild):** `npm audit` currently reports advisories in build-time tooling (Vite dev server / esbuild). These affect the **local dev server only** — they are not present in the production bundle shipped to users. Fixing them requires upgrading to Vite 8.x, which is a breaking change tracked separately; it is deliberately deferred rather than rushed, to avoid destabilizing the build pipeline. If you believe one of these is exploitable in production, please still report it — the assessment may be wrong.

## Security Practices in Place

- Row-Level Security (RLS) enforced on all Supabase tables
- Secrets (Paystack, Sentry, VAPID, service keys) are never bundled client-side — only `VITE_`-prefixed public keys are exposed, and Netlify's secret scanner is explicitly configured for the ones that are intentionally public
- Content-Security-Policy, HSTS, X-Frame-Options, and related security headers on all responses (see `netlify.toml` / `vercel.json`)
- Cookie consent system for analytics/ad scripts
- Rate limiting on public-facing Edge Functions (`supabase/functions/_shared/rate-limit.ts`)
- Error monitoring via Sentry with PII scrubbing
- Dependabot/`npm audit` reviewed regularly; production runtime vulnerabilities are treated as high priority

## Disclosure Policy

We follow coordinated disclosure: once a reported vulnerability is confirmed and fixed (or mitigated), we'll agree on a reasonable disclosure timeline with the reporter, typically 30–90 days depending on severity and complexity of the fix.
