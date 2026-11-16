/**
 * Curated customer-facing standards and methodology metadata.
 * This file deliberately excludes internal Studio tools and proprietary
 * implementation details. Public claims must be supported by repository evidence.
 */
export interface EngineeringDomain {
  key: string;
  title: string;
  description: string;
  standards: string[];
}

export interface PublicEngineMetadata {
  id: string;
  name: string;
  category: string;
  domain: string;
  route: string;
  standards: string[];
  method: string;
  assumptions: string[];
}

/** Do not present repository test-file counts as passing test totals. */
export const ENGINEERING_TRUST_NOTICE =
  "FRELUX uses deterministic calculation logic and automated regression tests. Code references and test coverage vary by tool and market. Standards references are informational, not certification or a substitute for professional review.";

export const ENGINEERING_DOMAINS: EngineeringDomain[] = [
  {
    key: "structural",
    title: "Structural and reinforcement takeoff",
    description:
      "Geometry-led quantity calculations, reinforcement schedules, and engineering references where documented.",
    standards: [],
  },
  {
    key: "substructure",
    title: "Foundations and substructure",
    description:
      "Foundation and excavation quantities with explicit inputs, units, and disclosed assumptions.",
    standards: [],
  },
  {
    key: "masonry",
    title: "Masonry and blockwork",
    description:
      "Wall areas, opening deductions, and material takeoffs based on entered dimensions and configured products.",
    standards: [],
  },
  {
    key: "finishes",
    title: "Finishes and coatings",
    description:
      "Floor and wall finish quantities with configurable coverage, coats, layout, and package rounding.",
    standards: [],
  },
  {
    key: "roofing",
    title: "Roofing and waterproofing",
    description:
      "Roof area and material takeoffs that disclose geometry and allowance inputs.",
    standards: [],
  },
  {
    key: "mep",
    title: "Building services and MEP quantities",
    description:
      "Electrical, plumbing, and drainage quantity tools with market-specific references where configured.",
    standards: [],
  },
];

export const PUBLIC_ENGINE_METADATA: PublicEngineMetadata[] = [
  {
    id: "reinforcement",
    name: "Reinforcement takeoff",
    category: "Structural",
    domain: "structural",
    route: "/reinforcement",
    standards: ["BS 8666:2020", "EN 1992-1-1"],
    method:
      "Bar quantities are derived from the entered schedule and geometry. The tool is a quantity takeoff, not a structural design approval.",
    assumptions: [
      "Bar dimensions and shape codes must be checked against the selected market's applicable detailing requirements.",
    ],
  },
  {
    id: "foundation",
    name: "Foundation and excavation calculator",
    category: "Substructure",
    domain: "substructure",
    route: "/foundation-calculator",
    standards: [],
    method:
      "Excavation and concrete quantities are calculated from entered dimensions. Product quantities depend on the selected material configuration.",
    assumptions: [
      "Ground conditions, bearing capacity, and structural adequacy require professional assessment.",
    ],
  },
  {
    id: "paint",
    name: "Paint calculator",
    category: "Finishes",
    domain: "finishes",
    route: "/paint-calculator",
    standards: [],
    method:
      "Paint quantity is estimated from entered surface area, coats, and product coverage, then rounded to configured package sizes.",
    assumptions: [
      "Coverage varies by product and substrate; use the manufacturer's current technical data sheet.",
    ],
  },
  {
    id: "tile",
    name: "Tile calculator",
    category: "Finishes",
    domain: "finishes",
    route: "/tile-calculator",
    standards: [],
    method:
      "Tile quantities are based on measured area, configured tile/carton coverage, and the selected cutting allowance.",
    assumptions: [
      "Actual cutting waste depends on room shape, pattern, tile size, and installer practice.",
    ],
  },
  {
    id: "screeding",
    name: "Screeding calculator",
    category: "Finishes",
    domain: "finishes",
    route: "/screeding-calculator",
    standards: [],
    method:
      "Screed volume is derived from area and specified thickness; material conversions are shown only where configured.",
    assumptions: [
      "Mix design, substrate condition, and product instructions govern installation.",
    ],
  },
  {
    id: "conduit-wiring",
    name: "Conduit and wiring estimator",
    category: "MEP",
    domain: "mep",
    route: "/electrical-conduit-wiring-estimator",
    standards: [],
    method:
      "Route quantities are estimated from entered runs and allowances. This is not an electrical design or compliance certificate.",
    assumptions: [
      "Cable sizing, protection, voltage drop, and installation compliance require qualified review.",
    ],
  },
  {
    id: "waterproofing",
    name: "Waterproofing calculator",
    category: "Roofing",
    domain: "roofing",
    route: "/waterproofing",
    standards: [],
    method:
      "Membrane quantities follow entered surface dimensions and configured product coverage/lap assumptions.",
    assumptions: [
      "Confirm current manufacturer installation details, lap sizes, and substrate requirements.",
    ],
  },
];

export function findPublicEngine(
  routeOrId: string,
): PublicEngineMetadata | undefined {
  const normalized = routeOrId.toLowerCase().replace(/^\//, "");
  return PUBLIC_ENGINE_METADATA.find(
    (engine) =>
      engine.id === normalized ||
      engine.route.toLowerCase().replace(/^\//, "") === normalized,
  );
}
