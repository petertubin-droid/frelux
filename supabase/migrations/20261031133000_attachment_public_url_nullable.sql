-- 20261031133000_attachment_public_url_nullable.sql
-- project_attachments.public_url was NOT NULL, which made it impossible to store
-- private evidence without inventing a public link. Private files must not have one.
-- ROLLBACK: alter table public.project_attachments alter column public_url set not null;
alter table public.project_attachments alter column public_url drop not null;
