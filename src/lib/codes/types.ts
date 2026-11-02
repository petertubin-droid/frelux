/**
 * FRELUX International Building Code Reference — data model.
 *
 * DESIGN POSITION (why this is references, not parameters):
 *
 *  - Design parameters (load factors, mix ratios, rebar spacing, cover
 *    values, wind speeds, snow loads) are property of the ADOPTED CODE
 *    and the project's engineer. This engine never copies a value from
 *    one jurisdiction into another, and never outputs a parameter it
 *    has not been given by an edition of the code.
 *  - Every reference below is a DOCUMENT IDENTIFIER with the scope it
 *    governs. Where the correct document for a jurisdiction is not
 *    established with confidence, the reference is marked
 *    "verify-locally" instead of guessed.
 *  - Where a jurisdiction simply does not regulate a domain (e.g. snow
 *    loads in Nigeria), it is reported as "unsupported" with the reason
 *    — an explicit gap, never a silent import from another country.
 */

/** Jurisdictions with a supported reference set. */
export type JurisdictionCode =
  "EU" | "GB" | "US" | "CA" | "AU" | "NG" | "KE" | "ZA" | "AE";

export const JURISDICTIONS: { code: JurisdictionCode; name: string }[] = [
  { code: "EU", name: "European Union (Eurocodes, national annexes)" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "AE", name: "United Arab Emirates" },
];

export type CodeFamilyId =
  | "eurocode"
  | "uk-regs"
  | "ibc"
  | "irc"
  | "nbcc"
  | "ncc-au"
  | "ng-nbc"
  | "ke-code"
  | "za-sans"
  | "ae-codes";

/** The eight engineering requirement domains the brief requires. */
export type RequirementDomain =
  | "concrete"
  | "reinforcement"
  | "loads"
  | "wind"
  | "snow"
  | "foundations"
  | "durability"
  | "materials";

export const REQUIREMENT_DOMAINS: {
  id: RequirementDomain;
  label: string;
  description: string;
}[] = [
  {
    id: "concrete",
    label: "Concrete design",
    description: "Structural concrete design rules for the adopted code.",
  },
  {
    id: "reinforcement",
    label: "Reinforcement",
    description: "Detailing, steel grades and reinforcing material standards.",
  },
  {
    id: "loads",
    label: "Structural loads",
    description: "Basis of design, self-weight, imposed and other actions.",
  },
  {
    id: "wind",
    label: "Wind loads",
    description: "Wind actions and the jurisdiction's wind data basis.",
  },
  {
    id: "snow",
    label: "Snow loads",
    description:
      "Snow actions and ground-snow data, where the jurisdiction regulates it.",
  },
  {
    id: "foundations",
    label: "Foundations",
    description: "Geotechnical and foundation design references.",
  },
  {
    id: "durability",
    label: "Durability",
    description:
      "Exposure classification, cover and service-life requirements.",
  },
  {
    id: "materials",
    label: "Material specifications",
    description: "Material product standards the code calls up.",
  },
];

/**
 * verified        document identity and domain scope confirmed.
 * verify-locally  the document is the recognised basis but its current
 *                 edition/wording must be confirmed with the authority
 *                 having jurisdiction (revision in progress, practice
 *                 varies, or local amendments).
 * unsupported     the jurisdiction does not provide a reference this
 *                 engine can honestly name for the domain.
 */
export type ReferenceStatus = "verified" | "verify-locally" | "unsupported";

export interface CodeReference {
  /** Document designation, e.g. "EN 1992-1-1". */
  document: string;
  title: string;
  /** What the document governs for this domain. */
  governs: string;
  status: Exclude<ReferenceStatus, "unsupported">;
  /** Caveat shown with the reference. */
  note?: string;
}

/** A domain either has references or an explicit unsupported record. */
export type DomainEntry =
  | { status: "referenced"; references: CodeReference[]; note?: string }
  | { status: "unsupported"; reason: string };

export interface CodeEdition {
  id: string;
  label: string;
  year: number | null;
  /** Whether this engine treats the edition as current for new work. */
  state: "current" | "superseded" | "regional-variant";
  note?: string;
}

export interface CodeFamily {
  id: CodeFamilyId;
  name: string;
  shortName: string;
  jurisdictions: JurisdictionCode[];
  /** Who adopts/enforces it — never a claim of municipal approval. */
  adoptingAuthorities: string;
  /** How local adoption varies (states, emirates, provinces…). */
  adoptionNote: string;
  editions: CodeEdition[];
  defaultEditionId: string;
  requirements: Record<RequirementDomain, DomainEntry>;
  /** Scope limits or structural-system notes specific to the family. */
  scopeNotes: string[];
}

export type BuildingType =
  "single_family" | "multi_family" | "commercial" | "industrial" | "mixed_use";

export const BUILDING_TYPES: { id: BuildingType; label: string }[] = [
  { id: "single_family", label: "Single-family / duplex dwelling" },
  { id: "multi_family", label: "Multi-family residential" },
  { id: "commercial", label: "Commercial / office / retail" },
  { id: "industrial", label: "Industrial / warehouse" },
  { id: "mixed_use", label: "Mixed-use" },
];

export type StructuralSystem =
  | "rc_frame"
  | "loadbearing_masonry"
  | "steel_frame"
  | "timber_frame"
  | "cold_formed_steel"
  | "composite";

export const STRUCTURAL_SYSTEMS: {
  id: StructuralSystem;
  label: string;
  /** Material domains this system makes relevant. */
  domains: RequirementDomain[];
}[] = [
  {
    id: "rc_frame",
    label: "Reinforced concrete frame",
    domains: ["concrete", "reinforcement", "durability", "materials"],
  },
  {
    id: "loadbearing_masonry",
    label: "Load-bearing masonry",
    domains: ["concrete", "durability", "materials"],
  },
  {
    id: "steel_frame",
    label: "Structural steel frame",
    domains: ["materials", "durability"],
  },
  {
    id: "timber_frame",
    label: "Timber frame",
    domains: ["materials"],
  },
  {
    id: "cold_formed_steel",
    label: "Cold-formed steel framing",
    domains: ["materials"],
  },
  {
    id: "composite",
    label: "Composite steel–concrete",
    domains: ["concrete", "reinforcement", "durability", "materials"],
  },
];

export interface ProjectConfiguration {
  country: JurisdictionCode;
  /** Free-text project location (city/site) — context, not a code input. */
  location: string;
  buildingType: BuildingType;
  structuralSystem: StructuralSystem;
  familyId: CodeFamilyId;
  editionId: string;
  /** Material families specified by the engineer, for the report header. */
  materials: string[];
}

export type DomainResolution =
  | {
      domain: RequirementDomain;
      label: string;
      status: "referenced";
      references: CodeReference[];
      note?: string;
    }
  | {
      domain: RequirementDomain;
      label: string;
      status: "unsupported";
      reason: string;
    };

export interface ReferenceReport {
  family: CodeFamily;
  edition: CodeEdition;
  country: JurisdictionCode;
  jurisdictionSupported: boolean;
  domains: DomainResolution[];
  /** Understood inputs of the report — printed with it. */
  assumptions: string[];
  warnings: string[];
  /** Always true: a qualified professional must review structural design. */
  professionalReviewRequired: true;
  /** Statements proving no parameter substitution took place. */
  nonSubstitution: string[];
  registryVersion: string;
}
