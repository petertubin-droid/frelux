// =========================================================
// ARCHIE UNIVERSAL LEXICON ENGINE — OEWN TRANSFORM
//
// Pure functions that convert Open English WordNet (CC BY 4.0
// + Princeton WordNet attribution) JSON into validated,
// deterministic records for the lexicon tables. Shared by the
// ingestion pipeline and the test suite; the edge-function
// retrieval layer consumes the same data shape. The dataset
// format is the official OEWN release json (entries-*.json +
// per-lexfile synset jsons + frames.json), built verbatim from
// the OEWN YAML sources by scripts/lexicon/build-oewn-dataset.py
// (validated structure-identical against the official 2025
// release json before first use).
//
// Determinism: word/sense/relationship IDs are UUIDv5
// (SHA-1, RFC 4122) derived from stable dataset keys, so
// re-importing the same dataset NEVER creates duplicates
// (ON CONFLICT DO NOTHING), and upgrading a version updates
// in place where the key is unchanged.
//
// Honesty: nothing is invented — definitions, examples,
// pronunciations and relations come only from the dataset.
// Counts reported by the pipeline are counted from actual
// rows, never estimated.
// =========================================================

// ---------- UUIDv5 (deterministic ids across imports) ----------

/** Minimal, dependency-free SHA-1 (FIPS 180-1). Node 20+ also
 * ships node:crypto, but this module is shared with the Deno
 * edge runtime and the test suite — one implementation, no
 * environment drift.
 */
function sha1(bytes: Uint8Array): Uint8Array {
  const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  const h = new Uint32Array([
    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
  ]);
  const len = bytes.length;
  const padded = new Uint8Array((((len + 8) >>> 6) + 1) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, len << 3, false);
  dv.setUint32(padded.length - 8, Math.floor(len / 2 ** 29), false);
  const w = new Uint32Array(80);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 80; i++) {
      const v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = ((v << 1) | (v >>> 31)) >>> 0;
    }
    let a = h[0],
      b = h[1],
      c = h[2],
      d = h[3],
      e = h[4];
    for (let i = 0; i < 80; i++) {
      const f =
        i < 20
          ? (b & c) | (~b & d)
          : i < 40
            ? b ^ c ^ d
            : i < 60
              ? (b & c) | (b & d) | (c & d)
              : b ^ c ^ d;
      const t =
        (((a << 5) | (a >>> 27)) + (f + e + K[Math.floor(i / 20)] + w[i])) >>>
        0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = t;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, h[0], false);
  odv.setUint32(4, h[1], false);
  odv.setUint32(8, h[2], false);
  odv.setUint32(12, h[3], false);
  odv.setUint32(16, h[4], false);
  return out;
}

/** Deterministic id derivation (RFC 4122 v5 layout over
 * SHA-1 of a stable key). Not tied to a public namespace —
 * stability across imports is what matters: the same dataset
 * key always yields the same id, so re-imports are idempotent.
 */
export function uuidV5(name: string): string {
  const hash = sha1(new TextEncoder().encode("frelux-lexicon-v1:" + name));
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(hash.subarray(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---------- OEWN JSON input types ----------

export interface OewnSenseEntry {
  id: string;
  synset: string;
  derivation?: string[];
  antonym?: string[];
  pertainym?: string[];
  also?: string[];
  subcat?: string[];
  sent?: string[];
  adjposition?: string;
  participle?: string;
  exemplifies?: string[];
  event?: string[];
  agent?: string[];
  result?: string[];
  undergoer?: string[];
  by_means_of?: string[];
  instrument?: string[];
  location?: string[];
  property?: string[];
  material?: string[];
  uses?: string[];
  vehicle?: string[];
  body_part?: string[];
  destination?: string[];
  state?: string[];
}

export interface OewnPosEntry {
  sense?: OewnSenseEntry[];
  form?: string[];
  pronunciation?: Array<{ value: string; notes?: string }>;
}

export type OewnEntriesFile = Record<string, Record<string, OewnPosEntry>>;

export interface OewnSynset {
  definition: string[];
  example?: string[];
  members?: string[];
  partOfSpeech: string;
  ili?: string;
  hypernym?: string[];
  similar?: string[];
  also?: string[];
  entails?: string[];
  causes?: string[];
  attribute?: string[];
  mero_part?: string[];
  mero_substance?: string[];
  mero_member?: string[];
  exemplifies?: string[];
  domain_topic?: string[];
  domain_region?: string[];
  usage?: string[];
  wikidata?: string[];
  source?: string[];
}

export type OewnSynsetFile = Record<string, OewnSynset>;

// ---------- Output record types ----------

export type KnowledgeStatus =
  "VERIFIED" | "LEARNED" | "USER_PROVIDED" | "UNVERIFIED";
export type UnitType =
  | "WORD"
  | "PHRASAL_VERB"
  | "IDIOM"
  | "MULTI_WORD_EXPRESSION"
  | "ABBREVIATION"
  | "ACRONYM";

export interface LexiconWordRecord {
  id: string;
  canonical: string;
  normalized: string;
  spelling_variants: string[];
  language: string;
  regional_usage: string | null;
  pronunciation: string | null;
  part_of_speech: string;
  unit_type: UnitType;
  inflection_metadata: Record<string, unknown>;
  frequency: number | null;
  metadata: Record<string, unknown>;
}

export interface LexiconSenseRecord {
  id: string;
  word_id: string;
  external_id: string;
  synset_key: string;
  definition: string;
  usage_examples: string[];
  domain: string | null;
  register: string | null;
  region: string | null;
  grammatical: Record<string, unknown>;
  confidence: number | null;
  knowledge_status: KnowledgeStatus;
}

export interface LexiconSynsetRelationRecord {
  relation_type: string;
  from_synset_key: string;
  to_synset_key: string;
}

export interface LexiconSenseRelationRecord {
  relation_type: string;
  from_sense_external_id: string;
  to_sense_external_id: string;
}

export interface TransformResult {
  words: LexiconWordRecord[];
  senses: LexiconSenseRecord[];
  synsetRelations: LexiconSynsetRelationRecord[];
  senseRelations: LexiconSenseRelationRecord[];
  rejected: Array<{ key: string; reason: string }>;
}

// ---------- Mapping tables (documented, no invention) ----------

export const POS_MAP: Record<string, string> = {
  n: "noun",
  v: "verb",
  a: "adjective",
  s: "adjective",
  r: "adverb",
  p: "pronoun",
  c: "conjunction",
  d: "determiner",
  i: "interjection",
  u: "punctuation",
  x: "other",
};

// Synset-level relation key → relation type. HYPO-/HOLO- inverses
// are materialized deterministically (standard WordNet semantics:
// hyponym(A,B) ≡ hypernym(B,A)).
const SYNSYM_MAP: Record<string, string> = {
  hypernym: "HYPERNYM",
  similar: "SIMILAR_TO",
  also: "ALSO_SEE",
  entails: "ENTAILMENT",
  causes: "CAUSES",
  attribute: "ATTRIBUTE",
  mero_part: "MERONYM_PART",
  mero_substance: "MERONYM_SUBSTANCE",
  mero_member: "MERONYM_MEMBER",
  exemplifies: "EXEMPLIFIES",
  domain_topic: "DOMAIN_TOPIC",
  domain_region: "DOMAIN_REGION",
  usage: "USAGE",
};
// Deterministic inverse materialization (standard WordNet
// semantics): hyponym(A,B) ≡ hypernym(B,A), holonym is the
// inverse of meronym. Also materialized for ALSO_SEE/usage.
const SYNSYM_INVERSE: Record<string, string> = {
  HYPERNYM: "HYPONYM",
  MERONYM_PART: "HOLONYM_PART_OF",
  MERONYM_SUBSTANCE: "HOLONYM_SUBSTANCE_OF",
  MERONYM_MEMBER: "HOLONYM_MEMBER_OF",
  SIMILAR_TO: "SIMILAR_TO",
  ALSO_SEE: "ALSO_SEE",
  USAGE: "USAGE",
  DOMAIN_TOPIC: "DOMAIN_OF_TOPIC",
  DOMAIN_REGION: "DOMAIN_OF_REGION",
};

// Sense-level relation key → relation type (no inversion: these
// are directional lexical relations in the dataset).
const SENSEREL_MAP: Record<string, string> = {
  antonym: "ANTONYM",
  derivation: "DERIVATION",
  pertainym: "PERTAINYM",
  also: "ALSO_SEE",
  exemplifies: "EXEMPLIFIES",
  event: "ROLE_EVENT",
  agent: "ROLE_AGENT",
  result: "ROLE_RESULT",
  undergoer: "ROLE_UNDERGOER",
  by_means_of: "ROLE_BY_MEANS_OF",
  instrument: "ROLE_INSTRUMENT",
  location: "ROLE_LOCATION",
  property: "ROLE_PROPERTY",
  material: "ROLE_MATERIAL",
  uses: "ROLE_USES",
  vehicle: "ROLE_VEHICLE",
  body_part: "ROLE_BODY_PART",
  destination: "ROLE_DESTINATION",
  state: "ROLE_STATE",
};

// Adverbial particles that form canonical phrasal verbs.
const PARTICLES = new Set([
  "aboard",
  "about",
  "above",
  "across",
  "after",
  "along",
  "apart",
  "around",
  "aside",
  "away",
  "back",
  "down",
  "forth",
  "forward",
  "in",
  "off",
  "on",
  "out",
  "over",
  "round",
  "through",
  "together",
  "under",
  "up",
  "up with",
]);

// ---------- Validation ----------

export function validateLemma(lemma: string): boolean {
  // OEWN lemmas: word chars, spaces, apostrophes, hyphens, periods
  return (
    /^[\p{L}\p{N}'._+][\p{L}\p{N} '_./+-]*$/u.test(lemma) && lemma.length <= 80
  );
}

export function classifyUnitType(lemma: string, pos: string): UnitType {
  const words = lemma.split(/[\s_]+/).filter(Boolean);
  if (words.length === 1) return "WORD";
  if (
    pos === "v" &&
    words.length === 2 &&
    PARTICLES.has(words[1].toLowerCase())
  )
    return "PHRASAL_VERB";
  // Multi-word lexical units with dictionary senses are treated
  // as multi-word expressions; "idiom" is a register judgment we
  // do not fabricate — registers stay null unless sourced.
  return "MULTI_WORD_EXPRESSION";
}

// ---------- The transform ----------

/**
 * Transform one OEWN entries file + its synset files into
 * validated lexicon records. Rejects malformed records
 * honestly (collected in `rejected`, never silently dropped).
 */
export function transformOewn(
  entries: OewnEntriesFile,
  synsetFiles: Record<string, OewnSynsetFile>, // lexfile name → synsets
  options?: { language?: string },
): TransformResult {
  const language = options?.language ?? "en";
  const words: LexiconWordRecord[] = [];
  const senses: LexiconSenseRecord[] = [];
  const synsetRelations: LexiconSynsetRelationRecord[] = [];
  const senseRelations: LexiconSenseRelationRecord[] = [];
  const rejected: TransformResult["rejected"] = [];

  // 1) synset-level relations (from synset files)
  for (const [lexfile, synsets] of Object.entries(synsetFiles)) {
    for (const [sk, s] of Object.entries(synsets)) {
      if (!Array.isArray(s.definition) || s.definition.length === 0) continue;
      for (const [key, relType] of Object.entries(SYNSYM_MAP)) {
        const targets = (s as unknown as Record<string, string[]>)[key];
        if (!Array.isArray(targets)) continue;
        for (const to of targets) {
          if (!/^\d{8}-[nvars]$/.test(to)) {
            rejected.push({
              key: `${sk}:${key}:${to}`,
              reason: "malformed synset reference",
            });
            continue;
          }
          synsetRelations.push({
            relation_type: relType,
            from_synset_key: sk,
            to_synset_key: to,
          });
          const inv = SYNSYM_INVERSE[relType];
          if (inv) {
            synsetRelations.push({
              relation_type: inv,
              from_synset_key: to,
              to_synset_key: sk,
            });
          }
        }
      }
      // domain metadata for senses of this synset comes from the
      // lexicographer file (e.g. "noun.act") — metadata, not a
      // hard-coded assumption.
      void lexfile;
    }
  }

  // 2) words & senses (from entries files)
  for (const [lemma, posEntries] of Object.entries(entries)) {
    if (!validateLemma(lemma)) {
      rejected.push({ key: lemma, reason: "invalid lemma" });
      continue;
    }
    for (const [posKey, entry] of Object.entries(posEntries)) {
      // homograph keys (e.g. "n-1", "v-2") are pronunciation
      // variants of the same word — same base POS.
      const pos = posKey.split("-")[0];
      const posName = POS_MAP[pos];
      if (!posName) {
        rejected.push({
          key: `${lemma}:${posKey}`,
          reason: "unsupported part of speech",
        });
        continue;
      }
      const canonical = lemma.replace(/_/g, " ");
      const normalized = canonical.toLowerCase();
      const wordId = uuidV5(`word|${language}|${normalized}|${posName}`);
      const pron =
        entry.pronunciation?.map((p) => p.value).filter(Boolean) ?? [];
      const existingWord = words.find((w) => w.id === wordId);
      if (existingWord) {
        // homograph variant — merge pronunciation/forms, never duplicate
        const prons = new Set([
          ...(existingWord.pronunciation ?? "").split(" / "),
          ...pron,
        ]);
        existingWord.pronunciation = prons.size
          ? Array.from(prons).filter(Boolean).join(" / ")
          : null;
        const forms = new Set([
          ...existingWord.spelling_variants,
          ...(entry.form ?? []),
        ]);
        existingWord.spelling_variants = Array.from(forms);
        (existingWord.metadata as Record<string, unknown>).homograph_tags = [
          ...new Set([
            ...(((existingWord.metadata as Record<string, unknown>)
              .homograph_tags as string[]) ?? []),
            posKey,
          ]),
        ];
        continue;
      }
      words.push({
        id: wordId,
        canonical,
        normalized,
        spelling_variants: entry.form ?? [],
        language,
        regional_usage: null,
        pronunciation: pron.length ? pron.join(" / ") : null,
        part_of_speech: posName,
        unit_type: classifyUnitType(lemma, pos),
        inflection_metadata: entry.form?.length ? { forms: entry.form } : {},
        frequency: null, // not legitimately available in OEWN — never fabricated
        metadata: {
          oewn_pos: pos,
          ...(posKey !== pos ? { homograph_tags: [posKey] } : {}),
        },
      });
      for (const sense of entry.sense ?? []) {
        if (!sense?.id || !sense?.synset) {
          rejected.push({
            key: `${lemma}:${pos}`,
            reason: "sense missing id/synset",
          });
          continue;
        }
        if (!/^\d{8}-[nvars]$/.test(sense.synset)) {
          rejected.push({
            key: sense.id,
            reason: "malformed synset reference",
          });
          continue;
        }
        // The synset data must exist in the loaded files; the
        // definition comes from the synset (never invented).
        const synset = findSynset(synsetFiles, sense.synset);
        if (!synset) {
          rejected.push({
            key: sense.id,
            reason: `synset ${sense.synset} not present in dataset`,
          });
          continue;
        }
        const definition = synset.definition.join("; ");
        if (!definition.trim()) {
          rejected.push({ key: sense.id, reason: "empty definition" });
          continue;
        }
        const grammatical: Record<string, unknown> = {};
        if (sense.subcat?.length) grammatical.subcategorization = sense.subcat;
        if (sense.sent?.length) grammatical.sentence_frames = sense.sent;
        if (sense.adjposition)
          grammatical.adjective_position = sense.adjposition;
        if (sense.participle) grammatical.participle = sense.participle;
        senses.push({
          id: uuidV5(`sense|${sense.id}`),
          word_id: wordId,
          source_id: OEWN_SOURCE_ID, // provenance is never detached
          external_id: sense.id,
          synset_key: sense.synset,
          definition,
          usage_examples: synset.example ?? [],
          domain: synsetLexfile(synsetFiles, sense.synset),
          register: null, // register is not sourced by OEWN — never guessed
          region: null, // region is not sourced by OEWN — never guessed
          grammatical,
          confidence: 1.0, // directly sourced record (provenance in source_id)
          knowledge_status: "VERIFIED",
        });
        // sense-level relations
        for (const [key, type] of Object.entries(SENSEREL_MAP)) {
          const targets = (sense as unknown as Record<string, string[]>)[key];
          if (!Array.isArray(targets)) continue;
          for (const rawTo of targets) {
            let to = rawTo;
            const prefix = `${sense.id}:${key}:`;
            if (rawTo.startsWith(prefix)) to = rawTo.slice(prefix.length);
            if (!to || !/^[\w%:'.-]+$/.test(to)) {
              rejected.push({
                key: `${sense.id}:${key}:${rawTo}`,
                reason: "malformed sense reference",
              });
              continue;
            }
            senseRelations.push({
              relation_type: type,
              from_sense_external_id: sense.id,
              to_sense_external_id: to,
            });
          }
        }
      }
    }
  }

  // 3) dedupe relationships (dataset may repeat; unique
  //    constraints also guard at the DB level)
  const seen = new Set<string>();
  const dedupeRel = <
    T extends LexiconSynsetRelationRecord | LexiconSenseRelationRecord,
  >(
    rows: T[],
    keyOf: (r: T) => string,
  ): T[] => {
    const out: T[] = [];
    for (const r of rows) {
      const k = keyOf(r);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  };
  const dedupedSynsetRelations = dedupeRel(
    synsetRelations,
    (r) => `${r.relation_type}|${r.from_synset_key}|${r.to_synset_key}`,
  );
  const dedupedSenseRelations = dedupeRel(
    senseRelations,
    (r) =>
      `${r.relation_type}|${r.from_sense_external_id}|${r.to_sense_external_id}`,
  );

  return {
    words,
    senses,
    synsetRelations: dedupedSynsetRelations,
    senseRelations: dedupedSenseRelations,
    rejected,
  };
}

function findSynset(
  synsetFiles: Record<string, OewnSynsetFile>,
  key: string,
): OewnSynset | null {
  for (const synsets of Object.values(synsetFiles)) {
    const s = synsets[key];
    if (s) return s;
  }
  return null;
}

/** The lexicographer file a synset lives in (domain metadata). */
function synsetLexfile(
  synsetFiles: Record<string, OewnSynsetFile>,
  key: string,
): string | null {
  for (const [lexfile, synsets] of Object.entries(synsetFiles)) {
    if (key in synsets) return lexfile;
  }
  return null;
}

/** Source metadata for Open English WordNet (CC BY 4.0). */
export const OEWN_SOURCE_ID = uuidV5(`source|wordnet|2026-dev-bff3181`);
export const OEWN_SOURCE = {
  name: "Open English WordNet",
  dataset: "english-wordnet-2026-dev-json",
  version: "2026-dev-bff3181",
  license:
    "CC BY 4.0 (Open English WordNet) with WordNet License attribution (Princeton University). This work is licensed under a Creative Commons Attribution 4.0 International License.",
  attribution:
    "Open English WordNet 2026 development snapshot (main branch, commit bff3181f, 2026-08-26), (c) The Open English WordNet Team, licensed CC BY 4.0; derived from Princeton WordNet. WordNet © Princeton University.",
  url: "https://github.com/globalwordnet/english-wordnet/commit/bff3181fe5c810dcd157cba0eed60322a6e0aaed",
} as const;
