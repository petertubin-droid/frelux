-- SCHEMA REPAIR 2026-10-14: this migration was originally authored against the
-- legacy market_prices table (old dev project schema). It never applied to the
-- live DB (relation did not exist). Rewritten to the live estimation_prices
-- schema (price_type/ref_id/notes/price_source mapping), same verified price data.

-- Electrical estimation price books for IT (Italy), MX (Mexico), and JP (Japan).
-- P2 batch 13 (2026-10-13): 33 manual-confidence rows (11 slugs x 3 markets).
--
-- Markets covered:
--   IT (Italy)   EUR (Euro)
--   MX (Mexico)  MXN (Mexican Peso)
--   JP (Japan)   JPY (Japanese Yen)
--
-- Pricing methodology & source basis:
-- IT (EUR, per metre unless noted; Tecnomat / Leroy Merlin Italia live listings 2026, incl 22% IVA):
--   lighting  Cavo unipolare FS17 CPR 450/750V 1x1.5 mmq matassa 100m 21.90 € -> 0.22 €/m (Norma CEI 64-8)
--   socket    Cavo unipolare FS17 CPR 450/750V 1x2.5 mmq matassa 100m 34.90 € -> 0.35 €/m (Prese 10/16A)
--   dedicated Cavo unipolare FS17 CPR 450/750V 1x6.0 mmq matassa 100m 85.03 € -> 0.85 €/m (Piano induzione 32A)
--   earth     Cavo unipolare FS17 CPR 450/750V 1x2.5 mmq giallo/verde matassa 100m 34.90 € -> 0.35 €/m (Conduttore PE)
--   feeder    Cavo unipolare FS17 CPR 1x16 mmq o multipolare FG16OR16 3G6/3G10 3.50 €/m (Montante contatore)
--   conduit   Tubo corrugato pieghevole PVC Gewiss/Tubifor Ø 20 mm tirafilo matassa 100m 31.97 € -> 0.32 €/m
--   junction  Scatola da incasso 3 moduli tipo 503 (Bticino 503E / Vimar V71303) 0.95 € each
--   breaker   Interruttore magnetotermico Bticino/Schneider 1P+N 10A/16A curva C 4.5kA 8.50 € each (CEI EN 60898-1)
--   switch    Bticino Matix / Vimar Plana interruttore 1P 10AX completo con supporto e placca 4.50 € each
--   socket    Bticino Matix / Vimar Plana presa bivalente bipasso 10/16A 2P+T completa con placca 5.80 € each (Tipo L)
--   DB        Centralino Sartel / Gewiss incasso 24 moduli IP40 con portello fumé 21.40 € each
--
-- MX (MXN, per metre unless noted; The Home Depot México live listings 2026, incl 16% IVA):
--   lighting  Cable eléctrico IUSA/Indiana THW-LS 14 AWG 100m rollo $1,025.00 MXN -> $10.25 MXN/m (NOM-001-SEDE)
--   socket    Cable eléctrico Indiana/IUSA THW-LS 12 AWG 100m rollo $1,435.00 MXN -> $14.35 MXN/m (NEMA 5-15R)
--   dedicated Cable eléctrico IUSA/Indiana THW-LS 10 AWG 100m carrete $2,279.00 MXN -> $22.79 MXN/m (Minisplit A/C)
--   earth     Cable eléctrico IUSA THW-LS 14 AWG verde 100m rollo $1,025.00 MXN -> $10.25 MXN/m (Tierra física)
--   feeder    Cable eléctrico Indiana THW-LS 8 AWG deslizable por metro $41.50 MXN/m (Acometida CFE)
--   conduit   Poliducto naranja flexible corrugado Poliflex 3/4" con guía 50m $999.00 MXN -> $19.98 MXN/m
--   junction  Caja conduit chalupa Amanco 1/2" PVC autoextinguible $12.00 MXN each
--   breaker   Interruptor termomagnético Square D QO 1 polo 15A/20A 120V QO115/QO120 $229.00 MXN each
--   switch    Apagador sencillo 1 módulo 15A con placa Commercial Electric / Niessen $49.00 MXN each
--   socket    Placa con contacto dúplex polarizado y aterrizado 15A 127V Lucek / Leviton $65.00 MXN each
--   DB        Centro de carga Square D QOD 8 espacios 100A bifásica 120/240V empotrar $769.00 MXN each
--
-- JP (JPY, per metre unless noted; MonotaRO / Amazon.co.jp live listings 2026, incl 10% consumption tax):
--   lighting  Fujidenshi / YASAKA 600V VVF 1.6mm 2-core 100m coil ¥16,478 -> ¥165 JPY/m (JIS C 3342)
--   socket    Aichi / YASAKA 600V VVF 2.0mm 2-core 100m coil ¥24,980 -> ¥250 JPY/m (JIS C 3342 20A branch)
--   dedicated YASAKA / Aichi 600V VVF 2.0mm 3-core / 200V with earth 100m coil ¥39,980 -> ¥400 JPY/m (IH/Heat pump)
--   earth     Aichi 600V IV single-core PVC ground wire 1.6mm green 100m coil ¥6,490 -> ¥65 JPY/m
--   feeder    600V CV / VVR 3-core 8 mm2 cross-linked polyethylene cable ¥1,250 JPY/m (Main intake feeder)
--   conduit   Bakuma / Mirai Kogyo PF-16 flexible resin conduit pipe 16mm 50m coil ¥4,948 -> ¥99 JPY/m (JIS C 8411)
--   junction  Mirai Kogyo flush switch box 1-gang CSW-1NF synthetic resin ¥461 JPY each (JIS C 8435)
--   breaker   Panasonic compact breaker SH type 2P1E 20A 100V BSH2201 ¥1,428 JPY each (JIS C 8211)
--   switch    Panasonic Cosmo Series Wide 21 single switch complete with plate set WT5001 + WTC7101W ¥580 JPY each
--   socket    Panasonic Cosmo Series Wide 21 duplex grounding outlet 15A 125V set WTF1502WK ¥680 JPY each (JIS Type A/B)
--   DB        Tempearl / Panasonic residential distribution board 8-circuit 40A main with ELB ¥17,580 JPY each

with input_rows (market, material_slug, price, currency, source_desc) as (
  values
    -- IT (Italy)
    ('IT', 'elec-cable-lighting',        0.22, 'EUR', 'Cavo unipolare FS17 CPR 450/750V 1x1.5 mmq matassa 100m 21.90 € = 0.22 €/m; Norma CEI 64-8 circuiti luce'),
    ('IT', 'elec-cable-socket',          0.35, 'EUR', 'Cavo unipolare FS17 CPR 450/750V 1x2.5 mmq matassa 100m 34.90 € = 0.35 €/m; prese forza motrice 10/16A Bipasso/Schuko'),
    ('IT', 'elec-cable-dedicated',       0.85, 'EUR', 'Cavo unipolare FS17 CPR 450/750V 1x6.0 mmq matassa 100m 85.03 € = 0.85 €/m; piano cottura a induzione 32A / carichi pesanti'),
    ('IT', 'elec-cable-earth',           0.35, 'EUR', 'Cavo unipolare FS17 CPR 450/750V 1x2.5 mmq giallo/verde matassa 100m 34.90 € = 0.35 €/m; conduttore di protezione PE'),
    ('IT', 'elec-cable-feeder',          3.50, 'EUR', 'Cavo unipolare FS17 CPR 1x16 mmq o multipolare FG16OR16 3G6/3G10 3.50 €/m; montante alimentazione principale dal contatore'),
    ('IT', 'elec-conduit',               0.32, 'EUR', 'Tubo corrugato pieghevole PVC Gewiss/Tubifor serie Tieffe Ø 20 mm con tirafilo matassa 100m 31.97 € = 0.32 €/m; posa sottotraccia'),
    ('IT', 'elec-junction-box',          0.95, 'EUR', 'Scatola da incasso 3 moduli rettangolare tipo 503 (Bticino 503E / Vimar V71303) 0.95 € each; per serie civili modulari'),
    ('IT', 'elec-breaker',               8.50, 'EUR', 'Interruttore magnetotermico Bticino/Schneider 1P+N 10A/16A curva C 4.5kA 8.50 € each; protezione sovraccarico CEI EN 60898-1'),
    ('IT', 'elec-switch-plate',          4.50, 'EUR', 'Bticino Matix / Vimar Plana interruttore 1P 10AX completo di supporto 3 moduli e placca 4.50 € each; serie civile'),
    ('IT', 'elec-socket-outlet',         5.80, 'EUR', 'Bticino Matix / Vimar Plana presa bivalente bipasso 10/16A 2P+T completa di supporto e placca 5.80 € each; standard italiano tipo L'),
    ('IT', 'elec-distribution-board',   21.40, 'EUR', 'Centralino Sartel / Gewiss da incasso 24 moduli IP40 con portello trasparente fumé 21.40 € each; quadro elettrico di appartamento'),

    -- MX (Mexico)
    ('MX', 'elec-cable-lighting',       10.25, 'MXN', 'Cable eléctrico IUSA / Indiana THW-LS/THHW-LS calibre 14 AWG rollo 100m $1,025.00 MXN = $10.25 MXN/m; NOM-001-SEDE alumbrado'),
    ('MX', 'elec-cable-socket',         14.35, 'MXN', 'Cable eléctrico Indiana / IUSA THW-LS calibre 12 AWG rollo 100m $1,435.00 MXN = $14.35 MXN/m; contactos generales 20A NEMA 5-15R'),
    ('MX', 'elec-cable-dedicated',      22.79, 'MXN', 'Cable eléctrico IUSA / Indiana THW-LS calibre 10 AWG carrete 100m $2,279.00 MXN = $22.79 MXN/m; circuitos dedicados minisplit A/C'),
    ('MX', 'elec-cable-earth',          10.25, 'MXN', 'Cable eléctrico IUSA THW-LS calibre 14 AWG verde rollo 100m $1,025.00 MXN = $10.25 MXN/m; conductor de puesta a tierra'),
    ('MX', 'elec-cable-feeder',         41.50, 'MXN', 'Cable eléctrico Indiana THW-LS calibre 8 AWG deslizable por metro $41.50 MXN/m; alimentador principal de acometida CFE'),
    ('MX', 'elec-conduit',              19.98, 'MXN', 'Poliducto naranja flexible corrugado Poliflex 3/4 pulgada con guía rollo 50m $999.00 MXN = $19.98 MXN/m; canalización ahogada'),
    ('MX', 'elec-junction-box',         12.00, 'MXN', 'Caja conduit tipo chalupa Amanco 1/2 pulgada de PVC autoextinguible $12.00 MXN each; montaje de apagadores y contactos'),
    ('MX', 'elec-breaker',             229.00, 'MXN', 'Interruptor termomagnético Square D QO 1 polo 15A/20A 120V enchufable QO115/QO120 $229.00 MXN each; protección sobrecarga'),
    ('MX', 'elec-switch-plate',         49.00, 'MXN', 'Apagador sencillo 1 módulo 15A con placa de pared Commercial Electric / Niessen Estévez $49.00 MXN each'),
    ('MX', 'elec-socket-outlet',        65.00, 'MXN', 'Placa con contacto dúplex polarizado y aterrizado 15A 127V NEMA 5-15R Lucek / Leviton $65.00 MXN each'),
    ('MX', 'elec-distribution-board',  769.00, 'MXN', 'Centro de carga Square D QOD de 8 espacios 100A bifásica 120/240V NEMA 1 empotrar QOD8F $769.00 MXN each'),

    -- JP (Japan)
    ('JP', 'elec-cable-lighting',      165.00, 'JPY', 'Fujidenshi / YASAKA 600V VVF 1.6mm 2-core flat vinyl sheathed cable 100m coil ¥16,478 = ¥165 JPY/m; JIS C 3342 lighting circuits'),
    ('JP', 'elec-cable-socket',        250.00, 'JPY', 'Aichi / YASAKA 600V VVF 2.0mm 2-core flat vinyl sheathed cable 100m coil ¥24,980 = ¥250 JPY/m; JIS C 3342 20A branch outlets'),
    ('JP', 'elec-cable-dedicated',     400.00, 'JPY', 'YASAKA / Aichi 600V VVF 2.0mm 3-core / 200V with earth wire 100m coil ¥39,980 = ¥400 JPY/m; 200V heat pump / IH cooker'),
    ('JP', 'elec-cable-earth',          65.00, 'JPY', 'Aichi 600V IV single-core PVC ground wire 1.6mm green 100m coil ¥6,490 = ¥65 JPY/m; protective grounding conductor'),
    ('JP', 'elec-cable-feeder',       1250.00, 'JPY', '600V CV / VVR 3-core 8 mm2 cross-linked polyethylene insulated cable ¥1,250 JPY/m; main intake feeder from TEPCO/KEPCO meter'),
    ('JP', 'elec-conduit',              99.00, 'JPY', 'Bakuma / Mirai Kogyo PF-16 flexible resin conduit pipe 16mm 50m coil ¥4,948 = ¥99 JPY/m; JIS C 8411 concealed flexible conduit'),
    ('JP', 'elec-junction-box',        461.00, 'JPY', 'Mirai Kogyo flush switch box 1-gang CSW-1NF synthetic resin ¥461 JPY each; JIS C 8435 mounting box'),
    ('JP', 'elec-breaker',            1428.00, 'JPY', 'Panasonic compact breaker SH type 2P1E 20A 100V BSH2201 ¥1,428 JPY each; JIS C 8211 residential branch breaker'),
    ('JP', 'elec-switch-plate',        580.00, 'JPY', 'Panasonic Cosmo Series Wide 21 single switch complete with plate set WT5001 + WTC7101W ¥580 JPY each; JIS flush switch'),
    ('JP', 'elec-socket-outlet',       680.00, 'JPY', 'Panasonic Cosmo Series Wide 21 duplex grounding outlet 15A 125V complete set WTF1502WK ¥680 JPY each; JIS Type A/B outlet'),
    ('JP', 'elec-distribution-board', 17580.00, 'JPY', 'Tempearl / Panasonic residential distribution board 8-circuit 40A main with ELB 30mA ¥17,580 JPY each; JIS residential panel')
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
  update estimation_prices mp
  set is_active = false, updated_at = now()
  from resolved res
  where mp.market = res.market
    and mp.price_type = 'material'
    and mp.ref_id = res.material_id
    and mp.is_active = true
  returning mp.id
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
  returning id, market, ref_id
)
select
  market,
  count(*) as inserted_rows
from seeded
group by market
order by market;

-- Verification check: 11 active electrical prices per market for IT, MX, JP
select
  mp.market,
  count(distinct mp.ref_id) as active_electrical_slugs
from estimation_prices mp
join estimation_materials m on m.id = mp.ref_id
where mp.price_type = 'material' and mp.market in ('IT', 'MX', 'JP')
  and m.slug like 'elec-%'
  and mp.is_active = true
group by mp.market
order by mp.market;
