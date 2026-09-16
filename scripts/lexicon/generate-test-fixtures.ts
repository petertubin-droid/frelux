/* eslint-disable @typescript-eslint/no-explicit-any -- dev-only fixture extractor walking raw OEWN JSON */
// Generates REAL lexicon test fixtures from the OEWN dataset
// (spec §18: test words with multiple meanings — run, bank,
// light, bat, file, plant, scale, charge, point, field — plus
// context/antonym/phrase support words). Data is extracted
// with the production transform, never hand-written.
//
//   npx tsx scripts/lexicon/generate-test-fixtures.ts
import * as fs from "node:fs";
import {
  transformOewn,
  OEWN_SOURCE,
  OEWN_SOURCE_ID,
  type OewnEntriesFile,
  type OewnSynsetFile,
} from "../../supabase/functions/_shared/lexicon/transform";

const DIR = process.argv[2] ?? "/tmp/oewn";
const OUT =
  "supabase/functions/_shared/lexicon/__fixtures__/test-words.json";

const TEST_WORDS = [
  "run", "bank", "light", "bat", "file", "plant", "scale", "charge",
  "point", "field", // spec §18 words
  "paint", "morning", "program", "give", "give up", "give away",
  "hot", "cold",
  "wet", "dry", "build", "cast", "wall", "block", "cement",
  // antonym/relation targets so both sides resolve in tests
  "discharge", "unblock",
];

// load synset files once
const synsetFiles: Record<string, OewnSynsetFile> = {};
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".json") || f.startsWith("entries-") || f === "frames.json") continue;
  synsetFiles[f.replace(".json", "")] = JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8"));
}

const wanted = new Set(TEST_WORDS.map((w) => w.toLowerCase()));
const words: any[] = [];
const senses: any[] = [];
const senseRels: any[] = [];
const synsetRels: any[] = [];

for (const f of fs.readdirSync(DIR).filter((f) => f.startsWith("entries-")).sort()) {
  const entries = JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")) as OewnEntriesFile;
  // keep only the wanted lemmas (plus their homograph keys)
  const filtered: OewnEntriesFile = {};
  for (const [lemma, poses] of Object.entries(entries)) {
    if (wanted.has(lemma.toLowerCase())) filtered[lemma] = poses;
  }
  if (!Object.keys(filtered).length) continue;
  const r = transformOewn(filtered, synsetFiles);
  words.push(...r.words);
  senses.push(...r.senses);
  // sense relations are collected in the second pass with both
  // sides in the fixture — no dangling references
}

// sense relations for the wanted words (from + to may point at
// senses of other lemmas — include those target senses too)
const wantedSenseIds = new Set(senses.map((s) => s.external_id));
for (const f of fs.readdirSync(DIR).filter((f) => f.startsWith("entries-")).sort()) {
  const entries = JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")) as OewnEntriesFile;
  for (const [lemma, poses] of Object.entries(entries)) {
    if (wanted.has(lemma.toLowerCase())) {
      for (const pos of Object.values(poses)) {
        for (const s of pos.sense ?? []) {
          for (const key of ["antonym", "derivation", "pertainym"] as const) {
            for (const raw of (s as any)[key] ?? []) {
              const prefix = `${s.id}:${key === "derivation" ? "derivation" : key}:`;
              let to = raw;
              if (raw.startsWith(prefix)) to = raw.slice(prefix.length);
              if (wantedSenseIds.has(s.id) && wantedSenseIds.has(to)) {
                senseRels.push({
                  relation_type: key === "antonym" ? "ANTONYM" : key === "derivation" ? "DERIVATION" : "PERTAINYM",
                  from_sense_external_id: s.id,
                  to_sense_external_id: to,
                });
              }
            }
          }
        }
      }
    }
  }
}

// synset relations for the wanted words' synsets, both
// directions, with target synsets' member senses + words
// relations only from each word's HEAD senses (dataset order) —
// enough for traversal tests without a giant fixture
const headSenseSynsets = new Set<string>();
const byWord = new Map<string, number>();
for (const sn of senses) {
  const n = (byWord.get(sn.word_id) ?? 0);
  if (n < 6) headSenseSynsets.add(sn.synset_key);
  byWord.set(sn.word_id, n + 1);
}
const wantedSynsets = new Set(senses.map((s) => s.synset_key));
const relFrom = new Set(headSenseSynsets);
for (const synsets of Object.values(synsetFiles)) {
  for (const [sk, sv] of Object.entries(synsets)) {
    for (const [key, relType] of Object.entries({ hypernym: "HYPERNYM", similar: "SIMILAR_TO", mero_part: "MERONYM_PART" })) {
      const targets = (sv as any)[key];
      if (!Array.isArray(targets)) continue;
      let perRel = 0;
      for (const to of targets) {
        if (perRel >= 2) break; // keep the fixture compact
        if (relFrom.has(sk)) {
          perRel++;
          synsetRels.push({ relation_type: relType, from_synset_key: sk, to_synset_key: to });
          if (relType === "HYPERNYM" && relFrom.has(to)) {
            synsetRels.push({ relation_type: "HYPONYM", from_synset_key: to, to_synset_key: sk });
          }
        }
      }
    }
  }
}

// pull in senses/words for relation-target synsets (one lemma
// member each) so graph traversal tests return real words
const relSynsets = new Set<string>();
for (const r of synsetRels) { relSynsets.add(r.from_synset_key); relSynsets.add(r.to_synset_key); }
const relTargetSynsets = [...relSynsets].filter((sk) => !wantedSynsets.has(sk));
const extraSenses: any[] = [];
const extraWords: any[] = [];
for (const f of fs.readdirSync(DIR).filter((f) => f.startsWith("entries-")).sort()) {
  const entries = JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")) as OewnEntriesFile;
  const filtered: OewnEntriesFile = {};
  for (const [lemma, poses] of Object.entries(entries)) {
    for (const pos of Object.values(poses)) {
      if ((pos.sense ?? []).some((s) => relTargetSynsets.includes(s.synset))) {
        filtered[lemma] = poses;
        break;
      }
    }
  }
  if (!Object.keys(filtered).length) continue;
  // one representative member word per target synset keeps the
  // fixture small while graph-traversal tests still see real words
  const r = transformOewn(filtered, synsetFiles);
  const takenSynsets = new Set<string>();
  const keepWordIds = new Set<string>();
  const keepSenses: typeof r.senses = [];
  for (const s of r.senses) {
    if (relTargetSynsets.includes(s.synset_key) && !takenSynsets.has(s.synset_key)) {
      takenSynsets.add(s.synset_key);
      keepWordIds.add(s.word_id);
      keepSenses.push(s);
    }
  }
  extraWords.push(...r.words.filter((w) => keepWordIds.has(w.id)));
  extraSenses.push(...keepSenses);
}

const sourceId = OEWN_SOURCE_ID; // identical to the production source row
const fixture = {
  source: {
    id: sourceId,
    name: OEWN_SOURCE.name,
    dataset: OEWN_SOURCE.dataset,
    version: OEWN_SOURCE.version,
    license: OEWN_SOURCE.license,
    attribution: OEWN_SOURCE.attribution,
    url: OEWN_SOURCE.url,
  },
  words: [...words, ...extraWords],
  senses: [...senses, ...extraSenses],
  senseRelations: senseRels,
  synsetRelations: synsetRels,
};

fs.mkdirSync(OUT.replace("/test-words.json", ""), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(fixture));
console.log(`fixture: ${OUT}`);
console.log(`  words: ${fixture.words.length}`);
console.log(`  senses: ${fixture.senses.length}`);
console.log(`  senseRelations: ${fixture.senseRelations.length}`);
console.log(`  synsetRelations: ${fixture.synsetRelations.length}`);
console.log(`  size: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
