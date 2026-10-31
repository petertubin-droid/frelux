-- 20261031130000_fix_expense_trigger.sql
-- diaspora_on_expense referenced new.created_by, which project_expenses does not
-- have; every expense submission failed at the trigger. The notifier must name
-- the actual submitter column.
-- ROLLBACK: restore the prior body only if the column is ever added.
create or replace function public.diaspora_on_expense()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.diaspora_notify(
    new.project_id,
    'expense_submitted',
    'Expense awaiting approval',
    coalesce(new.name, new.category, 'An expense') || ' - ' || coalesce(new.currency, '') || ' ' || coalesce(new.amount::text, ''),
    '/diaspora-tracker/' || new.project_id::text,
    new.submitted_by
  );
  return new;
end;
$$;
