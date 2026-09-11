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

// Self-referential intents (capability_query, identity_query,
// system_status) require an explicit ARCHIE/self anchor —
// otherwise everyday questions with "what/which/should" get
// misrouted away from knowledge. Deterministic precision guard.
// Second-person identity assertions ("you are actually
// ChatGPT") ARE anchored: they genuinely target the self-model
// and must keep the identity route (conflict arbitration).
const SELF_ANCHOR =
  /archie|your (abilities|skills|capabilities|tools|knowledge|memory|engine|subsystems?|systems?|status|diagnostics|name)|can you do|are you able|can you (?:convert|handle|manage|offer|support|provide)|anything you can do|do you (?:offer|support|handle|provide)|(?:do|run|give me|gimme) a (?:systems?|health|status|diagnostics) check|(?:systems?|health|status) check|are you (?:really |actually |just |some kind of |basically |merely )*(?:an? )?(?:chatgpt|gemini|claude|copilot|ai|assistant|chatbot|robot|human|person|program|llm|model)|you(?:'re| are|r)\s+(?:actually |really |just |some kind of |basically )?(?:chatgpt|gemini|claude|copilot|an ai|a robot|openai|an assistant|a chatbot)|who (?:am i|i am) talking to|who am i speaking to|who (?:is|was) behind (?:you|this|that|archie|the (?:assistant|bot|chat|agent))|tell me (?:more )?about yourself|tell me who you are|who you (?:are|were)|what (?:model|engine|system) (?:are|powers) you|who (?:made|built|created) you|what should i call you|what is operational|show diagnostics|engine status|health check|status report/i;
const SELF_ANCHOR_INTENTS = new Set([
  "capability_query",
  "identity_query",
  "system_status",
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
// Exported for the held-out leak guard (phase 4): the
// confusion test verifies no held-out phrase appears
// verbatim in the training corpus — memorization is not
// generalization.
export const CORPUS: Array<[Intent, string[]]> = [
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
      "hi there",
      "hello there",
      "hey archie",
      "good afternoon",
      "hi, its me again",
      "hey, quick question but hello first",
      "hello, are you around",
      "good to see you again",
      "howdy",
      "hey hey",
      "morning archie",
      "evening",
      "whats up",
      "how is it going",
      "how have you been",
      "how are you doing",
      "how are you doing today",
      "how is your day going",
      "how are you feeling today",
      "hey how are you doing",
      "how are you doing this morning",
      "long time no talk",
      "hi, hope you are well",
      "hello my friend",
      "hey you around",
      "top of the morning",
      "hi hi",
      "greetings and salutations",
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
      "see you later",
      "bye archie",
      "thats all for today",
      "im signing off",
      "thats everything, thanks and goodbye",
      "talk to you tomorrow",
      "speak soon",
      "ill be back later",
      "goodbye for now",
      "im heading out",
      "lets call it a day",
      "thats it from me today",
      "later archie",
      "im off for the night",
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
      "thank you so much",
      "thanks archie",
      "that really helped",
      "perfect, thank you",
      "nice one",
      "youre the best",
      "cheers, that was great",
      "im grateful for your help",
      "thanks, that answer was spot on",
      "good job",
      "thanks for the quick answer",
      "thanks for everything today",
      "thank you for all your help today",
      "thanks for all the hard work this week",
      "that saved me time, thanks",
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
      "who made you",
      "who created you",
      "who built you",
      "what model are you",
      "are you a real ai or a chatbot",
      "are you claude",
      "are you human",
      "are you a robot",
      "tell me about yourself",
      "what should i call you",
      "so who exactly am i talking to",
      "are you really archie",
      "is this an ai im talking to",
      "youre just chatgpt with a different name, right",
      "i bet you are really chatgpt underneath",
      "so youre basically a chatbot",
      "you seem like gemini to me",
      "are you sure youre not claude",
      "do you run on openai models",
      "who is behind you",
      "what engine powers you",
      "explain who you are",
      "are you an assistant",
      "who runs this assistant",
      "who is behind this chat",
      "who made this assistant",
      "is this assistant a person or a program",
      "who developed this assistant",
    ],
  ],
  [
    "capability_query",
    [
      "what can you do",
      "what are you able to do",
      "can you help me with things",
      "what are your abilities",
      "can you do math",
      "can you plan tasks for me",
      "can you remember things i tell you",
      "can you research topics for me",
      "are you able to analyze code",
      "what kind of tasks can you handle",
      "list your capabilities",
      "can you teach me things",
      "can you answer questions",
      "can you calculate quantities for projects",
      "what work are you good at",
      "show me what you can do",
      "can you check prices for me",
      "are you able to search the web",
      "can you plan my week for me",
      "what are you capable of exactly",
      "is there anything you can do for me",
      "can you handle planning",
      "do you support research tasks",
      "what services do you offer",
      "can you look things up for me",
      "are you able to learn from our chats",
      "what can you help with",
      "can you manage tasks",
      "could you plan a project for me",
      "can you convert units for me",
      "do you handle unit conversions",
      "can you do conversions between feet and meters",
      "what can you tell me about your own abilities",
      "do you offer any tools for research",
      "do you have any features for planning",
      "are there any tools you can use for estimates",
    ],
  ],
  [
    "system_status",
    [
      "how is your system running",
      "are you operational",
      "is your engine healthy",
      "status report",
      "give me your status",
      "how are your subsystems doing",
      "any errors today",
      "is everything working on your end",
      "how is your memory doing",
      "are you running at full capacity",
      "check your systems",
      "is your knowledge base working",
      "do a systems check",
      "how is your engine performing",
      "any issues i should know about",
      "are all your modules online",
      "whats your current state",
      "is your research pipeline working",
      "how are you running today",
      "are you feeling okay technically",
      "run a health check",
      "is your planning working properly",
      "everything ok on your side",
      "are you degraded right now",
      "any warnings in your system",
      "how is the engine today",
      "any problems with your subsystems",
      "how are your subsystems holding up",
      "is your subsystem health good",
      "whats the state of your systems",
    ],
  ],
  [
    "knowledge_query",
    [
      "what is screeding",
      "what is concrete curing",
      "explain how grout works",
      "tell me about epoxy grout",
      "which grout should i choose for wet areas",
      "what type of grout suits bathroom tiles",
      "what do you know about tile adhesives",
      "explain the difference between primer and sealer",
      "what is the difference between oil and water based paint",
      "when is the delivery",
      "what time is the site meeting",
      "which brand of tiles lasts longest",
      "what does curing time mean",
      "tell me about laterite as a building material",
      "what is a datum level",
      "explain what a batching plant does",
      "what is the standard room height in nigeria",
      "which roofing sheet is best for hot climates",
      "what is flexural strength",
      "explain the water cement ratio",
      "what does r-value mean in insulation",
      "tell me about the history of concrete",
      "what is a dapron wall",
      "which sand type is best for plastering",
      "what is a lintel",
      "whats a lintel",
      "whats a batching plant",
      "whats a dapron in construction",
      "explain how damp proofing works",
      "what is the difference between m20 and m25 concrete",
      "tell me about pvc ceilings vs pop ceilings",
      "what causes efflorescence on walls",
      "explain tile spacing",
      "what are the types of foundation cracks",
      "which timber is termite resistant",
      "how is the market for building materials this week",
      "what is the market situation for granite now",
      "how is the weather affecting construction season",
    ],
  ],
  [
    "howto_guidance",
    [
      "how do i prepare a wall for painting",
      "how do i mix cement mortar",
      "how to lay tiles properly",
      "steps to install a ceiling fan",
      "how do i seal a concrete floor",
      "how do i fix a leaking roof",
      "how to apply screed on a floor",
      "how do i remove old wallpaper",
      "walk me through painting a room",
      "how do i cure concrete slabs",
      "how to choose the right ladder for work",
      "how do i set out a building",
      "how to waterproof a bathroom",
      "how do i hang a heavy mirror",
      "guide me through fixing a door frame",
      "how do i fill cracks in a wall",
      "how to sharpen a chisel",
      "how do i paint over a dark color",
      "teach me how to do it properly",
      "how do i maintain my tools",
      "how to store leftover paint",
      "how do i level a floor",
      "what is the best way to clean paint brushes",
      "whats the best way to organize my toolbox",
      "what is the best way to store cement bags",
      "whats the best way to fix a sticking door",
      "best way to prep a ceiling before painting",
    ],
  ],
  [
    "task_planning",
    [
      "help me plan a project",
      "plan my week",
      "help me organize this renovation",
      "create a plan for the kitchen tiling",
      "plan the painting job for my house",
      "help me plan my day",
      "break this project into steps",
      "plan the work for next week",
      "help me organize my tasks",
      "make a schedule for the build",
      "help me plan the budget for this job",
      "organize the workflow for the site",
      "plan out the phases for this project",
      "help me plan a room repaint",
      "create a timeline for the renovation",
      "help me prioritize these tasks",
      "plan the deliveries for the materials",
      "help me sort out the work order",
      "break this into a checklist",
      "plan my morning routine",
      "help me plan a trip to the site",
      "organize my week around this deadline",
    ],
  ],
  [
    "code_analysis_request",
    [
      "analyze this function",
      "review my code",
      "analyze this component for bugs",
      "review this module please",
      "check my code for issues",
      "analyze the performance of this file",
      "review this pull request",
      "analyze this script for errors",
      "review my sql query",
      "analyze this api endpoint",
      "check this function for edge cases",
      "review the code in this branch",
      "analyze my typescript types",
      "review this regex",
      "analyze this code path",
      "look for bugs in this file",
      "review the error handling here",
      "analyze this loop for problems",
      "review our test coverage",
      "analyze why this code is slow",
    ],
  ],
  [
    "research_request",
    [
      "research the best grout brands",
      "search for concrete prices in nigeria",
      "find information about solar inverters",
      "research the latest cement standards",
      "search the web for tile suppliers near me",
      "research this topic for me",
      "look up information about damp proof membranes",
      "research the history of arc welding",
      "find out what causes concrete cancer",
      "research competitor pricing for painting services",
      "search for the best waterproofing products",
      "research current building regulations",
      "look up the specifications for this tool",
      "research eco friendly insulation options",
      "find information on rust prevention",
      "research the market for scaffolding rental",
      "search for reviews of this paint brand",
      "look into how others solved this problem",
      "research the price trends for steel",
      "find out what experts say about pop ceilings",
      "research this for me before i decide",
      "search for case studies on foundation repairs",
    ],
  ],
  [
    "math_question",
    [
      "what is 12 times 34",
      "calculate 15 percent of 8000",
      "how much is 25 plus 25",
      "whats 144 divided by 12",
      "calculate the area of a 4 by 5 rectangle",
      "what is 20 percent off 45000",
      "how much is 3.5 percent interest on 200000",
      "calculate 17 squared",
      "whats the square root of 169",
      "what is 100 minus 37.5",
      "convert 5 meters to centimeters",
      "whats 9 times 9 times 9",
      "calculate my profit if i buy at 120 and sell at 180",
      "whats 10 percent of 250000",
      "how much do i save with a 15 percent discount on 80000",
      "calculate the average of 4 8 and 12",
      "whats 350 multiplied by 6",
      "convert 90 kilograms to pounds",
    ],
  ],
  [
    "teaching",
    [
      "remember that my site is in lekki",
      "learn that i prefer epoxy grout",
      "note that the client wants white ceilings",
      "memorize this: the gate code is 4471",
      "remember the delivery is on friday",
      "note that cement prices rose again",
      "remember that i work on weekends",
      "learn this preference: i like detailed answers",
      "remember that my paint supplier is topcoat",
      "note that the project deadline is the 30th",
      "remember my site manager is called ade",
      "learn that we use 450mm blocks",
      "remember that i hate surprises in pricing",
      "teach yourself this rule: never quote without checking stock",
      "remember i confirmed the tiling date",
      "note that the roof design changed to pitched",
      "remember that granite comes from the abeokuta quarry",
      "learn that my workers start at 7am",
      "remember the structural engineer approved the design",
      "note this down: the client pays in two installments",
      "remember that we settled on matte paint",
      "learn this for future estimates: my rooms are 10 feet high",
      "store this fact: the client pays in two installments",
      "keep in mind that my client prefers saturday visits",
      "you should know that my supplier delivers on mondays",
      "you should know that i never work on sundays",
    ],
  ],
  [
    "price_query",
    [
      "check prices of granite today",
      "check the cost of sharp sand",
      "whats granite going for now",
      "what are blocks going for these days",
      "check today price of cement at the depot",
      "how much is granite per tonne now",
      "current cost of a trip of laterite",
      "whats the going rate for iron rods",
      "check the market price of plywood",
      "how much does a bundle of roofing sheets go for",
      "whats the damage on floor tiles these days",
      "check what replastering costs in my area",
      "going rate for a plumber these days",
      "what is day rate for masons around here",
      "check labor cost for plastering work",
    ],
  ],
  [
    "correction",
    [
      "no, the ratio is 1 to 4",
      "actually the price is different",
      "that is wrong",
      "you are mistaken about the date",
      "no that is not what i said",
      "thats incorrect, try again",
      "actually it is the other way around",
      "no, i said two coats not three",
      "correction: the meeting is on thursday",
      "wait, thats not right",
      "no, use the other supplier",
      "actually the site is in ikorodu not lekki",
      "thats not accurate",
      "no, the budget is 500000 not 50000",
      "hmm, that answer is off",
      "actually i need it in feet not meters",
      "no, i meant the master bedroom",
      "thats wrong, check again",
      "correction, the paint is satin not matte",
      "no, deliver on monday instead",
    ],
  ],
];

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
  // Day/date questions about a subject are KNOWLEDGE queries
  // about stored facts ("what day is the delivery", "on which
  // day is the handover") — the Naive Bayes fallback previously
  // misfiled these as capability_query on weak token overlap
  // (perf-pass defect, cx-3 probe 2026-09-11). Deterministic
  // stage-1 rule; the subject is extracted by the downstream
  // knowledge path exactly as for "when is the delivery".
  {
    intent: "knowledge_query",
    pattern:
      /^(?:on\s+)?(?:what|which)\s+(?:day|date|time)\b.{0,40}\bis\b/i,
    confidence: 0.8,
  },
  // Identity questions about ARCHIE itself are deterministic —
  // the Bayes fallback previously misfiled "who are you" as
  // knowledge_query (pre-existing defect, found by the cx-3
  // probe batch 2026-09-11).
  {
    intent: "identity_query",
    pattern:
      /^(?:who|what)\s+are\s+you\b|what\s+is\s+your\s+name|are\s+you\s+(?:archie|chatgpt|gemini|claude|an?\s+ai)|introduce\s+yourself|who\s+made\s+you/i,
    confidence: 0.9,
  },
  // Imperative commands (owner is issuing an instruction).
  {
    // Canonical capability probes — deterministic, exactly like
    // "introduce yourself" (phase 4 regression fix: the Bayes
    // token-prior fight misrouted "what can you do" after the
    // corpus grew).
    intent: "capability_query",
    pattern:
      /^(?:what|which)\s+can\s+you\s+(?:do|offer|handle|manage|plan)\b|^what\s+(?:are|were)\s+your\s+(?:abilities|skills|capabilities)\b|^(?:list|show)\s+your\s+(?:abilities|skills|capabilities)\b/i,
    confidence: 0.85,
  },
  {
    // Second-person identity ASSERTIONS ("you are actually
    // chatgpt") — deterministic, mirrors the self-anchor. These
    // must keep the identity route (conflict arbitration P8),
    // even when phrased with a teaching tail ("..., remember
    // that") the Bayes fallback now weighs toward teaching.
    intent: "identity_query",
    pattern:
      /^you(?:'re| are|r)\s+(?:actually |really |just |some kind of |basically |merely )?(?:chatgpt|gemini|claude|copilot|openai|an?\s+ai|a\s+robot|an?\s+assistant|a\s+chatbot)/i,
    confidence: 0.85,
  },
  {
    intent: "teaching",
    // "store this fact" / "keep in mind" are unambiguous
    // teaching phrasings exactly like "note that" (phase 4
    // root fix — the Bayes fallback lost them to knowledge
    // on domain-word density). NOTE: "i confirm that" is
    // deliberately NOT here — confirmations keep their own
    // dedicated confirmation path (similarity floor, phase 6).
    pattern:
      /^(?:please\s+)?(?:remember|learn|note|memorize|teach)\b|^(?:please\s+)?(?:store this|keep in mind|keep this in mind|bear in mind)\b|^you (?:should )?know that\b/i,
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
  // Counterfactual questions ("if it had not rained, would
  // the ground be dry?") are hypothetical questions, NOT
  // corrections — route them past the correction rule.
  {
    intent: "knowledge_query",
    pattern:
      /^if\b[^.?!]*\b(?:had not|hadn't|remove[d]?|didn't|stop(?:ped)?|change[d]?)\b/i,
    confidence: 0.75,
  },
  {
    // Explicit owner confirmation — VERIFICATION, not a
    // generic question (audit H1/P3). Patterns mirror the
    // engine's own EXPLICIT_CONFIRM semantics exactly; the
    // confirmation path (similarity floor, phase 6) lives in
    // the correction route. Phase 4 regression fix: the Bayes
    // fallback used to route these to correction by accident
    // of token priors — deterministic now.
    intent: "correction",
    pattern:
      /\b(?:i\s+)?confirm\s+that\b|\bverified that\b|\bverify that\b|\byou(?:'?re| were)? right about\b|\bthat'?s (?:right|correct|exact) about\b/i,
    confidence: 0.8,
  },
  {
    intent: "correction",
    pattern:
      /^(?:no[,.!?]?\s+(?:that|this|the)\b|(?:that|this)\s+is\s+(?:wrong|incorrect|not\s+accurate|not\s+right)|you\s+are\s+(?:wrong|mistaken)|actually,?\s+it\s+is\s+(?:not|different)|correct\s+that)\b/i,
    confidence: 0.85,
  },
  // Unit conversion ("convert 5 meters to centimeters") —
  // deterministic conversion beats generic question frames.
  {
    intent: "math_question",
    pattern:
      /\bconvert\s+-?\d+(?:\.\d+)?\s*[a-z°]+\s+(?:to|into|in)\s+[a-z°]+/i,
    confidence: 0.95,
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
  // Bare-noun definitional questions ("what is photosynthesis?")
  // — domain-general knowledge beats the archie-centric Bayes
  // fallback (P2 xd-2). Questions about ARCHIE itself keep
  // their own routes.
  {
    // NOTE (phase 4, 2026-09-11): "who is behind ..." asks who
    // is behind the ASSISTANT — an identity probe, not a
    // bare-noun definition. The lookahead excludes it so the
    // Bayes identity route + self-anchor guard can decide.
    intent: "knowledge_query",
    pattern:
      /^(?:what|who)\s+(?:is|are|was|were)\s+(?!archie\b|your\b|this\b|that\b|the\b|behind\b)[a-z]/i,
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
  let { intent, confidence } = classifier.classify(input);
  // Precision guard: self-referential intents require an
  // explicit ARCHIE/self anchor in the text. Everyday visitor
  // questions ("what grout should I choose...") must land in
  // knowledge paths, not the capability manifest.
  if (SELF_ANCHOR_INTENTS.has(intent) && !SELF_ANCHOR.test(input)) {
    intent = input.includes("?") ? "knowledge_query" : "howto_guidance";
    confidence = Math.min(confidence, 0.6);
  }
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

// ---------------------------------------------------------
// Compound-request decomposition (plan P2, audit N2).
// Owners speak in compound requests ("what is screeding and
// what is mortar", "estimate X then give me a status
// report", "tell me about screeding but don't mention
// prices"). The engine answers EACH clause honestly instead
// of answering only the first and silently dropping the
// rest. Splitting is CONSERVATIVE: "and" splits only before
// an intent-shaped continuation ("cement and sand" is ONE
// clause), and negated clauses become explicit constraints
// that are acknowledged and excluded — never answered.
// ---------------------------------------------------------

/** Hard cap: beyond this many clauses the request is honestly
 *  refused rather than half-remembered mid-composition. */
export const MAX_COMPOUND_CLAUSES = 4;

/** Intent-shaped continuations after "and" — the conservative
 *  split heuristic. A bare "and <noun>" stays one clause. */
const INTENT_CONTINUATION =
  "(?:what|how|why|when|where|who|which|is|are|does|do|can|could|would|should|tell|give|show|estimate|calculate|compute|plan|compare|check|remember|list|explain|describe|status|price|convert|compare)";

export interface DecomposedClause {
  /** The clause text, negation markers stripped for NLU. */
  text: string;
  /** True when the owner excluded this clause ("don't …",
   *  "… but without …") — it is a constraint, not a request:
   *  acknowledged, excluded, never answered. */
  negated: boolean;
}

/** Split a raw utterance into clauses. Returns a single
 *  clause for plain requests — decomposition is opt-in by
 *  the sentence structure itself. */
export function decomposeClauses(rawInput: string): DecomposedClause[] {
  // Code is data, not prose: fenced blocks and inline code are
  // masked BEFORE splitting so a `;` or "and" inside pasted
  // source never decomposes the request. Placeholders are
  // restored into their clause after the split.
  const masks: string[] = [];
  const mask = (text: string): string =>
    text
      .replace(/```[\s\S]*?```/g, (m) => {
        masks.push(m);
        return `\u0000${masks.length - 1}\u0000`;
      })
      .replace(/`[^`\n]*`/g, (m) => {
        masks.push(m);
        return `\u0000${masks.length - 1}\u0000`;
      });
  const unmask = (text: string): string =>
    text.replace(/\u0000(\d+)\u0000/g, (_, i) => masks[Number(i)] ?? "");
  const input = mask(rawInput);
  const negation = /\b(?:don'?t|do\s+not|doesn'?t|never|exclude|excluding|without|but\s+not)\b/i;
  const markers = new RegExp(
    "\\s*(?:;|,?\\s+then\\b|\\s+after\\s+that\\b|\\s+also\\b|,\\s+and\\s+|\\s+and\\s+(?=" +
      INTENT_CONTINUATION +
      "\\b))",
    "i",
  );

  // First split on the negation-bearing "but" — the negated
  // tail is a constraint on the WHOLE request.
  const butNeg = /\s*,?\s+but\s+(?=(?:don'?t|do\s+not|never|exclude|excluding|without)\b)/i;
  const headSplit = butNeg.exec(input);
  let head = input;
  let negatedTail: string | null = null;
  if (headSplit) {
    head = input.slice(0, headSplit.index);
    negatedTail = input.slice(headSplit.index + headSplit[0].length);
  }

  // A clause that ITSELF begins with a negation marker
  // ("don't tell me about prices", "; never mention X") is a
  // constraint from its first word — flagged like a "but"
  // tail: acknowledged, excluded, never answered.
  const leadingNegation =
    /^\s*(?:please\s+)?(?:don'?t|do\s+not|doesn'?t|never|exclude|excluding|without)\b/i;

  const clauses: DecomposedClause[] = [];
  for (const part of head.split(markers)) {
    const negated = leadingNegation.test(part);
    const text = unmask(part)
      .trim()
      .replace(/^[,;\s]+|[,;\s]+$/g, "")
      .replace(/\s+and$/i, "")
      .replace(leadingNegation, "")
      .trim();
    if (text.length === 0) continue;
    clauses.push({ text, negated });
  }
  if (negatedTail) {
    // Sub-clause recovery inside the negated tail (audit fix
    // 2026-09-11, compound-decomposition defect): the tail is
    // a CONSTRAINT on the request, but owners keep talking
    // after it — "…but don't include the ceiling, compare
    // emulsion with satin paint, then plan the purchase"
    // carries two further REQUESTS inside the tail. Reading
    // the whole tail as one exclusion silently drops them
    // (meaning loss — the exact case the audit probe caught).
    // Tail fragments are therefore classified deterministically:
    //   * a fragment led by a negation marker stays a constraint;
    //   * a fragment that is itself an imperative/interrogative
    //     request (intent-continuation verb) is recovered as a
    //     POSITIVE clause;
    //   * anything else stays a constraint (conservative: an
    //     ambiguous fragment is excluded, never fabricated
    //     into an answered request).
    // Commas separate tail fragments too (they do NOT in the
    // head — noun lists there must stay whole).
    const tailSplit = new RegExp(
      "\\s*(?:,|;|,?\\s+then\\b|\\s+after\\s+that\\b|\\s+also\\b|,\\s+and\\s+|\\s+and\\s+(?=" +
        INTENT_CONTINUATION +
        "\\b))",
      "i",
    );
    const intentLed = new RegExp(
      "^\\s*(?:please\\s+)?(?:" + INTENT_CONTINUATION + ")\\b",
      "i",
    );
    for (const part of negatedTail.split(tailSplit)) {
      const negatedFrag =
        leadingNegation.test(part) || !intentLed.test(part);
      let text = unmask(part).trim().replace(/^[,;\s]+|[,;\s]+$/g, "");
      if (negatedFrag) {
        text = text
          .replace(leadingNegation, "")
          .replace(negation, "")
          .replace(negation, "")
          .replace(/\s+/g, " ")
          .trim();
      }
      if (text.length > 0) clauses.push({ text, negated: negatedFrag });
    }
  }
  return clauses;
}

/** Compose a compound answer from per-clause responses and
 *  respected exclusions (plan P2/P5): numbered parts, visible
 *  exclusions, all-excluded redirect. Shared by the engine's
 *  internal compound path and the reasoning loop so the two
 *  can never drift apart. */
export function composeCompound(
  parts: string[],
  excluded: string[],
): string {
  let text: string;
  if (parts.length === 0) {
    text =
      "Every part of that request was an exclusion (a \"don't\") — there was nothing left to answer. Tell me what you DO want and I will do it fully.";
  } else {
    text =
      parts.length === 1
        ? parts[0]
        : parts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  }
  if (excluded.length > 0) {
    text += `\nYou also asked me NOT to: ${excluded
      .map((t) => `"${t}"`)
      .join("; ")}. Respected — that part is excluded from this answer.`;
  }
  return text;
}
