/**
 * The FRELUX standards library.
 *
 * Every entry below is a DOCUMENT IDENTIFIER plus the domain it governs.
 * No design parameter (factor, ratio, spacing, load value) is stored
 * here on purpose: those belong to the adopted code edition and the
 * project's engineer. Where a jurisdiction has no honest reference for a
 * domain, the domain is recorded as unsupported with a reason.
 *
 * AUDIT NOTE: this file is versioned in git. Administrative status
 * changes (verified / under review / unsupported) are an overlay stored
 * in the database and shown in /admin/code-registry; the library stays
 * the immutable denominator, so any change is diffable.
 */

import type {
  CodeFamily,
  CodeFamilyId,
  JurisdictionCode,
  RequirementDomain,
} from "./types";

export const REGISTRY_VERSION = "2026.10.30-r1";

const ref = (
  document: string,
  title: string,
  governs: string,
  status: "verified" | "verify-locally" = "verified",
  note?: string,
) => ({ document, title, governs, status, note });

export const CODE_FAMILIES: Record<CodeFamilyId, CodeFamily> = {
  // ────────────────────────────────────────────────────────────────
  eurocode: {
    id: "eurocode",
    name: "EN Eurocodes",
    shortName: "Eurocodes",
    jurisdictions: ["EU"],
    adoptingAuthorities:
      "National standards bodies in each EU/EEA member state, with a published National Annex.",
    adoptionNote:
      "The Eurocodes are model codes. Each country's National Annex fixes the nationally determined parameters (partial factors, wind/snow maps, material values). The annex of the project country applies — never another member state's annex.",
    editions: [
      {
        id: "en-current",
        label: "EN 1990–EN 1999 as adopted nationally (with National Annexes)",
        year: null,
        state: "current",
        note: "Confirm which parts and annex version the member state has designated.",
      },
    ],
    defaultEditionId: "en-current",
    scopeNotes: [
      "National Annex of the project country governs nationally determined parameters.",
      "Design values are not transferable between member states.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "EN 1992-1-1",
            "Eurocode 2: Design of concrete structures — General rules and rules for buildings",
            "Structural concrete design, including detailing and fire rules.",
          ),
          ref(
            "EN 1992-1-1 National Annex",
            "Project country's National Annex to Eurocode 2",
            "Nationally determined parameters for concrete design.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "EN 1992-1-1 §8–§9",
            "Detailing rules for reinforcement",
            "Detailing (spacing, anchorage, laps) — as amended by the National Annex.",
          ),
          ref(
            "EN 10080",
            "Steel for the reinforcement of concrete — Weldable reinforcing steel",
            "Reinforcing steel product standard.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "EN 1990",
            "Eurocode: Basis of structural design",
            "Design basis, combinations and partial factors (via National Annex).",
          ),
          ref(
            "EN 1991-1-1",
            "Eurocode 1: Actions on structures — Densities, self-weight and imposed loads",
            "Self-weight and imposed loads.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "EN 1991-1-4",
            "Eurocode 1: Actions on structures — Wind actions",
            "Wind actions; the national wind map is in the country's National Annex.",
            "verified",
            "The wind map/values come from the National Annex of the project country.",
          ),
        ],
      },
      snow: {
        status: "referenced",
        references: [
          ref(
            "EN 1991-1-3",
            "Eurocode 1: Actions on structures — Snow loads",
            "Snow actions and the national ground-snow map.",
            "verified",
            "Not every member state has national snow data; where the annex is silent, the engineer must justify the value.",
          ),
        ],
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "EN 1997-1",
            "Eurocode 7: Geotechnical design — General rules",
            "Geotechnical design and foundation verification.",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "EN 206",
            "Concrete — Specification, performance, production and conformity",
            "Exposure classes (XC/XD/XS/XF/XA) and conformity.",
          ),
          ref(
            "EN 1992-1-1 §4",
            "Durability and cover requirements",
            "Nominal cover linked to the exposure class.",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "EN 206",
            "Concrete specification",
            "Concrete composition and conformity.",
          ),
          ref(
            "EN 10080",
            "Reinforcing steel",
            "Reinforcement product standard.",
          ),
          ref(
            "EN 1090-1 / EN 1090-2",
            "Execution of steel structures",
            "Fabrication and erection of steel components.",
          ),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  "uk-regs": {
    id: "uk-regs",
    name: "UK Building Regulations and British Standards",
    shortName: "UK",
    jurisdictions: ["GB"],
    adoptingAuthorities:
      "England: MHCLG (Building Regulations 2010, Approved Documents). Scotland, Wales and Northern Ireland legislate separately.",
    adoptionNote:
      "England's Approved Documents differ from Scotland's Technical Handbooks, Wales' regulations and Northern Ireland's Building Regulations. Confirm the devolved regime that applies to the site, plus any local authority amendments.",
    editions: [
      {
        id: "uk-current",
        label:
          "Building Regulations 2010 (England), current Approved Documents",
        year: 2010,
        state: "current",
        note: "Approved Documents are amended individually — confirm the current version of Part A for structure.",
      },
      {
        id: "uk-scotland",
        label: "Building (Scotland) Regulations — Technical Handbooks",
        year: 2004,
        state: "regional-variant",
        note: "Separate regime with its own structural guidance.",
      },
    ],
    defaultEditionId: "uk-current",
    scopeNotes: [
      "Part A (structure) applies; Parts B, C, L, M, etc. apply to their own subjects.",
      "Duty-holder and competence rules (Building Safety Act) apply to higher-risk buildings.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "BS EN 1992-1-1 + UK National Annex",
            "Eurocode 2 with UK NA",
            "Structural concrete design in the UK.",
          ),
          ref(
            "Approved Document A",
            "Structure",
            "Regulatory requirement that structural work be designed to the relevant standards.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "BS 4449",
            "Steel for the reinforcement of concrete",
            "Reinforcing steel grades.",
          ),
          ref(
            "BS EN 1992-1-1 §8–§9 + UK NA",
            "Detailing rules",
            "Detailing and anchorage rules as amended by the UK NA.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "BS EN 1990 + UK NA",
            "Basis of structural design",
            "Design basis and combinations.",
          ),
          ref(
            "BS EN 1991-1-1 + UK NA",
            "Actions — self-weight and imposed loads",
            "Permanent and variable actions.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "BS EN 1991-1-4 + UK NA",
            "Wind actions",
            "UK wind map and parameters (basic velocity from the UK NA).",
          ),
        ],
      },
      snow: {
        status: "referenced",
        references: [
          ref(
            "BS EN 1991-1-3 + UK NA",
            "Snow loads",
            "UK ground-snow values from the National Annex.",
          ),
        ],
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "BS EN 1997-1 + UK NA",
            "Geotechnical design",
            "Foundation and geotechnical verification.",
          ),
          ref(
            "Approved Document C",
            "Site preparation and resistance to contaminants and moisture",
            "Site preparation requirements.",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "BS 8500-1 / BS 8500-2",
            "Concrete — Complementary British Standard to BS EN 206",
            "UK exposure classes, limiting compositions and conformity.",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "BS 8500-1",
            "Concrete specification (UK)",
            "Concrete mixes and exposure classes.",
          ),
          ref("BS 4449", "Reinforcing steel", "Steel grades."),
          ref(
            "BS EN 1090-2",
            "Execution of steel structures",
            "Fabrication standard.",
          ),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  ibc: {
    id: "ibc",
    name: "International Building Code",
    shortName: "IBC",
    jurisdictions: ["US"],
    adoptingAuthorities:
      "State and local jurisdictions adopting the IBC by ordinance (often with local amendments).",
    adoptionNote:
      "The IBC has no legal force until a jurisdiction adopts a specific edition, frequently with amendments and a different effective date. Confirm the adopted edition with the local building department.",
    editions: [
      {
        id: "ibc-2024",
        label: "IBC 2024",
        year: 2024,
        state: "current",
        note: "Newest edition; adoption varies by jurisdiction.",
      },
      { id: "ibc-2021", label: "IBC 2021", year: 2021, state: "current" },
      { id: "ibc-2018", label: "IBC 2018", year: 2018, state: "superseded" },
    ],
    defaultEditionId: "ibc-2021",
    scopeNotes: [
      "The IBC's Chapter 35 fixes which editions of referenced standards (ASCE 7, ACI 318, AISC 360…) apply — use the edition paired with the adopted IBC, not the newest standalone standard.",
      "High-wind and seismic detailing depend on the site's mapped hazard values in ASCE 7.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "ACI 318",
            "Building Code Requirements for Structural Concrete",
            "Structural concrete design; the edition is the one referenced by the adopted IBC.",
            "verify-locally",
            "Confirm the ACI 318 edition referenced by the adopted IBC (Chapter 35).",
          ),
          ref(
            "IBC Chapter 19",
            "Concrete",
            "Administrative and quality requirements for concrete.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "ACI 318 (detailing chapters)",
            "Reinforcement detailing",
            "Detailing and development rules.",
          ),
          ref(
            "ASTM A615",
            "Deformed and plain carbon-steel bars for concrete reinforcement",
            "Reinforcing bar specification.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "ASCE 7",
            "Minimum Design Loads and Associated Criteria for Buildings and Other Structures",
            "Loads, combinations and hazard maps.",
          ),
          ref(
            "IBC Chapter 16",
            "Structural design",
            "Load combinations and design basis.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "ASCE 7 Chapters 26–31",
            "Wind loads",
            "Wind hazard maps, exposure categories and pressure coefficients.",
          ),
        ],
      },
      snow: {
        status: "referenced",
        references: [
          ref(
            "ASCE 7 Chapter 7",
            "Snow loads",
            "Ground snow load maps and roof snow provisions.",
          ),
        ],
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "IBC Chapter 18",
            "Soils and foundations",
            "Foundation design and geotechnical reporting.",
          ),
          ref(
            "ACI 332",
            "Residential concrete construction",
            "Where applicable to residential foundations.",
            "verify-locally",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "ACI 318 Chapter 19",
            "Concrete durability requirements",
            "Exposure classes F, S, W and C.",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "ACI 318",
            "Concrete materials and testing",
            "Concrete material requirements.",
          ),
          ref(
            "AISC 360",
            "Specification for Structural Steel Buildings",
            "Structural steel design.",
          ),
          ref(
            "AISI S100",
            "North American Specification for the Design of Cold-Formed Steel Structural Members",
            "Cold-formed steel.",
          ),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  irc: {
    id: "irc",
    name: "International Residential Code",
    shortName: "IRC",
    jurisdictions: ["US"],
    adoptingAuthorities:
      "State and local jurisdictions adopting the IRC for one- and two-family dwellings and townhouses.",
    adoptionNote:
      "The IRC is a prescriptive code with a limited scope. Where a design falls outside its prescriptive provisions, the IBC (or an engineered design) applies.",
    editions: [
      {
        id: "irc-2024",
        label: "IRC 2024",
        year: 2024,
        state: "current",
        note: "Adoption varies by jurisdiction.",
      },
      { id: "irc-2021", label: "IRC 2021", year: 2021, state: "current" },
      { id: "irc-2018", label: "IRC 2018", year: 2018, state: "superseded" },
    ],
    defaultEditionId: "irc-2021",
    scopeNotes: [
      "Scope: detached one- and two-family dwellings and townhouses not more than three storeys above grade plane.",
      "Prescriptive solutions only; anything outside them needs an engineered design under the IBC.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapter 4",
            "Foundations",
            "Prescriptive concrete foundation provisions.",
          ),
          ref(
            "ACI 318 / ACI 332",
            "Concrete design references",
            "Where the prescriptive path does not apply.",
            "verify-locally",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapter 4",
            "Prescriptive reinforcement requirements",
            "Minimum prescriptive reinforcement for foundation elements.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapter 3",
            "Building planning",
            "Design criteria, live loads and limitations.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapter 3 / ASCE 7",
            "Wind design criteria",
            "Prescriptive wind provisions; ASCE 7 where the prescriptive path is exceeded.",
          ),
        ],
      },
      snow: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapter 3",
            "Snow loads",
            "Ground snow load from the jurisdiction's mapped value.",
          ),
        ],
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapter 4",
            "Footings and foundations",
            "Prescriptive footing and foundation rules.",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapter 4 / ACI 318 Chapter 19",
            "Durability in foundation concrete",
            "Where an engineered design applies.",
            "verify-locally",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "IRC Chapters 5–6",
            "Materials and wall construction",
            "Prescriptive material requirements.",
          ),
          ref(
            "AWC NDS",
            "National Design Specification for Wood Construction",
            "Engineered timber design.",
          ),
          ref(
            "AISI S230",
            "Standard for cold-formed steel framing — Prescriptive method",
            "Prescriptive CFS framing.",
          ),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  nbcc: {
    id: "nbcc",
    name: "National Building Code of Canada",
    shortName: "NBCC",
    jurisdictions: ["CA"],
    adoptingAuthorities:
      "Provincial and territorial governments adopt the NBCC through their own building codes (e.g. Ontario Building Code, Québec Construction Code).",
    adoptionNote:
      "There is no federal enforcement: each province/territory adopts the NBCC with amendments. Confirm the code and amendments of the province or territory where the site sits.",
    editions: [
      {
        id: "nbcc-2020",
        label: "NBCC 2020",
        year: 2020,
        state: "current",
        note: "Provincial adoption timelines vary.",
      },
      { id: "nbcc-2015", label: "NBCC 2015", year: 2015, state: "superseded" },
    ],
    defaultEditionId: "nbcc-2020",
    scopeNotes: [
      "Structural requirements sit in Part 4 (large buildings) and Part 9 (housing and small buildings).",
      "Climatic design data (wind, snow, seismic) moved out of the printed Appendix C in NBCC 2020 — use the current published climatic dataset for the site.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "CSA A23.3",
            "Design of concrete structures",
            "Structural concrete design.",
          ),
          ref(
            "NBCC Part 4",
            "Structural design requirements",
            "Code-level structural provisions.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "CSA A23.3",
            "Reinforcement detailing",
            "Detailing and development.",
          ),
          ref(
            "CSA G30.18",
            "Carbon steel bars for concrete reinforcement",
            "Bar specification.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "NBCC Part 4, Section 4.1",
            "Structural loads and procedures",
            "Loads, combinations and effects.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "NBCC 4.1.7 + climatic data",
            "Wind loads",
            "Wind design using the NBC's published climatic values for the site.",
          ),
        ],
      },
      snow: {
        status: "referenced",
        references: [
          ref(
            "NBCC 4.1.6 + climatic data",
            "Snow loads",
            "Ground snow and associated rain loads from the published climatic data.",
          ),
        ],
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "NBCC Part 4, Section 4.2",
            "Foundations and excavations",
            "Foundation requirements.",
          ),
          ref(
            "CSA A23.3",
            "Concrete foundation design",
            "Structural design of foundations.",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "CSA A23.1 / A23.2",
            "Concrete materials and methods of testing",
            "Exposure classes and concrete quality.",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "CSA A23.1",
            "Concrete materials",
            "Concrete material requirements.",
          ),
          ref("CSA S16", "Design of steel structures", "Structural steel."),
          ref("CSA O86", "Engineering design in wood", "Timber design."),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  "ncc-au": {
    id: "ncc-au",
    name: "National Construction Code (Australia)",
    shortName: "NCC",
    jurisdictions: ["AU"],
    adoptingAuthorities:
      "Australian Building Codes Board publishes the NCC; states and territories adopt it by legislation with their own commencement dates and variations.",
    adoptionNote:
      "Adoption dates and transitional arrangements differ per state/territory, and state variations apply. Confirm the edition in force at the site's date of approval.",
    editions: [
      {
        id: "ncc-2022",
        label: "NCC 2022 (Volumes One, Two, Three)",
        year: 2022,
        state: "current",
        note: "Adoption across states is staged — check local transitional provisions.",
      },
      { id: "ncc-2019", label: "NCC 2019", year: 2019, state: "superseded" },
    ],
    defaultEditionId: "ncc-2022",
    scopeNotes: [
      "Volume One covers Class 2–9 buildings; Volume Two covers Class 1 and 10; Volume Three covers plumbing.",
      "Performance Solutions may be used instead of Deemed-to-Satisfy provisions — that path requires a qualified professional.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "AS 3600",
            "Concrete structures",
            "Structural concrete design (with Supplement 1).",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "AS 3600",
            "Reinforcement detailing",
            "Detailing and development rules.",
          ),
          ref(
            "AS/NZS 4671",
            "Steel reinforcing materials",
            "Reinforcing steel specification.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "AS/NZS 1170.0",
            "Structural design actions — General principles",
            "Design basis and combinations.",
          ),
          ref(
            "AS/NZS 1170.1",
            "Permanent, imposed and other actions",
            "Permanent and imposed actions.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "AS/NZS 1170.2",
            "Wind actions",
            "Regional wind speeds and pressure coefficients.",
          ),
        ],
      },
      snow: {
        status: "referenced",
        references: [
          ref(
            "AS/NZS 1170.3",
            "Snow and ice actions",
            "Alpine and sub-alpine snow provisions.",
          ),
        ],
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "AS 2870",
            "Residential slabs and footings",
            "Residential foundation classification and design.",
          ),
          ref(
            "AS 3600",
            "Structural design of footings",
            "Engineered foundation design.",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "AS 3600 Section 4",
            "Durability and exposure classification",
            "Exposure classes and cover.",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref("AS 3600", "Concrete material requirements", "Concrete quality."),
          ref("AS 4100", "Steel structures", "Structural steel."),
          ref("AS 3700", "Masonry structures", "Masonry design."),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  "ng-nbc": {
    id: "ng-nbc",
    name: "National Building Code (Nigeria)",
    shortName: "Nigeria NBC",
    jurisdictions: ["NG"],
    adoptingAuthorities:
      "Federal Ministry of Works and Housing published the National Building Code; enforcement is by state and local planning authorities.",
    adoptionNote:
      "Adoption and enforcement vary by state, and a revised edition has been in development for years. Confirm the edition and any state building regulations the planning authority applies to the site.",
    editions: [
      {
        id: "ng-nbc-2006",
        label: "National Building Code (1st edition, 2006)",
        year: 2006,
        state: "current",
        note: "The published federal edition. Confirm with the state planning authority whether a revision or state regulations supersede it for this project.",
      },
    ],
    defaultEditionId: "ng-nbc-2006",
    scopeNotes: [
      "The 2006 code is a regulatory/administrative framework; it does not provide a complete modern structural design methodology. Structural design is normally carried out to a recognised standard (historically BS 8110, increasingly EN 1992) with the engineer's justification.",
      "State planning authorities may impose additional requirements (setbacks, drainage, environmental impact).",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "NBC 2006 (structural provisions) + engineer-specified design standard",
            "Concrete design basis",
            "The code's structural provisions; the design standard used must be stated by the engineer.",
            "verify-locally",
            "The 2006 code does not itself codify a complete concrete design method. The project engineer must name the design standard (EN 1992 or legacy BS 8110) and justify it.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "NBC 2006 detailing provisions + engineer-specified standard",
            "Reinforcement detailing",
            "Detailing requirements as adopted; confirm with the design standard named by the engineer.",
            "verify-locally",
          ),
          ref(
            "SON NIS standards for reinforcing steel",
            "Nigerian Industrial Standards (reinforcement)",
            "Product standards published by the Standards Organisation of Nigeria.",
            "verify-locally",
            "Confirm the current NIS designation and edition with SON before specifying.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "NBC 2006 imposed-load provisions",
            "Minimum imposed loads",
            "The code's occupancy load table.",
            "verify-locally",
            "Verify the table against the edition the state authority applies.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "NBC 2006 wind provisions + engineer's justification",
            "Wind actions",
            "Basic wind requirements; no modern national wind map is codified in the 2006 edition.",
            "verify-locally",
            "The engineer must justify the wind speed used (measured data or a recognised regional map) — this tool does not supply one.",
          ),
        ],
      },
      snow: {
        status: "unsupported",
        reason:
          "Snow loading is not a codified design case in the Nigerian National Building Code: the country has no mapped ground-snow values. Importing another country's snow map would be a fabrication.",
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "NBC 2006 foundation provisions + geotechnical investigation",
            "Foundation requirements",
            "Foundation provisions of the code; soil investigation by a geotechnical engineer.",
            "verify-locally",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "NBC 2006 durability/quality provisions",
            "Durability requirements",
            "Code-level quality provisions; exposure-based design follows the engineer's named standard.",
            "verify-locally",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "NIS 444-1",
            "Cement — Composition, specifications and conformity criteria",
            "Cement specification (Nigerian Industrial Standard).",
            "verify-locally",
            "Confirm the current edition with SON.",
          ),
          ref(
            "NBC 2006 material requirements",
            "Material quality requirements",
            "Code-level material requirements.",
            "verify-locally",
          ),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  "ke-code": {
    id: "ke-code",
    name: "Kenya building standards",
    shortName: "Kenya",
    jurisdictions: ["KE"],
    adoptingAuthorities:
      "County governments approve buildings under the Physical and Land Use Planning Act and county by-laws; KEBS publishes material standards.",
    adoptionNote:
      "Building control is a county function. Confirm the by-laws and approval requirements of the specific county, and whether a newer national building code has been gazetted.",
    editions: [
      {
        id: "ke-legacy",
        label:
          "Local Government (Adoptive By-Laws) (Building) Order, 1968 — as applied by counties",
        year: 1968,
        state: "current",
        note: "The long-standing national instrument applied through county by-laws; a modernised code has been under development — confirm with the county before relying on it.",
      },
    ],
    defaultEditionId: "ke-legacy",
    scopeNotes: [
      "The legacy by-laws are largely prescriptive and dated; structural design in practice references recognised international standards named by the engineer.",
      "County approval processes (and any county-specific structural requirements) apply on top.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "Adoptive By-Laws 1968 + engineer-named design standard",
            "Concrete design basis",
            "By-law structural provisions; the design standard (e.g. EN 1992 or BS 8110) is named by the engineer.",
            "verify-locally",
            "The by-laws do not codify a complete modern concrete design method — the engineer must state and justify the standard used.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "Adoptive By-Laws 1968 + engineer-named standard",
            "Reinforcement detailing",
            "Detailing follows the design standard named by the engineer.",
            "verify-locally",
          ),
          ref(
            "KEBS adoption of ISO 6935 (steel for concrete reinforcement)",
            "Reinforcing steel standard",
            "Kenya Bureau of Standards adoption of the ISO reinforcing-steel standard.",
            "verify-locally",
            "Confirm the current KS designation with KEBS.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "Adoptive By-Laws 1968 load provisions",
            "Imposed loads",
            "By-law occupancy loads.",
            "verify-locally",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "Engineer's justified wind basis",
            "Wind actions",
            "No modern national wind map is codified; the engineer justifies the wind value used.",
            "verify-locally",
            "This tool does not supply a wind speed for Kenya.",
          ),
        ],
      },
      snow: {
        status: "unsupported",
        reason:
          "Snow loading is not codified in Kenyan building by-laws. High-altitude sites need a site-specific engineering assessment, which this reference engine cannot provide.",
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "Adoptive By-Laws 1968 foundation provisions + geotechnical investigation",
            "Foundation requirements",
            "Foundation provisions and site investigation.",
            "verify-locally",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "Engineer-named design standard",
            "Durability requirements",
            "Durability follows the design standard the engineer names.",
            "verify-locally",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "KS EAS 18",
            "Cement — Composition, specifications and conformity criteria (East African Standard adopted by KEBS)",
            "Cement specification.",
            "verify-locally",
            "Confirm the current KS designation with KEBS.",
          ),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  "za-sans": {
    id: "za-sans",
    name: "South African National Standards (SANS)",
    shortName: "SANS",
    jurisdictions: ["ZA"],
    adoptingAuthorities:
      "National Building Regulations (SANS 10400) enforced by local authorities; structural work by professionally registered competent persons (ECSA).",
    adoptionNote:
      "Municipal enforcement applies the National Building Regulations and the SANS the regulations call up. Confirm the municipal by-laws and the registration category of the competent person the project requires.",
    editions: [
      {
        id: "za-current",
        label:
          "SANS 10400 (National Building Regulations) with current SANS design standards",
        year: null,
        state: "current",
        note: "SANS documents are revised individually — confirm the current edition of each part used.",
      },
    ],
    defaultEditionId: "za-current",
    scopeNotes: [
      "SANS 10400 Part B requires structural design by a competent person with the appropriate ECSA registration.",
      "SANS 10100-1 (concrete) is aligned with EN 1992, but its South African amendments govern.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "SANS 10100-1",
            "The structural use of concrete",
            "Structural concrete design (EN 1992-aligned with SA amendments).",
          ),
          ref(
            "SANS 10400-B",
            "Structural design",
            "Regulatory structural requirements.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "SANS 10100-1",
            "Reinforcement detailing",
            "Detailing and development.",
          ),
          ref(
            "SANS 920",
            "Steel bars for concrete reinforcement",
            "Reinforcing bar specification.",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "SANS 10160-1",
            "Basis of structural design and actions for buildings and industrial structures — Basis of structural design",
            "Design basis and combinations.",
          ),
          ref(
            "SANS 10160-2",
            "Self-weight and imposed loads",
            "Permanent and imposed actions.",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref("SANS 10160-3", "Wind actions", "South African wind loading."),
        ],
      },
      snow: {
        status: "unsupported",
        reason:
          "Snow is not a codified load case in the SANS 10160 series; the country has no mapped ground-snow values. Any high-altitude site needs a site-specific engineering assessment.",
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "SANS 10400-H",
            "Foundations",
            "Regulatory foundation requirements.",
          ),
          ref(
            "SANS 10100-1 / geotechnical investigation",
            "Structural foundation design",
            "Design of foundations to the concrete standard.",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "SANS 10100-1",
            "Durability and cover",
            "Exposure-based durability requirements.",
          ),
          ref(
            "SANS 10400-B",
            "Durability provisions",
            "Regulatory durability requirements.",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref("SANS 920", "Reinforcing steel", "Bar specification."),
          ref(
            "SANS 10162-1",
            "The structural use of steel — Limit-states design of hot-rolled steelwork",
            "Structural steel.",
          ),
          ref("SANS 10163-1", "The structural use of timber", "Timber design."),
        ],
      },
    },
  },

  // ────────────────────────────────────────────────────────────────
  "ae-codes": {
    id: "ae-codes",
    name: "UAE building regulations (emirate-level)",
    shortName: "UAE",
    jurisdictions: ["AE"],
    adoptingAuthorities:
      "Emirate and free-zone authorities: Dubai Municipality / Dubai Development Authority, Abu Dhabi (DMT/ADQCC), Sharjah, Trakhees, and each free zone.",
    adoptionNote:
      "The UAE has no single national building code. Dubai publishes the Dubai Building Code; Abu Dhabi publishes the Abu Dhabi International Building Code; free zones apply their own. The authority having jurisdiction for the plot governs.",
    editions: [
      {
        id: "ae-dubai",
        label: "Dubai Building Code (2021)",
        year: 2021,
        state: "regional-variant",
        note: "Applies to projects under Dubai Municipality / DDA jurisdiction.",
      },
      {
        id: "ae-abudhabi",
        label: "Abu Dhabi International Building Code (ADIBC)",
        year: 2013,
        state: "regional-variant",
        note: "Applies to Abu Dhabi projects; confirm current amendments with DMT.",
      },
    ],
    defaultEditionId: "ae-dubai",
    scopeNotes: [
      "Structural design normally follows the reference code named in the emirate's building code (commonly IBC/ASCE 7) with local amendments — confirm the actual basis with the authority.",
      "Fire and life safety is additionally governed by the UAE Fire and Life Safety Code of Practice.",
    ],
    requirements: {
      concrete: {
        status: "referenced",
        references: [
          ref(
            "Emirate building code + named concrete standard",
            "Concrete design basis",
            "The emirate code's structural chapter and the concrete standard it calls up.",
            "verify-locally",
            "Confirm with the authority which concrete design standard (ACI 318 or EN 1992) the approved design basis uses.",
          ),
        ],
      },
      reinforcement: {
        status: "referenced",
        references: [
          ref(
            "Emirate building code + named standard",
            "Reinforcement detailing",
            "Detailing follows the concrete standard of the approved design basis.",
            "verify-locally",
          ),
        ],
      },
      loads: {
        status: "referenced",
        references: [
          ref(
            "Emirate building code structural chapter",
            "Structural loads and combinations",
            "The loads chapter of the emirate code and the standard it references.",
            "verify-locally",
          ),
        ],
      },
      wind: {
        status: "referenced",
        references: [
          ref(
            "Emirate building code wind provisions",
            "Wind actions",
            "Wind requirements of the emirate code (commonly via the referenced US code).",
            "verify-locally",
            "Confirm the wind speed basis with the authority; coastal exposure and gust factors are site-specific.",
          ),
        ],
      },
      snow: {
        status: "unsupported",
        reason:
          "Snow loading does not apply in the UAE and is not provided for in the emirate building codes. No snow reference exists to cite.",
      },
      foundations: {
        status: "referenced",
        references: [
          ref(
            "Emirate building code foundation chapter + geotechnical investigation",
            "Foundations",
            "Foundation requirements and mandatory site investigation.",
            "verify-locally",
          ),
        ],
      },
      durability: {
        status: "referenced",
        references: [
          ref(
            "Emirate code durability requirements (marine/chloride exposure)",
            "Durability",
            "Durability requirements for aggressive coastal ground and air.",
            "verify-locally",
            "Coastal chlorides and sulfate-bearing ground commonly drive the durability specification — confirm with the geotechnical report.",
          ),
        ],
      },
      materials: {
        status: "referenced",
        references: [
          ref(
            "Emirate code referenced material standards",
            "Material specifications",
            "Material standards referenced by the emirate code (ASTM, BS or EN families as named).",
            "verify-locally",
          ),
        ],
      },
    },
  },
};

/** Country → the family normally applicable there. */
export const DEFAULT_FAMILY_BY_JURISDICTION: Record<
  JurisdictionCode,
  CodeFamilyId
> = {
  EU: "eurocode",
  GB: "uk-regs",
  US: "ibc",
  CA: "nbcc",
  AU: "ncc-au",
  NG: "ng-nbc",
  KE: "ke-code",
  ZA: "za-sans",
  AE: "ae-codes",
};

export const FAMILY_ORDER: CodeFamilyId[] = [
  "eurocode",
  "uk-regs",
  "ibc",
  "irc",
  "nbcc",
  "ncc-au",
  "ng-nbc",
  "ke-code",
  "za-sans",
  "ae-codes",
];

/** Domains in display order. */
export const DOMAIN_ORDER: RequirementDomain[] = [
  "concrete",
  "reinforcement",
  "loads",
  "wind",
  "snow",
  "foundations",
  "durability",
  "materials",
];

export function getFamily(id: CodeFamilyId): CodeFamily {
  return CODE_FAMILIES[id];
}
