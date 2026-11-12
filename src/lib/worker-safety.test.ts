import { describe, it, expect } from "vitest";
import {
  SAFETY_RULES,
  WHATSAPP_SAFETY_NOTICE,
  contactAccessMessage,
  safetyWhatsAppLink,
} from "./worker-safety";

describe("worker safety rules", () => {
  it("states all five protections", () => {
    expect(SAFETY_RULES).toHaveLength(5);
    expect(SAFETY_RULES.map((rule) => rule.id)).toEqual([
      "phone-after-escrow",
      "no-escrow-no-movement",
      "client-id",
      "same-area",
      "auto-release",
    ]);
    for (const rule of SAFETY_RULES) {
      expect(rule.how.length).toBeGreaterThan(20);
      expect(rule.why.length).toBeGreaterThan(20);
    }
  });

  it("keeps the shared notice dash free and complete", () => {
    expect(WHATSAPP_SAFETY_NOTICE).not.toMatch(/[\u2013\u2014]/);
    expect(WHATSAPP_SAFETY_NOTICE).toContain("No escrow, no movement");
    expect(WHATSAPP_SAFETY_NOTICE).toContain("48 hours");
  });

  it("escapes the notice into a working share link", () => {
    const link = safetyWhatsAppLink("a & b");
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("a & b"));
  });

  it("explains why a number is hidden instead of showing a blank", () => {
    expect(
      contactAccessMessage("fund_escrow_for_this_professional_to_reveal"),
    ).toContain("Fund escrow");
    expect(contactAccessMessage("sign_in_and_fund_escrow_to_reveal")).toContain(
      "Sign in",
    );
    expect(
      contactAccessMessage("professional_has_not_published_a_number"),
    ).toContain("Send a message");
    expect(contactAccessMessage("unlocked")).toBe("");
  });
});
