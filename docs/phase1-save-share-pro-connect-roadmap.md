# FRELUX Phase 1 Roadmap: Save, Share, and Pro Connect

**Status:** Implementation backlog; no completion or deployment claim
**Last reviewed:** 2026-10-14
**Scope:** Improve the path from free anonymous calculator use to an optional saved project, safe live sharing, and a relevant Pro Connect discovery action.

## Product outcome

A visitor can use any calculator without an account. When they choose to keep work in FRELUX, they can sign in with a supported method and save it to a cloud project. They can deliberately create a revocable, read-only link to a privacy-reviewed view of that saved calculation. Where reliable location and Pro Connect coverage exist, the saved calculation can lead to relevant professionals without implying availability or verification that the data does not support.

This is a completion plan for existing foundations, not a claim that the features are absent or fully operational. The app already has Google sign-in, a guest save-to-device path, contractor-project calculation saves, share-link records and a shared-project route, plus Pro Connect directory/profile and verification workflows. Close the integration gaps below before marketing a seamless end-to-end journey.

## Phase 1A — Keep calculators open; make cloud save a clear choice

- Preserve anonymous calculator access. Do not put a sign-in wall before calculating, viewing results, editing inputs, or exporting a basic result.
- Keep local/device save available to guests, with an explicit explanation that it is not synced or recoverable across devices. Do not silently replace a device save with a cloud save.
- When a guest chooses **Save Project** (cloud), show a short sign-in/create-account step and explain why an account is needed. Resume the original save intent after authentication, retaining the calculation inputs/results safely through the OAuth redirect and handling cancellation, expiry, and failure without data loss.
- Prefer the existing Google sign-in path. Offer phone sign-in only after confirming Supabase phone OTP, SMS provider, country coverage, delivery cost/limits, abuse controls, and production redirect/configuration are enabled and tested. Phone contact/verification fields in Pro Connect are not proof that general customer phone authentication is ready. Never expose a partially configured sign-in button.
- After sign-in, make project selection/creation and the save confirmation clear. Offer a deliberate way to import/migrate a local calculation into a cloud project; do not auto-upload local history without user consent.
- Preserve account security, owner-scoped RLS, accessible focus/error/loading states, and mobile-friendly behavior. Avoid requesting profile data that is not necessary to save.

**Acceptance:** anonymous calculations and export still work; guest local saves remain labeled as device-only; Google sign-in returns to the original calculation and completes the intended cloud save once; cancel/retry/network failure does not discard or duplicate the calculation; unauthorized users cannot read or overwrite another account's saved projects. Phone auth is enabled only after its provider and delivery path pass production checks.

## Phase 1B — Live project links with explicit privacy controls

- Add **Share Live Project Link** to the appropriate saved calculation/project surface, alongside PDF export, and explain that anyone with the link can view the shared content.
- First reconcile the current data model: calculator saves are written to `contractor_projects` / project calculations, while the existing `/shared/:id` renderer resolves `user_projects`. Verify ownership and read paths before connecting these flows; do not assume the current link primitive already shares every saved calculator project.
- Define a read-only public share view for the supported saved estimate, backed by an unguessable token and narrowly scoped server/database reads. Expose only fields needed for the estimate (for example, project label, calculation summary, units/currency, and estimate disclaimer). Exclude owner contact details, precise site address/location, private notes, credentials, client data, attachments, and unrelated project records unless a separate explicit consented feature is designed.
- Let the owner preview what will be public before creating the link. Provide copy/share feedback, link status, expiry where supported, and reliable revoke/disable behavior. Revocation should take effect on subsequent reads; document any cache behavior. Do not leak private data via search indexes, metadata, logs, or response errors.
- Show provenance appropriately: saved estimate date, market/units context, and estimate-only caveat. Keep viewer access read-only; never make the link a bearer path to edit or download the entire project by default.
- Make the shared route work without login, with clear expired/revoked/not-found states, responsive presentation, keyboard/screen-reader support, and a copyable URL. Do not call a link “live” if it is actually a stale snapshot; define whether the view reflects current project values or a versioned snapshot and show that behavior.

**Acceptance:** only the intended estimate fields are accessible anonymously; owner and non-owner RLS tests pass; random/invalid/expired/revoked tokens fail closed; link creation and revocation are tested end to end; existing project sharing remains compatible; private project data is absent from response payloads and page metadata.

## Phase 1C — Contextual Pro Connect discovery from saved work

- In a saved project containing a screeding calculation, show a compact, optional **Find a screeder** panel tied to that project's chosen trade and service area. Keep the calculation usable if the panel is dismissed or has no results.
- Resolve the supported service area from user-provided project location at the least precise useful level (city/area); do not publish or transmit precise site coordinates/address for matching unless the user expressly opts in. Ask for location when absent rather than guessing from account location or applying a Nigerian default.
- Query real Pro Connect profiles for matching screeding trade and covered service area. Define what “verified” means from the actual displayed verification tier/evidence and freshness. Do not equate phone/email confirmation, profile approval, or an unreviewed credential with an authoritative trade license.
- Show an accurate, dynamically computed result count and matching area. Never hard-code “3 near you” or claim professionals are available, vetted, licensed, or accepting work unless the matching records substantiate that exact claim. If profile recency, trade, coverage, verification, or availability cannot be established, state the limitation or omit that claim.
- Provide useful states: location needed, matching profiles, no matches, directory unavailable, and stale/unverified profile data. Link each result to its public Pro Connect profile; disclose that users should confirm scope, availability, and terms directly. Do not share the private project or calculation with a professional by showing the widget.
- Keep the recommendation contextual to screeding (not “3 painters”), and extend the same pattern to other trades only after each trade mapping and location-coverage behavior is verified.

**Acceptance:** only relevant trade-and-area profiles appear; displayed counts match the query; zero-result and failure states are honest; the widget never exposes project details; tests cover missing/opted-out location, no matches, stale/unverified profiles, and responsive/accessibility behavior.

## Delivery order and release gate

1. Audit and document current auth, project save, share-token, shared-route, Pro Connect data, RLS, and deployment configuration; identify the authoritative project/calculation record and migration status.
2. Complete the anonymous-to-authenticated save journey and tests, including safe resume after Google OAuth.
3. Reconcile the share data model and public read boundary; add privacy controls, owner preview, revoke/expiry behavior, and anonymous access tests before placing the share CTA in user flows.
4. Add the contextual trade/location panel using verified directory data and truthful empty/stale states.
5. Run clean migration replay; strict TypeScript; focused unit/integration/RLS tests; full test suite; production build; accessibility checks; `git diff --check`; then verify migration application and representative live reads separately. Record exact commit and deployment evidence in both handoff files.

Do not label this journey fully operational until the deployed app passes these gates. A committed migration, visible button, mocked pro, seed profile, or configured OAuth provider alone is not proof of production behavior. Keep unsupported phone sign-in, public share types, and uncovered service areas unavailable or clearly marked until verified.
