-- ============================================================
-- FRELUX: Doors & Windows price book for Brazil (BR)
--
-- Verified 2026-10-14 from live Leroy Merlin Brasil listings (BRL).
-- All rows scan_confidence='manual'.
--
-- BR (BRL, live listings 2026-10-14, Leroy Merlin Brasil):
--   door-flush:   R$ 330.26 (Folha de Porta Lisa 210x80 com reforço interno, LM Brasil Portas para Quarto Lisa category)
--   door-panel:   R$ 552.72 (Porta de Madeira Frisada 2,10 x 0,72, LM Brasil Portas de Madeira Quarto category)
--   door-frame:   R$ 189.90 (Batente de Madeira MDF Naval 215x14x2,7cm Artens, LM Brasil Batentes category)
--   door-hinge:   R$  16.30 (Dobradiça para Porta 3.1/2" latonada 3 peças Vonder R$ 48.90 = R$ 16.30 each, product 1566879071)
--   door-lockset: R$ 195.90 (Fechadura Pado para Porta Interna acetinado, LM Brasil Fechaduras category)
--
-- Unpriced per zero-fabrication rule:
--   door-security (Brazilian portas de entrada/macicas are high-variability premium items, R$ 2,700+)
--   window-aluminium, window-louver (custom-fabricated per opening)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('BR', 'door-flush',   330.26, 'BRL', 'Leroy Merlin Brasil Folha de Porta Lisa 210x80 com reforco interno R$ 330.26, live listing 2026-10-14'),
    ('BR', 'door-panel',   552.72, 'BRL', 'Leroy Merlin Brasil Porta de Madeira Frisada 2,10 x 0,72 R$ 552.72, live listing 2026-10-14'),
    ('BR', 'door-frame',   189.90, 'BRL', 'Leroy Merlin Brasil Batente de Madeira MDF Naval 215x14x2,7cm Artens R$ 189.90, live listing 2026-10-14'),
    ('BR', 'door-hinge',    16.30, 'BRL', 'Leroy Merlin Brasil Dobradica para Porta 3.1/2 latonada 3 pecas Vonder R$ 48.90 = R$ 16.30 each, product 1566879071, live 2026-10-14'),
    ('BR', 'door-lockset', 195.90, 'BRL', 'Leroy Merlin Brasil Fechadura Pado para Porta Interna acetinado R$ 195.90, live listing 2026-10-14')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug AND m.is_active = true
)
, deactivated AS (
  UPDATE estimation_prices p
  SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material'
    AND p.ref_id = s.material_id
    AND p.market = s.market
    AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', s.market
FROM seeded s
ON CONFLICT DO NOTHING;
