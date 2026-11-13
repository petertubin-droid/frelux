-- =========================================================
-- Tax rule integrity
--
-- The tax engine's own documentation promises that "the DB refuses active
-- rules without reviewer + next review date". It did not: nothing in the schema
-- said so, and a rule could be activated with no citation, no reviewer and an
-- empty component list, which would then be presented as verified tax.
--
-- This adds the promise to the database, and an append-only audit of every
-- change so a rate in production can always be traced to the rule, the reviewer
-- and the citation that authorised it.
--
-- Rollback: 20261112290000_tax_rule_integrity_rollback.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS public.tax_rule_audit (
  id           bigserial PRIMARY KEY,
  rule_id      uuid NOT NULL,
  rule_code    text NOT NULL,
  version      integer NOT NULL,
  market_code  text NOT NULL,
  action       text NOT NULL CHECK (action IN ('insert', 'update', 'deactivate')),
  old_row      jsonb,
  new_row      jsonb,
  actor        uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tax_rule_audit_rule_idx
  ON public.tax_rule_audit (rule_id, created_at DESC);

COMMENT ON TABLE public.tax_rule_audit IS
  'Append-only record of tax rule inserts, edits and deactivations, with the actor.';

ALTER TABLE public.tax_rule_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_rule_audit_admin_read" ON public.tax_rule_audit;
CREATE POLICY "tax_rule_audit_admin_read"
  ON public.tax_rule_audit FOR SELECT
  TO authenticated
  USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.tax_rule_audit FROM anon, authenticated;

-- ── The guard ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tax_jurisdiction_rules_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comp jsonb;
  prior_names text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.market_profiles WHERE country_code = NEW.market_code
  ) THEN
    RAISE EXCEPTION 'Unknown market %', NEW.market_code USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.is_active THEN
    IF btrim(coalesce(NEW.reviewer_name, '')) = '' THEN
      RAISE EXCEPTION 'An active tax rule needs a named reviewer'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.next_review_date IS NULL THEN
      RAISE EXCEPTION 'An active tax rule needs a next review date'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.next_review_date < coalesce(NEW.effective_from, current_date) THEN
      RAISE EXCEPTION 'Next review date must not precede the effective date'
        USING ERRCODE = 'check_violation';
    END IF;
    IF btrim(coalesce(NEW.source_title, '')) = ''
       OR btrim(coalesce(NEW.source_url, '')) = '' THEN
      RAISE EXCEPTION 'An active tax rule needs a citation: source title and URL'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.source_url !~* '^https?://' THEN
      RAISE EXCEPTION 'Source URL must be an http(s) link to the authority text'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.effective_from IS NULL THEN
      RAISE EXCEPTION 'An active tax rule needs an effective date'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF jsonb_typeof(NEW.components) <> 'array'
     OR jsonb_array_length(NEW.components) = 0 THEN
    RAISE EXCEPTION 'A tax rule needs at least one component (name + rate)'
      USING ERRCODE = 'check_violation';
  END IF;

  FOR comp IN SELECT * FROM jsonb_array_elements(NEW.components)
  LOOP
    IF btrim(coalesce(comp ->> 'name', '')) = '' THEN
      RAISE EXCEPTION 'Every tax component needs a name'
        USING ERRCODE = 'check_violation';
    END IF;
    IF (comp ->> 'rate_pct') IS NULL
       OR (comp ->> 'rate_pct')::numeric < 0
       OR (comp ->> 'rate_pct')::numeric > 100 THEN
      RAISE EXCEPTION 'Tax component "%" needs a rate between 0 and 100', comp ->> 'name'
        USING ERRCODE = 'check_violation';
    END IF;
    -- A component may only compound on one authored before it, so a rule can
    -- never describe a cycle the engine cannot compute.
    IF comp ? 'compound_on' AND comp ->> 'compound_on' IS NOT NULL THEN
      IF NOT (comp ->> 'compound_on' = ANY (prior_names)) THEN
        RAISE EXCEPTION 'Tax component "%" compounds on "%", which is not an earlier component',
          comp ->> 'name', comp ->> 'compound_on'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    prior_names := prior_names || (comp ->> 'name');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tax_jurisdiction_rules_guard ON public.tax_jurisdiction_rules;
CREATE TRIGGER trg_tax_jurisdiction_rules_guard
  BEFORE INSERT OR UPDATE ON public.tax_jurisdiction_rules
  FOR EACH ROW EXECUTE FUNCTION public.tax_jurisdiction_rules_guard();

COMMENT ON FUNCTION public.tax_jurisdiction_rules_guard() IS
  'Refuses an active tax rule without reviewer, review date, citation and effective date, and refuses components that compound on nothing.';

-- ── The audit ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tax_jurisdiction_rules_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tax_rule_audit
    (rule_id, rule_code, version, market_code, action, old_row, new_row, actor)
  VALUES (
    NEW.id,
    NEW.rule_code,
    NEW.version,
    NEW.market_code,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'insert'
      WHEN TG_OP = 'UPDATE' AND OLD.is_active AND NOT NEW.is_active THEN 'deactivate'
      ELSE 'update'
    END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END,
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tax_jurisdiction_rules_audit ON public.tax_jurisdiction_rules;
CREATE TRIGGER trg_tax_jurisdiction_rules_audit
  AFTER INSERT OR UPDATE ON public.tax_jurisdiction_rules
  FOR EACH ROW EXECUTE FUNCTION public.tax_jurisdiction_rules_audit();
