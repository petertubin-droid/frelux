# Custom domain setup

FRELUX resolves its public origin from one place per runtime, so switching
domains is a single command plus four dashboard settings. Current canonical
origin: **https://freluxtools.netlify.app**.

## The three mirrors

| Runtime | File | Used by |
| --- | --- | --- |
| Client bundle | `src/lib/site-config.ts` | canonical tags, structured data, share links, ad postback placeholders |
| Build scripts | `scripts/lib/site-url.mjs` | `prerender.mjs`, `generate-sitemap.mjs`, `submit-indexnow.mjs` |
| Edge functions | `supabase/functions/_shared/site.ts` | dynamic sitemap, API docs links, web-push contact |

`VITE_SITE_URL` (Netlify) and `SITE_URL` (Supabase secrets) override the
in-repo default, so both must be set when the domain changes. Otherwise a
stale dashboard value silently wins over the code.

## 1. Rewrite the repo

```bash
npm run set-domain -- frelux.com --dry-run   # preview
npm run set-domain -- frelux.com             # apply
```

That updates the three mirrors plus the static SEO files that must carry the
literal host: `index.html` (canonical, `og:url`, `og:image`, Twitter card),
`public/robots.txt`, `public/404.html`, `public/sitemap.xml`,
`netlify/functions/sitemap.js`, and both `.env.*.example` files.

It deliberately leaves alone:

- `supabase/functions/_shared/cors.ts` — the previous Netlify origin stays
  allow-listed so existing shared links keep working through the transition.
- `supabase/migrations/**` — applied history is immutable; config drift is
  fixed by new forward migrations.
- The `hqhvlkunkdrxyuvziorm` mentions inside old migrations, which are
  historical records of the pre-2026-10-16 project.

Then verify and ship:

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run build          # prerender + sitemap regeneration must both pass
npm test -- --run src/lib/site-config.test.ts src/lib/seo.test.ts src/lib/structured-data.test.ts
git push origin main
```

## 2. Netlify

1. Domain management → **Add a domain** → the new domain.
2. DNS, one of:
   - **Netlify DNS** (recommended): change the registrar's nameservers to the
     four Netlify nameservers. Apex and `www` both get managed records and
     automatic SSL.
   - **External DNS**: apex `A`/`ALIAS` to Netlify's load balancer, `www`
     `CNAME` to `<site>.netlify.app`. Keep any existing MX/TXT records.
3. Set the new domain as **primary** so `www` and the `*.netlify.app` host
   redirect to it (Netlify issues the 301s itself).
4. Site configuration → Environment → `VITE_SITE_URL=https://<domain>`.
5. HTTPS: Netlify provisions the certificate once DNS resolves; enable
   "Force HTTPS".

> **Builds are currently paused by the owner.** None of this reaches
> production until builds are resumed or a manual deploy is run. The
> `.netlify.app` host keeps serving the last successful build in the
> meantime.

## 3. Supabase

- Edge Functions → Secrets → `SITE_URL=https://<domain>`. The dynamically
  generated `/sitemap.xml` reads it, so repoint before the first post-switch
  crawl.
- Authentication → URL Configuration:
  - Site URL: `https://<domain>`
  - Redirect URLs: add `https://<domain>/**` (keep the Netlify entries during
    the transition so magic links in flight still work).
  - The management API equivalents are `site_url` and `uri_allow_list` on
    `/v1/projects/{ref}/config/auth`.
- Nothing to change for payments: `paystack-checkout` derives its callback
  from `window.location.origin`, and the webhook URL is project-scoped
  (`https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/paystack-webhook`).

## 4. Search engines

1. Google Search Console: add the new property (Domain property via DNS TXT
   is the most durable), then submit `https://<domain>/sitemap.xml`.
2. Keep the old Search Console property for 6-12 months to watch the 301s.
3. Bing/IndexNow: `npm run indexnow` after the new domain resolves; the key
   file lives at `public/indexnow-key.txt` and is served from the new host
   automatically.
4. Confirm in the rendered HTML: `<link rel="canonical">`, `og:url`, and the
   JSON-LD `@id`/`url` fields all show the new origin.
5. If the old domain should redirect rather than 301 automatically, add a
   Netlify redirect rule for it after the new one is primary.

## 5. Post-launch checks

```bash
curl -sI https://<domain>            | head -5    # 200 + HSTS/HTTPS force
curl -s  https://<domain>/sitemap.xml | head -5   # absolute new-domain URLs
curl -s  https://<domain>/robots.txt  | head -3
curl -s  https://<domain>/paint-calculator | grep -o 'rel="canonical"[^>]*'
```

Payments sanity check after the switch: open `/pricing`, start a checkout and
confirm the Paystack callback returns to `https://<domain>/pricing?status=verify&ref=...`.

## Namecheap specifics

Registration includes a free DNS zone (BasicDNS). Skip every upsell at
checkout: Premium DNS, SSL certificates, hosting, Site Maker, email. Enable
WhoisGuard privacy (free) and auto-renew.

After purchase, Domain List -> Manage -> **Advanced DNS**. Keep Namecheap's
nameservers (BasicDNS) and add:

| Type | Host | Value | Priority |
| --- | --- | --- | --- |
| A Record | `@` | `75.2.60.5` | - |
| CNAME Record | `www` | `<site>.netlify.app.` | - |
| TXT Record | `resend._domainkey` | `p=MIGf...IDAQAB` (full DKIM value from Resend) | - |
| MX Record | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT Record | `send` | `v=spf1 include:amazonses.com ~all` | - |
| CNAME Record | `rsend` | `send.forge.rmta.net.` | - |

Notes:

- Delete the default `CNAME www -> parkingpage.namecheap.com` and the default
  URL Redirect record on `@` before adding the above, or the site will keep
  parking.
- Namecheap trims trailing dots; `www` pointing at `<site>.netlify.app` is fine.
- If the domain also needs to receive mail, add the MX records for that inbox
  at `@`; Resend only needs the `send` subdomain, so it never collides with
  Namecheap email forwarding.
- TTL: Automatic (1800s) is fine. DKIM/SPF usually validate within 15-30 min,
  and Resend re-checks automatically; use "Verify DNS records" to force it.

The alternative is Netlify DNS: in Netlify, add the domain and choose "Use
Netlify DNS", then set the five Namecheap nameservers (dns1-4.p07.nsone.net
plus the assigned one) and manage every record in Netlify instead. That
removes the manual A/CNAME entries but means all records live in Netlify.
