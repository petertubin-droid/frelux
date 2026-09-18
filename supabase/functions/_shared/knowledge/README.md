# ARCHIE Knowledge Repository (Phase 5)

Server-side-only, centralized abstraction over the ARCHIE knowledge
subsystem (Project B, the "Frelukx" Supabase project). Every knowledge
operation — lexicon, semantic graph, provenance/evidence, ingestion,
graph health — goes through this module. ARCHIE application code must
never talk to Project B directly.

**This module must NEVER be imported from `src/`** (the Netlify browser
bundle). It lives under `supabase/functions/`, which the Netlify build
excludes entirely (verified: `netlify.toml` SECRETS_SCAN_OMIT_PATHS
covers `supabase/functions`; no VITE_* variable carries these values).

## Files

| File                    | Purpose                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `config.ts`             | Env/secrets loading + validation. Fails safe with typed errors; never throws key material.  |
| `tables.ts`             | The ONLY place knowledge table names + RPCs are declared.                                   |
| `projection.ts`         | Canonical row-shape contract + the Phase 4B seam (see below).                               |
| `repository.ts`         | The facade: client construction + every knowledge operation + gated ingestion.              |
| `repository.test.ts`    | Offline unit tests (15) — config fail-safety, write gating, delegation. CI-safe.            |
| `live.test.ts`          | Live Project B verification (13 owner-required tests). Skips unless credentials are in env. |
| `vitest.live.config.ts` | Dedicated config for the live suite (no mocks; real supabase-js + network).                 |

## Configuration (Edge Function secrets on PROJECT A)

Set via Dashboard (A → Edge Functions → Secrets) or
`supabase secrets set --project-ref hqhvlkunkdrxyuvziorm …`
(see `migration-prep/phase2-secrets-procedure.md`):

```
KNOWLEDGE_DB_URL=https://pjvtqkshewerpvggtgqx.supabase.co
KNOWLEDGE_SERVICE_ROLE_KEY=<Frelukx service-role secret — never in code/logs>
KNOWLEDGE_WRITES_ENABLED=false   # optional; default disabled (write freeze)
```

Project A's own `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
(platform-injected) are untouched and separate.

## Operations (repository interface)

- `lexicon.` lookup / lookupMany / contextualSenses / synonyms / antonyms /
  senseRelations / relatedWords / latestSourceLabel / sources
- `graph.` concept / conceptsForWord / contextualConcepts / neighbors /
  report / hierarchy / paths / compare / groundTruth
- `provenance.` forEdge / forNode / lexiconImports / graphImports
- `health()` — archie_graph_health RPC
- `ingestion.` (GATED by `KNOWLEDGE_WRITES_ENABLED`, default DISABLED):
  upsertSources / insertWords / insertSenses / insertSynsetRelations /
  insertSenseRelations / recordLexiconImport / recordGraphImport /
  rebuildSemanticGraph (archie_build_semantic_graph RPC)

The repository binds the EXISTING deterministic retrieval layers
(`_shared/lexicon/retrieval.ts`, `_shared/semantic-graph/retrieval.ts` —
unchanged) to a Project B client; it adds no retrieval logic of its own.

## Phase 4B forward compatibility

`projection.ts` documents the single internal seam: when the
provenance/evidence normalization lands (draft:
`migration-prep/phase4b-normalization-draft.sql`), the edge column
select and row projection change INSIDE this module
(embed reference tables, map back to canonical text shape). No
application, engine, retrieval, or fixture code changes.

## Running the tests

```bash
# offline (CI): config, gating, delegation — no network
npx vitest run --project edge-functions supabase/functions/_shared/knowledge/

# live (operator only; needs KNOWLEDGE_* env set, hits Project B read-only)
npx vitest run --config supabase/functions/_shared/knowledge/vitest.live.config.ts
```

## Security notes

- The service-role key is fetched from env at call time, held in memory
  only, never logged (`config.ts` errors carry no key material;
  `repository.ts` logs only the URL origin).
- `knowledgeOrigin()` is the only URL-safe logging surface.
- Browser clients have no route: B grants only `service_role` (and the
  admin policy); zero `anon`/`authenticated` grants exist on the nine
  knowledge tables (verified 2026-09-17 on both projects).
- The live suite's Node-20 WebSocket polyfill (`ws`) is test-only;
  the Deno edge runtime ships native WebSocket.
