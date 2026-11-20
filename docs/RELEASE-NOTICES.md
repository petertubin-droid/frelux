# Release notices

2026-11-20.

## What it is

A row in `public.release_notices` becomes a banner at the top of the site for 24 hours. The app reads the table at runtime, so publishing needs no deploy, no rebuild and no Netlify release. That matters while builds are paused: a notice still reaches users.

This is not a changelog. A changelog is read by people who go looking for it. These notices exist for changes that alter something a user has already saved, where the user needs to know before they rely on an old number.

## Publishing one

```sql
insert into public.release_notices (notice_key, title, body, category, published_at, expires_at)
values (
  'a-stable-key',
  'Short title, sentence case',
  'What changed and what it means for anything already saved.',
  'feature',
  now(),
  now() + interval '24 hours'
);
```

`notice_key` is unique, so re-running a seed is safe. `expires_at` must be after `published_at`, enforced by a check constraint. To retire a notice early, set `is_active = false`.

## Behaviour

- Readers see only live notices: active, published, not expired. That is enforced in RLS, not only in the client, so an expired row is unreadable rather than merely hidden.
- The banner re-checks when a tab becomes visible, so a notice that expires while a page sits open disappears without a reload.
- Dismissal is per notice per browser (`frelux_release_notice_dismissed_<id>`), so dismissing one does not hide the next.
- Selection rules live in `src/lib/notices/release-notice.ts` and are tested without a browser or database: future notices stay hidden, expired ones vanish, unparseable dates are ignored rather than shown forever.
- No insert policy exists. Publishing is service_role only; a signed-in user cannot announce to the site.

## First notice

`openings-schedule-shared`, live 2026-11-20 08:57 UTC until 2026-11-21 08:57 UTC, announcing that doors and windows now take any number of sizes and that saved entries were carried across.
