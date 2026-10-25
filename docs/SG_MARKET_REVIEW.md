# Singapore (SG) Market Matrix Integration Review

Status: review complete, go/no-go decision pending (Chibuike).
Date: 2026-10-25. Evidence gathered from the repo (post `f300df76`, plus Phase 3 slices through `778c93eb`) and the live production database (freluxproject).

## Where SG stands today

### Already present (verified)

- **Native standards profiles**: electrical (SS 638, EMA) and plumbing (SS 675, PUB), added in `f300df76` with a dedicated verification suite (`global-markets-expansion.test.ts`). SG is one of that suite's 10 priority markets.
- **Estimation engines from `f300df76`**: drywall, masonry and plastering have market configurations verified across the priority markets, and the foundation engine gained multi-market cement bag sizing (SG was not given a bag size there; default 50 kg fallback applies).
- **Live price book**: `estimation_prices` (production) holds 8 SG rows priced in SGD. The bundled price books carry 7 SG rows (ceiling boards, plaster products, SGD). Sparse but real; no Nigerian-baseline fallback is involved.
- **Country selection**: `countries.ts` lists SG/Singapore/SGD, so the country picker and currency formatting already support it.
- **Inventory gate**: after the slice 3 reconciliation, profile gates accept fully native extras beyond the 20 inventory markets; extras must carry an explicit `standardsRef`, which SG does.

### Missing (all fail closed today)

1. **Not in `ALL_20_MARKETS`.** The market matrix is engine-by-market: every one of the 54 inventory engines must carry a `marketMatrix.SG` entry with a valid support status and non-empty notes before SG can join. Today there are zero `SG:` matrix entries. This is the structural gate, and it is honest: most engines have not been assessed for SG.
2. **No construction typology.** `CONSTRUCTION_TYPOLOGIES` covers exactly the 20 inventory markets; SG has no typology entry.
3. **No tax fixture.** `src/lib/tax/fixtures/markets/` holds the 20 validated markets; SG (GST) is not among them. SG quotes will correctly return `tax_not_determined` until a fixture is researched from authoritative sources and signed off by an accountable reviewer, per the Phase 1 process.
4. **No verified work calendar.** `work_calendars` holds only NG 2026. Timeline scheduling for an SG site stays a labeled planning estimate (fail-closed, correct behavior).
5. **No compliance-standards entry.** `ComplianceStandards` iterates `ALL_20_MARKETS`; SG would appear there automatically the moment it joins, so its standards content must exist first.

## What adding SG to the matrix requires

Per the rollout policy (one market at a time, no market activated from generic locale profiles, explicit unverified labels until verified):

1. **Engine matrix audit (largest item).** For each of the 54 engines, record an honest SG support status. Realistic statuses: `verified` only where a native profile or configuration exists (electrical, plumbing, drywall, masonry, plastering, foundation sizing); `requires_local_inputs` for price-dependent estimators that have SGD rows; `requires_verification` elsewhere. No blanket `verified`.
2. **Typology entry**: Singapore residential/structural typology from primary sources.
3. **Tax fixture**: GST research (IRAS), fixture, deterministic engine tests, accountable reviewer sign-off. Until then `tax_not_determined` remains the displayed state.
4. **Work calendar**: Singapore 2027 (or remaining 2026) public holidays from an authoritative source, seeded like NG 2026 with completeness and tentative flags.
5. **Price book expansion**: the current 8 rows are thin; estimators without verified SG prices must continue requiring manual entry per the manual-entry policy.
6. **UI consequences**: SG automatically appears in BoqGenerator, ComplianceStandards, AdminEngineMatrix and SupplierPortal market lists the moment it joins `ALL_20_MARKETS`; those pages' SG content must be ready and honestly labeled.
7. **Gate**: per Phase 5, engines stay behind explicit support statuses; nothing activates market-wide from profile existence alone.

## Recommendation

SG is a legitimate expansion candidate with real foundations (native standards profiles, a live SGD price book, one of the 10 priority markets in the current expansion work). But joining the matrix is a deliberate expansion slice of its own, not a side effect of the profile additions. The suggested order: tax fixture first (highest risk, longest lead time due to sign-off), then work calendar and typology, then the 54-engine matrix audit, and only then the one-line `ALL_20_MARKETS` addition.

The go/no-go and pilot sequencing belong to the owner. Nothing in the codebase currently claims SG support in the matrix, and all SG-facing behavior fails closed in the meantime, so there is no integrity exposure in leaving the decision open.
