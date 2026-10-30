create table if not exists public.catalogue_sync_requests (
  request_id bigint primary key,
  source_id uuid not null references public.price_scan_sources(id) on delete cascade,
  requested_at timestamptz not null default now(),
  processed boolean not null default false
);
grant select, insert, update on public.catalogue_sync_requests to service_role, authenticated;

-- Ask a catalogue for its product list. Responses land in pg_net and are
-- parsed by process_catalogue_responses() so a slow supplier never blocks a run.
create or replace function public.request_catalogue_sync()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare r record; rid bigint; asked integer := 0;
begin
  for r in
    select id, product_url from public.price_scan_sources
     where is_active and can_price_products and source_format = 'json'
       and product_url is not null
  loop
    select net.http_get(
      url := r.product_url,
      headers := jsonb_build_object('Accept','application/json','User-Agent','FreluxPriceBot/1.0 (+https://freluxtools.com)'),
      timeout_milliseconds := 30000
    ) into rid;
    insert into public.catalogue_sync_requests (request_id, source_id) values (rid, r.id)
    on conflict (request_id) do nothing;
    asked := asked + 1;
  end loop;
  return asked;
end;
$$;

create or replace function public.process_catalogue_responses()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  r record; payload jsonb; staged integer := 0; src record; p jsonb; v jsonb;
begin
  for r in
    select q.request_id, q.source_id, resp.content
      from public.catalogue_sync_requests q
      join net._http_response resp on resp.id = q.request_id
     where not q.processed and resp.status_code = 200 and resp.content is not null
     order by q.requested_at
     limit 20
  loop
    select * into src from public.price_scan_sources where id = r.source_id;
    begin
      payload := r.content::jsonb;
    exception when others then
      update public.catalogue_sync_requests set processed = true where request_id = r.request_id;
      continue;
    end;

    if jsonb_typeof(payload) = 'object' and payload ? 'products' then
      -- Shopify: price lives on each variant.
      for p in select * from jsonb_array_elements(payload->'products') loop
        for v in select * from jsonb_array_elements(coalesce(p->'variants','[]'::jsonb)) loop
          perform public.stage_catalogue_product(
            src.market, src.id, coalesce(src.supplier_name, src.retailer),
            concat_ws(' - ', p->>'title', v->>'title'),
            nullif(regexp_replace(coalesce(v->>'price',''), '[^0-9.]', '', 'g'), '')::numeric,
            coalesce(src.currency,''), null);
          staged := staged + 1;
        end loop;
      end loop;
    elsif jsonb_typeof(payload) = 'array' then
      -- WooCommerce store API: minor units, currency beside the price.
      for p in select * from jsonb_array_elements(payload) loop
        perform public.stage_catalogue_product(
          src.market, src.id, coalesce(src.supplier_name, src.retailer),
          p->>'name',
          case when p ? 'prices'
               then (nullif(p->'prices'->>'price','')::numeric /
                     power(10, coalesce(nullif(p->'prices'->>'currency_minor_unit','')::int, 2)))
               else null end,
          coalesce(nullif(p->'prices'->>'currency_code',''), src.currency, ''), null);
        staged := staged + 1;
      end loop;
    end if;
    update public.catalogue_sync_requests set processed = true where request_id = r.request_id;
  end loop;
  perform public.automap_catalogue_products();
  return staged;
end;
$$;

select cron.unschedule('catalogue-sync') where exists (select 1 from cron.job where jobname='catalogue-sync');
select cron.schedule('catalogue-sync', '17 */6 * * *', $$select public.request_catalogue_sync()$$);
select cron.unschedule('catalogue-materialise') where exists (select 1 from cron.job where jobname='catalogue-materialise');
select cron.schedule('catalogue-materialise', '*/10 * * * *', $$select public.process_catalogue_responses()$$);
