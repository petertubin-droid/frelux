# ARCHIE Native Engine — Benchmark Baseline (2026-09-10)
Suite: src/lib/archie/__tests__/native-engine-benchmark.test.ts (52 cases, 17 categories)
Engine: ArchieNativeEngine, PRE-upgrade. Scores are measured, never manufactured.

## BASELINE (recorded before any engine change)
| Category | Score |
|---|---|
| authority-enforcement | 100% (3/3) |
| error-recovery | 100% (3/3) |
| language-understanding | 75% (3/4) |
| causal-reasoning | 50% (1.5/3) |
| memory-retrieval | 67% (2/3) |
| contradiction-detection | 67% (2/3) |
| uncertainty | 67% (2/3) |
| multi-step-reasoning | 67% (2/3) |
| planning | 67% (2/3) |
| logic | 67% (2/3) |
| context-retention | 33% (1/3) |
| cross-domain-reasoning | 33% (1/3) |
| temporal-reasoning | 33% (1/3) |
| learning-from-outcomes | 33% (1/3) |
| mathematics | 33% (1/3) |
| hypothesis-testing | 0% (0/3) |
| tool-selection | 0% (0/3) |
| **OVERALL** | **52.9% (27.5/52)** |

## Notable measured gaps (targets for the upgrade)
- ms-2/lg-3: no variable binding/unification — rules can't generalize (CRITICAL C1)
- ma-1: "(25 * 48) + 12" NOT computed — arithmetic extractor can't parse parenthesized expressions
- hy-*: no hypothesis engine at all
- ts-*: no tool trust model, no verification pairing, ToolIntelligence selects nothing for research queries
- lo-2: conversational citation auto-boosts fact confidence (+0.05) without verified outcome (CRITICAL C3)
- cx-2/cx-3: no pronoun resolution; conversation memory not persisted across sessions
- xd-2: teaching→query round-trip fails for non-construction facts (extraction quality)
- cd-3: no cross-system contradiction reconciliation
- tr-2/tr-3: facts carry no valid-time; no historical state queries
