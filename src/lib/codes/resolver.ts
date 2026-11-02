/**
 * Resolution of a project configuration into a reference report.
 *
 * Hard rules enforced here and covered by tests:
 *  1. Nothing numerical is produced. The report names documents and
 *     their scope; parameters belong to the adopted code + engineer.
 *  2. A chosen family that is not adopted in the selected country is
 *     flagged, never silently applied.
 *  3. Unsupported domains stay unsupported. The resolver never borrows a
 *     reference from another family to fill a gap.
 *  4. Every report carries the professional-review requirement and the
 *     non-substitution statements.
 */

import {
  CODE_FAMILIES,
  DEFAULT_FAMILY_BY_JURISDICTION,
  DOMAIN_ORDER,
  REGISTRY_VERSION,
  getFamily,
} from "./library";
import {
  BUILDING_TYPES,
  REQUIREMENT_DOMAINS,
  STRUCTURAL_SYSTEMS,
  type CodeFamilyId,
  type DomainResolution,
  type ProjectConfiguration,
  type ReferenceReport,
  type RequirementDomain,
  type StructuralSystem,
} from "./types";

/** Administrative overlay keyed by `${familyId}:${domain}:${document}`. */
export type StatusOverlay = Record<
  string,
  {
    status?: "verified" | "under-review" | "unsupported";
    note?: string;
    reviewer?: string | null;
  }
>;

export function entryKey(
  familyId: CodeFamilyId,
  domain: RequirementDomain,
  document: string,
): string {
  return `${familyId}:${domain}:${document}`;
}

function labelOf(
  list: { id: string; label: string }[],
  id: string,
  fallback: string,
): string {
  return list.find((item) => item.id === id)?.label ?? fallback;
}

export function defaultConfiguration(
  country: ProjectConfiguration["country"],
): ProjectConfiguration {
  const familyId = DEFAULT_FAMILY_BY_JURISDICTION[country];
  const family = getFamily(familyId);
  return {
    country,
    location: "",
    buildingType: "single_family",
    structuralSystem: "rc_frame",
    familyId,
    editionId: family.defaultEditionId,
    materials: [],
  };
}

export interface ResolveOptions {
  overlay?: StatusOverlay;
}

export function resolveReferenceReport(
  config: ProjectConfiguration,
  options: ResolveOptions = {},
): ReferenceReport {
  const family = CODE_FAMILIES[config.familyId] ?? getFamily("ng-nbc");
  const warnings: string[] = [];

  // Edition must belong to the chosen family.
  const edition =
    family.editions.find((item) => item.id === config.editionId) ??
    family.editions.find((item) => item.id === family.defaultEditionId) ??
    family.editions[0];
  if (edition.id !== config.editionId) {
    warnings.push(
      `The selected edition does not belong to ${family.name}; ${edition.label} is reported instead.`,
    );
  }
  if (edition.state === "superseded") {
    warnings.push(
      `${edition.label} is treated as superseded by this registry. Confirm with the authority whether new work may still use it.`,
    );
  }

  const jurisdictionSupported = family.jurisdictions.includes(config.country);
  const expectedFamily = DEFAULT_FAMILY_BY_JURISDICTION[config.country];
  if (!jurisdictionSupported) {
    warnings.push(
      `${family.name} is not the code adopted in this jurisdiction (${config.country}). It is shown for reference comparison only — it must not be applied as the governing code.`,
    );
  } else if (expectedFamily !== family.id) {
    warnings.push(
      `${family.name} is an alternative code family for this jurisdiction; confirm that the authority having jurisdiction accepts it for this project.`,
    );
  }

  // Scope limits.
  if (family.id === "irc" && config.buildingType !== "single_family") {
    warnings.push(
      "The IRC is limited to detached one- and two-family dwellings and townhouses of limited height. The selected building type falls outside IRC scope — the IBC or an engineered design applies.",
    );
  }
  if (family.id === "ae-codes") {
    warnings.push(
      "UAE requirements are emirate-specific. The authority having jurisdiction for the plot (municipality, development authority or free zone) governs the approved design basis.",
    );
  }
  if (family.id === "nbcc" || family.id === "ncc-au") {
    warnings.push(
      "Adoption is sub-national: confirm the province/territory or state/territory edition and any amendments in force at this site.",
    );
  }
  if (family.id === "ibc" || family.id === "uk-regs") {
    warnings.push(
      "Adoption is local: confirm the edition in force (and any local amendments) with the building department or local authority for this site.",
    );
  }

  // Structural-system applicability notes.
  const systemLabel = labelOf(
    STRUCTURAL_SYSTEMS,
    config.structuralSystem,
    config.structuralSystem,
  );
  const systemWarnings: Record<StructuralSystem, string | null> = {
    rc_frame: null,
    loadbearing_masonry:
      "The section above covers masonry design implicitly through the code's structural chapters; confirm the masonry design standard named by the adopting authority.",
    steel_frame:
      "Concrete and reinforcement references apply only to the elements that are concrete (foundations, slabs on grade). The steel design standard is listed under materials.",
    timber_frame:
      "Timber design is governed by the code's timber standard; concrete references apply only to foundations and slabs on grade.",
    cold_formed_steel:
      "Cold-formed steel framing follows the prescriptive/engineered provisions listed under materials; confirm any span tables the authority accepts.",
    composite:
      "Composite members require the composite design provisions of the adopted code family; confirm the code's composite chapter applies before using the concrete and steel references together.",
  };
  const systemWarning = systemWarnings[config.structuralSystem];
  if (systemWarning) warnings.push(systemWarning);

  // Domains.
  const domains: DomainResolution[] = DOMAIN_ORDER.map((domain) => {
    const entry = family.requirements[domain];
    const meta = REQUIREMENT_DOMAINS.find((item) => item.id === domain)!;
    if (entry.status === "unsupported") {
      return {
        domain,
        label: meta.label,
        status: "unsupported",
        reason: entry.reason,
      };
    }
    const references = entry.references.map((reference) => {
      const override =
        options.overlay?.[entryKey(family.id, domain, reference.document)];
      if (!override) return reference;
      if (override.status === "unsupported") {
        return {
          ...reference,
          status: "verify-locally" as const,
          note:
            override.note ??
            "Administration has flagged this reference as not currently usable — confirm before relying on it.",
        };
      }
      return {
        ...reference,
        status:
          override.status === "verified"
            ? ("verified" as const)
            : reference.status,
        note: override.note ?? reference.note,
      };
    });
    return {
      domain,
      label: meta.label,
      status: "referenced",
      references,
      note: entry.note,
    };
  });

  const flaggedReferences = domains
    .flatMap((domain) =>
      domain.status === "referenced" ? domain.references : [],
    )
    .filter((reference) => reference.status === "verify-locally");
  if (flaggedReferences.length > 0) {
    warnings.push(
      `${flaggedReferences.length} reference${flaggedReferences.length === 1 ? "" : "s"} in this set must be verified locally before use (marked in the list).`,
    );
  }

  const assumptions: string[] = [
    `Applicable edition: ${edition.label} (${family.shortName}).`,
    `Building type assumed: ${labelOf(BUILDING_TYPES, config.buildingType, config.buildingType)}.`,
    `Structural system assumed: ${systemLabel}.`,
    `Location supplied by the user: ${config.location.trim() || "not stated"}.`,
    config.materials.length > 0
      ? `Material specifications noted by the user: ${config.materials.join(", ")}.`
      : "No material specifications were entered for this project.",
    "The authority having jurisdiction may amend or refuse any part of the adopted code — confirm locally.",
    "The report names documents and their scope only. All design values (load factors, cover, mix proportions, spacing, wind and snow values) come from the adopted code edition and the project's engineer.",
  ];

  const nonSubstitution: string[] = [
    "No concrete mix ratio, reinforcement spacing, load combination or safety factor is produced or copied between jurisdictions.",
    "Where this jurisdiction has no codified reference for a domain, the domain is reported as unsupported rather than filled from another country's code.",
    "Substituting another jurisdiction's parameters requires a validated engineering method and the authority's acceptance — not this tool.",
  ];

  return {
    family,
    edition,
    country: config.country,
    jurisdictionSupported,
    domains,
    assumptions,
    warnings,
    professionalReviewRequired: true,
    nonSubstitution,
    registryVersion: REGISTRY_VERSION,
  };
}
