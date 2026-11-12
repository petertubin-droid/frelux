-- pro_profiles lost every grant for the browser roles: only postgres and
-- service_role could read it, so a visitor opening a Pro Connect profile and a
-- professional opening their own dashboard both got a permission error while
-- every other pro_* table stayed readable. This restores the grants the RLS
-- policies were written for, and keeps the contact number out of reach:
-- anon and authenticated may read the profile columns but not contact_phone or
-- phone_number, which are served only by get_pro_public_phone() when the owner
-- has published the number.
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pro_profiles'
    and column_name not in ('contact_phone', 'phone_number');

  revoke all on public.pro_profiles from anon, authenticated;
  execute format('grant select (%s) on public.pro_profiles to anon, authenticated', cols);
  -- Owners still set their own phone: writes are gated by the RLS policies
  -- (insert_own_pro_profile, update_own_pro_profile).
  grant insert, update, delete on public.pro_profiles to authenticated;
end $$;
