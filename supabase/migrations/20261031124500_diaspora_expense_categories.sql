-- 20261031124500_diaspora_expense_categories.sql
-- The ledger needs the categories the tracker reports on; existing values kept.
-- ROLLBACK:
--   alter table public.project_expenses drop constraint project_expenses_category_check;
--   alter table public.project_expenses add constraint project_expenses_category_check
--     check (category = any (array['material','labour','transport','misc']));
alter table public.project_expenses drop constraint if exists project_expenses_category_check;
alter table public.project_expenses add constraint project_expenses_category_check
  check (category = any (array[
    'material','labour','transport','misc',
    'equipment','professional_fees','contractor_payment'
  ]));
