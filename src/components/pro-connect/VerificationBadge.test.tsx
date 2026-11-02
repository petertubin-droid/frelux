import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VerificationBadge } from "@/components/pro-connect/VerificationBadge";
import { getVerificationTier, verificationTierInfo } from "@/types/pro-connect";
import type { DbProProfile } from "@/types/pro-connect";

const tier0Profile = {
  contact_verified_at: null,
  identity_verified_at: null,
  pro_level: false,
} as unknown as DbProProfile;
const tier1Profile = {
  contact_verified_at: "2025-01-01",
  identity_verified_at: null,
  pro_level: false,
} as unknown as DbProProfile;
const tier2Profile = {
  contact_verified_at: "2025-01-01",
  identity_verified_at: "2025-01-02",
  pro_level: false,
} as unknown as DbProProfile;
const tier3Profile = {
  contact_verified_at: "2025-01-01",
  identity_verified_at: "2025-01-02",
  pro_level: true,
} as unknown as DbProProfile;

describe("getVerificationTier", () => {
  it("returns 0 for unverified", () => {
    expect(getVerificationTier(tier0Profile)).toBe(0);
  });
  it("returns 1 for contact verified only", () => {
    expect(getVerificationTier(tier1Profile)).toBe(1);
  });
  it("returns 2 for identity verified", () => {
    expect(getVerificationTier(tier2Profile)).toBe(2);
  });
  it("returns 3 for pro level", () => {
    expect(getVerificationTier(tier3Profile)).toBe(3);
  });
});

describe("verificationTierInfo", () => {
  it("has info for all 4 tiers", () => {
    expect(verificationTierInfo[0]).toBeDefined();
    expect(verificationTierInfo[1]).toBeDefined();
    expect(verificationTierInfo[2]).toBeDefined();
    expect(verificationTierInfo[3]).toBeDefined();
  });

  it("tier 0 is Unverified", () => {
    expect(verificationTierInfo[0].label).toBe("Unverified");
  });
  it("tier 3 is Pro", () => {
    expect(verificationTierInfo[3].label).toBe("FRELUX Pro");
  });
});

describe("VerificationBadge component", () => {
  it("returns null for tier 0 (unverified)", () => {
    const { container } = render(<VerificationBadge profile={tier0Profile} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders badge for tier 1", () => {
    render(<VerificationBadge profile={tier1Profile} />);
    expect(screen.getByText("Contact Verified")).toBeTruthy();
  });

  it("renders badge for tier 2", () => {
    render(<VerificationBadge profile={tier2Profile} />);
    expect(screen.getByText("Verified")).toBeTruthy();
  });

  it("renders badge for tier 3", () => {
    render(<VerificationBadge profile={tier3Profile} />);
    expect(screen.getByText("Pro")).toBeTruthy();
  });

  it("hides label when showLabel is false", () => {
    render(<VerificationBadge profile={tier1Profile} showLabel={false} />);
    expect(screen.queryByText("Contact Verified")).toBeNull();
  });

  it("toggles tooltip on click", () => {
    render(<VerificationBadge profile={tier2Profile} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    // Tooltip content should now be visible
    expect(document.body.textContent).toContain("FRELUX Verified");
  });
});
