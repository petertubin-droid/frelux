# FRELUX AI Multilingual Construction Dictionary: API

The construction dictionary is an independent module
(`src/lib/construction-dictionary/`) usable by the FRELUX
website, FRELUX AI, the mobile app, the FRELUX API and future
voice products. It never modifies the calculator engines:
the language layer converts requests into structured intent and
protects measurements verbatim around the deterministic math.

## Endpoints

The module functions form the internal API. The admin and
server surfaces bind them like this:

| Spec endpoint | Module function | Access |
| --- | --- | --- |
| GET /api/terms | `listDictionaryTerms(filter)` | authenticated |
| GET /api/terms/:id | `getDictionaryTerm(id)` | authenticated |
| GET /api/translate | `presentTerm(term, language)` | authenticated |
| POST /api/terms | `createDictionaryTerm(draft)` | admin (RLS) |
| POST /api/terms/verify | `verifyDictionaryTerm({term_id, action, verified_by})` | admin (RLS) |
| GET /api/terms/search | `searchTerms(query, terms, filters)` | authenticated |

`POST /api/terms` always creates records UNVERIFIED with
version 1. Verification is a deliberate human action
(`POST /api/terms/verify` with approve/reject) and every change
writes an audit row to `construction_term_versions` with the
pre-change snapshot, so terminology changes are reversible.

### Translate request/response example

Request:

```json
{ "term": "screeding", "language": "igbo", "context": "construction" }
```

Response:

```json
{
  "canonical_term": "screeding",
  "translation": null,
  "presented_term": "screeding",
  "definition": "Applying a thin cement-sand layer to level a floor or wall.",
  "technical_context": "Thin leveling screed of cementitious mortar to achieve a flat plane.",
  "confidence": 0.95,
  "verified": false,
  "needs_clarification": false,
  "note": "No reliable Igbo translation is recorded yet: the technical term is preserved in English and explained in the selected language."
}
```

When `translation_confidence < 0.75` (configurable
`CONFIDENCE_THRESHOLD`), the response either asks for
clarification, shows the original technical term, or lists
multiple interpretations. The dictionary never fabricates a
translation.

## AI integration pipeline

`runDictionaryPipeline` runs BEFORE any technical construction
response is generated:

USER MESSAGE -> LANGUAGE DETECTION -> TERM EXTRACTION ->
CONSTRUCTION DICTIONARY -> INTENT NORMALIZATION -> TOOL
SELECTION -> CALCULATION -> RESULT VALIDATION ->
LANGUAGE GENERATION -> USER

Language resolution priority:
1. explicit user language selection (authoritative)
2. current conversation language
3. automatic language detection (script + vocabulary markers)
4. default: English

## Hard guarantees (enforced by tests and DB constraints)

- Measurements are never translated or altered: "12 ft × 10 ft"
  stays verbatim in every language.
- The language never determines the math: every language maps to
  the same structured intent, tool and engine key.
- Unverified or low-confidence terminology is flagged and
  clarified, never presented as reliable.
- `construction_terms.confidence_gate`: a record with confidence
  below 0.75 can never be `verified = true`.
- Records are unique per (canonical_term, language).
- Adding a language is data only: extend the registry
  (`DICTIONARY_LANGUAGES` / `frelux_archie_languages`), no
  architecture change.
- Search is typo-tolerant (edit distance <= 2) across
  canonical, translation, synonym, local, alternative and
  abbreviation fields: "concret" suggests "concrete".
- Voice pipeline: speech transcription -> terminology
  correction -> canonical term -> tool. Low confidence asks the
  user to clarify instead of assuming.
- Every terminology change is versioned with a reversible audit
  snapshot (`construction_term_versions`).

## Database

Migration: `supabase/migrations/20260910140000_construction_dictionary.sql`

- `construction_terms`: full terminology records, RLS
  (admin manage / authenticated read).
- `construction_term_versions`: audit history, RLS
  (admin manage / authenticated read).
- Language registry extended with pt, ar, hi, zh
  (en, pcm, ig, yo, ha, fr, es already active).

## Admin dashboard

`/admin/dictionary` (RequireAdmin-gated): total/verified/
unverified/needs-review counts, languages, categories, average
confidence, recently changed terms, filters by Language ->
Category -> Verification -> Confidence, approve/reject actions
and version history.

## Seeding policy

The seed dictionary (`seed-terms.ts`) is curated for accuracy,
not padded to numeric targets: every record has a real
definition, technical context and example. Translations are
included only where they are reliable standard terminology;
everything else is `needs_review` or `keep_in_english`.
Admins extend and verify terminology through the dashboard.
