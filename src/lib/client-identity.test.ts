import { describe, it, expect } from "vitest";
import {
  NG_BANKS,
  identityOutcomeMessage,
  identityAllowsFunding,
} from "./client-identity";

describe("client identity copy", () => {
  it("never promises approval when the names were merely close", () => {
    const message = identityOutcomeMessage({ status: "pending" });
    expect(message.toLowerCase()).toContain("person");
    expect(message.toLowerCase()).not.toContain("verified");
  });

  it("asks for the account number when the bank could not confirm", () => {
    const message = identityOutcomeMessage({
      status: "pending",
      needs_bank_confirmation: true,
    });
    expect(message.toLowerCase()).toContain("account number");
  });

  it("only lets a verified client fund escrow", () => {
    expect(identityAllowsFunding("verified")).toBe(true);
    expect(identityAllowsFunding("pending")).toBe(false);
    expect(identityAllowsFunding("none")).toBe(false);
    expect(identityAllowsFunding("rejected")).toBe(false);
  });

  it("offers bank codes that are all digits", () => {
    expect(NG_BANKS.length).toBeGreaterThan(10);
    for (const bank of NG_BANKS) {
      expect(bank.code).toMatch(/^[0-9]{3,6}$/);
      expect(bank.name.length).toBeGreaterThan(2);
    }
  });
});
