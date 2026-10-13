-- Electrical estimation price books for GH (Ghana), KE (Kenya), and ZA (South Africa).
-- P2 batch 11 (2026-10-13): 33 manual-confidence rows (11 slugs x 3 markets).
--
-- Markets covered:
--   GH (Ghana)        GHS (Ghana Cedi)
--   KE (Kenya)        KES (Kenyan Shilling)
--   ZA (South Africa) ZAR (South African Rand)
--
-- Pricing methodology & source basis:
-- GH (GHS, per metre unless noted; Valmont Electricals Accra live catalog / Esca Tech 2026):
--   lighting  RR 1.5mm2 single-core pure Cu conduit cable 100m GH₵ 320.00 -> GH₵ 3.20/m
--   socket    RR 2.5mm2 single-core pure Cu conduit cable 100m GH₵ 460.00 -> GH₵ 4.60/m
--   dedicated RR 4.0mm2 single-core pure Cu conduit cable 100m GH₵ 1,150.00 -> GH₵ 11.50/m
--   earth     RR 2.5mm2 single-core green/yellow Cu earth wire 100m GH₵ 460.00 -> GH₵ 4.60/m
--   feeder    Nexans Kabelmetal 16mm2 single-core pure Cu cable 100m GH₵ 3,750.00 -> GH₵ 37.50/m
--   conduit   Valmont 20mm x 3m rigid PVC conduit pipe (10-bundle GH₵ 145.00) -> GH₵ 4.83/m
--   junction  Valmont 3x3 PVC pattress knockout box 20-pack GH₵ 90.00 -> GH₵ 4.50 each
--   breaker   Valmont Focus 1-pole 6-32A MCB 6kA GH₵ 28.00 each
--   switch    Valmont Focus 1-gang 1-way light switch white GH₵ 15.00 each
--   socket    Valmont Focus double 13A switched socket outlet GH₵ 38.00 each
--   DB        Valmont Focus 12-way consumer unit / distribution board GH₵ 390.00 each
--
-- KE (KES, per metre unless noted; TDK Networks / East Africa Cable / Rapidtech Nairobi live listings):
--   lighting  East Africa Cable 1.5mm2 single-core PVC Cu wire 100m KES 3,600.00 -> KES 36.00/m
--   socket    East Africa Cable 2.5mm2 single-core PVC Cu wire 90m KES 7,900.00 -> KES 87.78/m
--   dedicated East Africa Cable 4.0mm2 single-core PVC Cu wire 100m KES 9,000.00 -> KES 90.00/m
--   earth     East Africa Cable 2.5mm2 green/yellow Cu earth wire 90m KES 7,900.00 -> KES 87.78/m
--   feeder    TDK 16mm2 single-core PVC Cu building wire 100m KES 28,400.00 -> KES 284.00/m
--   conduit   Rapidtech Tronic 20mm x 2.9m rigid PVC conduit pipe KES 200.00 -> KES 68.97/m
--   junction  Winstar Hardware single pattress / conduit knockout box KES 40.00 each
--   breaker   Randtech 1-pole 20A MCB circuit breaker KES 270.00 each
--   switch    Tronic Kenya 1-gang 1-way slim wall switch 10A KES 95.00 each
--   socket    Hada Electrical Windsor 13A twin switched socket outlet KES 300.00 each
--   DB        Hada Electrical Havells 8-way SPN consumer unit / distribution board KES 4,500.00 each
--
-- ZA (ZAR, per metre unless noted; Leroy Merlin SA / Builders Warehouse live listings):
--   lighting  Aberdare / Leroy Merlin Surfix 1.5mm2 2C+E white cable 100m R 1,649.00 -> R 16.49/m
--   socket    Leroy Merlin Surfix 2.5mm2 2C+E white cable 100m R 2,249.00 -> R 22.49/m
--   dedicated Leroy Merlin 4.0mm2 flat twin & earth white cable 10m R 411.00 -> R 41.10/m
--   earth     Builders Warehouse Waco 1.5mm2 bare / insulated earth wire R 7.00/m
--   feeder    ACDC Dynamics 16mm2 red GP building wire 50m R 5,009.00 -> R 100.18/m
--   conduit   Leroy Merlin Proton 20mm x 4m PVC conduit pipe R 19.90 -> R 4.98/m
--   junction  Leroy Merlin Proton 20mm 2-way conduit junction box R 13.50 each
--   breaker   Leroy Merlin CBI Electric mini-rail 25A MCB circuit breaker R 169.00 each
--   switch    Leroy Merlin CBI 1-lever 1-way light switch white 2x4 R 32.00 each
--   socket    Leroy Merlin Crabtree 4x4 2x3-pin switched socket outlet R 129.00 each
--   DB        Leroy Merlin CBI Electric 12-way flush distribution board unpopulated R 357.00 each

with input_rows(market, material_slug, price, currency, source_desc) as (
  values
    -- GH (Ghana)
    ('GH', 'elec-cable-lighting',        3.20, 'GHS', 'Valmont Electricals RR 1.5mm2 single-core copper conduit cable 100m GH₵ 320.00 = GH₵ 3.20/m; Energy Commission L.I. 2008 lighting'),
    ('GH', 'elec-cable-socket',          4.60, 'GHS', 'Valmont Electricals RR 2.5mm2 single-core copper conduit cable 100m GH₵ 460.00 = GH₵ 4.60/m; BS 1363 ring/radial socket branch'),
    ('GH', 'elec-cable-dedicated',      11.50, 'GHS', 'Valmont Electricals RR 4.0mm2 single-core copper conduit cable 100m GH₵ 1,150.00 = GH₵ 11.50/m; dedicated A/C and water heater'),
    ('GH', 'elec-cable-earth',           4.60, 'GHS', 'Valmont Electricals RR 2.5mm2 single-core green/yellow copper earth wire 100m GH₵ 460.00 = GH₵ 4.60/m; earthing conductor'),
    ('GH', 'elec-cable-feeder',         37.50, 'GHS', 'Nexans Kabelmetal 16mm2 single-core copper building cable 100m GH₵ 3,750.00 = GH₵ 37.50/m; main service feeder'),
    ('GH', 'elec-conduit',               4.83, 'GHS', 'Valmont Electricals 20mm x 3m rigid high-impact PVC conduit pipe 10-bundle GH₵ 145.00 = GH₵ 4.83/m; concealed conduit'),
    ('GH', 'elec-junction-box',          4.50, 'GHS', 'Valmont Electricals 3x3 PVC pattress knockout box 20-pack GH₵ 90.00 = GH₵ 4.50 each (BS 4662 standard)'),
    ('GH', 'elec-breaker',              28.00, 'GHS', 'Valmont Electricals Focus 1-pole 6-32A C-curve MCB 6kA GH₵ 28.00 each'),
    ('GH', 'elec-switch-plate',         15.00, 'GHS', 'Valmont Electricals Focus 1-gang 1-way light switch white GH₵ 15.00 each'),
    ('GH', 'elec-socket-outlet',        38.00, 'GHS', 'Valmont Electricals Focus double 13A switched socket outlet GH₵ 38.00 each'),
    ('GH', 'elec-distribution-board',  390.00, 'GHS', 'Valmont Electricals Focus 12-way consumer unit / distribution board GH₵ 390.00 each'),

    -- KE (Kenya)
    ('KE', 'elec-cable-lighting',       36.00, 'KES', 'TDK Networks East Africa Cable 1.5mm2 single-core PVC copper wire 100m KES 3,600.00 = KES 36.00/m; KS IEC 60364 lighting'),
    ('KE', 'elec-cable-socket',         87.78, 'KES', 'TDK Networks East Africa Cable 2.5mm2 single-core PVC copper wire 90m KES 7,900.00 = KES 87.78/m; 32A ring / 20A radial socket branch'),
    ('KE', 'elec-cable-dedicated',      90.00, 'KES', 'TDK Networks East Africa Cable 4.0mm2 single-core PVC copper wire 100m KES 9,000.00 = KES 90.00/m; instant shower / water heater'),
    ('KE', 'elec-cable-earth',          87.78, 'KES', 'TDK Networks East Africa Cable 2.5mm2 green/yellow copper earth wire 90m KES 7,900.00 = KES 87.78/m; earthing conductor'),
    ('KE', 'elec-cable-feeder',        284.00, 'KES', 'TDK Networks 16mm2 single-core PVC copper building wire 100m KES 28,400.00 = KES 284.00/m; main consumer service feeder'),
    ('KE', 'elec-conduit',              68.97, 'KES', 'Rapidtech Tronic 20mm x 2.9m heavy-gauge rigid PVC conduit pipe KES 200.00 = KES 68.97/m; embedded masonry conduit'),
    ('KE', 'elec-junction-box',         40.00, 'KES', 'Winstar Hardware single pattress / conduit knockout box KES 40.00 each (BS 4662 standard)'),
    ('KE', 'elec-breaker',             270.00, 'KES', 'Randtech 1-pole 20A MCB circuit breaker KES 270.00 each; EPRA compliant'),
    ('KE', 'elec-switch-plate',         95.00, 'KES', 'Tronic Kenya 1-gang 1-way slim wall switch 10A KES 95.00 each (KEBS certified)'),
    ('KE', 'elec-socket-outlet',       300.00, 'KES', 'Hada Electrical Windsor 13A twin switched socket outlet KES 300.00 each'),
    ('KE', 'elec-distribution-board', 4500.00, 'KES', 'Hada Electrical Havells 8-way SPN consumer unit / distribution board KES 4,500.00 each'),

    -- ZA (South Africa)
    ('ZA', 'elec-cable-lighting',       16.49, 'ZAR', 'Leroy Merlin Aberdare Surfix 1.5mm2 2-core + earth white cable 100m R 1,649.00 = R 16.49/m; SANS 10142-1 lighting'),
    ('ZA', 'elec-cable-socket',         22.49, 'ZAR', 'Leroy Merlin Surfix 2.5mm2 2-core + earth white cable 100m R 2,249.00 = R 22.49/m; SANS 164-1/2 socket branch'),
    ('ZA', 'elec-cable-dedicated',      41.10, 'ZAR', 'Leroy Merlin 4.0mm2 flat twin & earth white cable 10m R 411.00 = R 41.10/m; geyser / water heater circuit'),
    ('ZA', 'elec-cable-earth',           7.00, 'ZAR', 'Builders Warehouse Waco 1.5mm2 / 2.5mm2 earth wire R 7.00/m; bonding and earthing'),
    ('ZA', 'elec-cable-feeder',        100.18, 'ZAR', 'ACDC Dynamics 16mm2 red GP building wire 50m R 5,009.00 = R 100.18/m; main distribution feeder'),
    ('ZA', 'elec-conduit',               4.98, 'ZAR', 'Leroy Merlin Proton 20mm x 4m PVC conduit pipe R 19.90 = R 4.98/m'),
    ('ZA', 'elec-junction-box',         13.50, 'ZAR', 'Leroy Merlin Proton 20mm 2-way conduit junction box R 13.50 each (SANS compliant)'),
    ('ZA', 'elec-breaker',             169.00, 'ZAR', 'Leroy Merlin CBI Electric mini-rail 25A MCB circuit breaker R 169.00 each; curve 1 / curve 2'),
    ('ZA', 'elec-switch-plate',         32.00, 'ZAR', 'Leroy Merlin CBI 1-lever 1-way light switch white 2x4 R 32.00 each (SABS approved)'),
    ('ZA', 'elec-socket-outlet',       129.00, 'ZAR', 'Leroy Merlin Crabtree 4x4 2x3-pin switched socket outlet R 129.00 each'),
    ('ZA', 'elec-distribution-board',  357.00, 'ZAR', 'Leroy Merlin CBI Electric 12-way flush distribution board unpopulated R 357.00 each')
),
resolved as (
  select
    r.market,
    m.id as material_id,
    r.price,
    r.currency,
    r.source_desc
  from input_rows r
  join estimation_materials m
    on m.slug = r.material_slug
   and m.is_active = true
),
deactivated as (
  update market_prices mp
  set is_active = false
  from resolved res
  where mp.market = res.market
    and mp.material_id = res.material_id
    and mp.is_active = true
  returning mp.id
),
seeded as (
  insert into market_prices (
    market,
    material_id,
    price,
    currency,
    unit,
    source,
    confidence_score,
    scan_confidence,
    is_active,
    last_verified_at
  )
  select
    res.market,
    res.material_id,
    res.price,
    res.currency,
    m.unit,
    res.source_desc,
    1.00,
    'manual',
    true,
    now()
  from resolved res
  join estimation_materials m on m.id = res.material_id
  returning id, market, material_id
)
select
  market,
  count(*) as inserted_rows
from seeded
group by market
order by market;

-- Verification check: 11 active electrical prices per market for GH, KE, ZA
select
  mp.market,
  count(distinct mp.material_id) as active_electrical_slugs
from market_prices mp
join estimation_materials m on m.id = mp.material_id
where mp.market in ('GH', 'KE', 'ZA')
  and m.slug like 'elec-%'
  and mp.is_active = true
group by mp.market
order by mp.market;
