/**
 * Reads a described building project and says what it is and what is known
 * about its size.
 *
 * This is deliberately not an AI call. The page promises that quantities come
 * from the deterministic engines, so the reading that decides which engine to
 * open, and which numbers to enter in it, must itself be deterministic and
 * inspectable. The model is asked afterwards only to explain a cost.
 *
 * Nothing is invented: a value appears in the result only when the sentence
 * contained it.
 */

export interface CalculatorIntent {
  key: string;
  label: string;
  path: string;
  matched: string[];
}

export interface ProjectRect {
  length: number;
  width: number;
  unit: "m" | "ft" | null;
}

export interface ProjectDimensions {
  rects: ProjectRect[];
  areasM2: number[];
  rooms: number | null;
  doors: number | null;
  windows: number | null;
}

export interface ProjectReading {
  /** The calculator this project belongs in, or null when nothing matched. */
  intent: CalculatorIntent | null;
  dimensions: ProjectDimensions;
  /** What is known, in one line, for the AI prompt and for the screen. */
  summaryLines: string[];
  /** What the reading could not find. Each is something the reader must add. */
  missing: string[];
}

interface IntentSpec {
  key: string;
  label: string;
  path: string;
  keywords: string[];
}

// Ordered by how specific the trade is: a phrase such as "roof truss" scores
// above the bare word "building", which most descriptions contain.
const INTENTS: readonly IntentSpec[] = [
  {
    key: "paint",
    label: "Paint Calculator",
    path: "/paint-calculator",
    keywords: [
      "painting",
      "paint",
      "emulsion",
      "primer",
      "undercoat",
      "gloss",
      "repaint",
    ],
  },
  {
    key: "tile",
    label: "Tile Calculator",
    path: "/tile-calculator",
    keywords: [
      "retiling",
      "retile",
      "tiling",
      "tiles",
      "tile",
      "ceramic",
      "porcelain",
      "grout",
    ],
  },
  {
    key: "screeding",
    label: "Screeding Cost Estimator",
    path: "/screeding-cost-estimator",
    keywords: ["screeding", "screed", "floor levelling", "self levelling"],
  },
  {
    key: "pop",
    label: "POP Ceiling Calculator",
    path: "/pop-ceiling-calculator",
    keywords: [
      "pop ceiling",
      "pop",
      "gypsum ceiling",
      "ceiling",
      "pvc ceiling",
    ],
  },
  {
    key: "roof",
    label: "Roof Framing Calculator",
    path: "/roof-framing-calculator",
    keywords: [
      "roof truss",
      "trusses",
      "truss",
      "rafter",
      "purlin",
      "roofing",
      "roof",
    ],
  },
  {
    key: "electrical",
    label: "Electrical Calculator",
    path: "/tools/services/electrical",
    keywords: [
      "electrical",
      "wiring",
      "rewire",
      "sockets",
      "socket",
      "conduit",
      "breaker",
    ],
  },
  {
    key: "fence",
    label: "Fence Block Calculator",
    path: "/fence-block-calculator",
    keywords: ["fencing", "fence", "perimeter wall", "compound wall"],
  },
  {
    key: "doors",
    label: "Doors and Windows Estimator",
    path: "/tools/components/doors-windows",
    keywords: ["doors", "door", "windows", "window"],
  },
  {
    key: "build",
    label: "Build-to-Roof Estimator",
    path: "/build-to-roof-estimator",
    keywords: [
      "blockwork",
      "block work",
      "bungalow",
      "duplex",
      "storey building",
      "superstructure",
      "foundation",
      "building a house",
      "build a house",
      "blocks",
    ],
  },
];

const UNIT_TO_METRES: Record<"m" | "ft", number> = { m: 1, ft: 0.3048 };

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bmetres?\b|\bmeters?\b|\bmetre\b|\bmeter\b/g, "m")
    .replace(/\bfeet\b|\bfoot\b|\bft\b/g, "ft")
    .replace(/\bsquare metres?\b|\bsquare meters?\b/g, "m2")
    .replace(/\bsquare feet\b|\bsq\.? ?ft\b/g, "ft2")
    .replace(/[×*]/g, "x")
    .replace(/\bby\b/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the keyword sits on word boundaries in the haystack. */
function boundedAt(haystack: string, index: number, keyword: string): boolean {
  const before = haystack[index - 1];
  const after = haystack[index + keyword.length];
  const okBefore = before === undefined || !/[a-z0-9]/.test(before);
  const okAfter = after === undefined || !/[a-z0-9]/.test(after);
  return okBefore && okAfter;
}

/** Which calculator the described work belongs in, with the words that
 *  decided it. Keywords are scored by how many words they contain, so a
 *  specific phrase outranks a general one, and the earliest mention wins a
 *  tie. */
export function detectCalculatorIntent(text: string): CalculatorIntent | null {
  const haystack = normalise(text);
  if (!haystack) return null;
  let best: {
    spec: IntentSpec;
    score: number;
    at: number;
    hits: string[];
  } | null = null;
  for (const spec of INTENTS) {
    const hits: string[] = [];
    let score = 0;
    let at = Number.POSITIVE_INFINITY;
    for (const keyword of spec.keywords) {
      const index = haystack.indexOf(keyword);
      if (index === -1) continue;
      if (!boundedAt(haystack, index, keyword)) continue;
      hits.push(keyword);
      score += keyword.split(" ").length * 2 + 1;
      at = Math.min(at, index);
    }
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && at < best.at)) {
      best = { spec, score, at, hits };
    }
  }
  if (!best) return null;
  return {
    key: best.spec.key,
    label: best.spec.label,
    path: best.spec.path,
    matched: best.hits,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function firstCount(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

/** Dimensions written in the sentence, in the unit they were written in.
 *  A pair with no unit stays unit-less rather than being assumed metric. */
export function parseProjectDimensions(text: string): ProjectDimensions {
  const haystack = normalise(text);
  const rects: ProjectRect[] = [];
  const pair = /(\d+(?:\.\d+)?)\s*(m|ft)?\s*x\s*(\d+(?:\.\d+)?)\s*(m|ft)?/g;
  for (const match of haystack.matchAll(pair)) {
    const unit = (match[2] ?? match[4] ?? null) as "m" | "ft" | null;
    rects.push({ length: Number(match[1]), width: Number(match[3]), unit });
  }

  const areasM2: number[] = [];
  const area = /(\d+(?:\.\d+)?)\s*(m2|ft2)/g;
  for (const match of haystack.matchAll(area)) {
    const value = Number(match[1]);
    areasM2.push(
      match[2] === "ft2"
        ? round2(value * UNIT_TO_METRES.ft ** 2)
        : round2(value),
    );
  }

  const rooms = firstCount(haystack, [
    /(\d+)\s*(?:bedroom|bedrooms|bed room|bed)\b/,
    /(\d+)\s*(?:room|rooms)\b/,
  ]);
  const doors = firstCount(haystack, [/(\d+)\s*doors?\b/]);
  const windows = firstCount(haystack, [/(\d+)\s*windows?\b/]);

  return { rects, areasM2, rooms, doors, windows };
}

function metres(value: number, unit: "m" | "ft" | null): number | null {
  if (!unit) return null;
  return round2(value * UNIT_TO_METRES[unit]);
}

/**
 * The full reading: what the project is, what size it is, and what is still
 * unknown. `summaryLines` is written to be read by a person and reused as the
 * AI prompt context, so the model sees exactly the numbers on screen.
 */
export function readProject(text: string): ProjectReading {
  const intent = detectCalculatorIntent(text);
  const dimensions = parseProjectDimensions(text);
  const summaryLines: string[] = [];
  const missing: string[] = [];

  if (intent) {
    summaryLines.push(
      `Work type: ${intent.label} (read from: ${intent.matched.join(", ")}).`,
    );
  } else {
    missing.push("the trade or work type");
  }

  if (dimensions.rects.length > 0) {
    const described = dimensions.rects
      .map((rect) => {
        const size = `${rect.length} x ${rect.width} ${rect.unit ?? "(unit not stated)"}`;
        if (!rect.unit) return `${size}, unit not stated`;
        return `${size} (${metres(rect.length, rect.unit)} m x ${metres(
          rect.width,
          rect.unit,
        )} m)`;
      })
      .join("; ");
    summaryLines.push(`Stated area: ${described}.`);
  } else if (dimensions.areasM2.length > 0) {
    summaryLines.push(
      `Stated area: ${dimensions.areasM2.map((a) => `${a} m2`).join(", ")}.`,
    );
  } else {
    missing.push("length and width, or a floor area");
  }

  if (dimensions.rooms !== null) {
    summaryLines.push(`Rooms stated: ${dimensions.rooms}.`);
  }
  if (dimensions.doors !== null) {
    summaryLines.push(`Doors stated: ${dimensions.doors}.`);
  }
  if (dimensions.windows !== null) {
    summaryLines.push(`Windows stated: ${dimensions.windows}.`);
  }

  return { intent, dimensions, summaryLines, missing };
}

/** Context handed to the AI panel: the visitor's own words plus the reading,
 *  so the model cannot quietly substitute a different project. */
export function buildProjectContext(text: string): string {
  const reading = readProject(text);
  const lines = [
    "Smart Calculator: the visitor described this project in their own words.",
    `Their description: """${text.trim()}"""`,
  ];
  if (reading.summaryLines.length > 0) {
    lines.push(
      `Reading of that description:\n${reading.summaryLines.join("\n")}`,
    );
  }
  lines.push(
    reading.intent
      ? `The deterministic calculator for this work is ${reading.intent.label}. Quantities must be attributed to that calculator, not invented here.`
      : "No calculator matched, so treat any quantity as illustrative and say so.",
  );
  if (reading.missing.length > 0) {
    lines.push(`Still missing: ${reading.missing.join("; ")}.`);
  }
  return lines.join("\n");
}
