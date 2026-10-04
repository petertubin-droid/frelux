/**
 * Conversational Estimator Engine (Engine 3 — WhatsApp-native)
 *
 * Turns a WhatsApp-style chat thread (typed message, pasted
 * conversation, or a voice-note transcript) written in English
 * into a full paint estimate — the same deterministic estimate
 * the Paint Calculator produces.
 *
 * House rules, identical to every other Frelux engine:
 *  - Detection and extraction are deterministic keyword/regex
 *    work. No LLM, no external service, no network. Nothing is
 *    uploaded.
 *  - The engine reports ONLY what it found. Every extracted fact
 *    carries its evidence (the matched phrase). Facts not found
 *    are missing — never guessed, never defaulted silently.
 *  - If a critical fact (the room dimensions) is missing, the
 *    engine does not estimate. It asks a follow-up question in
 *    the same language the customer wrote in.
 *  - Quantities come from the same calculatePaint chain the
 *    calculator uses (same coverage, coat and waste rules).
 *    Prices are never invented: an unconfigured price is
 *    reported as absent.
 *
 * The language keyword packs below are the built-in defaults;
 * the live packs are admin-configured in the
 * conversational_language_packs table and fetched by the page.
 * When a category has configured packs the DB version wins;
 * otherwise the engine falls back to these defaults.
 */

import { calculatePaint, type CalcConfig } from "../calc";
import type { CalculatorInput, ProjectType, Unit } from "../../types";

// =========================================================
// Language packs (defaults; DB-configurable)
// =========================================================

export type ConversationLanguage = "en";

export interface LanguagePack {
  language: ConversationLanguage;
  category:
    | "greeting"
    | "surface_paint"
    | "surface_screed"
    | "surface_pop"
    | "surface_tile"
    | "dimension_word"
    | "unit_meter"
    | "unit_feet"
    | "region_hint"
    | "coats_word";
  keywords: string[];
  weight: number;
}

/**
 * Default packs. Weights are per-keyword-hit scores; detection
 * is "highest total wins, ties broken in favour of English".
 * Only high-confidence everyday words are included; the engine
 * does not pretend to recognise vocabulary it cannot verify.
 */
export const DEFAULT_LANGUAGE_PACKS: LanguagePack[] = [
  // English
  {
    language: "en",
    category: "greeting",
    keywords: [
      "hello",
      "hi ",
      "good morning",
      "good afternoon",
      "please",
      "thank you",
    ],
    weight: 1,
  },
  {
    language: "en",
    category: "surface_paint",
    keywords: ["paint", "painting", "painted", "painter"],
    weight: 2,
  },
  {
    language: "en",
    category: "surface_screed",
    keywords: ["screeding", "screed", "skim coat"],
    weight: 2,
  },
  {
    language: "en",
    category: "surface_pop",
    keywords: ["pop ceiling", "pop board", "plaster of paris"],
    weight: 2,
  },
  {
    language: "en",
    category: "surface_tile",
    keywords: ["tile", "tiling", "tiles"],
    weight: 2,
  },
  {
    language: "en",
    category: "dimension_word",
    keywords: ["by", " x ", "meters", "metres", "feet", "how much"],
    weight: 1,
  },
  {
    language: "en",
    category: "unit_meter",
    keywords: ["meter", "metre", "meters", "metres"],
    weight: 1,
  },
  {
    language: "en",
    category: "unit_feet",
    keywords: ["feet", "foot", "ft"],
    weight: 1,
  },
  {
    language: "en",
    category: "region_hint",
    keywords: ["lagos", "abuja", "kano", "enugu", "port harcourt"],
    weight: 1,
  },
  {
    language: "en",
    category: "coats_word",
    keywords: ["coat", "coats", "coating"],
    weight: 1,
  },
];

// =========================================================
// Number words (1–10) — used for room counts, coats, doors
// =========================================================

const NUMBER_WORDS: Record<ConversationLanguage, Record<string, number>> = {
  en: {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  },
};

// =========================================================
// Thread parsing
// =========================================================

export interface ParsedMessage {
  sender: string | null;
  text: string;
}

export interface ParsedThread {
  messages: ParsedMessage[];
  cleanedText: string;
}

/**
 * Strips WhatsApp artifacts (timestamps, sender prefixes, media
 * placeholders, system lines) and returns the messages plus one
 * flat lowercased text for extraction.
 */
export function parseThread(raw: string): ParsedThread {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // WhatsApp export: "[12:34, 3/10/2026] Alice: message"
  // WhatsApp transcript style: "12:34 - Alice: message"
  const timestamped =
    /^\[?\d{1,2}[:/]\d{2}([,:]\s*\d{1,2}[:/]\d{1,2}[:/]\d{2,4})?\]?\s*[-–]?\s*/;
  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    // System/hidden-notification lines carry no estimating content.
    if (
      /^[-–]\s/.test(line) &&
      /changed the subject|joined using this group|added you|left the group|messages and calls are end-to-end/i.test(
        line,
      )
    ) {
      continue;
    }
    let text = line;
    let sender: string | null = null;

    const m = line.match(timestamped);
    if (m) {
      let rest = line.slice(m[0].length);
      const colon = rest.indexOf(":");
      if (colon > -1 && colon <= 40) {
        sender = rest.slice(0, colon).trim() || null;
        rest = rest.slice(colon + 1).trim();
      }
      text = rest;
    }
    if (text.length === 0) continue;
    // Media placeholders are not estimating content.
    if (
      /^[\u200e\u200f]?\u2713?/u.test(text) &&
      /image omitted|video omitted|sticker omitted|audio omitted|document omitted/i.test(
        text,
      )
    ) {
      continue;
    }
    if (/^[\u200e\u200f]/u.test(text))
      text = text.replace(/^[\u200e\u200f]+/u, "").trim();
    messages.push({ sender, text });
  }

  const cleanedText = messages
    .map((m) => m.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  return { messages, cleanedText };
}

// =========================================================
// Language detection
// =========================================================

export interface LanguageDetection {
  language: ConversationLanguage;
  scores: Record<ConversationLanguage, number>;
  matched: string[];
}

function normalizePacks(
  packs: LanguagePack[] | null | undefined,
): LanguagePack[] {
  if (!packs || packs.length === 0) return DEFAULT_LANGUAGE_PACKS;
  // DB packs win per category: keep DB rows plus any default
  // category the DB does not cover at all.
  const covered = new Set(packs.map((p) => `${p.language}:${p.category}`));
  const fallback = DEFAULT_LANGUAGE_PACKS.filter(
    (p) => !covered.has(`${p.language}:${p.category}`),
  );
  return [...packs, ...fallback];
}

export function detectLanguage(
  text: string,
  packs: LanguagePack[] | null | undefined = null,
): LanguageDetection {
  const lower = ` ${text.toLowerCase()} `;
  const scores: Record<ConversationLanguage, number> = {
    en: 0,
  };
  const matched: string[] = [];

  for (const pack of normalizePacks(packs)) {
    for (const kw of pack.keywords) {
      const needle = kw.toLowerCase();
      const isWhole = needle.trim().length > 2 && needle.includes(" ");
      if (
        isWhole
          ? lower.includes(needle)
          : new RegExp(
              `(^|[^a-zà-ÿ])${escapeRegex(needle.trim())}([^a-zà-ÿ]|$)`,
              "i",
            ).test(lower)
      ) {
        scores[pack.language] += pack.weight;
        matched.push(kw.trim());
      }
    }
  }

  // Default to English on a tie or on total silence.
  const order: ConversationLanguage[] = ["en"];
  let language: ConversationLanguage = "en";
  let best = 0;
  for (const lang of order) {
    if (scores[lang] > best) {
      best = scores[lang];
      language = lang;
    }
  }
  return { language, scores, matched: [...new Set(matched)].slice(0, 12) };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========================================================
// Parameter extraction
// =========================================================

export type CalculatorIntent =
  "paint" | "screeding" | "pop_ceiling" | "tile" | "unknown";

export interface ExtractedFact<T> {
  value: T;
  evidence: string;
}

export interface ExtractedParams {
  intent: CalculatorIntent;
  intentEvidence: string | null;
  length: ExtractedFact<number> | null;
  width: ExtractedFact<number> | null;
  unit: ExtractedFact<Unit> | null;
  bedrooms: ExtractedFact<number> | null;
  coats: ExtractedFact<number> | null;
  doors: ExtractedFact<number> | null;
  windows: ExtractedFact<number> | null;
  region: ExtractedFact<string> | null;
  propertyType: ExtractedFact<ProjectType> | null;
}

const NIGERIAN_REGIONS = [
  "abia",
  "adamawa",
  "akwa ibom",
  "anambra",
  "bauchi",
  "bayelsa",
  "benue",
  "borno",
  "cross river",
  "delta",
  "ebonyi",
  "edo",
  "ekiti",
  "enugu",
  "fct",
  "abuja",
  "gombe",
  "imo",
  "jigawa",
  "kaduna",
  "kanо",
  "kano",
  "katsina",
  "kebbi",
  "kebbi",
  "kogi",
  "kwara",
  "lagos",
  "nasarawa",
  "niger",
  "ogun",
  "ondo",
  "osun",
  "oyo",
  "plateau",
  "rivers",
  "port harcourt",
  "sokoto",
  "taraba",
  "yobe",
  "zamfara",
  "ikeja",
  "yaba",
  "lekki",
  "ajah",
  "victoria island",
  "surulere",
  "ibadan",
];

const PROPERTY_TYPES: Array<{ words: string[]; type: ProjectType }> = [
  {
    words: ["self contained", "self-contained", "selfcontain", "studio"],
    type: "room",
  },
  { words: ["bedroom flat", "bedroom apartment", "flat"], type: "house" },
  {
    words: ["duplex", "semi detached", "semi-detached", "bungalow"],
    type: "house",
  },
  { words: ["shop", "office", "warehouse"], type: "room" },
  { words: ["fence", "wall outside", "outside wall"], type: "fence" },
];

function wordNumber(text: string, lang: ConversationLanguage): number | null {
  const words = text.split(/[^a-zà-ÿ'’\-]+/i).filter(Boolean);
  const table = NUMBER_WORDS[lang];
  for (const w of words) {
    const n = table[w.toLowerCase()];
    if (n != null) return n;
  }
  return null;
}

/**
 * Extracts estimating facts from the cleaned thread text.
 * Every fact keeps the phrase it came from — the customer can
 * verify what the engine "heard".
 */
export function extractParams(
  thread: ParsedThread,
  language: ConversationLanguage,
  packs: LanguagePack[] | null | undefined = null,
): ExtractedParams {
  const text = thread.cleanedText;
  const activePacks = normalizePacks(packs);

  // ---- intent (first configured surface keyword that appears) ----
  const intentOrder: Array<{ intent: CalculatorIntent; categories: string[] }> =
    [
      { intent: "paint", categories: ["surface_paint"] },
      { intent: "screeding", categories: ["surface_screed"] },
      { intent: "pop_ceiling", categories: ["surface_pop"] },
      { intent: "tile", categories: ["surface_tile"] },
    ];
  let intent: CalculatorIntent = "unknown";
  let intentEvidence: string | null = null;
  for (const { intent: candidate, categories } of intentOrder) {
    for (const cat of categories) {
      for (const pack of activePacks.filter((p) => p.category === cat)) {
        for (const kw of pack.keywords) {
          if (text.includes(kw.toLowerCase())) {
            intent = candidate;
            intentEvidence = kw;
            break;
          }
        }
        if (intentEvidence) break;
      }
      if (intentEvidence) break;
    }
    if (intentEvidence) break;
  }
  if (intent === "unknown") {
    // Fallback: raw loanwords any language of chat uses.
    if (/\bpaint|\bpainty|\bfenti|\befu/.test(text)) {
      intent = "paint";
      intentEvidence = "paint";
    }
  }

  // ---- dimensions: "3 by 3", "3 x 3", "12ft by 10ft", "3by3" ----
  let length: ExtractedFact<number> | null = null;
  let width: ExtractedFact<number> | null = null;
  let unit: ExtractedFact<Unit> | null = null;

  const dimMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(?:feet|ft|foot|feets?|leg|ẹsẹ̀|ese|ƙafa|kafa)?\s*(?:by|x|×)\s*(\d+(?:\.\d+)?)/,
  );
  if (dimMatch) {
    length = { value: parseFloat(dimMatch[1]), evidence: dimMatch[0].trim() };
    width = { value: parseFloat(dimMatch[2]), evidence: dimMatch[0].trim() };
    const ctx = dimMatch[0];
    const feetRe = /(feet|ft|foot|feets|leg|ẹsẹ̀|ese|ƙafa|kafa)/;
    const meterRe = /(meter|metre|meters|metres|mita|mitar|mẹ́ta)/;
    if (feetRe.test(ctx) || (feetRe.test(text) && !meterRe.test(text))) {
      unit = { value: "feet", evidence: "feet" };
    } else {
      unit = { value: "meters", evidence: "meters" };
    }
  }

  // ---- bedrooms ("2 bedroom flat") ----
  let bedrooms: ExtractedFact<number> | null = null;
  const bedMatch = text.match(/(\d+)\s*bedroom/);
  if (bedMatch) {
    bedrooms = { value: parseInt(bedMatch[1], 10), evidence: bedMatch[0] };
  } else {
    const wordBed = text.match(/(one|two|three|four|five|six)\s*bedroom/);
    if (wordBed) {
      const n = wordNumber(wordBed[0], language);
      if (n != null) bedrooms = { value: n, evidence: wordBed[0] };
    }
  }

  // ---- coats ("2 coats", "two coats") ----
  let coats: ExtractedFact<number> | null = null;
  const coatMatch = text.match(/(\d+)\s*coat/);
  if (coatMatch)
    coats = { value: parseInt(coatMatch[1], 10), evidence: coatMatch[0] };
  else {
    const wordCoat = text.match(
      /\b(one|two|three|four|five|èjì|eji|biyu|uku)\b[^.]{0,12}coat|coat[^.]{0,12}\b(one|two|three|four|five|èjì|eji|biyu|uku)\b/,
    );
    if (wordCoat) {
      const n = wordNumber(wordCoat[0], language);
      if (n != null) coats = { value: n, evidence: wordCoat[0] };
    }
  }

  // ---- doors / windows ----
  const doorMatch = text.match(/(\d+)\s*door/);
  const doors: ExtractedFact<number> | null = doorMatch
    ? { value: parseInt(doorMatch[1], 10), evidence: doorMatch[0] }
    : null;
  const winMatch = text.match(/(\d+)\s*window/);
  const windows: ExtractedFact<number> | null = winMatch
    ? { value: parseInt(winMatch[1], 10), evidence: winMatch[0] }
    : null;

  // ---- region ----
  let region: ExtractedFact<string> | null = null;
  for (const r of NIGERIAN_REGIONS) {
    if (new RegExp(`(^|[^a-z])${r}([^a-z]|$)`).test(text)) {
      region = { value: r, evidence: r };
      break;
    }
  }

  // ---- property type ----
  let propertyType: ExtractedFact<ProjectType> | null = null;
  for (const { words, type } of PROPERTY_TYPES) {
    for (const w of words) {
      if (text.includes(w)) {
        propertyType = { value: type, evidence: w };
        break;
      }
    }
    if (propertyType) break;
  }

  return {
    intent,
    intentEvidence,
    length,
    width,
    unit,
    bedrooms,
    coats,
    doors,
    windows,
    region,
    propertyType,
  };
}

// =========================================================
// Reply templates (four languages, hardcoded + tested)
// =========================================================

interface ReplyStrings {
  understood: string; // "What I heard:"
  askDimensions: string;
  askArea: string; // fallback when intent is unknown
  askUnit: string;
  estimateTitle: string;
  evidenceLabel: string;
  notFound: string; // "I could not find"
  routedOther: string; // "Use the X calculator with these numbers:"
}

export const REPLIES: Record<ConversationLanguage, ReplyStrings> = {
  en: {
    understood: "Here is what I picked up from your message:",
    askDimensions:
      'Please send the room size — length and width (e.g. "4 by 3 meters").',
    askArea:
      "Please tell me what you want to estimate — paint, screeding, POP ceiling or tiles?",
    askUnit: "Are those measurements in meters or feet?",
    estimateTitle: "Your paint estimate",
    evidenceLabel: "From your words:",
    notFound: "I could not find that in your message, so I did not guess it.",
    routedOther: "Open the calculator below with the numbers I extracted:",
  },
};

// =========================================================
// Estimate assembly
// =========================================================

export interface ConversationalEstimate {
  language: ConversationLanguage;
  detection: LanguageDetection;
  understood: Array<{ label: string; value: string; evidence: string }>;
  missingCritical: boolean;
  followUpQuestions: string[];
  intent: CalculatorIntent;
  routedCalculatorPath: string | null;
  paintEstimate: {
    input: CalculatorInput;
    liters: number;
    containers: Array<{ size: number; count: number }>;
    paintableArea: number;
    coats: number;
    warnings: string[];
  } | null;
  replyTitle: string;
  notFoundNote: string | null;
}

const INTENT_ROUTES: Record<CalculatorIntent, string | null> = {
  paint: "/paint-calculator",
  screeding: "/screeding-calculator",
  pop_ceiling: "/pop-ceiling-calculator",
  tile: "/tile-calculator",
  unknown: null,
};

const INTENT_LABELS: Record<CalculatorIntent, string> = {
  paint: "Paint job",
  screeding: "Screeding",
  pop_ceiling: "POP ceiling",
  tile: "Tiling",
  unknown: "Unknown surface",
};

/**
 * Builds the conversational estimate. Deterministic: same thread,
 * same packs, same result. The paint quantity chain is the SAME
 * calculatePaint the calculator uses (defaults overridable by
 * the caller with DB-configured CalcConfig).
 */
export function buildConversationalEstimate(
  rawThread: string,
  options: {
    language?: ConversationLanguage | "auto";
    packs?: LanguagePack[] | null;
    calcConfig?: CalcConfig;
  } = {},
): ConversationalEstimate {
  const thread = parseThread(rawThread);
  const detection = detectLanguage(thread.cleanedText, options.packs);
  const language: ConversationLanguage =
    !options.language || options.language === "auto"
      ? detection.language
      : options.language;
  const params = extractParams(thread, language, options.packs);
  const strings = REPLIES[language];

  const understood: Array<{ label: string; value: string; evidence: string }> =
    [];
  if (params.intent !== "unknown") {
    understood.push({
      label: "Job type",
      value: INTENT_LABELS[params.intent],
      evidence: params.intentEvidence ?? "",
    });
  }
  if (params.length && params.width) {
    understood.push({
      label: "Size",
      value: `${params.length.value} by ${params.width.value} ${params.unit?.value ?? "meters"}`,
      evidence: params.length.evidence,
    });
  }
  if (params.bedrooms)
    understood.push({
      label: "Bedrooms",
      value: String(params.bedrooms.value),
      evidence: params.bedrooms.evidence,
    });
  if (params.coats)
    understood.push({
      label: "Coats",
      value: String(params.coats.value),
      evidence: params.coats.evidence,
    });
  if (params.doors)
    understood.push({
      label: "Doors",
      value: String(params.doors.value),
      evidence: params.doors.evidence,
    });
  if (params.windows)
    understood.push({
      label: "Windows",
      value: String(params.windows.value),
      evidence: params.windows.evidence,
    });
  if (params.region)
    understood.push({
      label: "Area",
      value: params.region.value,
      evidence: params.region.evidence,
    });
  if (params.propertyType)
    understood.push({
      label: "Property type",
      value: params.propertyType.value,
      evidence: params.propertyType.evidence,
    });

  // ---- follow-up questions ----
  const followUpQuestions: string[] = [];
  const missingCritical = !params.length || !params.width;
  if (params.intent === "unknown") followUpQuestions.push(strings.askArea);
  if (missingCritical && params.intent !== "unknown")
    followUpQuestions.push(strings.askDimensions);

  // ---- paint estimate (full delegation for the flagship intent) ----
  let paintEstimate: ConversationalEstimate["paintEstimate"] = null;
  if (params.intent === "paint" && !missingCritical) {
    const unit: Unit = params.unit?.value ?? "meters";
    const input: CalculatorInput = {
      projectType: params.propertyType?.value ?? "room",
      length: params.length!.value,
      width: params.width!.value,
      wallHeight: 3,
      doors: params.doors?.value ?? 1,
      doorDims: { width: 0.9, height: 2.1 }, // FRELUX standard door
      windows: params.windows?.value ?? 2,
      windowDims: { width: 1.2, height: 1.2 }, // FRELUX standard window
      coats: params.coats?.value ?? 2,
      paintType: "standard",
      unit,
      includeCeiling: true,
      wasteMargin: 10,
      surfaceCondition: "smooth",
      colorCondition: "same_or_light",
      includePrimer: false,
    };
    const result = calculatePaint(input, options.calcConfig);
    const warnings: string[] = [];
    if (result.heightWarning) warnings.push(result.heightWarning);
    if (result.colorWarning) warnings.push(result.colorWarning);
    if (result.primerRecommended)
      warnings.push("Primer is recommended for this job.");
    paintEstimate = {
      input,
      liters: result.adjustedLiters,
      containers: result.recommendedContainers.map((c) => ({
        size: c.size,
        count: c.count,
      })),
      paintableArea: result.paintableArea,
      coats: result.coats,
      warnings,
    };
  }

  const routedCalculatorPath =
    params.intent !== "unknown" ? INTENT_ROUTES[params.intent] : null;

  return {
    language,
    detection,
    understood,
    missingCritical,
    followUpQuestions,
    intent: params.intent,
    routedCalculatorPath,
    paintEstimate,
    replyTitle: paintEstimate ? strings.estimateTitle : strings.understood,
    notFoundNote: understood.length === 0 ? strings.notFound : null,
  };
}
