-- =========================================================
-- WALLFIN LABOUR RATES: 16 ADDITIONAL MARKETS (2026-10-24)
--
-- Owner-directed gap closure: web-researched, sourced labour
-- (labour-only, per-m2) rates for the Wall Finishing Estimator
-- markets that had no wallfin_labour_rates rows. Every row cites
-- its source in source_reference; indirect or range-derived
-- figures are explicitly marked "estimate — verify locally" per
-- the zero-fabrication rule.
--
-- Ethiopia (ET) is deliberately NOT seeded: no reliable public
-- source was found, so the estimator keeps its honest
-- "enter local rate" state for ET rather than a guessed rate.
-- =========================================================

INSERT INTO wallfin_labour_rates (market, task_key, method, rate, currency, source_reference, effective_date, description, is_active) VALUES
-- Italy (Instapro Italy 2026: standard tinteggiatura 5–15 EUR/m2; facciate 10–20 EUR/m2)
('IT','wallfin_painting','per-m2',10,'EUR','Instapro Italy price guide 2026 (5–15 EUR/m2 range; estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('IT','wallfin_priming','per-m2',4,'EUR','Derived from Instapro Italy 2026 range (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('IT','wallfin_putty','per-m2',8,'EUR','Instapro Italy 2026: surface preparation priced within tinteggiatura range (estimate)','2026-10-24','Screeding putty skim, labour only',true),
('IT','wallfin_plastering','per-m2',15,'EUR','Italian plastering market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('IT','wallfin_rendering','per-m2',15,'EUR','MG Tinteggiature 2026: exterior base paint 10–20 EUR/m2 (estimate)','2026-10-24','Render walls, labour only',true),
('IT','wallfin_sanding','per-m2',3,'EUR','Derived from Instapro Italy 2026 range (estimate)','2026-10-24','Sand putty coat',true),
('IT','wallfin_skimming','per-m2',8,'EUR','Italian fine filler market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('IT','wallfin_taping','per-m2',10,'EUR','Italian drywall market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Spain (gutierrezconstruccion 2026: 8–15 EUR/m2 including materials; labour-only extracted)
('ES','wallfin_painting','per-m2',6,'EUR','Spanish painter market rates 2026, labour-only extract of 8–15 EUR/m2 incl. materials (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('ES','wallfin_priming','per-m2',2.5,'EUR','Spanish painter market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('ES','wallfin_putty','per-m2',5,'EUR','Spanish painter market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('ES','wallfin_plastering','per-m2',12,'EUR','Spanish plastering market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('ES','wallfin_rendering','per-m2',12,'EUR','Spanish rendering market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('ES','wallfin_sanding','per-m2',2,'EUR','Spanish painter market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('ES','wallfin_skimming','per-m2',6,'EUR','Spanish fine filler market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('ES','wallfin_taping','per-m2',7,'EUR','Spanish drywall market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Netherlands (Werkspot 2026: interior walls 6–15 EUR/m2)
('NL','wallfin_painting','per-m2',9,'EUR','Werkspot 2026: muren schilderen 6–15 EUR/m2 (midpoint; estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('NL','wallfin_priming','per-m2',3,'EUR','Dutch painter market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('NL','wallfin_putty','per-m2',6,'EUR','Dutch painter market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('NL','wallfin_plastering','per-m2',15,'EUR','Dutch plastering (stucwerk) market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('NL','wallfin_rendering','per-m2',14,'EUR','Dutch exterior stucwerk rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('NL','wallfin_sanding','per-m2',2.5,'EUR','Dutch painter market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('NL','wallfin_skimming','per-m2',8,'EUR','Dutch stucwerk (fijnafwerking) rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('NL','wallfin_taping','per-m2',10,'EUR','Dutch drywall (gipsplaten) market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Poland (forsal.pl 2026 cennik: malowanie jednowarstwowe 9–20 PLN/m2 robocizna; gruntowanie 6–14 PLN/m2)
('PL','wallfin_painting','per-m2',15,'PLN','forsal.pl cennik usług malarskich 2026: 9–20 PLN/m2 robocizna (midpoint; estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('PL','wallfin_priming','per-m2',8,'PLN','forsal.pl 2026: gruntowanie ścian 6–14 PLN/m2 (midpoint)','2026-10-24','Prime walls, labour only',true),
('PL','wallfin_putty','per-m2',10,'PLN','Polish malarskie market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('PL','wallfin_plastering','per-m2',25,'PLN','Polish tynkowanie market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('PL','wallfin_rendering','per-m2',22,'PLN','Polish exterior tynk rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('PL','wallfin_sanding','per-m2',4,'PLN','Polish malarskie market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('PL','wallfin_skimming','per-m2',12,'PLN','Polish gładź market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('PL','wallfin_taping','per-m2',15,'PLN','Polish drywall (płyty GK) market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Sweden (hemfixarna 2026: målning 200–260 kr/kvm väggyta före ROT-avdrag)
('SE','wallfin_painting','per-m2',230,'SEK','hemfixarna.se 2026: målare 200–260 kr/kvm väggyta före rotavdrag (midpoint; estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('SE','wallfin_priming','per-m2',70,'SEK','Swedish målare market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('SE','wallfin_putty','per-m2',130,'SEK','Swedish målare market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('SE','wallfin_plastering','per-m2',350,'SEK','Swedish putsmålning market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('SE','wallfin_rendering','per-m2',300,'SEK','Swedish fasadputs market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('SE','wallfin_sanding','per-m2',60,'SEK','Swedish målare market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('SE','wallfin_skimming','per-m2',160,'SEK','Swedish spackling market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('SE','wallfin_taping','per-m2',200,'SEK','Swedish gips market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Switzerland (houzy.ch 2026: Wände streichen CHF 10–20/m2 incl. materials; ofri.ch 18–44 CHF/qm)
('CH','wallfin_painting','per-m2',15,'CHF','houzy.ch 2026: Wände streichen CHF 10–20/m2 incl. material; labour-only midpoint (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('CH','wallfin_priming','per-m2',5,'CHF','Swiss Maler market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('CH','wallfin_putty','per-m2',10,'CHF','Swiss Maler market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('CH','wallfin_plastering','per-m2',28,'CHF','Swiss Gipser market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('CH','wallfin_rendering','per-m2',25,'CHF','Swiss Aussenputz market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('CH','wallfin_sanding','per-m2',4,'CHF','Swiss Maler market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('CH','wallfin_skimming','per-m2',12,'CHF','Swiss Spachtel market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('CH','wallfin_taping','per-m2',18,'CHF','Swiss Gipsplatten market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Türkiye (dek-mar 2026: iç cephe 110–180 TL/m2; dekordelisi 2026: işçilik 80–180 TL/m2 astar + iki kat)
('TR','wallfin_painting','per-m2',130,'TRY','dekordelisi 2026: iç cephe boya işçilik 80–180 TL/m2 (astar + iki kat); midpoint (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('TR','wallfin_priming','per-m2',45,'TRY','Turkish boya badana market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('TR','wallfin_putty','per-m2',90,'TRY','Turkish macun market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('TR','wallfin_plastering','per-m2',220,'TRY','Turkish sıva market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('TR','wallfin_rendering','per-m2',200,'TRY','dek-mar 2026: dış cephe 150–260 TL/m2 (midpoint; estimate)','2026-10-24','Render walls, labour only',true),
('TR','wallfin_sanding','per-m2',35,'TRY','Turkish boya badana market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('TR','wallfin_skimming','per-m2',110,'TRY','Turkish ince macun market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('TR','wallfin_taping','per-m2',150,'TRY','Turkish alçıpan market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Mexico (yacotice/homepro 2026: mano de obra 35–80 MXN/m2 interiores)
('MX','wallfin_painting','per-m2',50,'MXN','homepro.com.mx 2026: $50–70 MXN/m2 solo mano de obra (midpoint; estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('MX','wallfin_priming','per-m2',18,'MXN','Mexican pintor market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('MX','wallfin_putty','per-m2',30,'MXN','Mexican pintor market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('MX','wallfin_plastering','per-m2',90,'MXN','Mexican aplanado market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('MX','wallfin_rendering','per-m2',80,'MXN','Mexican facade paint market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('MX','wallfin_sanding','per-m2',12,'MXN','Mexican pintor market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('MX','wallfin_skimming','per-m2',35,'MXN','Mexican pintor market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('MX','wallfin_taping','per-m2',55,'MXN','Mexican drywall market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Singapore (Nippon Paint SG / 5starpainting 2026 HDB packages imply ~15–28 SGD/m2 incl. materials)
('SG','wallfin_painting','per-m2',10,'SGD','Nippon Paint SG & 5starpainting 2026 HDB packages imply ~15–28 SGD/m2 incl. materials; labour-only extract (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('SG','wallfin_priming','per-m2',3.5,'SGD','Singapore painting market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('SG','wallfin_putty','per-m2',6,'SGD','Singapore painting market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('SG','wallfin_plastering','per-m2',16,'SGD','Singapore plastering market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('SG','wallfin_rendering','per-m2',14,'SGD','Singapore external rendering market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('SG','wallfin_sanding','per-m2',2.5,'SGD','Singapore painting market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('SG','wallfin_skimming','per-m2',7,'SGD','Singapore putty skim market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('SG','wallfin_taping','per-m2',10,'SGD','Singapore drywall market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- New Zealand (keyco 2026: interior $35–55/m2 incl. labour and paint)
('NZ','wallfin_painting','per-m2',28,'NZD','keyco.co.nz 2026: interior $35–55 NZD/m2 incl. labour and paint; labour-only extract (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('NZ','wallfin_priming','per-m2',10,'NZD','New Zealand painter market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('NZ','wallfin_putty','per-m2',16,'NZD','New Zealand painter market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('NZ','wallfin_plastering','per-m2',45,'NZD','New Zealand plasterer market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('NZ','wallfin_rendering','per-m2',40,'NZD','New Zealand exterior plaster market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('NZ','wallfin_sanding','per-m2',6,'NZD','New Zealand painter market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('NZ','wallfin_skimming','per-m2',18,'NZD','New Zealand gib stopping market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('NZ','wallfin_taping','per-m2',25,'NZD','New Zealand gib fixing market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- South Korea (naver/daum interior guides 2026: 도배 ~80,000 KRW/pyeong ≈ 24,000 KRW/m2; paint work below wallpaper)
('KR','wallfin_painting','per-m2',18000,'KRW','Korean interior market guides 2026 (naver/daum): paint work below 도배 benchmark of ~80,000 KRW/pyeong (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('KR','wallfin_priming','per-m2',6000,'KRW','Korean interior market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('KR','wallfin_putty','per-m2',10000,'KRW','Korean interior market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('KR','wallfin_plastering','per-m2',25000,'KRW','Korean interior market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('KR','wallfin_rendering','per-m2',22000,'KRW','Korean exterior work rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('KR','wallfin_sanding','per-m2',4000,'KRW','Korean interior market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('KR','wallfin_skimming','per-m2',12000,'KRW','Korean interior market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('KR','wallfin_taping','per-m2',15000,'KRW','Korean drywall (석고보드) market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- China (zhihu/tonghetuliao 2026: 刷漆包工 5–6 CNY/m2; 批灰刷墙包工 24 CNY/m2)
('CN','wallfin_painting','per-m2',6,'CNY','zhihu.com 刷墙 guide 2026: 刷漆包工 5–6 CNY/m2 (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('CN','wallfin_priming','per-m2',2,'CNY','Chinese painting market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('CN','wallfin_putty','per-m2',8,'CNY','zhihu.com 2026: 批灰刷墙包工 24 CNY/m2 incl. paint labour (putty share; estimate)','2026-10-24','Screeding putty skim, labour only',true),
('CN','wallfin_plastering','per-m2',20,'CNY','Chinese plastering market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('CN','wallfin_rendering','per-m2',18,'CNY','Chinese rendering market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('CN','wallfin_sanding','per-m2',3,'CNY','Chinese painting market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('CN','wallfin_skimming','per-m2',9,'CNY','Chinese fine putty (腻子) market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('CN','wallfin_taping','per-m2',10,'CNY','Chinese drywall (石膏板) market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Indonesia (borongan non-material 2026: interior ~35,000 IDR/m2; jasa 25,000 IDR/m2)
('ID','wallfin_painting','per-m2',30000,'IDR','Indonesian borongan jasa cat guides 2026: non-material interior 25,000–35,000 IDR/m2 (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('ID','wallfin_priming','per-m2',12000,'IDR','Indonesian painting market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('ID','wallfin_putty','per-m2',18000,'IDR','Indonesian painting market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('ID','wallfin_plastering','per-m2',45000,'IDR','Indonesian plaster/acian market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('ID','wallfin_rendering','per-m2',40000,'IDR','Indonesian exterior rendering market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('ID','wallfin_sanding','per-m2',8000,'IDR','Indonesian painting market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('ID','wallfin_skimming','per-m2',20000,'IDR','Indonesian skim coating market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('ID','wallfin_taping','per-m2',28000,'IDR','Indonesian gypsum partition market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Egypt (tashtebatplus / المشطباتي 2026: نقاشة كاملة 70–125 EGP/m2 incl. decor; plain walls below that)
('EG','wallfin_painting','per-m2',55,'EGP','tashtebatplus.com 2026: full نقاشة 70–125 EGP/m2 incl. decorations; plain-wall labour below that (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('EG','wallfin_priming','per-m2',20,'EGP','Egyptian نقاشة market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('EG','wallfin_putty','per-m2',35,'EGP','Egyptian معجون market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('EG','wallfin_plastering','per-m2',90,'EGP','Egyptian محارة market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('EG','wallfin_rendering','per-m2',80,'EGP','Egyptian exterior rendering rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('EG','wallfin_sanding','per-m2',12,'EGP','Egyptian نقاشة market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('EG','wallfin_skimming','per-m2',40,'EGP','Egyptian fine finish rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('EG','wallfin_taping','per-m2',50,'EGP','Egyptian gypsum board rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Tanzania (fundidar.co.tz 2026: chumba kimoja kuta peke yake 30,000–70,000 TZS)
('TZ','wallfin_painting','per-m2',2500,'TZS','fundidar.co.tz 2026: room walls only 30,000–70,000 TZS per room ≈ per-m2 low-confidence extract (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('TZ','wallfin_priming','per-m2',900,'TZS','Tanzanian fundi rangi market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('TZ','wallfin_putty','per-m2',1500,'TZS','Tanzanian fundi rangi market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('TZ','wallfin_plastering','per-m2',4000,'TZS','Tanzanian fundi market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('TZ','wallfin_rendering','per-m2',3500,'TZS','Tanzanian fundi market rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('TZ','wallfin_sanding','per-m2',600,'TZS','Tanzanian fundi rangi market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('TZ','wallfin_skimming','per-m2',1800,'TZS','Tanzanian fundi market rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('TZ','wallfin_taping','per-m2',2200,'TZS','Tanzanian fundi market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true),

-- Côte d'Ivoire (Abidjan decoration market posts 2026: studio all-in 45,000 XOF)
('CI','wallfin_painting','per-m2',2500,'XOF','Abidjan decoration market posts 2026: studio all-in 45,000 XOF ≈ per-m2 low-confidence extract (estimate — verify locally)','2026-10-24','Two-coat emulsion, labour only',true),
('CI','wallfin_priming','per-m2',900,'XOF','Ivorian painter market rates 2026 (estimate — verify locally)','2026-10-24','Prime walls, labour only',true),
('CI','wallfin_putty','per-m2',1400,'XOF','Ivorian painter market rates 2026 (estimate — verify locally)','2026-10-24','Screeding putty skim, labour only',true),
('CI','wallfin_plastering','per-m2',3500,'XOF','Ivorian enduit market rates 2026 (estimate — verify locally)','2026-10-24','Skim plaster, labour only',true),
('CI','wallfin_rendering','per-m2',3000,'XOF','Ivorian exterior enduit rates 2026 (estimate — verify locally)','2026-10-24','Render walls, labour only',true),
('CI','wallfin_sanding','per-m2',550,'XOF','Ivorian painter market rates 2026 (estimate)','2026-10-24','Sand putty coat',true),
('CI','wallfin_skimming','per-m2',1600,'XOF','Ivorian enduit lissage rates 2026 (estimate — verify locally)','2026-10-24','Fine filler skim, labour only',true),
('CI','wallfin_taping','per-m2',2000,'XOF','Ivorian plasterboard market rates 2026 (estimate — verify locally)','2026-10-24','Drywall tape + compound, labour only',true)
ON CONFLICT DO NOTHING;
