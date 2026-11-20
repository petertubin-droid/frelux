/** Shared, conservative methodology content for catalogued FRELUX tools. */
import {
  CONSTRUCTION_TOOLS,
  findToolByRoute,
} from "@/config/construction-tools";
import { ALL_FAQ_ARTICLES, FAQ_ARTICLES } from "@/config/faq-articles";
import { getToolFaqGroupByRoute } from "@/config/tool-faqs";
import {
  methodologyText,
  type MethodologyKey,
} from "@/lib/calculatorMethodology";

export interface AboutThisToolConfig {
  slug: string;
  route: string;
  name: string;
  scope: string;
  inputs: string;
  result: string;
  category?: string;
  methodologyHeading?: string;
  /**
   * How the number is produced, in the calculator's own verified words.
   * Sourced from calculatorMethodology.ts, which is written per engine; a tool
   * with no entry there gets no paragraph rather than a generic one.
   */
  methodology?: string;
  /** Only populate after verifying against the calculator's actual implementation. */
  verifiedFormula?: string;
  verifiedAssumptions?: string[];
  verifiedStandards?: {
    code: string;
    name: string;
    geography: string;
    use: string;
  }[];
}

/** Route coverage is derived from the existing catalog; it does not add tools. */
export const ABOUT_TOOL_ROUTES = CONSTRUCTION_TOOLS.map((tool) => tool.to);

/**
 * Tools whose methodology copy is written and verified in
 * calculatorMethodology.ts. Mapped explicitly by slug: a wrong key would print
 * another trade's method on the page, so this is never derived from names.
 */
export const METHOD_BY_SLUG: Partial<Record<string, MethodologyKey>> = {
  "blueprint-takeoff": "blueprint-takeoff",
  boq: "boq",
  "borehole-water-system-estimator": "borehole",
  "build-to-roof": "build-to-roof",
  concrete: "structural",
  "conduit-wiring": "electrical",
  conversational: "conversational",
  "count-vision": "count-vision",
  "color-assistant": "color-assistant",
  "color-preview": "color-preview",
  "doors-windows": "doors-windows",
  electrical: "electrical",
  "fence-block": "fence-block",
  flooring: "flooring",
  "foundation-designer": "foundation",
  "foundation-estimate": "foundation-estimator",
  generator: "generator",
  "global-site-safety-estimator": "site-safety",
  labour: "labour",
  margin: "margin",
  paint: "painting",
  "photo-estimator": "ai-photo-estimate",
  plumbing: "plumbing",
  "pop-ceiling": "pop-ceiling",
  reinforcement: "reinforcement",
  "renovation-estimator": "renovation",
  "retaining-wall": "retaining-wall",
  "roof-framing": "roof-framing",
  screeding: "screeding",
  "smart-calculator": "smart-calc",
  "soffit-gutter": "soffit-gutter",
  solar: "solar-pv",
  "tall-building-structure": "tall-building",
  tile: "tile-cost",
  "wall-finish-estimator": "wall-finish",
  "water-tower-staging": "water-tower",
  waterproofing: "waterproofing",
  "window-blinds": "window-blinds",
};

/**
 * Standards each tool actually cites, found in that tool's own page or in the
 * engine module it imports. A code is listed only after being located in that
 * source, and about-this-tool.test.ts re-checks every token of every code
 * against the repository, so a standard cannot be claimed without a source.
 *
 * Absent tools render the honest fallback paragraph instead: a plausible code
 * the calculator never uses is exactly the false precision this block removes.
 */
export const VERIFIED_STANDARDS: Record<
  string,
  { code: string; name: string; geography: string; use: string }[]
> = {
  boq: [
    {
      code: "NIQS BESMM4",
      name: "Nigerian bill of quantities standard method of measurement",
      geography: "Nigeria",
      use: "Line items and measurement rules the bill is compiled against.",
    },
  ],
  "borehole-water-system-estimator": [
    {
      code: "EN 806",
      name: "Specifications for installations inside buildings conveying water for human consumption",
      geography: "Europe",
      use: "Pipe sizing and installation practice for the distribution run.",
    },
  ],
  "carbon-footprint": [
    {
      code: "EN 15978",
      name: "Sustainability of construction works, assessment of environmental performance",
      geography: "Europe",
      use: "The assessment framework the embodied-carbon figures follow.",
    },
  ],
  "plaster-render-calculator": [
    {
      code: "EN 13279-1",
      name: "Gypsum binders and gypsum plasters",
      geography: "Europe",
      use: "The plaster class and the single coat thickness range the interior system is described against.",
    },
    {
      code: "EN 15824",
      name: "Specifications for external renders and internal plasters based on organic binders",
      geography: "Europe",
      use: "The binder classification the exterior silicone and mineral topcoats follow.",
    },
    {
      code: "ASTM C587",
      name: "Standard specification for gypsum veneer plaster",
      geography: "United States",
      use: "The one coat veneer plaster name used on the North American copy.",
    },
    {
      code: "ASTM C926",
      name: "Standard specification for application of portland cement based plaster",
      geography: "United States",
      use: "The stucco finish coat application practice the US naming refers to.",
    },
    {
      code: "ETAG 004 / EAD 040083-00-0404",
      name: "External thermal insulation composite systems with rendering",
      geography: "Europe",
      use: "The 100 mm mesh overlap the reinforcing allowance is sized from.",
    },
  ],
  "eifs-wall-estimator": [
    {
      code: "ASTM C920",
      name: "Standard specification for elastomeric joint sealants",
      geography: "United States",
      use: "Sealant the system specifies at joints and terminations.",
    },
    {
      code: "ASTM E2273",
      name: "Standard test method for determining drainage efficiency of EIFS",
      geography: "United States",
      use: "Drainage performance the wall assembly is described against.",
    },
    {
      code: "ASTM E2570",
      name: "Standard test methods for water-resistive barrier coatings",
      geography: "United States",
      use: "Water-resistive coating behaviour behind the finish.",
    },
  ],
  "defs-calculator": [
    {
      code: "ASTM C1396",
      name: "Standard specification for gypsum board",
      geography: "United States",
      use: "The exterior gypsum sheathing substrate the system can be applied over.",
    },
    {
      code: "ASTM C926",
      name: "Standard specification for application of portland cement based plaster",
      geography: "United States",
      use: "The base coat application practice the direct-applied system follows over masonry.",
    },
    {
      code: "ASTM C1063",
      name: "Standard specification for installation of lathing and furring",
      geography: "United States",
      use: "The casing bead and weep screed trims counted at openings and the base.",
    },
    {
      code: "ASTM C847",
      name: "Standard specification for metal lath",
      geography: "United States",
      use: "The corrosion-resistant fixing and reinforcement practice the board screws follow.",
    },
  ],
  "foundation-designer": [
    {
      code: "BS 8004",
      name: "Code of practice for foundations",
      geography: "United Kingdom",
      use: "Foundation type selection and bearing assumptions.",
    },
    {
      code: "Eurocode 7",
      name: "Geotechnical design",
      geography: "Europe",
      use: "Design approach the bearing and settlement checks follow.",
    },
  ],
  "foundation-estimate": [
    {
      code: "BS 8004",
      name: "Code of practice for foundations",
      geography: "United Kingdom",
      use: "Foundation type selection and bearing assumptions.",
    },
    {
      code: "Eurocode 7",
      name: "Geotechnical design",
      geography: "Europe",
      use: "Design approach the bearing and settlement checks follow.",
    },
  ],
  "icf-wall-estimator": [
    {
      code: "ASTM E119",
      name: "Fire-resistance tests of building construction and materials",
      geography: "United States",
      use: "Fire-resistance rating the wall assembly is described against.",
    },
    {
      code: "ASTM E90",
      name: "Laboratory measurement of airborne sound transmission loss",
      geography: "United States",
      use: "Acoustic performance the assembly is described against.",
    },
    {
      code: "ASTM E2634",
      name: "Standard specification for flat wall insulating concrete form systems",
      geography: "United States",
      use: "The ICF system specification the takeoff follows.",
    },
    {
      code: "EN 1365",
      name: "Fire resistance tests for loadbearing elements",
      geography: "Europe",
      use: "Fire performance of the loadbearing wall.",
    },
  ],
  reinforcement: [
    {
      code: "BS 4449",
      name: "Steel for the reinforcement of concrete",
      geography: "United Kingdom",
      use: "Bar grades and properties behind the schedule weights.",
    },
  ],
  "retaining-wall": [
    {
      code: "BS 8002",
      name: "Code of practice for earth retaining structures",
      geography: "United Kingdom",
      use: "Stability checks and pressure assumptions.",
    },
    {
      code: "Eurocode 7",
      name: "Geotechnical design",
      geography: "Europe",
      use: "Design approach the stability checks follow.",
    },
  ],
  "roof-framing": [
    {
      code: "EN 1991-1",
      name: "Eurocode 1, actions on structures",
      geography: "Europe",
      use: "Load actions the member sizing is described against.",
    },
  ],
  sequence: [
    {
      code: "EN 13670",
      name: "Execution of concrete structures",
      geography: "Europe",
      use: "Curing and striking times behind the stage durations.",
    },
    {
      code: "Eurocode 2",
      name: "Design of concrete structures",
      geography: "Europe",
      use: "Concrete practice the stages follow.",
    },
  ],
  "tall-building-structure": [
    {
      code: "EN 1992-1",
      name: "Eurocode 2, design of concrete structures",
      geography: "Europe",
      use: "Concrete member checks the takeoff supports.",
    },
  ],
};

export function getAboutToolConfig(
  route: string,
): AboutThisToolConfig | undefined {
  const tool = findToolByRoute(route);
  if (!tool) return undefined;
  const article =
    (
      ALL_FAQ_ARTICLES as Record<
        string,
        { description?: string; summary?: string }
      >
    )[tool.slug] ||
    (
      FAQ_ARTICLES as Record<string, { description?: string; summary?: string }>
    )[tool.slug];

  const methodologyHeading =
    tool.category === "ai"
      ? tool.slug === "color-assistant"
        ? "How recommendations are produced"
        : tool.slug === "color-preview"
          ? "How the preview is produced"
          : "How the result is produced"
      : undefined;

  return {
    slug: tool.slug,
    route: tool.to,
    name: tool.heading || tool.title,
    category: tool.category,
    scope: article?.description || article?.summary || tool.does,
    inputs: tool.enters,
    result: tool.gets,
    methodologyHeading,
    ...(METHOD_BY_SLUG[tool.slug]
      ? { methodology: methodologyText(METHOD_BY_SLUG[tool.slug]!) }
      : {}),
    ...(VERIFIED_STANDARDS[tool.slug]
      ? { verifiedStandards: VERIFIED_STANDARDS[tool.slug] }
      : {}),
  };
}

/** Existing FAQ copy for the same route, kept visible and schema-synchronized. */
export function getAboutToolFaqs(route: string) {
  const tool = findToolByRoute(route);
  const group =
    getToolFaqGroupByRoute(route) ||
    (tool ? getToolFaqGroupByRoute(tool.to) : undefined);
  return (
    group?.questions.map((item) => ({ question: item.q, answer: item.a })) ?? []
  );
}
