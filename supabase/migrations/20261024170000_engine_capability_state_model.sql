-- =========================================================
-- ENGINE CAPABILITY OPERATIONAL STATE MODEL (2026-10-24)
--
-- Roadmap Phase 0 item 1: the capability registry grows the full
-- operational state model — unavailable / partial / configured /
-- verified_operational / suspended — plus evidence owner and
-- release-blocking gaps per pair.
--
-- Additive by design (roadmap item 3): engine_capability_verified
-- is preserved untouched; its rows are the EXPLICIT backfill
-- source for verified_operational, not repurposed. New pairs
-- default to `configured` (engine resolves market-first; local
-- price entry required for book gaps) and can only reach
-- verified_operational through an explicit UPDATE with evidence.
--
-- State semantics:
--   unavailable        engine cannot run in this market at all
--   partial            engine runs for a subset of its scope
--   configured         market config resolves; not yet operationally verified
--   verified_operational market-first resolution regression-verified
--   suspended          previously verified, temporarily withdrawn
-- =========================================================

CREATE TABLE IF NOT EXISTS engine_capability_state (
  engine_id text NOT NULL,
  market_code text NOT NULL,
  state text NOT NULL DEFAULT 'configured',
  evidence_owner text NOT NULL DEFAULT 'FRELUX Operations',
  blocking_gaps text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_verification timestamptz,
  state_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engine_capability_state_pkey PRIMARY KEY (engine_id, market_code),
  CONSTRAINT engine_capability_state_engine_fk
    FOREIGN KEY (engine_id) REFERENCES engine_capabilities (engine_id),
  CONSTRAINT engine_capability_state_state_check
    CHECK (state IN (
      'unavailable', 'partial', 'configured',
      'verified_operational', 'suspended'
    ))
);

-- Explicit backfill from the verified pairs (owner-directed 2026-10-24
-- full-market activation): every verified pair is verified_operational.
INSERT INTO engine_capability_state
  (engine_id, market_code, state, evidence_owner, last_verification, state_note)
SELECT
  v.engine_id,
  v.market_code,
  'verified_operational',
  'Owner directive (2026-10-24): all 32 approved markets verified for all 54 engines',
  v.verified_at,
  'Backfilled from engine_capability_verified; market-first resolution with no-substitution local price entry (regression-guarded).'
FROM engine_capability_verified v
ON CONFLICT (engine_id, market_code) DO NOTHING;

-- Pairs in the registry but not in the verified table stay `configured`:
-- an operational row must exist for every engine x approved market so
-- the state model is total. These mark clearly what is NOT verified.
INSERT INTO engine_capability_state
  (engine_id, market_code, state, evidence_owner, state_note)
SELECT
  e.engine_id,
  m.market_code,
  'configured',
  'FRELUX Operations',
  'Registered pair without verified status; market-first resolution applies with explicit local price entry for book gaps.'
FROM engine_capabilities e
CROSS JOIN (
  SELECT DISTINCT market_code FROM engine_capability_state
) m
ON CONFLICT (engine_id, market_code) DO NOTHING;

-- Release gate: an operational row may only claim verified_operational
-- while its pair also holds a verified row (fail closed on stale claims).
CREATE OR REPLACE FUNCTION engine_capability_state_gate()
RETURNS trigger AS $$
BEGIN
  IF NEW.state = 'verified_operational' THEN
    IF NOT EXISTS (
      SELECT 1 FROM engine_capability_verified v
      WHERE v.engine_id = NEW.engine_id AND v.market_code = NEW.market_code
    ) THEN
      RAISE EXCEPTION
        'verified_operational requires a verified pair (% / %)',
        NEW.engine_id, NEW.market_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engine_capability_state_gate_trg
BEFORE INSERT OR UPDATE OF state ON engine_capability_state
FOR EACH ROW EXECUTE FUNCTION engine_capability_state_gate();
