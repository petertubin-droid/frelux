-- The bulk guard caught "10 x Tarmac Sharp Sand 25KG" but not "Mastercrete 12.5KG
-- - 2 bags", so six multi-bag cement lines sat in the review queue looking like
-- ordinary single products. A purchase of several bags needs its price divided
-- before it can describe one bag, and the per-bag price of a smaller pack is not
-- the same product as the 25 kg bag Frelux prices, so those lines are set aside
-- rather than scaled.
create or replace function public.catalogue_title_is_bulk(p_title text)
returns boolean language sql immutable as $$
  select coalesce(p_title, '') ~* '^\s*[0-9]+\s*x\s'
      or coalesce(p_title, '') ~* '\m(bulk|pallet|pack of|trade pack|multi ?buy)\M'
      or coalesce(p_title, '') ~* '\([0-9]{2,}\s*kg\)'
      or coalesce(p_title, '') ~* '[0-9]+\s*kg\s*(each\s*)?-?\s*bulk'
      or coalesce(p_title, '') ~* '\m(?:[2-9]|[1-9][0-9]+)\s*bags?\M';
$$;

select public.classify_catalogue_backlog(null);
