-- ============================================================
-- FRELUX: Plumbing price book BRAZIL (BR) — 9/9 rows, verified
-- 2026-10-14 from live BR listings, scan_confidence='manual'.
-- System per BR profile: PVC soldável marrom 25mm cold water,
-- CPVC Aquatherm 22mm hot (NBR 15884), esgoto branco 50/100mm
-- (NBR 5648/8160).
--   br-elbow:  Curva 90° soldável 25mm Krona, R$3.00 ea
--               (ferreiracosta.com.br 20-pack R$59.90)
--   br-tee:    Tê soldável 90° 25mm Tigre, R$4.90 (casamaisfacil)
--   br-reducer: Bucha de redução 25x20 Tigre, R$1.00 (hipertintas)
--   br-union:  União soldável 25mm Tigre, R$11.97 (lojadopedrao)
--   br-valve:  Registro esfera VS soldável Tigre 25mm, R$15.10
--               (casafernandes.com.br)
--   br-pipe-cold: Cano marrom soldável 25mm x 6m Tigre,
--               leroymerlin.com.br R$32.90 = R$5.48/m
--   br-pipe-hot: Tubo CPVC Aquatherm 22mm x 3m Tigre,
--               construcasa Bordignon R$42.90 = R$14.30/m
--   br-pipe-waste: Tubo esgoto branco 50mm x 6m Tigre,
--               casamaisfacil R$72.90 = R$12.15/m
--   br-pipe-drainage: Tubo esgoto branco 100mm x 6m Tigre,
--               casamaisfacil R$103.90 = R$17.32/m
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PVC elbow (curva), 25mm soldável (BR)', 'br-elbow', 'pipe', 'Per piece. ferreiracosta.com.br curva 90° soldável PVC marrom 25mm Krona, R$3.00/cada (pacote 20 un R$59.90) — live listing read 2026-10-14. Brazilian cold-water practice uses solvent-weld brown PVC (NBR 5648).', CURRENT_DATE, true, 5),
  ('PVC tee (tê), 25mm soldável (BR)', 'br-tee', 'pipe', 'Per piece. casamaisfacil.com.br tê PVC soldável 90° 25mm marrom Tigre, R$4.90 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PVC reducer (bucha), 25 x 20mm (BR)', 'br-reducer', 'pipe', 'Per piece. hipertintas.com.br bucha de redução soldável curta 25x20mm Tigre, R$1.00 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PVC union (união), 25mm (BR)', 'br-union', 'pipe', 'Per piece. lojadopedrao.com.br união PVC soldável 25mm 3/4" Tigre, R$11.97 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('Ball valve (registro esfera), 25mm (BR)', 'br-valve', 'pipe', 'Per piece. casafernandes.com.br registro esfera compacto VS soldável Tigre 25mm 3/4", R$15.10 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PVC marrom pipe, 25mm x 6m, per metre (BR)', 'br-pipe-cold', 'pipe', 'Per metre. leroymerlin.com.br cano soldável marrom 6m 25mm 3/4" Tigre, R$32.90 = R$5.48/m — live listing read 2026-10-14. Cold-water trunk per NBR 5648.', CURRENT_DATE, true, 5),
  ('CPVC pipe, 22mm x 3m, per metre (BR)', 'br-pipe-hot', 'pipe', 'Per metre. construcasa Bordignon (construcasabordignon.com.br) tubo CPVC Aquatherm 22mm barra 3m Tigre, R$42.90 = R$14.30/m — live listing read 2026-10-14. CPVC hot-water line per NBR 15884.', CURRENT_DATE, true, 5),
  ('PVC esgoto pipe, 50mm x 6m, per metre (BR)', 'br-pipe-waste', 'pipe', 'Per metre. casamaisfacil.com.br tubo PVC esgoto 50mm 6 metros branco Tigre, R$72.90 = R$12.15/m — live listing read 2026-10-14. DN 50 waste line per NBR 8160.', CURRENT_DATE, true, 5),
  ('PVC esgoto pipe, 100mm x 6m, per metre (BR)', 'br-pipe-drainage', 'pipe', 'Per metre. casamaisfacil.com.br tubo PVC esgoto 100mm 6 metros branco Tigre, R$103.90 = R$17.32/m — live listing read 2026-10-14. DN 100 soil drop/riser per NBR 8160.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('BR', 'br-elbow',            3.00, 'BRL', 'ferreiracosta.com.br curva 90° soldável 25mm Krona R$3.00/cada (20-pack R$59.90), live listing read 2026-10-14'),
    ('BR', 'br-tee',              4.90, 'BRL', 'casamaisfacil.com.br tê soldável 90° 25mm Tigre R$4.90, live listing read 2026-10-14'),
    ('BR', 'br-reducer',          1.00, 'BRL', 'hipertintas.com.br bucha de redução soldável curta 25x20 Tigre R$1.00, live listing read 2026-10-14'),
    ('BR', 'br-union',           11.97, 'BRL', 'lojadopedrao.com.br união PVC soldável 25mm Tigre R$11.97, live listing read 2026-10-14'),
    ('BR', 'br-valve',           15.10, 'BRL', 'casafernandes.com.br registro esfera VS soldável Tigre 25mm R$15.10, live listing read 2026-10-14'),
    ('BR', 'br-pipe-cold',        5.48, 'BRL', 'leroymerlin.com.br cano marrom soldável 25mm x 6m Tigre R$32.90 = R$5.48/m, live listing read 2026-10-14'),
    ('BR', 'br-pipe-hot',        14.30, 'BRL', 'construcasabordignon.com.br tubo CPVC Aquatherm 22mm x 3m Tigre R$42.90 = R$14.30/m, live listing read 2026-10-14'),
    ('BR', 'br-pipe-waste',       12.15, 'BRL', 'casamaisfacil.com.br tubo esgoto branco 50mm x 6m Tigre R$72.90 = R$12.15/m, live listing read 2026-10-14'),
    ('BR', 'br-pipe-drainage',    17.32, 'BRL', 'casamaisfacil.com.br tubo esgoto branco 100mm x 6m Tigre R$103.90 = R$17.32/m, live listing read 2026-10-14')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug
)
, deactivated AS (
  UPDATE estimation_prices p SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material' AND p.ref_id = s.material_id AND p.market = s.market AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', s.market
FROM seeded s
ON CONFLICT DO NOTHING;

SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE 'br-pipe-%' OR m.slug IN ('br-elbow','br-tee','br-reducer','br-union','br-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
