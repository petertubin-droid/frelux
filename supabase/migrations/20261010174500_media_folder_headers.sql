-- =========================================================
-- Header images — media folder seed
-- =========================================================
-- Owner directive (2026-10-10): the Admin > Header Images screen
-- must let admins upload their own backdrop photos (file upload,
-- not pasted URLs). Uploads go through the existing media library
-- (media bucket + media_items table), so the picker needs a
-- dedicated folder to keep header shots organized.
--
-- Fully re-runnable: guards on every object.
-- =========================================================

INSERT INTO media_folders (name, slug, sort_order)
VALUES ('Header Images', 'headers', 9)
ON CONFLICT (slug) DO NOTHING;
