/*
# Partnership Inquiries

1. New Table: partnership_inquiries
   Stores submissions from the public Partners page (/partners).
   - id (uuid, primary key)
   - name (text, not null) - submitter's name
   - email (text, not null) - submitter's email
   - company (text, nullable) - organisation they represent
   - interest (text, not null) - 'investor' | 'partner' | 'collaborator' | 'other'
   - message (text, not null) - what they want to explore
   - status (text, default 'new') - new, reviewed, responded, archived
   - created_at (timestamptz, default now())

2. Security
   - RLS enabled.
   - INSERT: anon + authenticated (public form, no sign-in required).
   - SELECT/UPDATE/DELETE: admin only (via is_admin()).
*/

CREATE TABLE IF NOT EXISTS public.partnership_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  interest text NOT NULL CHECK (interest IN ('investor','partner','collaborator','other')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','responded','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partnership_inquiries_public_insert" ON public.partnership_inquiries;
CREATE POLICY "partnership_inquiries_public_insert"
ON public.partnership_inquiries FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "partnership_inquiries_admin_select" ON public.partnership_inquiries;
CREATE POLICY "partnership_inquiries_admin_select"
ON public.partnership_inquiries FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "partnership_inquiries_admin_update" ON public.partnership_inquiries;
CREATE POLICY "partnership_inquiries_admin_update"
ON public.partnership_inquiries FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "partnership_inquiries_admin_delete" ON public.partnership_inquiries;
CREATE POLICY "partnership_inquiries_admin_delete"
ON public.partnership_inquiries FOR DELETE
TO authenticated
USING (public.is_admin());

GRANT INSERT ON TABLE public.partnership_inquiries TO anon, authenticated;
