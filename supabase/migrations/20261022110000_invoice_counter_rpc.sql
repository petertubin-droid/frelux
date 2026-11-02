-- Wave 1.3: atomic per-user invoice number reservation.
-- PostgREST upserts cannot express "last_number = last_number + 1",
-- so this invoker RPC does the increment in one statement. RLS
-- applies (owner policy on invoice_counters), and auth.uid() pins the
-- row to the CALLER — nobody can advance or read another user's
-- counter.

CREATE OR REPLACE FUNCTION public.reserve_invoice_number(p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $function$
DECLARE
  v_number integer;
BEGIN
  IF p_year IS NULL OR p_year < 2000 OR p_year > 3000 THEN
    RAISE EXCEPTION 'Invalid invoice year: %', p_year;
  END IF;

  INSERT INTO public.invoice_counters (user_id, year, last_number)
  VALUES (auth.uid(), p_year, 1)
  ON CONFLICT (user_id, year)
  DO UPDATE SET last_number = public.invoice_counters.last_number + 1
  RETURNING last_number INTO v_number;

  RETURN v_number;
END;
$function$;

-- Client callers reserve their own counter only; no cross-user access.
REVOKE EXECUTE ON FUNCTION public.reserve_invoice_number(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_invoice_number(integer) TO authenticated;
