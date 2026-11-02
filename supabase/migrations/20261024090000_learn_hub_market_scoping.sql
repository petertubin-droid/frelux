-- Learn Hub market globalization (step 1: scoping).
--
-- The existing 100-article corpus is the Nigerian library (painting,
-- screeding, tiling, POP, tyrolene, stucco, mineral stone). Before
-- market-specific articles are written for the other 31 website
-- markets, the hub itself must be market-aware so a US visitor is
-- never served the Nigerian library.
--
-- Semantics:
--   market = 'NG' | '<ISO 3166-1 alpha-2>' | 'GLOBAL'
--   - A 2-letter code scopes the article to that single market.
--   - 'GLOBAL' is visible in every market (worldwide articles).
--   - Every existing row backfills to 'NG' (the whole current
--     corpus is Nigeria-scoped).
--
-- Public RLS stays read-everything: market scoping is a curation
-- concern, not a security boundary. Individual article pages remain
-- reachable by URL for SEO and shared links; the HUB, LIBRARY,
-- CATEGORY and SEARCH listings apply the market filter client-side.
--
-- Idempotent: safe to re-run.

ALTER TABLE learn_articles
  ADD COLUMN IF NOT EXISTS market TEXT NOT NULL DEFAULT 'NG';

-- Backfill any row created before the column existed (defensive;
-- ADD COLUMN ... DEFAULT already fills existing rows).
UPDATE learn_articles SET market = 'NG'
WHERE market IS NULL OR market = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'learn_articles_market_format'
  ) THEN
    ALTER TABLE learn_articles
      ADD CONSTRAINT learn_articles_market_format
      CHECK (market = 'GLOBAL' OR market ~ '^[A-Z]{2}$');
  END IF;
END $$;

-- Hub queries filter by (market IN (visitor, GLOBAL)) AND status.
CREATE INDEX IF NOT EXISTS idx_learn_articles_market_status
  ON learn_articles (market, status, published_at DESC);
