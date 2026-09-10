// =========================================================
// ARCHIE NATIVE ENGINE — NATURAL LANGUAGE UNDERSTANDING
//
// Real NLU, deterministic and measurable:
//   * normalizer + tokenizer
//   * entity extraction (numbers, quantities, URLs, emails,
//     file paths, code references, dates)
//   * TF-IDF vectorizer (real term-frequency × inverse
//     document-frequency over the corpus)
//   * multinomial Naive Bayes intent classifier TRAINED AT
//     BOOT from a labeled corpus. This is genuine statistical
//     learning — small scale, deterministic, zero external
//     APIs. Accuracy is MEASURED by the test suite over a
//     held-out labeled set.
// Not a canned chatbot: the classifier routes understanding;
// it never produces responses.
// =========================================================

import type { MemoryTurn, ToolSpecInternal } from "./types.ts";

// ---------------------------------------------------------
// Normalization & tokenization
// ---------------------------------------------------------
export function normalize(input: string): string {
  return input.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "am",
  "do",
  "does",
  "did",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "and",
  "or",
  "but",
  "at",
  "by",
  "from",
  "as",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "we",
  "they",
  "me",
  "my",
  "your",
  "please",
  "can",
  "could",
  "would",
  "will",
  "shall",
  "may",
  "might",
]);

export function tokenize(input: string): string[] {
  const normalized = normalize(input);
  const raw = normalized.match(/[a-z0-9+#._/]+/g) ?? [];
  return raw
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => t.replace(/^[._/-]+|[._/-]+$/g, ""))
    .filter((t) => t.length > 1);
}

// ---------------------------------------------------------
// Entity extraction — real patterns, honest typing
// ---------------------------------------------------------
export interface Entities {
  numbers: number[];
  quantities: { value: number; unit: string }[];
  urls: string[];
  emails: string[];
  filePaths: string[];
  codeRefs: string[];
  dates: string[];
  questionText: string | null;
}

export function extractEntities(input: string): Entities {
  const quantities: { value: number; unit: string }[] = [];
  for (const m of input.matchAll(
    /(\d+(?:\.\d+)?)\s*(mm|cm|m|km|kg|g|mg|l|ml|sqm|sq ft|ft|m2|m²|s|ms|hours?|minutes?|days?|naira|₦|\$|usd|ngn|percent|%)/gi,
  )) {
    quantities.push({ value: Number(m[1]), unit: m[2].toLowerCase() });
  }
  const questionMatch = input.match(
    /^(?:what|who|when|where|why|how|which|whose|is|are|can|does|do|explain|define|describe|tell)\b/i,
  );
  return {
    numbers: (input.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number),
    quantities,
    urls: [...input.matchAll(/https?:\/\/[^\s)"']+/gi)].map((m) => m[0]),
    emails: [...input.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)].map((m) => m[0]),
    filePaths: [
      ...input.matchAll(
        /(?:[\w.-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|py|sql|json|md|css|html)/g,
      ),
    ].map((m) => m[0]),
    codeRefs: [
      ...input.matchAll(/\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?\b/g),
    ]
      .filter(
        (m) =>
          /\.(ts|tsx|js|jsx|py|sql)$/.test(m[0]) ||
          /^(function|const|class|import|export|def)\b/i.test(
            input.slice(Math.max(0, m.index - 12), m.index),
          ),
      )
      .map((m) => m[0])
      .slice(0, 10),
    dates: [...input.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((m) => m[0]),
    questionText: questionMatch ? input : null,
  };
}

// ---------------------------------------------------------
// TF-IDF vectorizer (real; used for memory + fact salience)
// ---------------------------------------------------------
export class TfIdfIndex {
  private docFreq = new Map<string, number>();
  private docs = 0;

  addDoc(tokens: string[]): void {
    this.docs += 1;
    for (const term of new Set(tokens)) {
      this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
    }
  }

  /** IDF-weighted term-frequency vector. */
  vectorize(tokens: string[]): Map<string, number> {
    const v = new Map<string, number>();
    const idf = (t: string) =>
      Math.log((1 + this.docs) / (1 + (this.docFreq.get(t) ?? 0))) + 1;
    for (const t of tokens) {
      v.set(t, (v.get(t) ?? 0) + 1);
    }
    for (const [t, tf] of v) v.set(t, (tf / tokens.length || tf) * idf(t));
    return v;
  }
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, x] of a) na += x * x;
  for (const [, y] of b) nb += y * y;
  if (na === 0 || nb === 0) return 0;
  for (const [t, x] of a) {
    const y = b.get(t);
    if (y) dot += x * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------------------------------------------------------
// Intent classifier — multinomial Naive Bayes, trained at
// boot from a labeled corpus. Additive (Laplace) smoothing.
// ---------------------------------------------------------
export const INTENTS = [
  "greeting",
  "farewell",
  "gratitude",
  "identity_query",
  "capability_query",
  "system_status",
  "knowledge_query",
  "howto_guidance",
  "task_planning",
  "code_analysis_request",
  "research_request",
  "price_query",
  "documents_query",
  "images_query",
  "voice_query",
  "social_query",
  "family_query",
  "construction_calc",
  "math_question",
  "teaching",
  "correction",
] as const;

export type Intent = (typeof INTENTS)[number];

/** Labeled training corpus — the classifier's genuine training data. */
const CORPUS: Array<[Intent, string[]]> = [
  [
    "greeting",
    [
      "hello archie",
      "hi archie",
      "hey there",
      "good morning",
      "good evening",
      "how are you today",
      "yo archie you around",
      "greetings",
    ],
  ],
  [
    "farewell",
    [
      "bye for now",
      "goodbye archie",
      "talk later",
      "catch you later",
      "im done for today",
      "good night",
    ],
  ],
  [
    "gratitude",
    [
      "thank you",
      "thanks a lot",
      "that was helpful",
      "great work",
      "appreciate it",
      "well done",
    ],
  ],
  [
    "identity_query",
    [
      "who are you",
      "what are you",
      "are you archie",
      "introduce yourself",
      "what is your name",
      "are you chatgpt",
      "are you gemini",
      "do you use openai",
    ],
  ],
  [
    "capability_query",
    [
      "what can you do",
      "list your capabilities",
      "what are your abilities",
      "what skills do you have",
      "what is operational",
      "show diagnostics",
      "engine status",
    ],
  ],
  [
    "system_status",
    [
      "system status",
      "are all systems live",
      "health check",
      "is everything running",
      "status report",
      "give me a status update",
    ],
  ],
  [
    "knowledge_query",
    [
      "what is screeding",
      "explain portland cement",
      "tell me about concrete curing",
      "define retrofits",
      "what does rcc mean",
      "who designed the eiffel tower",
      "when was concrete invented",
      "how strong is grade 25 concrete",
    ],
  ],
  [
    "howto_guidance",
    [
      "how do i calculate cement bags",
      "how to mix mortar",
      "guide me through estimating a slab",
      "steps to plaster a wall",
      "walk me through the process",
      "best way to cure concrete",
    ],
  ],
  [
    "task_planning",
    [
      "plan a roofing project",
      "create a plan for my build",
      "break this project into tasks",
      "help me plan phases",
      "what steps are needed to build a bungalow",
      "plan the workflow",
    ],
  ],
  [
    "code_analysis_request",
    [
      "analyze this file",
      "review my code",
      "check src/lib/calc.ts",
      "what functions are in this module",
      "complexity report",
      "find issues in the code",
      "look at app.tsx",
    ],
  ],
  [
    "research_request",
    [
      "search the web for",
      "research the latest news",
      "look up current prices",
      "find information online about",
      "google the following",
      "cross check this online",
      "research osun state property prices",
    ],
  ],
  [
    "math_question",
    [
      "what is 25 times 48",
      "calculate 12.5 percent of 8000",
      "compute 348 divided by 12",
      "solve 15 + 7 times 3",
      "how much is 5 percent of 250000",
      "convert 45 square meters",
    ],
  ],
  [
    "teaching",
    [
      "learn this",
      "remember that",
      "note this down",
      "new knowledge for you",
      "i want to teach you",
      "save this fact",
      "you should know this",
    ],
  ],
  [
    "correction",
    [
      "that is wrong",
      "you are mistaken",
      "actually it is different",
      "correct that",
      "that is not accurate",
      "no the right answer is",
      "update your knowledge",
    ],
  ],
];

export interface NluResult {
  intent: Intent;
  confidence: number;
  entities: Entities;
  tokens: string[];
}

export class IntentClassifier {
  private priors = new Map<Intent, number>();
  private likelihood = new Map<Intent, Map<string, number>>();
  private vocab = new Set<string>();
  private index = new TfIdfIndex();
  private trained = false;

  train(corpus: Array<[Intent, string[]]> = CORPUS): void {
    const counts = new Map<Intent, number>();
    for (const [intent, utterances] of corpus) {
      counts.set(intent, (counts.get(intent) ?? 0) + utterances.length);
      for (const utterance of utterances) {
        const tokens = tokenize(utterance);
        this.index.addDoc(tokens);
        for (const t of tokens) this.vocab.add(t);
      }
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    for (const [intent, n] of counts) {
      this.priors.set(intent, n / total);
      this.likelihood.set(intent, new Map());
    }
    for (const [intent, utterances] of corpus) {
      for (const utterance of utterances) {
        for (const t of tokenize(utterance)) {
          const map = this.likelihood.get(intent)!;
          map.set(t, (map.get(t) ?? 0) + 1);
        }
      }
    }
    this.trained = true;
  }

  classify(input: string): {
    intent: Intent;
    confidence: number;
    scores: Map<Intent, number>;
  } {
    if (!this.trained) this.train();
    const tokens = tokenize(input).filter((t) => this.vocab.has(t));
    const V = this.vocab.size;
    const logScores = new Map<Intent, number>();
    for (const intent of this.priors.keys()) {
      let score = Math.log(this.priors.get(intent)!);
      const counts = this.likelihood.get(intent)!;
      const totalTokens = [...counts.values()].reduce((a, b) => a + b, 0);
      for (const t of tokens) {
        score += Math.log(((counts.get(t) ?? 0) + 1) / (totalTokens + V));
      }
      logScores.set(intent, score);
    }
    const sorted = [...logScores.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    const runner = sorted[1];
    // Confidence: normalized posterior gap between top two classes.
    const gap = runner ? top[1] - runner[1] : 10;
    const confidence = Math.max(0.05, Math.min(0.99, gap / (gap + 1)));
    return {
      intent: tokens.length === 0 ? "knowledge_query" : top[0],
      confidence,
      scores: logScores,
    };
  }
}

// ---------------------------------------------------------
// Two-stage NLU: a deterministic rule cascade for imperative
// and definitional patterns first, then the trained Naive
// Bayes classifier as the statistical fallback. (Standard
// staged-intent design: rules catch unambiguous commands,
// the classifier generalizes the rest.)
// ---------------------------------------------------------
const RULE_CASCADE: Array<{
  intent: Intent;
  pattern: RegExp;
  confidence: number;
}> = [
  // Imperative commands (owner is issuing an instruction).
  {
    intent: "teaching",
    pattern: /^(?:please\s+)?(?:remember|learn|note|memorize|teach)\b/i,
    confidence: 0.85,
  },
  {
    intent: "research_request",
    pattern:
      /^(?:please\s+)?(?:research|search|google|look\s+up|find\s+information)\b/i,
    confidence: 0.85,
  },
  {
    // Interrogative price questions about materials route to the
    // market intelligence lookup ("how much is a bag of cement",
    // "price of granite"). Imperative research commands above
    // still win ("look up the price of..."), and pure arithmetic
    // is matched by the math rule below — this rule requires an
    // explicit price/cost/unit-sale phrase.
    intent: "price_query",
    pattern:
      /^(?:what(?:'s|\u2019s| is)?\s+(?:the\s+)?(?:current\s+|market\s+|latest\s+)*price\s+of|price\s+of|(?:current|market|latest)\s+price\s+of|how\s+much\s+(?:is|does|are)\s+(?:a\s+|an\s+|the\s+)?(?:bag|trip|tonne|ton|carton|block|drum|pound)s?\s+of|how\s+much\s+(?:is|does|are)\b.+\b(?:cost|price)\b|how\s+much\s+is\b.+\bper\s+(?:bag|tonne|ton|unit|kg|square\s+meter)|\b(?:cement|granite|sand|sharp\s+sand|laterite|blocks?|iron\s+rods?|reinforcement|paint|tiles?)\b[^.?!]*\bprice\b)\b/i,
    confidence: 0.9,
  },
  {
    // Document pipeline status ("what documents have I ingested").
    intent: "documents_query",
    pattern:
      /(?:what|which|show|list)\b[^.?!]*\b(?:ingested |processed |uploaded )?documents?\b|\bmy documents?\b|\bdocument (?:pipeline|status)\b|\bwhat did the (?:plan|drawing|spec) (?:say|extract)\b/i,
    confidence: 0.85,
  },
  {
    // Image pipeline status ("what images have I ingested").
    intent: "images_query",
    pattern:
      /(?:what|which|show|list)\b[^.?!]*\b(?:ingested |processed |uploaded )?images?\b|\bmy images?\b|\bimage (?:pipeline|status|analysis)\b/i,
    confidence: 0.85,
  },
  {
    // Voice bank status. NOTE: transcription is NOT claimed here —
    // the voice subsystem stays honestly NOT_OPERATIONAL for
    // understanding speech; this rule only routes bank-status
    // questions to the real voice-sample adapter.
    intent: "voice_query",
    pattern:
      /\bvoice bank\b|\bvoice samples?\b|\bmy voice recordings?\b|\bvoice recordings? status\b/i,
    confidence: 0.85,
  },
  {
    // Social account/connection status.
    intent: "social_query",
    pattern:
      /\bsocial (?:accounts?|media|status|connections?)\b|\bbrand (?:accounts?|mentions?|status)\b|\bmy social\b/i,
    confidence: 0.85,
  },
  {
    // Trusted-people roster.
    intent: "family_query",
    pattern:
      /\bwho (?:is|are) (?:in|on) my (?:trusted|family|people)\b|\btrusted[- ]people\b|\btrusted people\b|\bfamily (?:roster|members?|status)\b|\bmy (?:family|people) roster\b/i,
    confidence: 0.85,
  },
  {
    // Deterministic construction calculators: require BOTH a
    // material keyword AND a quantity/dimension cue, so plain
    // price questions ("how much is a bag of cement") are
    // already served by the price rule above and never land
    // here.
    intent: "construction_calc",
    pattern:
      /\b(?:blocks?|bricks?)\b[^.?!]*\b(?:wall|meter|metre|feet|\d)|\bhow (?:many|much)\b[^.?!]*\b(?:blocks?|bricks?)\b|\bpaint\b[^.?!]*\b(?:square|meter|metre|feet|area|room|wall|\d)|\bhow much paint\b|\bcement\b[^.?!]*\b(?:cubic|volume|m3|concrete|\d[^.?!]*bags?\b)|\bhow many (?:bags )?of? ?cement\b/i,
    confidence: 0.9,
  },
  {
    intent: "task_planning",
    pattern:
      /^(?:please\s+)?(?:help\s+me\s+)?(?:plan|organize|create\s+a\s+plan|break\s+this)\b/i,
    confidence: 0.85,
  },
  {
    intent: "code_analysis_request",
    pattern: /^(?:please\s+)?(?:analyze|review)\b/i,
    confidence: 0.85,
  },
  {
    intent: "correction",
    pattern:
      /^(?:no[,.!?]?\s+(?:that|this|the)\b|(?:that|this)\s+is\s+(?:wrong|incorrect|not\s+accurate|not\s+right)|you\s+are\s+(?:wrong|mistaken)|actually,?\s+it\s+is\s+(?:not|different)|correct\s+that)\b/i,
    confidence: 0.85,
  },
  // Arithmetic signal — deterministic math beats generic question frames.
  {
    intent: "math_question",
    pattern:
      /\d+\s*(?:times|plus|minus|divided\s+by|multiplied\s+by|over|[-+*/^])\s*\d+|\d+(?:\.\d+)?\s*(?:percent|%)\s*of\s*\d+/i,
    confidence: 0.9,
  },
  // Definitional interrogatives ("what is the X of Y").
  {
    intent: "knowledge_query",
    pattern: /^(?:what|who)\s+(?:is|are|was|were)\s+(?:the|a|an|this|that)\b/i,
    confidence: 0.7,
  },
];

/** One deterministic NLU pass over raw owner input. */
export function understand(input: string): NluResult {
  const tokens = tokenize(input);
  // Stage 1: rule cascade over the raw input.
  for (const rule of RULE_CASCADE) {
    if (rule.pattern.test(input)) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        entities: extractEntities(input),
        tokens,
      };
    }
  }
  // Stage 2: trained Naive Bayes classifier.
  const classifier = new IntentClassifier();
  classifier.train();
  const { intent, confidence } = classifier.classify(input);
  return {
    intent,
    confidence,
    entities: extractEntities(input),
    tokens,
  };
}

/** Convert ARCHIE tool specs into a compact description for
 *  tool-aware composition (never executed here). */
export function describeTools(tools: ToolSpecInternal[]): string {
  return tools.map((t) => t.name).join(", ");
}

/** Build a working-memory turn with its retrieval vector. */
export function memoryTurnFromText(
  role: "owner" | "archie",
  text: string,
  index: TfIdfIndex,
  at = Date.now(),
): MemoryTurn {
  const tokens = tokenize(text);
  index.addDoc(tokens);
  return { role, text, at, vector: index.vectorize(tokens) };
}
