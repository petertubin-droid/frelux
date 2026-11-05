/**
 * Registration verification policy
 *
 * Phone (SMS) verification is switched off for registration because the
 * SMS gateway (Termii) is not configured on this deployment: the
 * send-sms-otp edge function returns 503 without TERMII_API_KEY, which
 * locked new professionals out of finishing registration. Email
 * verification is the supported path: Supabase Auth already sends a
 * confirmation email on sign up.
 *
 * Keep this decision in one place so the registration page and its tests
 * cannot drift apart. Turning SMS back on is a one-line change here once
 * TERMII_API_KEY and an approved sender ID exist.
 */

export const REGISTRATION_PHONE_VERIFICATION_ENABLED = false;

export const PHONE_VERIFICATION_UNAVAILABLE_MESSAGE =
  "Phone verification is unavailable while the SMS gateway is not configured. Your email address is used to verify the account instead; you can add a contact phone number without verifying it.";

/** Government-issued identity documents accepted at registration. */
export const IDENTITY_DOCUMENT_OPTIONS = [
  { value: "national_id", label: "National ID / NIN" },
  { value: "international_passport", label: "International passport" },
  { value: "drivers_license", label: "Driver's licence" },
  { value: "voters_card", label: "Voter's card" },
] as const;

export type IdentityDocumentType =
  (typeof IDENTITY_DOCUMENT_OPTIONS)[number]["value"];

export const IDENTITY_DOCUMENT_TYPES: readonly string[] =
  IDENTITY_DOCUMENT_OPTIONS.map((o) => o.value);

/**
 * Client-side pre-check only. The database RPC validates the same rules
 * again and is the authority.
 */
export function isValidIdentityDocumentNumber(
  documentType: string,
  documentNumber: string,
): boolean {
  const value = documentNumber.trim();
  if (!/^[A-Za-z0-9-]{5,24}$/.test(value)) return false;
  if (documentType === "national_id") return /^[0-9]{11}$/.test(value);
  return true;
}

export function identityDocumentErrorMessage(documentType: string): string {
  if (documentType === "national_id") {
    return "Enter your 11-digit National Identification Number";
  }
  return "Enter your document number (5 to 24 letters or digits)";
}

/**
 * Registration stays unverified, and the account is not elevated to
 * pro_worker, until a government-issued ID has been submitted. Only an
 * administrator review sets verification_status to 'verified'.
 */
export const ELEVATION_REQUIRES_GOVERNMENT_ID = true;

export const UNVERIFIED_ACCOUNT_NOTICE =
  "Your professional account stays unverified until you submit a government-issued ID and a FRELUX administrator approves it.";
