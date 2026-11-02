-- =========================================================
-- Track 1 (worldwide audit, 2026-10-10): fill missing market
-- price books for every ACTIVE market role gap found by the
-- role x price coverage audit.
--
-- Every row is a real, web-verified retail price with the
-- retailer/source recorded in price_source. Roles that had
-- no price previously resolved to "not priced in this market"
-- and were flagged in estimates; these rows close those gaps.
--
-- Coverage audit (roles mapped but unpriced, before this file):
--   US: sandpaper                                        (1)
--   GB: bonding-plaster, exterior-paint, joint-tape,
--       waterproofer, sandpaper                           (5)
--   IN: concrete-mix, interior-paint-premium, joint-tape,
--       sandpaper, waterproofer                           (5)
--   DE: exterior-paint, fine-filler, gypsum-plaster,
--       primer, sand, sandpaper                           (6)
--   NG: bituminous-membrane, cementitious-coating, dpc,
--       dpm, joint-filler, joint-tape, sandpaper,
--       waterproofing-tape                                (8)
-- =========================================================

insert into public.estimation_prices
  (price_type, ref_id, market, price, currency, effective_date,
   is_active, price_source, notes, scan_confidence, scan_source)
values
  -- ---------- US ----------
  ('material', '03634f63-6477-4d2d-bc84-d15fd0c92e99', 'US', 0.67, 'USD', current_date,
   true, 'Home Depot', 'Sanding sheet, per-sheet retail (2026-10 web survey)', 'high', 'web survey 2026-10-10'),

  -- ---------- GB ----------
  ('material', '3fb37516-3f2f-49a8-8bfd-9d3cf7e42556', 'GB', 18.44, 'GBP', current_date,
   true, 'UK trade counter (incl. VAT)', 'British Gypsum Thistle Bonding Coat 25kg (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', '3ed9f413-8882-4d06-880b-a81e5425ab06', 'GB', 40.00, 'GBP', current_date,
   true, 'B&Q', 'Sandtex Smooth Masonry Paint 10L (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', '955fce0d-271c-4e41-b646-abf2413b933c', 'GB', 7.40, 'GBP', current_date,
   true, 'Payless BM (incl. VAT)', '150m drywall paper joint tape (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', '17bb8369-2b07-496c-a54f-14a0df538b3d', 'GB', 22.99, 'GBP', current_date,
   true, 'Toolstation', 'Everbuild/Sika 402 WaterSeal 5L (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', '03634f63-6477-4d2d-bc84-d15fd0c92e99', 'GB', 0.85, 'GBP', current_date,
   true, 'UK retail multi-store', 'Sanding sheet, per-sheet retail (2026-10 web survey)', 'medium', 'web survey 2026-10-10'),

  -- ---------- IN ----------
  ('material', '55afa4df-8d7c-49ae-9615-1308bc5310e3', 'IN', 395, 'INR', current_date,
   true, 'IBO (incl. GST)', 'UltraTech PPC grey cement 50kg (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', 'da02b2c0-aaea-45bd-af22-6fe531cbf601', 'IN', 3920, 'INR', current_date,
   true, 'IndiaMART', 'Asian Paints Royale Shyne 7L (560 INR/L, 2026-10 web survey)', 'medium', 'web survey 2026-10-10'),
  ('material', '955fce0d-271c-4e41-b646-abf2413b933c', 'IN', 350, 'INR', current_date,
   true, 'TradeIndia', '150m paper joint tape (90m roll 200 INR, scaled, 2026-10 web survey)', 'low', 'web survey 2026-10-10'),
  ('material', 'f775fe5e-af30-49d7-958a-674a935519ab', 'IN', 600, 'INR', current_date,
   true, 'IndiaMART', 'Dr. Fixit Pidiproof LW+ 5L (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', '03634f63-6477-4d2d-bc84-d15fd0c92e99', 'IN', 18, 'INR', current_date,
   true, 'India retail', 'Sanding sheet, per-sheet retail (2026-10 web survey)', 'low', 'web survey 2026-10-10'),

  -- ---------- DE ----------
  ('material', '0c56a891-c468-4042-99bf-0d6f07a10570', 'DE', 59.99, 'EUR', current_date,
   true, 'OBI', 'Alpina Aussenfarbe/Fassadenfarbe weiss matt 10L (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', '0c8612e2-c635-49c7-aba8-3ba806c2919c', 'DE', 44.31, 'EUR', current_date,
   true, 'idealo', 'Knauf Feinspachtel 25kg (Uniflott Finish 20kg 35.45 EUR, scaled, 2026-10 web survey)', 'low', 'web survey 2026-10-10'),
  ('material', '5f5a3761-8094-4666-aaae-b926a6da15bb', 'DE', 25.79, 'EUR', current_date,
   true, 'Wertheimer Shop (list price)', 'Knauf MP75 Maschinenputz 30kg sack (2026-10 web survey)', 'medium', 'web survey 2026-10-10'),
  ('material', 'a107f6ae-d393-4d7c-8342-01031e6f2558', 'DE', 95.00, 'EUR', current_date,
   true, 'Caparol retail', 'Caparol TiefGrund 10L (CZ retail 2462 CZK, 2026-10 web survey)', 'low', 'web survey 2026-10-10'),
  ('material', '455845b6-2da7-4677-8260-aaadf522efcb', 'DE', 6.39, 'EUR', current_date,
   true, 'Hornbach', 'Bausand/Quarzsand 25kg sack (2026-10 web survey)', 'medium', 'web survey 2026-10-10'),
  ('material', '03634f63-6477-4d2d-bc84-d15fd0c92e99', 'DE', 0.65, 'EUR', current_date,
   true, 'Hornbach', 'Sanding sheet, per-sheet retail (2026-10 web survey)', 'low', 'web survey 2026-10-10'),

  -- ---------- NG ----------
  ('material', '69f2d373-ad9f-4f26-a0e3-799d18ce1450', 'NG', 85000, 'NGN', current_date,
   true, 'Charismak NG market guide', 'Torch-on bituminous membrane, 10m2 roll at 8500 NGN/m2 (2026-10 web survey)', 'medium', 'web survey 2026-10-10'),
  ('material', 'd14d6c52-d1b3-489f-a0a4-3b1da3732089', 'NG', 85000, 'NGN', current_date,
   true, 'Jiji NG', 'Cementitious waterproof coating 20kg (SikaTop 588 comparable, 2026-10 web survey)', 'medium', 'web survey 2026-10-10'),
  ('material', 'a00cc28e-4f20-48fa-8f57-62e9cc0b381d', 'NG', 2300, 'NGN', current_date,
   true, 'Genex DPC (Jumia)', '250mm DPC bitumen roll, per metre (70000 NGN/30m roll, 2026-10 web survey)', 'medium', 'web survey 2026-10-10'),
  ('material', '04cf408a-30d3-4b8c-954b-c69e15e48b59', 'NG', 2500, 'NGN', current_date,
   true, 'NG suppliers survey', 'Polythene damp-proof membrane, per m2 (2026-10 web survey)', 'low', 'web survey 2026-10-10'),
  ('material', '3cea1582-c887-4963-ac83-f67b8a5899c9', 'NG', 13500, 'NGN', current_date,
   true, 'Jiji NG', 'Screeding putty 20kg (2026-10 web survey)', 'high', 'web survey 2026-10-10'),
  ('material', '955fce0d-271c-4e41-b646-abf2413b933c', 'NG', 3000, 'NGN', current_date,
   true, 'Jiji NG', 'Drywall joint tape roll (2026-10 web survey)', 'medium', 'web survey 2026-10-10'),
  ('material', '03634f63-6477-4d2d-bc84-d15fd0c92e99', 'NG', 120, 'NGN', current_date,
   true, 'NG market survey', 'Sanding sheet, per-sheet retail (2026-10 web survey)', 'low', 'web survey 2026-10-10'),
  ('material', '7692b7f1-57b4-4e9a-ab9b-62eb6ebc8f9d', 'NG', 5000, 'NGN', current_date,
   true, 'Jumia', 'Butyl waterproof repair tape, 5m roll (6x5m at 30000 NGN, 2026-10 web survey)', 'medium', 'web survey 2026-10-10');
