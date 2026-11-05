/**
 * Automatic identity verification behaviour (client side).
 *
 * Owner decision: a submitted government ID is verified automatically if
 * no administrator reviews it, with a minimum review window of 10 to 15
 * minutes. These tests pin the window, the countdown and the honest
 * wording for every review state.
 */

import { describe, it, expect } from "vitest";
import {
  EMPTY_IDENTITY_VERIFICATION,
  IDENTITY_AUTO_VERIFY_MINUTES,
  IDENTITY_AUTO_VERIFY_NOTICE,
  identityReviewLabel,
  isIdentityVerified,
  minutesUntilAutoVerification,
  type MyIdentityVerification,
} from "@/lib/identity-verification";

const NOW = new Date("2026-11-05T19:00:00Z");

function state(
  overrides: Partial<MyIdentityVerification> = {},
): MyIdentityVerification {
  return { ...EMPTY_IDENTITY_VERIFICATION, ...overrides };
}

describe("automatic identity verification window", () => {
  it("waits at least 10 minutes and at most 15 before acting", () => {
    expect(IDENTITY_AUTO_VERIFY_MINUTES).toBeGreaterThanOrEqual(10);
    expect(IDENTITY_AUTO_VERIFY_MINUTES).toBeLessThanOrEqual(15);
    expect(IDENTITY_AUTO_VERIFY_NOTICE).toContain(
      String(IDENTITY_AUTO_VERIFY_MINUTES),
    );
    expect(IDENTITY_AUTO_VERIFY_NOTICE).toMatch(/automatically verified/i);
  });

  it("counts down to the automatic review and clamps at zero", () => {
    expect(minutesUntilAutoVerification("2026-11-05T19:15:00Z", NOW)).toBe(15);
    expect(minutesUntilAutoVerification("2026-11-05T19:08:00Z", NOW)).toBe(8);
    expect(minutesUntilAutoVerification("2026-11-05T18:59:00Z", NOW)).toBe(0);
    expect(minutesUntilAutoVerification(null, NOW)).toBeNull();
    expect(minutesUntilAutoVerification("not a date", NOW)).toBeNull();
  });

  it("treats only an approved request as verified", () => {
    expect(isIdentityVerified(state({ status: "approved" }))).toBe(true);
    expect(isIdentityVerified(state({ status: "pending" }))).toBe(false);
    expect(isIdentityVerified(state({ status: "rejected" }))).toBe(false);
  });

  it("describes every review state honestly", () => {
    const fifteenFromNow = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    expect(
      identityReviewLabel(
        state({ status: "pending", autoVerifyAt: fifteenFromNow }),
      ),
    ).toMatch(/automatic verification in about 15 minutes/i);

    expect(
      identityReviewLabel(state({ status: "approved", autoVerified: true })),
    ).toMatch(/verified automatically/i);

    expect(
      identityReviewLabel(state({ status: "approved", autoVerified: false })),
    ).toMatch(/administrator/i);

    expect(identityReviewLabel(state({ status: "rejected" }))).toMatch(
      /rejected/i,
    );
    expect(identityReviewLabel(state({ status: "more_info" }))).toMatch(
      /more information/i,
    );
    expect(identityReviewLabel(state({ status: "none" }))).toMatch(
      /no government id/i,
    );
  });
});
