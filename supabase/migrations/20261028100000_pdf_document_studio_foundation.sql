-- FRELUX Document Studio foundation (additive; no live prices or payment activation).
-- Rollback: drop the pdf_studio_* objects created here in reverse dependency order.
CREATE TABLE IF NOT EXISTS public.pdf_studio_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  document_type text NOT NULL CHECK (document_type IN ('quotation','material_schedule','project_summary','invoice','labour_schedule','bill_of_quantities')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(config) <= 65536),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pdf_studio_templates_user_updated_idx
  ON public.pdf_studio_templates(user_id, updated_at DESC);
ALTER TABLE public.pdf_studio_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pdf_studio_templates_owner_all ON public.pdf_studio_templates;
CREATE POLICY pdf_studio_templates_owner_all ON public.pdf_studio_templates
  FOR ALL TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.user_paid_status s WHERE s.user_id=auth.uid() AND s.is_paid AND (s.paid_until IS NULL OR s.paid_until > now()) AND lower(coalesce(s.plan,'')) IN ('pro','premium','enterprise')))
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.user_paid_status s WHERE s.user_id=auth.uid() AND s.is_paid AND (s.paid_until IS NULL OR s.paid_until > now()) AND lower(coalesce(s.plan,'')) IN ('pro','premium','enterprise')));

CREATE TABLE IF NOT EXISTS public.pdf_studio_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.pdf_studio_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  config jsonb NOT NULL CHECK (pg_column_size(config) <= 65536),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);
CREATE INDEX IF NOT EXISTS pdf_studio_template_versions_owner_idx
  ON public.pdf_studio_template_versions(user_id, template_id, version DESC);
ALTER TABLE public.pdf_studio_template_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pdf_studio_template_versions_owner_all ON public.pdf_studio_template_versions;
CREATE POLICY pdf_studio_template_versions_owner_all ON public.pdf_studio_template_versions
  FOR ALL TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.pdf_studio_templates t WHERE t.id=template_id AND t.user_id=auth.uid()))
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.pdf_studio_templates t WHERE t.id=template_id AND t.user_id=auth.uid()));

-- Atomic quota reservation. Existing subscription state and plan prices remain authoritative.
CREATE TABLE IF NOT EXISTS public.pdf_studio_export_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  period_start date NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','completed','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, request_id)
);
CREATE INDEX IF NOT EXISTS pdf_studio_export_reservations_period_idx
  ON public.pdf_studio_export_reservations(user_id, period_start, status);
ALTER TABLE public.pdf_studio_export_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pdf_studio_export_reservations FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.pdf_studio_plan_limits (
  plan text PRIMARY KEY CHECK (plan IN ('free','basic','pro','premium','enterprise')),
  monthly_exports integer NOT NULL CHECK (monthly_exports >= 0),
  visual_builder boolean NOT NULL DEFAULT false,
  custom_branding boolean NOT NULL DEFAULT false,
  watermark_removal boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pdf_studio_plan_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pdf_studio_plan_limits FROM anon, authenticated;
-- Configurable operational defaults; these do not change subscription prices or activate billing.
INSERT INTO public.pdf_studio_plan_limits(plan, monthly_exports, visual_builder, custom_branding, watermark_removal)
VALUES ('free',3,false,false,false), ('basic',3,false,false,false), ('pro',25,true,true,true),
       ('premium',100,true,true,true), ('enterprise',500,true,true,true)
ON CONFLICT (plan) DO NOTHING;

CREATE OR REPLACE FUNCTION public.reserve_pdf_studio_export(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_plan text; v_active boolean := false; v_limit integer;
        v_used integer; v_period date := date_trunc('month', now())::date; v_res public.pdf_studio_export_reservations;
BEGIN
  IF v_uid IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 7081));
  SELECT lower(coalesce(plan,'free')), is_paid AND (paid_until IS NULL OR paid_until > now())
    INTO v_plan, v_active FROM public.user_paid_status WHERE user_id = v_uid;
  IF NOT FOUND THEN v_plan := 'free'; v_active := false; END IF;
  IF NOT v_active THEN v_plan := 'free'; END IF;
  SELECT monthly_exports INTO v_limit FROM public.pdf_studio_plan_limits WHERE plan = v_plan;
  IF v_limit IS NULL THEN RAISE EXCEPTION 'pdf_plan_not_configured'; END IF;
  SELECT * INTO v_res FROM public.pdf_studio_export_reservations WHERE user_id=v_uid AND request_id=p_request_id;
  IF FOUND THEN RETURN jsonb_build_object('allowed', v_res.status = 'reserved', 'reason', CASE WHEN v_res.status='completed' THEN 'already_completed' ELSE NULL END, 'reservation_id', v_res.id, 'status', v_res.status, 'limit', v_limit); END IF;
  SELECT count(*) INTO v_used FROM public.pdf_studio_export_reservations
    WHERE user_id=v_uid AND period_start=v_period AND status IN ('reserved','completed');
  IF v_used >= v_limit THEN RETURN jsonb_build_object('allowed',false,'reason','quota_exhausted','used',v_used,'limit',v_limit); END IF;
  INSERT INTO public.pdf_studio_export_reservations(user_id,request_id,period_start)
    VALUES(v_uid,p_request_id,v_period) RETURNING * INTO v_res;
  RETURN jsonb_build_object('allowed',true,'reservation_id',v_res.id,'status','reserved','used',v_used+1,'limit',v_limit,'plan',v_plan);
END; $$;

CREATE OR REPLACE FUNCTION public.finish_pdf_studio_export_for_user(p_user_id uuid, p_request_id uuid, p_success boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' OR p_user_id IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'service_role_required'; END IF;
  UPDATE public.pdf_studio_export_reservations SET status=CASE WHEN p_success THEN 'completed' ELSE 'released' END,
    completed_at=now() WHERE user_id=p_user_id AND request_id=p_request_id AND status='reserved';
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_pdf_studio_export(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finish_pdf_studio_export_for_user(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_pdf_studio_export(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_pdf_studio_export_for_user(uuid,uuid,boolean) TO service_role;

-- Private generated documents; raw PDF bytes never live in browser storage.
CREATE TABLE IF NOT EXISTS public.pdf_studio_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 120),
  storage_path text NOT NULL UNIQUE,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 5000000),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);
CREATE INDEX IF NOT EXISTS pdf_studio_documents_owner_idx ON public.pdf_studio_documents(user_id, created_at DESC);
ALTER TABLE public.pdf_studio_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pdf_studio_documents_owner_select ON public.pdf_studio_documents;
CREATE POLICY pdf_studio_documents_owner_select ON public.pdf_studio_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id AND status='ready');
REVOKE INSERT, UPDATE, DELETE ON public.pdf_studio_documents FROM anon, authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('pdf-studio-documents','pdf-studio-documents',false,5000000,ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Atomic owner-checked template save + version snapshot (prevents split writes).
CREATE OR REPLACE FUNCTION public.save_pdf_studio_template(p_id uuid, p_name text, p_document_type text, p_config jsonb)
RETURNS public.pdf_studio_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_template public.pdf_studio_templates; v_next integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF char_length(trim(p_name)) NOT BETWEEN 1 AND 80 OR p_document_type NOT IN ('quotation','material_schedule','project_summary','invoice','labour_schedule','bill_of_quantities') OR pg_column_size(p_config)>65536 THEN RAISE EXCEPTION 'invalid_template'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.user_paid_status s
    JOIN public.pdf_studio_plan_limits l ON l.plan=lower(coalesce(s.plan,'free'))
    WHERE s.user_id=v_uid AND s.is_paid AND (s.paid_until IS NULL OR s.paid_until>now()) AND l.visual_builder
  ) THEN RAISE EXCEPTION 'template_entitlement_required'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.pdf_studio_templates(user_id,name,document_type,config) VALUES(v_uid,trim(p_name),p_document_type,p_config) RETURNING * INTO v_template;
  ELSE
    SELECT * INTO v_template FROM public.pdf_studio_templates WHERE id=p_id AND user_id=v_uid AND archived_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'template_not_found'; END IF;
    v_next:=v_template.version+1;
    UPDATE public.pdf_studio_templates SET name=trim(p_name),document_type=p_document_type,config=p_config,version=v_next,updated_at=now() WHERE id=p_id RETURNING * INTO v_template;
  END IF;
  INSERT INTO public.pdf_studio_template_versions(template_id,user_id,version,config) VALUES(v_template.id,v_uid,v_template.version,p_config);
  RETURN v_template;
END; $$;
REVOKE ALL ON FUNCTION public.save_pdf_studio_template(uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_pdf_studio_template(uuid,text,text,jsonb) TO authenticated;

-- Keep version history immutable to clients; mutations go through guarded RPCs.
DROP POLICY IF EXISTS pdf_studio_templates_owner_all ON public.pdf_studio_templates;
CREATE POLICY pdf_studio_templates_owner_select ON public.pdf_studio_templates
  FOR SELECT TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS pdf_studio_template_versions_owner_all ON public.pdf_studio_template_versions;
CREATE POLICY pdf_studio_template_versions_owner_select ON public.pdf_studio_template_versions
  FOR SELECT TO authenticated USING (auth.uid()=user_id);
REVOKE INSERT, UPDATE, DELETE ON public.pdf_studio_templates, public.pdf_studio_template_versions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.archive_pdf_studio_template(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.user_paid_status s
    JOIN public.pdf_studio_plan_limits l ON l.plan=lower(coalesce(s.plan,'free'))
    WHERE s.user_id=v_uid AND s.is_paid AND (s.paid_until IS NULL OR s.paid_until>now()) AND l.visual_builder
  ) THEN RAISE EXCEPTION 'template_entitlement_required'; END IF;
  UPDATE public.pdf_studio_templates SET archived_at=now(),updated_at=now() WHERE id=p_id AND user_id=v_uid AND archived_at IS NULL;
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.archive_pdf_studio_template(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_pdf_studio_template(uuid) TO authenticated;

-- Private company logos storage bucket
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('pdf-studio-logos','pdf-studio-logos',false,2097152,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET file_size_limit=2097152, allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'];

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users manage their own studio logos') THEN
    CREATE POLICY "Users manage their own studio logos" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'pdf-studio-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'pdf-studio-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Admin audit trail for plan limit changes
CREATE TABLE IF NOT EXISTS public.pdf_studio_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('plan_limit_updated')),
  plan text NOT NULL,
  old_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_studio_admin_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pdf_studio_admin_audit' AND policyname='Admins can view studio audit log') THEN
    CREATE POLICY "Admins can view studio audit log" ON public.pdf_studio_admin_audit
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));
  END IF;
END $$;

-- Allow admins to update plan limits
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pdf_studio_plan_limits' AND policyname='Admins can update plan limits') THEN
    CREATE POLICY "Admins can update plan limits" ON public.pdf_studio_plan_limits
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));
  END IF;
END $$;

GRANT SELECT, UPDATE ON public.pdf_studio_plan_limits TO authenticated;
GRANT SELECT ON public.pdf_studio_admin_audit TO authenticated;
