-- Electrical estimation price books for FR (France), BR (Brazil), SA (Saudi Arabia), and AE (United Arab Emirates).
-- P2 batch 12 (2026-10-13): 44 manual-confidence rows (11 slugs x 4 markets).
--
-- Markets covered:
--   FR (France)               EUR (Euro)
--   BR (Brazil)               BRL (Brazilian Real)
--   SA (Saudi Arabia)         SAR (Saudi Riyal)
--   AE (United Arab Emirates) AED (UAE Dirham)
--
-- Pricing methodology & source basis:
-- FR (EUR, per metre unless noted; Brico Dépôt / Leroy Merlin France live listings 2026, incl 20% TVA):
--   lighting  Nexans H07V-U 1.5mm2 fil de cuivre isolé 100m couronne 21.60 € -> 0.22 €/m (NF C 15-100)
--   socket    Brico Dépôt H07V-U 2.5mm2 fil rigide cuivre 100m couronne 32.90 € -> 0.33 €/m
--   dedicated Brico Dépôt H07V-R 6.0mm2 fil rigide cuivre 25m couronne 35.90 € -> 1.44 €/m (32A plaque de cuisson)
--   earth     Nexans H07V-U 2.5mm2 vert/jaune fil de terre 100m couronne 32.90 € -> 0.33 €/m
--   feeder    Brico Dépôt H07V-R 16mm2 fil cuivre rigide au mètre 3.20 €/m
--   conduit   Brico Dépôt gaine ICTA Ø20mm avec tire-fil 100m couronne 30.50 € -> 0.31 €/m
--   junction  Brico Dépôt boîte d'encastrement placo 1 poste Ø67mm prof. 40mm 0.59 € each
--   breaker   Schneider Domae / Brico Dépôt disjoncteur phase+neutre 16A/20A courbe C 3kA 8.99 € each
--   switch    Schneider Ovalis interrupteur va-et-vient 10A complet avec plaque 3.29 € each
--   socket    Legrand Dooxie prise de courant 2P+T 16A affleurante complète avec plaque 4.59 € each
--   DB        Brico Dépôt tableau électrique nu 2 rangées 26 modules 48.90 € each
--
-- BR (BRL, per metre unless noted; Leroy Merlin Brasil / Telhanorte / Cobrecom live listings 2026):
--   lighting  Cobrecom Flexicom cabo flexível 750V 1.5mm2 rolo 100m R$ 162,90 -> R$ 1.63/m (NBR 5410)
--   socket    Megatron cabo flexível 750V 2.5mm2 rolo 100m R$ 229,90 -> R$ 2.30/m (TUG NBR 14136)
--   dedicated Megatron cabo flexível 750V 6.0mm2 rolo 100m R$ 599,90 -> R$ 6.00/m (TUE chuveiro elétrico)
--   earth     Cobrecom cabo flexível 750V 2.5mm2 verde terra rolo 100m R$ 229,90 -> R$ 2.30/m
--   feeder    Cobrecom cabo flexível 750V 16mm2 rolo 100m R$ 1.540,00 -> R$ 15.40/m
--   conduit   Tramontina eletroduto corrugado flexível DN25 3/4" rolo 50m R$ 84,99 -> R$ 1.70/m
--   junction  Tigre Tigreflex CB caixa de luz embutir 4x2 retangular amarela R$ 3,69 each
--   breaker   Steck disjuntor monopolar DIN 20A curva C 3kA R$ 9,90 each
--   switch    Tramontina Liz conjunto 1 interruptor simples 10A 250V placa 4x2 R$ 11,90 each
--   socket    Tramontina Liz conjunto 1 tomada 2P+T 10A 250V placa 4x2 NBR 14136 R$ 15,90 each
--   DB        Tigre quadro de distribuição embutir 12/16 disjuntores porta branca R$ 108,90 each
--
-- SA (SAR, per metre unless noted; Alfanar / Boussah / Haatco live catalog 2026, incl 15% VAT):
--   lighting  Alfanar single-core Cu building wire 2.5mm2 (14 AWG) 100m coil 271 SAR -> 2.71 SAR/m (SBC 401 thermal derating)
--   socket    Alfanar single-core Cu building wire 4.0mm2 (12 AWG) 100m coil 418 SAR -> 4.18 SAR/m (SASO 2203 / BS 1363)
--   dedicated Alfanar single-core Cu building wire 6.0mm2 (10 AWG) 100m coil 639 SAR -> 6.39 SAR/m (split A/C load)
--   earth     Alfanar single-core Cu earth wire 2.5mm2 green/yellow 100m coil 271 SAR -> 2.71 SAR/m
--   feeder    Riyadh Cables / Alfanar 4-core 16mm2 Cu building feeder wire 35.00 SAR/m
--   conduit   Panasonic / Saudi electrical EMT / PVC heavy-duty conduit 20mm/25mm (3m pipe 19.55 SAR) -> 6.52 SAR/m
--   junction  Alfanar galvanized steel GI back box 7x7 cm (depth 4.7 cm) 2.70 SAR each
--   breaker   Alfanar 1-pole MCB 20A/32A plug-in/DIN 10kA (IEC 60898-1 / SASO 1349) 19.00 SAR each
--   switch    Alfanar Alfa 1-gang 1-way light switch 10A 7x7 cm 7.45 SAR each
--   socket    Alfanar Massa 13A 3-pin switched socket outlet 7x7 cm (BS 1363 / SASO 2203) 24.30 SAR each
--   DB        Alfanar 12-way consumer unit / distribution board 100A main (Raysan model 72-46) 465.75 SAR each
--
-- AE (AED, per metre unless noted; Ducab / Scientechnic / SupplyVan / Amazon.ae live listings 2026, incl 5% VAT):
--   lighting  Ducab single-core Cu PVC/LSF building wire 2.5mm2 100m coil 113 AED -> 1.13 AED/m (DEWA / BS 7671)
--   socket    Ducab single-core Cu PVC/LSF building wire 4.0mm2 100m coil 175 AED -> 1.75 AED/m (32A ring / 20A radial)
--   dedicated Ducab single-core Cu PVC/LSF building wire 6.0mm2 100m coil 260 AED -> 2.60 AED/m (dedicated A/C split)
--   earth     Ducab single-core Cu earth wire 2.5mm2 green/yellow 100m coil 113 AED -> 1.13 AED/m
--   feeder    Ducab 4-core 16mm2 XLPE/SWA or building feeder wire 28.00 AED/m
--   conduit   Decoduct / EGA rigid high-impact PVC conduit pipe 25mm dia 3m length 5.00 AED -> 1.67 AED/m
--   junction  York GI switch back box 3x3 inch (75x75mm) 2.00 AED each (BS 4662 standard)
--   breaker   Schneider Electric Easy9 / Acti9 iC60N 1-pole 20A/25A C-curve MCB 6kA 16.82 AED each
--   switch    Schneider Electric Vivace KB31 1-gang 1-way light switch 16AX 87x87mm 6.00 AED each
--   socket    Schneider Electric Vivace E KB15 13A 1-gang switched socket outlet (BS 1363) 16.00 AED each
--   DB        Gewiss / Schneider / Hager 8-12 way surface/flush consumer unit 337.00 AED each

with input_rows(market, material_slug, price, currency, source_desc) as (
  values
    -- FR (France)
    ('FR', 'elec-cable-lighting',        0.22, 'EUR', 'Nexans H07V-U 1.5mm2 fil cuivre rigide 100m couronne 21.60 € = 0.22 €/m; NF C 15-100 circuit éclairage 16A max 8 points'),
    ('FR', 'elec-cable-socket',          0.33, 'EUR', 'Brico Dépôt H07V-U 2.5mm2 fil cuivre rigide 100m couronne 32.90 € = 0.33 €/m; NF C 15-100 circuit prises 20A max 12 socles'),
    ('FR', 'elec-cable-dedicated',       1.44, 'EUR', 'Brico Dépôt H07V-R 6.0mm2 fil cuivre rigide 25m couronne 35.90 € = 1.44 €/m; circuit dédié plaque de cuisson 32A'),
    ('FR', 'elec-cable-earth',           0.33, 'EUR', 'Nexans H07V-U 2.5mm2 fil de terre vert/jaune 100m couronne 32.90 € = 0.33 €/m; conducteur de protection équipotentielle'),
    ('FR', 'elec-cable-feeder',          3.20, 'EUR', 'Brico Dépôt H07V-R 16mm2 fil cuivre rigide au mètre 3.20 €/m; liaison tableau de répartition / disjoncteur de branchement ENEDIS'),
    ('FR', 'elec-conduit',               0.31, 'EUR', 'Brico Dépôt gaine ICTA Ø20mm avec tire-fil 100m couronne 30.50 € = 0.31 €/m; gaine cintrable non propagatrice de flamme'),
    ('FR', 'elec-junction-box',          0.59, 'EUR', 'Brico Dépôt boîte d encastrement placo 1 poste Ø67mm prof. 40mm 0.59 € each; étanchéité à l air RT2012 / RE2020'),
    ('FR', 'elec-breaker',               8.99, 'EUR', 'Schneider Domae / Brico Dépôt disjoncteur divisionnaire phase+neutre 16A/20A courbe C 3kA 8.99 € each; NF EN 60898-1'),
    ('FR', 'elec-switch-plate',          3.29, 'EUR', 'Schneider Ovalis interrupteur va-et-vient 10A complet avec plaque blanche 3.29 € each; appareillage encastré'),
    ('FR', 'elec-socket-outlet',         4.59, 'EUR', 'Legrand Dooxie prise de courant 2P+T 16A affleurante avec plaque blanche 4.59 € each; NF C 61-314'),
    ('FR', 'elec-distribution-board',   48.90, 'EUR', 'Brico Dépôt tableau électrique nu 2 rangées 26 modules 48.90 € each; coffret modulaire DIN avec borniers terre/neutre'),

    -- BR (Brazil)
    ('BR', 'elec-cable-lighting',        1.63, 'BRL', 'Cobrecom Flexicom cabo flexível 750V 1.5mm2 rolo 100m R$ 162,90 = R$ 1.63/m; ABNT NBR 5410 iluminação 10A'),
    ('BR', 'elec-cable-socket',          2.30, 'BRL', 'Megatron cabo flexível 750V 2.5mm2 rolo 100m R$ 229,90 = R$ 2.30/m; ABNT NBR 5410 tomadas uso geral TUG 10A/20A'),
    ('BR', 'elec-cable-dedicated',       6.00, 'BRL', 'Megatron cabo flexível 750V 6.0mm2 rolo 100m R$ 599,90 = R$ 6.00/m; tomadas uso específico TUE chuveiro elétrico 5500W-7500W'),
    ('BR', 'elec-cable-earth',           2.30, 'BRL', 'Cobrecom cabo flexível 750V 2.5mm2 verde terra rolo 100m R$ 229,90 = R$ 2.30/m; condutor de proteção terra'),
    ('BR', 'elec-cable-feeder',         15.40, 'BRL', 'Cobrecom cabo flexível 750V 16mm2 rolo 100m R$ 1.540,00 = R$ 15.40/m; alimentação do padrão / quadro geral'),
    ('BR', 'elec-conduit',               1.70, 'BRL', 'Tramontina eletroduto corrugado flexível DN25 3/4 amarelo rolo 50m R$ 84,99 = R$ 1.70/m; NBR 15465 embutir alvenaria'),
    ('BR', 'elec-junction-box',          3.69, 'BRL', 'Tigre Tigreflex CB caixa de luz embutir 4x2 retangular amarela R$ 3,69 each; antichama termoplástica'),
    ('BR', 'elec-breaker',               9.90, 'BRL', 'Steck disjuntor monopolar DIN 20A curva C 3kA R$ 9,90 each; NBR NM 60898 proteção sobrecorrente'),
    ('BR', 'elec-switch-plate',         11.90, 'BRL', 'Tramontina Liz conjunto 1 interruptor simples 10A 250V placa 4x2 branca R$ 11,90 each; modular'),
    ('BR', 'elec-socket-outlet',        15.90, 'BRL', 'Tramontina Liz conjunto 1 tomada 2P+T 10A 250V placa 4x2 branca R$ 15,90 each; padrão brasileiro NBR 14136'),
    ('BR', 'elec-distribution-board',  108.90, 'BRL', 'Tigre quadro de distribuição embutir 12/16 disjuntores porta branca R$ 108,90 each; termoplástico com barramento'),

    -- SA (Saudi Arabia)
    ('SA', 'elec-cable-lighting',        2.71, 'SAR', 'Alfanar single-core copper building wire 2.5mm2 (14 AWG) 100m coil 271 SAR = 2.71 SAR/m; SBC 401 thermal derating standard'),
    ('SA', 'elec-cable-socket',          4.18, 'SAR', 'Alfanar single-core copper building wire 4.0mm2 (12 AWG) 100m coil 418 SAR = 4.18 SAR/m; SASO 2203 / BS 1363 socket circuits'),
    ('SA', 'elec-cable-dedicated',       6.39, 'SAR', 'Alfanar single-core copper building wire 6.0mm2 (10 AWG) 100m coil 639 SAR = 6.39 SAR/m; split A/C & water heater circuits'),
    ('SA', 'elec-cable-earth',           2.71, 'SAR', 'Alfanar single-core copper earth wire 2.5mm2 green/yellow 100m coil 271 SAR = 2.71 SAR/m; protective grounding conductor'),
    ('SA', 'elec-cable-feeder',         35.00, 'SAR', 'Riyadh Cables / Alfanar 4-core 16mm2 copper building feeder wire 35.00 SAR/m; main service entrance feeder'),
    ('SA', 'elec-conduit',               6.52, 'SAR', 'Panasonic / Saudi electrical EMT / PVC heavy-duty conduit 20mm/25mm (3m pipe 19.55 SAR) = 6.52 SAR/m; embedded masonry'),
    ('SA', 'elec-junction-box',          2.70, 'SAR', 'Alfanar galvanized steel GI back box 7x7 cm (depth 4.7 cm) 2.70 SAR each; standard BS knockout switch box'),
    ('SA', 'elec-breaker',              19.00, 'SAR', 'Alfanar 1-pole MCB 20A/32A plug-in/DIN 10kA 19.00 SAR each; IEC 60898-1 / SASO 1349 certified'),
    ('SA', 'elec-switch-plate',          7.45, 'SAR', 'Alfanar Alfa 1-gang 1-way light switch 10A 7x7 cm white 7.45 SAR each; SASO approved wall switch'),
    ('SA', 'elec-socket-outlet',        24.30, 'SAR', 'Alfanar Massa 13A 3-pin switched socket outlet 7x7 cm 24.30 SAR each; SASO 2203 / BS 1363 shuttered receptacle'),
    ('SA', 'elec-distribution-board',  465.75, 'SAR', 'Alfanar 12-way consumer unit / distribution board 100A main (Raysan model 72-46) 465.75 SAR each; IP41 flush panel'),

    -- AE (United Arab Emirates)
    ('AE', 'elec-cable-lighting',        1.13, 'AED', 'Ducab single-core copper PVC/LSF building wire 2.5mm2 100m coil 113 AED = 1.13 AED/m; DEWA / BS 7671 lighting circuits'),
    ('AE', 'elec-cable-socket',          1.75, 'AED', 'Ducab single-core copper PVC/LSF building wire 4.0mm2 100m coil 175 AED = 1.75 AED/m; DEWA 32A ring / 20A radial socket circuits'),
    ('AE', 'elec-cable-dedicated',       2.60, 'AED', 'Ducab single-core copper PVC/LSF building wire 6.0mm2 100m coil 260 AED = 2.60 AED/m; dedicated split A/C units'),
    ('AE', 'elec-cable-earth',           1.13, 'AED', 'Ducab single-core copper earth wire 2.5mm2 green/yellow 100m coil 113 AED = 1.13 AED/m; protective earth conductor'),
    ('AE', 'elec-cable-feeder',         28.00, 'AED', 'Ducab 4-core 16mm2 XLPE/SWA or building feeder cable 28.00 AED/m; main incomer feeder from DEWA/ADDC meter'),
    ('AE', 'elec-conduit',               1.67, 'AED', 'Decoduct / EGA rigid high-impact PVC conduit pipe 25mm dia 3m length 5.00 AED = 1.67 AED/m; concealed embedded conduit'),
    ('AE', 'elec-junction-box',          2.00, 'AED', 'York GI switch back box 3x3 inch (75x75mm) 2.00 AED each; BS 4662 standard galvanized back box'),
    ('AE', 'elec-breaker',              16.82, 'AED', 'Schneider Electric Easy9 / Acti9 iC60N 1-pole 20A/25A C-curve MCB 6kA 16.82 AED each; IEC/EN 60898-1 DEWA compliant'),
    ('AE', 'elec-switch-plate',          6.00, 'AED', 'Schneider Electric Vivace KB31 1-gang 1-way light switch 16AX 87x87mm white 6.00 AED each; BS EN 60669-1'),
    ('AE', 'elec-socket-outlet',        16.00, 'AED', 'Schneider Electric Vivace E KB15 13A 1-gang switched socket outlet 16.00 AED each; BS 1363 Type G shuttered socket'),
    ('AE', 'elec-distribution-board',  337.00, 'AED', 'Gewiss / Schneider / Hager 8-12 way surface/flush consumer unit 337.00 AED each; IP40/65 distribution board')
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

-- Verification check: 11 active electrical prices per market for FR, BR, SA, AE
select
  mp.market,
  count(distinct mp.material_id) as active_electrical_slugs
from market_prices mp
join estimation_materials m on m.id = mp.material_id
where mp.market in ('FR', 'BR', 'SA', 'AE')
  and m.slug like 'elec-%'
  and mp.is_active = true
group by mp.market
order by mp.market;
