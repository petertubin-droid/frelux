// =========================================================
// Name matching for client identity checks.
//
// A Nigerian bank account name and a government ID name are the same person
// written by two different systems: the bank may have the middle name, the ID
// may not; one may run middle-first, the other surname-first; both get cut off
// at a character limit; neither uses the same punctuation. A plain string
// comparison fails all four cases, so this scores token sets instead.
//
// Pure and dependency free: the edge function runs it, and the test suite
// imports the same file so there is only one implementation.
// =========================================================

export const NAME_TITLES = new Set([
  "MR",
  "MRS",
  "MISS",
  "MS",
  "DR",
  "ENGR",
  "ENG",
  "CHIEF",
  "CHIEFTESS",
  "ALHAJI",
  "ALHAJA",
  "HAJI",
  "PASTOR",
  "REV",
  "REVEREND",
  "PROF",
  "PROFESSOR",
  "BARR",
  "BARRISTER",
  "SIR",
  "LADY",
  "DEACON",
  "EVANG",
  "EVANGELIST",
  "HON",
  "PRINCE",
  "PRINCESS",
  "OBA",
  "OTUNBA",
  "ESQ",
  "JNR",
  "SNR",
  "II",
  "III",
  "CHIEFTAINCY",
  "ARC",
  "SURV",
  "MALLAM",
  "MALAM",
  "IMAM",
  "BISHOP",
]);

/** Uppercase, strip accents and punctuation, drop titles, keep name tokens. */
export function normaliseNameTokens(
  value: string | null | undefined,
): string[] {
  if (!value) return [];
  const flat = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    // An apostrophe joins a name, it does not separate it: O'KON stays OKON.
    .replace(/[\u2018\u2019'`\u00b4]/g, "")
    .replace(/[^A-Z]+/g, " ")
    .trim();
  if (!flat) return [];
  return flat
    .split(/\s+/)
    .filter((token) => token.length > 0 && !NAME_TITLES.has(token));
}

/** Two tokens agree when they match exactly, or one is a truncation of the other. */
export function tokensAgree(a: string, b: string): boolean {
  if (a === b) return true;
  const [shortName, longName] = a.length <= b.length ? [a, b] : [b, a];
  // A three character stub is enough to be a truncation but too short to be
  // evidence on its own, so require the longer side to carry the meaning.
  return shortName.length >= 3 && longName.startsWith(shortName);
}

function intersectionSize(a: string[], b: string[]): number {
  const used = new Set<number>();
  let hits = 0;
  for (const token of a) {
    for (let i = 0; i < b.length; i += 1) {
      if (used.has(i)) continue;
      if (tokensAgree(token, b[i])) {
        used.add(i);
        hits += 1;
        break;
      }
    }
  }
  return hits;
}

export interface NameMatchResult {
  score: number;
  reason: string;
}

/**
 * Score two personal names between 0 and 1.
 *
 * The score is deliberately generous for a full containment (a bank adding a
 * middle name does not make someone a different person) and unforgiving when
 * only one of two surnames lines up.
 */
export function scoreNameMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): NameMatchResult {
  const a = normaliseNameTokens(left);
  const b = normaliseNameTokens(right);

  if (a.length === 0 || b.length === 0) {
    return { score: 0, reason: "missing_name" };
  }

  const joinedA = a.join("");
  const joinedB = b.join("");
  if (joinedA === joinedB) {
    return { score: 1, reason: "identical_after_normalisation" };
  }

  const hits = intersectionSize(a, b);
  if (hits === 0) {
    return { score: 0, reason: "no_shared_name_tokens" };
  }

  const union = new Set([...a, ...b]).size;
  const jaccard = hits / union;
  const containA = hits / a.length;
  const containB = hits / b.length;
  const containment = Math.max(containA, containB);

  // Containment carries a small discount so a one-word overlap cannot score
  // like a full match, but a genuine middle name difference still clears it.
  const containmentScore = containment * 0.95;
  const score = Math.min(1, Math.max(jaccard, containmentScore));

  const rounded = Math.round(score * 1000) / 1000;
  const reason =
    containment === 1
      ? "one_name_contains_the_other"
      : `token_overlap_${hits}_of_${union}`;
  return { score: rounded, reason };
}

export type NameMatchDecision = "verified" | "pending" | "rejected";

export interface NameMatchVerdict {
  score: number;
  reason: string;
  decision: NameMatchDecision;
  explanation: string;
}

/**
 * Turn a score into a decision. Thresholds come from worker_safety_settings so
 * an admin can tighten them without a deploy.
 */
export function decideNameMatch(
  left: string | null | undefined,
  right: string | null | undefined,
  thresholds: { autoApprove: number; manualReview: number },
): NameMatchVerdict {
  const { score, reason } = scoreNameMatch(left, right);
  const autoApprove = thresholds.autoApprove;
  const manualReview = Math.min(thresholds.manualReview, autoApprove);

  if (reason === "missing_name") {
    return {
      score,
      reason,
      decision: "pending",
      explanation:
        "No account name to compare against yet, so a person has to look at this one.",
    };
  }

  if (score >= autoApprove) {
    return {
      score,
      reason,
      decision: "verified",
      explanation: `The ID name and the funding account name agree (score ${score}).`,
    };
  }

  if (score >= manualReview) {
    return {
      score,
      reason,
      decision: "pending",
      explanation: `The names are close but not close enough to accept automatically (score ${score}). A person has to confirm this one.`,
    };
  }

  return {
    score,
    reason,
    decision: "rejected",
    explanation: `The ID name and the funding account name do not look like the same person (score ${score}).`,
  };
}
