import { describe, expect, it } from "vitest";
import {
  CODE_FAMILIES,
  DEFAULT_FAMILY_BY_JURISDICTION,
  DOMAIN_ORDER,
  FAMILY_ORDER,
  REGISTRY_VERSION,
} from "../library";
import { defaultConfiguration, resolveReferenceReport } from "../resolver";
import {
  BUILDING_TYPES,
  JURISDICTIONS,
  REQUIREMENT_DOMAINS,
  STRUCTURAL_SYSTEMS,
  type ProjectConfiguration,
} from "../types";

const families = Object.values(CODE_FAMILIES);

describe("standards library integrity", () => {
  it("covers the ten required code families", () => {
    expect(FAMILY_ORDER).toHaveLength(10);
    expect(families.map((family) => family.id).sort()).toEqual(
      [
        "ae-codes",
        "eurocode",
        "ibc",
        "irc",
        "ke-code",
        "nbcc",
        "ncc-au",
        "ng-nbc",
        "uk-regs",
        "za-sans",
      ].sort(),
    );
  });

  it("gives every family an edition, a valid default, and all eight domains", () => {
    for (const family of families) {
      expect(family.editions.length).toBeGreaterThan(0);
      expect(family.editions.map((edition) => edition.id)).toContain(
        family.defaultEditionId,
      );
      for (const domain of DOMAIN_ORDER) {
        expect(
          family.requirements[domain],
          `${family.id}.${domain}`,
        ).toBeDefined();
      }
      expect(family.adoptingAuthorities.length).toBeGreaterThan(10);
      expect(family.adoptionNote.length).toBeGreaterThan(10);
    }
  });

  it("gives every referenced document a designation, title and scope", () => {
    for (const family of families) {
      for (const domain of DOMAIN_ORDER) {
        const entry = family.requirements[domain];
        if (entry.status === "unsupported") {
          expect(
            entry.reason.length,
            `${family.id}.${domain} reason`,
          ).toBeGreaterThan(20);
          continue;
        }
        expect(
          entry.references.length,
          `${family.id}.${domain}`,
        ).toBeGreaterThan(0);
        for (const reference of entry.references) {
          expect(reference.document.trim().length).toBeGreaterThan(1);
          expect(reference.title.trim().length).toBeGreaterThan(5);
          expect(reference.governs.trim().length).toBeGreaterThan(10);
          expect(["verified", "verify-locally"]).toContain(reference.status);
        }
      }
    }
  });

  it("maps every jurisdiction to a family that claims it", () => {
    const jurisdictionCodes = JURISDICTIONS.map((item) => item.code);
    for (const code of jurisdictionCodes) {
      const familyId = DEFAULT_FAMILY_BY_JURISDICTION[code];
      expect(familyId, code).toBeDefined();
      expect(CODE_FAMILIES[familyId].jurisdictions).toContain(code);
    }
    expect(Object.keys(DEFAULT_FAMILY_BY_JURISDICTION).sort()).toEqual(
      jurisdictionCodes.sort(),
    );
  });

  it("states snow as unsupported where the jurisdiction does not codify it", () => {
    for (const id of ["ng-nbc", "ke-code", "za-sans", "ae-codes"] as const) {
      const snow = CODE_FAMILIES[id].requirements.snow;
      expect(snow.status, id).toBe("unsupported");
    }
  });

  it("keeps design parameters out of the library entirely", () => {
    // No entry may carry a numeric design value: only edition years and
    // standard designations (which are strings) exist.
    const forbiddenKeys = [
      "factor",
      "ratio",
      "spacing",
      "cover",
      "windSpeed",
      "snowLoad",
      "loadFactor",
      "safetyFactor",
      "mix",
    ];
    for (const family of families) {
      for (const domain of DOMAIN_ORDER) {
        const entry = family.requirements[domain];
        if (entry.status !== "referenced") continue;
        for (const reference of entry.references) {
          for (const key of Object.keys(reference)) {
            expect(
              forbiddenKeys,
              `${family.id}.${domain}.${key}`,
            ).not.toContain(key);
          }
        }
      }
    }
  });
});

describe("project configuration defaults", () => {
  it("seeds the adopted family and its default edition per country", () => {
    expect(defaultConfiguration("GB").familyId).toBe("uk-regs");
    expect(defaultConfiguration("US").familyId).toBe("ibc");
    expect(defaultConfiguration("NG").familyId).toBe("ng-nbc");
    expect(defaultConfiguration("ZA").familyId).toBe("za-sans");
    expect(defaultConfiguration("AE").familyId).toBe("ae-codes");
    const config = defaultConfiguration("CA");
    expect(config.editionId).toBe(CODE_FAMILIES.nbcc.defaultEditionId);
  });

  it("offers the required building types and structural systems", () => {
    expect(BUILDING_TYPES.length).toBeGreaterThanOrEqual(4);
    expect(STRUCTURAL_SYSTEMS.map((system) => system.id)).toContain("rc_frame");
    expect(REQUIREMENT_DOMAINS).toHaveLength(8);
  });
});

function reportFor(patch: Partial<ProjectConfiguration>) {
  const country = patch.country ?? "GB";
  return resolveReferenceReport({ ...defaultConfiguration(country), ...patch });
}

describe("resolver", () => {
  it("returns all eight domains with the adopted family's references", () => {
    const report = reportFor({ country: "GB" });
    expect(report.domains).toHaveLength(8);
    expect(report.jurisdictionSupported).toBe(true);
    expect(report.professionalReviewRequired).toBe(true);
    expect(report.registryVersion).toBe(REGISTRY_VERSION);

    const concrete = report.domains.find(
      (domain) => domain.domain === "concrete",
    );
    expect(concrete?.status).toBe("referenced");
    if (concrete?.status === "referenced") {
      const documents = concrete.references
        .map((reference) => reference.document)
        .join(" ");
      expect(documents).toMatch(/BS EN 1992/);
      // Cross-family leakage: a UK report must not cite US concrete codes.
      expect(documents).not.toMatch(/ACI/);
    }
  });

  it("keeps every report free of numeric design values", () => {
    const report = reportFor({ country: "NG" });
    for (const domain of report.domains) {
      if (domain.status !== "referenced") continue;
      for (const reference of domain.references) {
        for (const value of Object.values(reference)) {
          expect(typeof value === "number").toBe(false);
        }
      }
    }
    for (const statement of report.nonSubstitution) {
      expect(statement).toMatch(/jurisdiction|substitut|parameter/i);
    }
  });

  it("flags a family that is not adopted in the selected country", () => {
    const report = reportFor({
      country: "NG",
      familyId: "ibc",
      editionId: "ibc-2021",
    });
    expect(report.jurisdictionSupported).toBe(false);
    expect(report.warnings.join(" ")).toMatch(/not the code adopted/i);
    // The report shows what was chosen — it never silently switches families.
    expect(report.family.id).toBe("ibc");
  });

  it("reports unsupported domains instead of importing another country's values", () => {
    const report = reportFor({ country: "NG" });
    const snow = report.domains.find((domain) => domain.domain === "snow");
    expect(snow?.status).toBe("unsupported");
    if (snow?.status === "unsupported") {
      expect(snow.reason).toMatch(/not a codified design case/i);
    }
    const asText = JSON.stringify(report);
    expect(asText).not.toMatch(/ASCE 7 Chapter 7/);
  });

  it("warns when the IRC is chosen outside its scope", () => {
    const report = reportFor({
      country: "US",
      familyId: "irc",
      editionId: "irc-2021",
      buildingType: "commercial",
    });
    expect(report.warnings.join(" ")).toMatch(
      /limited to detached one- and two-family/i,
    );
  });

  it("flags a superseded edition", () => {
    const report = reportFor({
      country: "US",
      familyId: "ibc",
      editionId: "ibc-2018",
    });
    expect(report.warnings.join(" ")).toMatch(/superseded/i);
  });

  it("falls back to a valid edition when the id does not belong to the family", () => {
    const report = reportFor({
      country: "GB",
      familyId: "uk-regs",
      editionId: "irc-2021",
    });
    expect(report.edition.id).toBe(CODE_FAMILIES["uk-regs"].defaultEditionId);
    expect(report.warnings.join(" ")).toMatch(/does not belong/i);
  });

  it("adds emirate and sub-national adoption warnings", () => {
    expect(reportFor({ country: "AE" }).warnings.join(" ")).toMatch(
      /emirate-specific/i,
    );
    expect(reportFor({ country: "CA" }).warnings.join(" ")).toMatch(
      /province|territory/i,
    );
    expect(reportFor({ country: "AU" }).warnings.join(" ")).toMatch(
      /state|territory/i,
    );
  });

  it("notes structural systems that limit which references apply", () => {
    const report = reportFor({
      country: "GB",
      structuralSystem: "steel_frame",
    });
    expect(report.warnings.join(" ")).toMatch(
      /steel design standard|only to the elements/i,
    );
  });

  it("records the project assumptions it was given", () => {
    const report = reportFor({
      country: "ZA",
      location: "Cape Town CBD",
      materials: ["Cement CEM II", "Grade 500 rebar"],
    });
    const text = report.assumptions.join(" ");
    expect(text).toMatch(/Cape Town CBD/);
    expect(text).toMatch(/Grade 500 rebar/);
    expect(text).toMatch(/Applicable edition/i);
    expect(text).toMatch(/engineer/i);
  });

  it("applies administrative overrides without inventing status", () => {
    const base = reportFor({ country: "GB" });
    const doc = base.domains.find((domain) => domain.domain === "wind");
    expect(doc?.status).toBe("referenced");
    const document =
      doc?.status === "referenced" ? doc.references[0].document : "";
    const key = `uk-regs:wind:${document}`;

    const withdrawn = resolveReferenceReport(
      { ...defaultConfiguration("GB") },
      {
        overlay: {
          [key]: { status: "unsupported", note: "Transition period." },
        },
      },
    );
    const wind = withdrawn.domains.find((domain) => domain.domain === "wind");
    if (wind?.status === "referenced") {
      expect(wind.references[0].status).toBe("verify-locally");
      expect(wind.references[0].note).toBe("Transition period.");
    }

    const reviewed = resolveReferenceReport(
      { ...defaultConfiguration("GB") },
      {
        overlay: {
          [key]: {
            status: "verified",
            note: "Checked 2026-10.",
            reviewer: "A. Engineer",
          },
        },
      },
    );
    const windReviewed = reviewed.domains.find(
      (domain) => domain.domain === "wind",
    );
    if (windReviewed?.status === "referenced") {
      expect(windReviewed.references[0].status).toBe("verified");
      expect(windReviewed.references[0].note).toBe("Checked 2026-10.");
    }
  });
});
