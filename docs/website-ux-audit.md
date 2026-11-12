# Whole-site correctness and completeness audit

Generated 2026-11-12 from the source tree. Re-run with `node scripts/audit-website.mjs`.

## Summary

```
page files: 323
declared routes: 369
broken internal links: 0
unresolvable imports: 0
duplicate route paths: 0
catch-all 404 route: present
tables without a scroll wrapper: 0
clickable divs with no role: 0
internal links using a plain anchor: 0
icon-only buttons without a label: 0
pages with co-rendered H1s: 0
currency literals needing review: 0
unreferenced page files: 0
```

## Route and link integrity

- Every internal `to` / `href` resolves to a registered route (query strings stripped before matching).
- Every dynamic import resolves to a file on disk.
- No duplicate route paths.
- Catch-all 404 route: present.

## Mobile layout

- Every table scrolls horizontally inside its own container.

## Accessibility

- Every element with a click handler declares a role: controls are buttons or links, backdrop and propagation wrappers are `presentation`, dialogs are `dialog` + `aria-modal`.
- Every modal closes on Escape through `useEscapeKey`, the same handler its backdrop uses.
- Every icon-only button is labelled.
- No page can render two H1s at once (each loading, error, empty and content branch carries its own).

## Consistency

- Internal navigation goes through the router, so no click forces a full page reload.
- No unreviewed currency literals: currency-code pickers, `getCurrencySymbol` fallbacks and NGN-only kobo analytics are intentional and excluded.

## Dead code

- No unreferenced page files.

## Site shell

- robots.txt: present
- web manifest: MISSING
- index.html title: FRELUX SMART CALC | Every Trade. Every Cost. One Platform.
- index.html meta description: present
- sitemap URLs: 1646

## Covered elsewhere

- Calculators: `scripts/audit-calculator-ui.mjs` reports 0 gaps across 48 calculators (header, ad slots, share/PDF, method note, disclaimer, input labels, fixed widths).
- Worker safety, escrow and Pro Connect: their own suites plus `docs/worker-safety-verification.md`.
