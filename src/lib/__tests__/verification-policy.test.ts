/**
 * Registration verification policy tests.
 *
 * Pins the owner's decisions:
 *  - SMS (Termii) verification is off for registration; email is used.
 *  - A government-issued ID is required before pro worker elevation and
 *    the account stays unverified until an administrator reviews it.
 */

import { describe, it, expect } from "vitest";
import {
  REGISTRATION_PHONE_VERIFICATION_ENABLED,
  PHONE_VERIFICATION_UNAVAILABLE_MESSAGE,
  IDENTITY_DOCUMENT_OPTIONS,
  isValidIdentityDocumentNumber,
  identityDocumentErrorMessage,
  ELEVATION_REQUIRES_GOVERNMENT_ID,
  UNVERIFIED_ACCOUNT_NOTICE,
} from "@/lib/verification-policy";
import { isEmailConfirmed } from "@/lib/email-verification";

describe("registration verification policy", () => {
  it("disables phone verification and explains the email fallback", () => {
    expect(REGISTRATION_PHONE_VERIFICATION_ENABLED).toBe(false);
    expect(PHONE_VERIFICATION_UNAVAILABLE_MESSAGE).toMatch(/email/i);
    expect(PHONE_VERIFICATION_UNAVAILABLE_MESSAGE).toMatch(/SMS gateway/i);
  });

  it("requires a government ID for elevation and keeps the account unverified", () => {
    expect(ELEVATION_REQUIRES_GOVERNMENT_ID).toBe(true);
    expect(UNVERIFIED_ACCOUNT_NOTICE).toMatch(/unverified/i);
    expect(UNVERIFIED_ACCOUNT_NOTICE).toMatch(/administrator/i);
  });

  it("offers the four accepted government document types", () => {
    expect(IDENTITY_DOCUMENT_OPTIONS.map((o) => o.value)).toEqual([
      "national_id",
      "international_passport",
      "drivers_license",
      "voters_card",
    ]);
  });

  it("validates a National ID as exactly 11 digits", () => {
    expect(isValidIdentityDocumentNumber("national_id", "12345678901")).toBe(
      true,
    );
    expect(isValidIdentityDocumentNumber("national_id", "1234567890")).toBe(
      false,
    );
    expect(isValidIdentityDocumentNumber("national_id", "12345678901A")).toBe(
      false,
    );
    expect(identityDocumentErrorMessage("national_id")).toMatch(/11-digit/i);
  });

  it("validates other documents as 5 to 24 letters or digits", () => {
    expect(
      isValidIdentityDocumentNumber("international_passport", "A1234567"),
    ).toBe(true);
    expect(
      isValidIdentityDocumentNumber("drivers_license", "ABC-123-456"),
    ).toBe(true);
    expect(isValidIdentityDocumentNumber("voters_card", "1234")).toBe(false);
    expect(
      isValidIdentityDocumentNumber("drivers_license", "A".repeat(25)),
    ).toBe(false);
    expect(isValidIdentityDocumentNumber("voters_card", "12 34 5678")).toBe(
      false,
    );
  });

  it("reports email confirmation from the auth user record", () => {
    expect(
      isEmailConfirmed({ email_confirmed_at: "2026-11-01T10:00:00Z" }),
    ).toBe(true);
    expect(isEmailConfirmed({ email_confirmed_at: null })).toBe(false);
    expect(isEmailConfirmed(null)).toBe(false);
  });
});
