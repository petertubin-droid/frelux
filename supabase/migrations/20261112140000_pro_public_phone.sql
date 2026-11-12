-- A listed professional can publish a contact number. Until now the number was
-- only readable by its owner, so the public profile had no way to offer a call
-- or WhatsApp link. This returns the number only when the professional has
-- switched contact_phone_public on and their profile is listed; otherwise null.
create or replace function public.get_pro_public_phone(p_slug text)
returns text
language sql
security definer
set search_path = public
as $$
  select p.contact_phone
  from public.pro_profiles p
  where p.slug = p_slug
    and p.is_listed = true
    and p.contact_phone_public = true
    and p.contact_phone is not null
    and length(regexp_replace(p.contact_phone, '[^0-9]', '', 'g')) >= 10
  limit 1;
$$;

revoke all on function public.get_pro_public_phone(text) from public;
grant execute on function public.get_pro_public_phone(text) to anon, authenticated;
