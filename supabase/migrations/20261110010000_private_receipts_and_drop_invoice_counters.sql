-- =========================================================
-- FRELUX: PRIVATE RECEIPTS, AND REMOVAL OF THE DEAD NUMBERING PATH
--
-- 1. Payment proof moves out of the public 'project-attachments' bucket into a
--    private bucket. A receipt is a client's bank slip or transfer screenshot:
--    a public object is readable by anyone who ever sees the URL. The new
--    bucket is private and the object path is stored instead of a public URL.
--
--    Path layout is <projectId>/<uuid>-<file>. The read policy proves the
--    caller owns that project, so one contractor cannot enumerate another's
--    folder even with a guessed path.
--
-- 2. invoice_counters and reserve_invoice_number are dropped. Numbers have
--    always come from the column defaults nextval('project_invoice_number_seq')
--    and nextval('project_payment_receipt_seq'); no trigger and no client ever
--    called the RPC, and no row was ever written. The counter implied a yearly
--    reset that does not exist, which misreads the numbering story.
-- =========================================================

-- ---------- 1. private receipts bucket ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-receipts', 'project-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS project_receipts_read ON storage.objects;
CREATE POLICY project_receipts_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-receipts'
    AND EXISTS (
      SELECT 1 FROM public.contractor_projects p
      WHERE p.id::text = (storage.foldername(objects.name))[1]
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_receipts_write ON storage.objects;
CREATE POLICY project_receipts_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-receipts'
    AND EXISTS (
      SELECT 1 FROM public.contractor_projects p
      WHERE p.id::text = (storage.foldername(objects.name))[1]
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_receipts_delete ON storage.objects;
CREATE POLICY project_receipts_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-receipts'
    AND EXISTS (
      SELECT 1 FROM public.contractor_projects p
      WHERE p.id::text = (storage.foldername(objects.name))[1]
        AND p.user_id = auth.uid()
    )
  );

-- ---------- 2. drop the dead numbering path ----------
DROP FUNCTION IF EXISTS public.reserve_invoice_number(integer);
DROP TABLE IF EXISTS public.invoice_counters;
