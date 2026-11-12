# UI audit scripts

Headless checks for the mobile-first premium display standard. They run against
a local preview of the built site, so start one first:

```bash
npm run build
npx vite preview --port 4180
```

Then, from the repo root:

```bash
# Overflow, clipped text, tap targets, sub-11px type, broken values — at 390px
node scripts/ui-audit/audit-ui.mjs / /start-building /network/marketplace

# Same checks at any width / colour scheme
node scripts/ui-audit/audit-narrow.mjs 320 light /
node scripts/ui-audit/audit-narrow.mjs 390 dark / /tools/project/boq

# Heading structure, broken images, empty links, console + HTTP errors
node scripts/ui-audit/audit-assets.mjs / /calculators

# Just the h1/h2 outline for a page
node scripts/ui-audit/h1.mjs /network/marketplace
```

Expected baseline: no off-screen bleed, no clipped text, no tap target under
24px except inline links inside a sentence, no type under 11px, one `h1` per
page. Requests to Supabase resolve to `ERR_NAME_NOT_RESOLVED` when the sandbox
has no network access; that noise is environmental, not a page fault.
