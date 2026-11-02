-- Electrical estimation price books for CN (China), ID (Indonesia), and KR (South Korea).
-- P2 batch 14 (2026-10-13): 33 manual-confidence rows (11 slugs x 3 markets).
--
-- Markets covered:
--   CN (China)        CNY (Chinese Yuan Renminbi)
--   ID (Indonesia)    IDR (Indonesian Rupiah)
--   KR (South Korea)  KRW (South Korean Won)
--
-- This completes all 20 global electrical market books in Frelux.
--
-- Pricing methodology & source basis:
-- CN (CNY, per metre unless noted; JD.com / Suning / Taobao / LESSO / Chint live listings 2026):
--   lighting  Huaxin / Guangzhou Zhujiang ZR-BV 1x1.5 mm² 100m coil 88.80-91.60 ¥ -> 0.90 CNY/m (GB 50054 lighting)
--   socket    Xinxing / Zhujiang ZR-BV 1x2.5 mm² 100m coil 145.00 ¥ -> 1.45 CNY/m (10A 5-hole branch circuits)
--   dedicated Huaxin ZR-BV 1x4.0 mm² 100m coil 223.60 ¥ -> 2.24 CNY/m (16A Air conditioner / kitchen circuits)
--   earth     ZR-BV 1x2.5 mm² yellow/green PE ground wire 100m coil 145.00 ¥ -> 1.45 CNY/m
--   feeder    Huaxin / Zhujiang ZR-BV 1x16 mm² or YJV 3x10/16 mm² power feeder 14.80 CNY/m
--   conduit   LESSO (联塑) PVC-U cold-bend flame retardant conduit A-pipe Ø20mm 2.85m 7.05 ¥ -> 2.47 CNY/m
--   junction  LESSO / TEP standard 86-type PVC flush-mounting junction box (86型暗盒) 2.50 CNY each
--   breaker   Chint (正泰) NXB-63 / DZ47-63 1P 16A/20A miniature circuit breaker MCB 6kA 8.50 CNY each (GB/T 10963.1)
--   switch    Bull (公牛) G12 / G07 86-type 1-gang 1-way switch panel with plate (一开单控) 7.20 CNY each
--   socket    Bull (公牛) G12 86-type 10A 5-hole combination socket (五孔插座 / 二三插) 7.20 CNY each
--   DB        Chint (正泰) PZ30-8 / PZ30-12 flush residential distribution box body 75.00 CNY each
--
-- ID (IDR, per metre unless noted; Mitra10 / Tokopedia / GudangMaterial / Ace Hardware live listings 2026):
--   lighting  Kabel Eterna NYM 2x1.5 mm² 50m roll IDR 666,000 -> IDR 13,320 / m (PUIL 2011 residential lighting)
--   socket    Kabel Supreme NYM 3x2.5 mm² 50m roll IDR 1,370,000 -> IDR 27,400 / m (16A Schuko branch circuits)
--   dedicated Kabel Supreme NYM 3x4.0 mm² IDR 42,000 / m (AC split & water heater dedicated circuits)
--   earth     Kabel NYA 1x2.5 mm² tembaga hijau/kuning ground wire IDR 4,800 / m
--   feeder    Kabel NYY 4x6 / 4x10 mm² PLN main intake cable from kWh meter IDR 68,000 / m
--   conduit   Pipa conduit PVC Boss / Clipsal Ø 20mm 2.9m/3m length IDR 16,800 -> IDR 5,800 / m
--   junction  Inbow Doos mangkok tanam saklar/stop kontak Nero / Broco IDR 2,800 each
--   breaker   MCB Schneider Electric Domae 1P 10A/16A/20A 4.5kA IDR 75,000 each (IEC 60898-1 / SNI)
--   switch    Saklar engkel 1-gang inbow Broco Galleo / Gracio lengkap IDR 21,000 each
--   socket    Stop kontak arde Schuko 16A tanam Broco Galleo G151 / Gracio IDR 22,500 each
--   DB        Box MCB Schneider Domae DOMH12108F 8 modul inbow / flush IDR 185,000 each
--
-- KR (KRW, per metre unless noted; Enuri / Danawa / Seoul P&C / Sangdo / iMarket live listings 2026):
--   lighting  LS Cable / Gaon HFIX 1x1.5 mm² single-core 100m roll 51,000 KRW -> 510 KRW/m (KEC lighting branch)
--   socket    LS Cable / Gaon HFIX 1x2.5 mm² single-core 100m roll 65,350 KRW -> 654 KRW/m (16A Type F socket branch)
--   dedicated LS Cable HFIX 1x4.0 mm² single-core 100m roll 105,000 KRW -> 1,050 KRW/m (Induction / system A/C)
--   earth     LS Cable HFIX 1x2.5 mm² green PE wire 100m roll 65,350 KRW -> 654 KRW/m
--   feeder    600V F-CV 3-core 6 mm² / 10 mm² cross-linked polyethylene cable 8,500 KRW/m (Main intake feeder)
--   conduit   Seoul P&C flame-retardant 난연 CD flexible conduit pipe 16mm 100m roll 27,500 KRW incl VAT -> 275 KRW/m
--   junction  Standard 1-gang synthetic resin / steel flush switch/outlet box (1개용 매입박스) 850 KRW each
--   breaker   LS ELECTRIC 32GRhN 2P 20A 30mA residential earth leakage breaker (누전차단기) 8,770 KRW each
--   switch    Winners / Jinheung 1-gang wide flush switch with plate (위너스 1구 와이드 스위치) 2,200 KRW each
--   socket    Winners / Jinheung 2-gang grounded flush outlet 16A 250V (2구 매입 접지콘센트 MCP2-22008) 2,450 KRW each
--   DB        Sangdo / Jinheung residential distribution board 5-6 circuit (주택용 세대분전함) 22,600 KRW each

with input_rows (market, material_slug, price, currency, source_desc) as (
  values
    -- CN (China)
    ('CN', 'elec-cable-lighting',        0.90, 'CNY', 'Huaxin / Zhujiang ZR-BV 1x1.5 mm² 100m coil 88.80-91.60 ¥ = 0.90 CNY/m; GB 50054 lighting branch'),
    ('CN', 'elec-cable-socket',          1.45, 'CNY', 'Xinxing / Zhujiang ZR-BV 1x2.5 mm² 100m coil 145.00 ¥ = 1.45 CNY/m; 10A 5-hole branch circuits'),
    ('CN', 'elec-cable-dedicated',       2.24, 'CNY', 'Huaxin ZR-BV 1x4.0 mm² 100m coil 223.60 ¥ = 2.24 CNY/m; 16A A/C & kitchen heavy load circuits'),
    ('CN', 'elec-cable-earth',           1.45, 'CNY', 'ZR-BV 1x2.5 mm² yellow/green ground wire 100m coil 145.00 ¥ = 1.45 CNY/m; PE earth conductor'),
    ('CN', 'elec-cable-feeder',         14.80, 'CNY', 'Huaxin / Zhujiang ZR-BV 1x16 mm² or YJV 3x10/16 mm² power cable 14.80 CNY/m; intake feeder from meter'),
    ('CN', 'elec-conduit',               2.47, 'CNY', 'LESSO (联塑) PVC-U cold-bend conduit A-pipe Ø20mm 2.85m 7.05 ¥ = 2.47 CNY/m; concealed wall/slab install'),
    ('CN', 'elec-junction-box',          2.50, 'CNY', 'LESSO / TEP standard 86-type PVC flush-mounting junction box (86型暗盒) 2.50 CNY each'),
    ('CN', 'elec-breaker',               8.50, 'CNY', 'Chint (正泰) NXB-63 / DZ47-63 1P 16A/20A miniature circuit breaker MCB 6kA 8.50 CNY each; GB/T 10963.1'),
    ('CN', 'elec-switch-plate',          7.20, 'CNY', 'Bull (公牛) G12 / G07 86-type 1-gang 1-way switch panel with plate (一开单控) 7.20 CNY each'),
    ('CN', 'elec-socket-outlet',         7.20, 'CNY', 'Bull (公牛) G12 86-type 10A 5-hole combination socket (五孔插座 / 二三插) 7.20 CNY each'),
    ('CN', 'elec-distribution-board',   75.00, 'CNY', 'Chint (正泰) PZ30-8 / PZ30-12 flush residential distribution box body 75.00 CNY each'),

    -- ID (Indonesia)
    ('ID', 'elec-cable-lighting',       13320, 'IDR', 'Kabel Eterna NYM 2x1.5 mm² 50m roll IDR 666,000 = IDR 13,320 / m; PUIL 2011 residential lighting'),
    ('ID', 'elec-cable-socket',         27400, 'IDR', 'Kabel Supreme NYM 3x2.5 mm² 50m roll IDR 1,370,000 = IDR 27,400 / m; 16A Schuko grounded socket branch'),
    ('ID', 'elec-cable-dedicated',      42000, 'IDR', 'Kabel Supreme NYM 3x4.0 mm² IDR 42,000 / m; AC split and water heater dedicated circuits'),
    ('ID', 'elec-cable-earth',           4800, 'IDR', 'Kabel NYA 1x2.5 mm² tembaga hijau/kuning ground wire IDR 4,800 / m; PE grounding conductor'),
    ('ID', 'elec-cable-feeder',         68000, 'IDR', 'Kabel NYY 4x6 / 4x10 mm² PLN main intake cable from kWh meter IDR 68,000 / m'),
    ('ID', 'elec-conduit',               5800, 'IDR', 'Pipa conduit PVC Boss / Clipsal Ø 20mm 2.9m/3m length IDR 16,800 = IDR 5,800 / m'),
    ('ID', 'elec-junction-box',          2800, 'IDR', 'Inbow Doos mangkok tanam saklar/stop kontak Nero / Broco IDR 2,800 each'),
    ('ID', 'elec-breaker',              75000, 'IDR', 'MCB Schneider Electric Domae 1P 10A/16A/20A 4.5kA IDR 75,000 each; IEC 60898-1 / SNI'),
    ('ID', 'elec-switch-plate',         21000, 'IDR', 'Saklar engkel 1-gang inbow Broco Galleo / Gracio lengkap IDR 21,000 each'),
    ('ID', 'elec-socket-outlet',        22500, 'IDR', 'Stop kontak arde Schuko 16A tanam Broco Galleo G151 / Gracio IDR 22,500 each'),
    ('ID', 'elec-distribution-board',  185000, 'IDR', 'Box MCB Schneider Domae DOMH12108F 8 modul inbow / flush IDR 185,000 each'),

    -- KR (South Korea)
    ('KR', 'elec-cable-lighting',         510, 'KRW', 'LS Cable / Gaon HFIX 1x1.5 mm² single-core 100m roll 51,000 KRW = 510 KRW/m; KEC lighting branch'),
    ('KR', 'elec-cable-socket',           654, 'KRW', 'LS Cable / Gaon HFIX 1x2.5 mm² single-core 100m roll 65,350 KRW = 654 KRW/m; 16A Type F socket branch'),
    ('KR', 'elec-cable-dedicated',       1050, 'KRW', 'LS Cable HFIX 1x4.0 mm² single-core 100m roll 105,000 KRW = 1,050 KRW/m; induction & A/C circuits'),
    ('KR', 'elec-cable-earth',            654, 'KRW', 'LS Cable HFIX 1x2.5 mm² green PE wire 100m roll 65,350 KRW = 654 KRW/m; PE earth conductor'),
    ('KR', 'elec-cable-feeder',          8500, 'KRW', '600V F-CV 3-core 6 mm² / 10 mm² power cable 8,500 KRW/m; main intake feeder from meter'),
    ('KR', 'elec-conduit',                275, 'KRW', 'Seoul P&C flame-retardant 난연 CD flexible conduit pipe 16mm 100m roll 27,500 KRW = 275 KRW/m'),
    ('KR', 'elec-junction-box',           850, 'KRW', 'Standard 1-gang synthetic resin / steel flush switch/outlet box (1개용 매입박스) 850 KRW each'),
    ('KR', 'elec-breaker',               8770, 'KRW', 'LS ELECTRIC 32GRhN 2P 20A 30mA residential earth leakage breaker (누전차단기) 8,770 KRW each'),
    ('KR', 'elec-switch-plate',          2200, 'KRW', 'Winners / Jinheung 1-gang wide flush switch with plate (위너스 1구 와이드 스위치) 2,200 KRW each'),
    ('KR', 'elec-socket-outlet',         2450, 'KRW', 'Winners / Jinheung 2-gang grounded flush outlet 16A 250V (2구 매입 접지콘센트 MCP2-22008) 2,450 KRW each'),
    ('KR', 'elec-distribution-board',   22600, 'KRW', 'Sangdo / Jinheung residential distribution board 5-6 circuit (주택용 세대분전함) 22,600 KRW each')
),

-- SCHEMA REPAIR 2026-10-14: the original CTE chain below was written against a
-- different estimation_prices shape (country_code/material_slug/unit_price
-- columns) that never existed in the live DB, so it could not apply. Rewritten
-- to the live estimation_prices schema (price_type/ref_id/market) joined to
-- estimation_materials by slug; same verified price data.

resolved as (
  select
    ir.market,
    m.id as material_id,
    ir.price,
    ir.currency,
    ir.source_desc
  from input_rows ir
  join estimation_materials m
    on m.slug = ir.material_slug
   and m.is_active = true
),
deactivated as (
  update estimation_prices ep
  set is_active = false, updated_at = now()
  from resolved res
  where ep.market = res.market
    and ep.price_type = 'material'
    and ep.ref_id = res.material_id
    and ep.is_active = true
  returning ep.id
),
seeded as (
  insert into estimation_prices (
    price_type,
    ref_id,
    price,
    currency,
    effective_date,
    notes,
    is_active,
    price_source,
    scan_confidence,
    market
  )
  select
    'material',
    res.material_id,
    res.price,
    res.currency,
    current_date,
    res.source_desc,
    true,
    res.source_desc,
    'manual',
    res.market
  from resolved res
  returning id, market
)
select
  market,
  count(*) as inserted_rows
from seeded
group by market
order by market;

-- Verification query (live schema):
-- select p.market, count(*) as active_electrical_prices
-- from estimation_prices p
-- join estimation_materials m on m.id = p.ref_id
-- where p.price_type = 'material'
--   and m.slug like 'elec-%'
--   and p.market in ('CN', 'ID', 'KR')
--   and p.is_active = true
-- group by p.market;
