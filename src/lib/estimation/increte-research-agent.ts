/**
 * Evidence intake and validation boundary for Increte research.
 * This module records observations supplied by an operator; it does not
 * claim background web crawling or activate production rules automatically.
 */
export type ResearchVerification = "unverified" | "verified" | "conflicting" | "unavailable" | "expired";
export interface IncreteResearchFinding {
  id: string;
  marketCode: string;
  product: string;
  observation: string;
  technicalEvidence: string;
  sourceUrl: string;
  observedAt: string;
  verification: ResearchVerification;
  approvedForActiveRules: boolean;
}
const MAX_AGE_DAYS = 90;

export function validateResearchFinding(value: IncreteResearchFinding, now = new Date()): string[] {
  const issues: string[] = [];
  if (!/^[A-Z]{2}$/.test(value.marketCode)) issues.push("Market code must be an ISO-style two-letter code.");
  if (!value.product.trim()) issues.push("Product is required.");
  if (!value.observation.trim()) issues.push("Observation is required.");
  if (!value.technicalEvidence.trim()) issues.push("Technical evidence is required.");
  try {
    const url = new URL(value.sourceUrl);
    if (url.protocol !== "https:") issues.push("Source URL must use HTTPS.");
  } catch { issues.push("A valid source URL is required."); }
  const observed = new Date(value.observedAt);
  if (!Number.isFinite(observed.getTime()) || observed > now) issues.push("Observation date must be valid and not in the future.");
  else if ((now.getTime() - observed.getTime()) / 86400000 > MAX_AGE_DAYS && value.verification === "verified") issues.push("Verified finding has expired; recheck the source.");
  if (value.approvedForActiveRules && value.verification !== "verified") issues.push("Only verified findings can be submitted for active-rule approval.");
  return issues;
}

export function isFindingCurrent(value: IncreteResearchFinding, now = new Date()): boolean {
  const age = (now.getTime() - new Date(value.observedAt).getTime()) / 86400000;
  return Number.isFinite(age) && age >= 0 && age <= MAX_AGE_DAYS && value.verification === "verified";
}
