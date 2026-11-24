/**
 * Professional credential suffixes on documents.
 *
 * A BOQ reviewer credit reads "Engr. U. Okereke, FNSE". The suffix is a claim
 * about a registration, not a decoration: a reader treats it as evidence that
 * the person is a fellow of the Nigerian Society of Engineers, or holds the
 * COREN number printed beside it.
 *
 * So the suffix is printed only when an administrator has verified it, and the
 * verification is a stamp on the profile (`credential_verified_at`), not a flag
 * the member can set. An unverified claim is not printed at all: printing it
 * with a caveat would still put an unchecked registration in front of a client.
 */

/** The credential fields a profile may carry. */
export interface CredentialClaim {
  credential_suffix?: string | null;
  credential_verified_at?: string | null;
  credential_verified_by?: string | null;
}

/** Longest suffix we will print: enough for a fellowship and a COREN number. */
export const MAX_CREDENTIAL_SUFFIX = 60;

/**
 * Tidy a stated suffix: collapse whitespace, drop a leading or trailing comma
 * so "FNSE," and ", FNSE" both print as "FNSE", and cap the length.
 */
export function normaliseCredentialSuffix(
  raw: string | null | undefined,
): string {
  if (!raw) return "";
  const collapsed = raw
    .replace(/\s+/g, " ")
    // A space before a comma is a typing habit, not a credential.
    .replace(/\s+,/g, ",")
    .trim();
  const trimmed = collapsed.replace(/^[,\s]+|[,\s]+$/g, "");
  return trimmed.slice(0, MAX_CREDENTIAL_SUFFIX).trim();
}

/** True when an administrator has verified this claim. */
export function isCredentialVerified(
  claim: CredentialClaim | null | undefined,
): boolean {
  return Boolean(claim?.credential_verified_at);
}

/**
 * The suffix to print, or null.
 *
 * Both halves are required: a verified stamp with no suffix has nothing to
 * print, and a suffix with no stamp is an unverified claim.
 */
export function printableCredentialSuffix(
  claim: CredentialClaim | null | undefined,
): string | null {
  if (!isCredentialVerified(claim)) return null;
  const suffix = normaliseCredentialSuffix(claim?.credential_suffix);
  return suffix || null;
}

/**
 * A reviewer credit as it should appear on a document.
 *
 * `statedSuffix` is what the document itself carries. It prints only when the
 * caller can also show the verification: documents assembled before this
 * existed carry no verification, so their suffix is dropped rather than trusted.
 */
export function reviewerCredit(
  name: string,
  statedSuffix: string | null | undefined,
  verified: boolean,
): string {
  const cleanName = (name ?? "").replace(/\s+/g, " ").trim();
  const suffix = verified ? normaliseCredentialSuffix(statedSuffix) : "";
  if (!cleanName) return suffix;
  return suffix ? `${cleanName}, ${suffix}` : cleanName;
}

/** Names compare without case or repeated spaces, so a retyped name matches. */
function sameName(a: string, b: string): boolean {
  const clean = (value: string) =>
    value.replace(/\s+/g, " ").trim().toLowerCase();
  return Boolean(clean(a)) && clean(a) === clean(b);
}

/**
 * Decide the reviewer credit for a document being written.
 *
 * A suffix attaches to the document only when the named reviewer is the profile
 * holder and that profile carries an administrator's verification stamp. Any
 * other combination is an unverified claim and prints as the bare name.
 */
export function resolveReviewerCredential(
  reviewerName: string,
  profile: ({ full_name?: string | null } & CredentialClaim) | null | undefined,
): { verified: boolean; suffix: string | null } {
  if (!profile) return { verified: false, suffix: null };
  const matches = sameName(reviewerName ?? "", profile.full_name ?? "");
  const suffix = printableCredentialSuffix(profile);
  if (!matches || !suffix) return { verified: false, suffix: null };
  return { verified: true, suffix };
}
