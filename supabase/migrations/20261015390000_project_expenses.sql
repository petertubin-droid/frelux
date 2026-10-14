-- ============================================================
-- FRELUX Roadmap Wave 1.1: Estimate vs. Actual expense tracking
-- (internationalized: currency is stored per-row from the
-- project's own currency; NO NGN assumption anywhere)
--
-- project_expenses — user-scoped actual spend records against a
-- contractor project. Categories mirror the project cost model
-- (material/labour/transport/misc). Optional link to a shopping
-- list item records "what it actually cost vs estimated".
-- RLS: authenticated users can only touch expenses of projects
-- they own (same pattern as project_shopping_list).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,

  -- Cost model category (mirrors contractor_projects totals)
  category text NOT NULL DEFAULT 'material'
    CHECK (category IN ('material','labour','transport','misc')),

  -- Human label of what was bought/paid
  name text NOT NULL,

  -- Actual spend in the project's currency. currency is stored
  -- per row (inherited from the project at insert time) so
  -- variance math never assumes a currency.
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN',

  -- When the money left the contractor's pocket
  spent_at date NOT NULL DEFAULT CURRENT_DATE,

  -- Optional link to the planned shopping item this expense
  -- settled, enabling item-level estimated-vs-actual deltas.
  shopping_item_id uuid REFERENCES public.project_shopping_list(id) ON DELETE SET NULL,

  -- Optional room link for room-level rollups
  room_id uuid REFERENCES public.project_rooms(id) ON DELETE SET NULL,

  notes text,
  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_category ON public.project_expenses(category);
CREATE INDEX IF NOT EXISTS idx_project_expenses_spent_at ON public.project_expenses(spent_at);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own project expenses" ON public.project_expenses;
CREATE POLICY "Users can CRUD own project expenses"
  ON public.project_expenses FOR ALL
  TO authenticated
  USING (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  );

-- keep updated_at fresh
CREATE OR REPLACE TRIGGER trg_project_expenses_updated_at
  BEFORE UPDATE ON public.project_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
