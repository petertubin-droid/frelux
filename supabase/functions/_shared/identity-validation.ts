// =========================================================
// Identity validation for admin-created and admin-edited accounts.
// =========================================================
// The registration form validates NIN in the browser, which is fine for a
// person filling it in and useless for anything else: an admin invitation, an
// admin edit, or a direct API call all bypass it. The database enforces the
// same rules again (migration 20261124160000), so this module exists to give
// the operator a clear 400 with the offending field instead of a 500 from the
// trigger.
//
// Rules, kept deliberately identical to the form and the trigger:
//   * NIN is Nigeria's 11-digit National Identification Number. Digits only;
//     spaces and dashes are stripped rather than rejected.
//   * A non-Nigerian account identifies itself with a government ID type and
//     number, not a NIN.
//   * government_id_type must be one the UI actually offers, so a typo cannot
//     land in the table and render as a blank badge.

export const GOVERNMENT_ID_TYPES = [
  "national_id",
  "passport",
  "drivers_license",
  "voters_card",
  "tax_id",
] as const;

export type GovernmentIdType = (typeof GOVERNMENT_ID_TYPES)[number];

/** Digits only. A NIN typed with spaces or dashes is normalised, not refused. */
export function normalizeNin(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

/** Digits only, upper-cased: passports and TINs are alphanumeric. */
export function normalizeGovernmentId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[^0-9A-Za-z-]/g, "")
    .toUpperCase()
    .slice(0, 40);
}

export interface IdentityInput {
  country_code?: unknown;
  nin_number?: unknown;
  government_id_type?: unknown;
  government_id_number?: unknown;
}

export interface IdentityResult {
  ok: boolean;
  /** Field name -> operator-facing message. Empty when ok. */
  errors: Record<string, string>;
  normalized: {
    nin_number: string;
    government_id_type: string;
    government_id_number: string;
  };
}

export function validateIdentity(input: IdentityInput): IdentityResult {
  const country = String(input.country_code ?? "")
    .trim()
    .toUpperCase();
  const nin = normalizeNin(input.nin_number);
  const type = String(input.government_id_type ?? "")
    .trim()
    .toLowerCase();
  const idNumber = normalizeGovernmentId(input.government_id_number);
  const errors: Record<string, string> = {};

  if (nin && !/^\d{11}$/.test(nin)) {
    errors.nin_number = "A Nigerian NIN must be exactly 11 digits.";
  }
  if (type && !(GOVERNMENT_ID_TYPES as readonly string[]).includes(type)) {
    errors.government_id_type = "Select a supported government ID type.";
  }
  if (idNumber && (idNumber.length < 4 || idNumber.length > 40)) {
    errors.government_id_number =
      "A government ID number must be between 4 and 40 characters.";
  }
  // Nigeria identifies with a NIN; elsewhere the government ID carries the
  // identity. Requiring one or the other stops a record that claims a verified
  // identity from holding nothing at all.
  if (country === "NG") {
    if (!nin && !idNumber) {
      errors.nin_number = "A Nigerian account needs an 11-digit NIN.";
    }
  } else if (country && !idNumber) {
    errors.government_id_number =
      "A government ID number is required outside Nigeria.";
  }
  // A NIN is never stored as a government ID number on a Nigerian account:
  // the trigger copies one into the other, and two copies of the same secret
  // are worse than one.
  const normalizedType = country === "NG" && !type ? "national_id" : type;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    normalized: {
      nin_number: country === "NG" ? nin : "",
      government_id_type: normalizedType,
      government_id_number: idNumber,
    },
  };
}
