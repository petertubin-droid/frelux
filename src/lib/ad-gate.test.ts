import { beforeEach, describe, expect, it } from "vitest";
import {
  AD_GATE_LABELS,
  firstBlockingGate,
  markAdGate,
  readAdGate,
  readLastAdGate,
} from "./ad-gate";

const clear = {
  pathname: "/learn/example",
  isPaid: false,
  authLoading: false,
  hasConsentChoice: true,
  slowNetwork: false,
};

describe("ad gate", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.documentElement.removeAttribute("data-ad-gate");
  });

  it("clears the page when no gate is closed", () => {
    expect(firstBlockingGate(clear)).toBeNull();
  });

  it("names each gate in the order the page checks it", () => {
    expect(firstBlockingGate({ ...clear, pathname: "/admin/network" })).toBe(
      "admin-route",
    );
    expect(firstBlockingGate({ ...clear, authLoading: true })).toBe(
      "entitlement-loading",
    );
    expect(firstBlockingGate({ ...clear, isPaid: true })).toBe("paid");
    expect(firstBlockingGate({ ...clear, hasConsentChoice: false })).toBe(
      "no-consent",
    );
    expect(firstBlockingGate({ ...clear, slowNetwork: true })).toBe(
      "slow-network",
    );
  });

  it("prefers the sign-in state over consent, so a subscriber is never served", () => {
    expect(
      firstBlockingGate({
        ...clear,
        isPaid: true,
        hasConsentChoice: false,
        slowNetwork: true,
      }),
    ).toBe("paid");
  });

  it("records the reason on the document and for the admin readout", () => {
    markAdGate("no-consent");
    expect(readAdGate()).toBe("no-consent");
    const last = readLastAdGate();
    expect(last?.reason).toBe("no-consent");
    expect(last?.path).toBe(window.location.pathname);
  });

  it("starts at not-run and explains every reason in plain words", () => {
    expect(readAdGate()).toBe("not-run");
    for (const label of Object.values(AD_GATE_LABELS)) {
      expect(label.length).toBeGreaterThan(10);
    }
  });
});
