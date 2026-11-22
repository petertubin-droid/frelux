// =========================================================
// CLIMATE MATERIAL ADVISOR CONFORMANCE (audit #34)
//
// This advisor is guidance, not a compliance determination, so what can be
// audited objectively is the boundary it draws: with no climate data it must
// report the gap rather than invent advice, and it must never claim
// certification, code compliance or flood assessment.
// =========================================================
import { describe, expect, it } from "vitest";
import { ADVISOR_DISCLOSURES, buildAdvisor } from "../material-advisor";

describe("climate advisor: the boundary it must keep", () => {
  it("discloses that it is not an engineering or compliance assessment", () => {
    const text = ADVISOR_DISCLOSURES.join(" ").toLowerCase();
    expect(text).toMatch(/not a structural engineering assessment/);
    expect(text).toMatch(/no code compliance is claimed/);
  });

  it("discloses that flood exposure is not assessed", () => {
    const text = ADVISOR_DISCLOSURES.join(" ").toLowerCase();
    expect(text).toMatch(/flood exposure is not assessed/);
  });

  it("states the coastal distance tolerance rather than implying precision", () => {
    const text = ADVISOR_DISCLOSURES.join(" ").toLowerCase();
    expect(text).toMatch(/±25 km|25 km/);
  });

  it("says climate normals are averages, not this week's weather", () => {
    const text = ADVISOR_DISCLOSURES.join(" ").toLowerCase();
    expect(text).toMatch(/long-term averages/);
  });
});

describe("climate advisor: no data means an explicit gap", () => {
  it("reports the missing input instead of inventing guidance", () => {
    const r = buildAdvisor(null);
    expect(r.confidence).toBe("general");
    expect(r.missing).toContain("climate_normals");
    expect(r.drivers).toEqual([]);
  });

  it("still carries every disclosure when it has no data", () => {
    const r = buildAdvisor(null);
    expect(r.disclosures.length).toBe(ADVISOR_DISCLOSURES.length);
  });

  it("drops to general guidance rather than a confident claim", () => {
    const r = buildAdvisor(null);
    expect(r.confidence).not.toBe("high");
  });
});
