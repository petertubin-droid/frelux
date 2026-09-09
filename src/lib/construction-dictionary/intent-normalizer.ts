// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// INTENT NORMALIZATION (spec §6 and §7)
//
// "How many blocks do I need?", "How many blocks will I
// need?" and "I need blocks for this house." are the SAME
// intent, in ANY language. The normalization layer converts
// a user request into a structured intent:
//
//   { intent, material, tool, measurement_protection }
//
// THE LANGUAGE NEVER DETERMINES THE MATHEMATICS. The
// structured intent selects the same deterministic FRELUX
// calculator tool for every language; all numbers and units
// are carried through VERBATIM for the engine.
// =========================================================

import { extractMeasurements } from "./translation-rules";

/** Dictionary tool vocabulary (spec §6). Maps onto the
 *  existing FRELUX calculator surfaces; the underlying
 *  math stays inside the deterministic engines, untouched
 *  by the language layer. */
export const DICTIONARY_TOOLS = {
  block_calculator: { engine_key: "build_to_roof", surface: "/cost-estimator" },
  paint_calculator: { engine_key: "painting", surface: "/paint-calculator" },
  tile_calculator: { engine_key: "build_to_roof", surface: "/calculators" },
  screeding_calculator: { engine_key: "build_to_roof", surface: "/calculators" },
  pop_calculator: { engine_key: "build_to_roof", surface: "/calculators" },
  foundation_calculator: { engine_key: "build_to_roof", surface: "/foundation-calculator" },
  roofing_calculator: { engine_key: "roof_geometry", surface: "/calculators" },
  build_to_roof_calculator: { engine_key: "build_to_roof", surface: "/cost-estimator" },
} as const;

export type DictionaryTool = keyof typeof DICTIONARY_TOOLS;

/** The normalized structured intent (spec §7). */
export interface NormalizedIntent {
  intent: "calculate_material" | "explain_term" | "general_question";
  material: string | null;
  tool: DictionaryTool | null;
  /** engine key that actually computes (existing registry) */
  engine_key: string | null;
  /** measurements carried VERBATIM to the engine */
  measurements: Array<{ raw: string; value: number; unit: string }>;
  /** unknown/ambiguous language material still resolves to
   *  the same tool as its English equivalent */
  matched_via: string;
}

/** Material keywords per tool, per language. Any language's
 *  phrasing of "how much paint" produces the same intent.
 *  New phrases are data, added freely. */
const TOOL_PHRASES: Record<DictionaryTool, Record<string, string[]>> = {
  block_calculator: {
    en: ["block", "blocks", "sandcrete"],
    pcm: ["block", "blocks"],
    yo: ["booku"],
    ig: ["nkume ulo"],
    ha: ["bulo"],
    fr: ["bloc", "blocs", "parpaing"],
    es: ["bloque", "bloques"],
    pt: ["bloco", "blocos"],
    ar: ["بلوك", "طوب"],
    hi: ["ब्लॉक"],
    zh: ["砖"],
  },
  paint_calculator: {
    en: ["paint", "emulsion", "coats of paint"],
    pcm: ["paint", "epo"],
    yo: ["epo"],
    ig: ["esi"],
    ha: ["fenti"],
    fr: ["peinture"],
    es: ["pintura"],
    pt: ["tinta"],
    ar: ["دهان", "طلاء"],
    hi: ["पेंट"],
    zh: ["油漆", "涂料"],
  },
  tile_calculator: {
    en: ["tile", "tiles", "tiling", "ceramic"],
    pcm: ["tile", "tiles"],
    yo: ["tile"],
    fr: ["carrelage", "carreau"],
    es: ["azulejo", "azulejos"],
    pt: ["azulejo", "revestimento"],
    ar: ["بلاط"],
    hi: ["टाइल"],
    zh: ["瓷砖"],
  },
  screeding_calculator: {
    en: ["screed", "screeding"],
    pcm: ["screed", "screeding"],
    fr: ["chape"],
    es: ["mortero de nivelación"],
    pt: ["contrapiso"],
    ar: ["لياسة"],
    hi: ["स्क्रीडिंग"],
    zh: ["找平"],
  },
  pop_calculator: {
    en: ["pop", "plaster of paris", "pop ceiling", "false ceiling"],
    pcm: ["pop", "pop ceiling"],
    fr: ["plafond suspendu"],
    es: ["cielo falso"],
    pt: ["forro"],
    ar: ["جبس"],
    hi: ["पॉप"],
    zh: ["石膏板"],
  },
  foundation_calculator: {
    en: ["foundation", "footing", "raft", "strip foundation", "pad foundation"],
    pcm: ["foundation", "futa"],
    yo: ["ile"],
    ha: ["gida", "kasa"],
    fr: ["fondation"],
    es: ["cimiento", "cimientos"],
    pt: ["fundação", "alicerce"],
    ar: ["أساس"],
    hi: ["नींव"],
    zh: ["地基"],
  },
  roofing_calculator: {
    en: ["roof", "roofing", "roofing sheet", "truss", "rafter", "fascia", "purlin"],
    pcm: ["roof", "rufin"],
    ha: ["rufi"],
    fr: ["toit", "toiture", "charpente"],
    es: ["techo", "tejado"],
    pt: ["telhado", "telha"],
    ar: ["سقف"],
    hi: ["छत"],
    zh: ["屋顶"],
  },
  build_to_roof_calculator: {
    en: ["build to roof", "build-to-roof", "substructure and superstructure"],
    pcm: ["build to roof"],
    fr: ["construction complète"],
    es: ["construcción completa"],
    pt: ["construção completa"],
    hi: ["निर्माण"],
    zh: ["建房"],
  },
};

/** Normalize a request in ANY supported language into the
 *  same structured intent. Different expressions with the
 *  same meaning map to the same tool; the language never
 *  changes which formula runs. */
export function normalizeIntent(
  message: string,
  detected_language: string,
): NormalizedIntent {
  const measurements = extractMeasurements(message);
  const lower = ` ${message.toLowerCase()} `;

  // highest-priority phrase families win; tool order mirrors
  // the spec. build_to_roof is checked AFTER its parts
  // (foundation, roofing, block) so specific tools win.
  const order: DictionaryTool[] = [
    "paint_calculator",
    "tile_calculator",
    "screeding_calculator",
    "pop_calculator",
    "block_calculator",
    "foundation_calculator",
    "roofing_calculator",
    "build_to_roof_calculator",
  ];

  // multi-word phrases first, then single words
  for (const tool of order) {
    const phrases = [
      ...(TOOL_PHRASES[tool][detected_language] ?? []),
      ...(TOOL_PHRASES[tool]["en"] ?? []),
    ].sort((a, b) => b.length - a.length);
    for (const phrase of phrases) {
      const rx = new RegExp(
        "\\b" + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "i",
      );
      if (rx.test(lower)) {
        return {
          intent: "calculate_material",
          material: phrase,
          tool,
          engine_key: DICTIONARY_TOOLS[tool].engine_key,
          measurements,
          matched_via: phrase,
        };
      }
    }
  }
  return {
    intent: "general_question",
    material: null,
    tool: null,
    engine_key: null,
    measurements,
    matched_via: "",
  };
}
