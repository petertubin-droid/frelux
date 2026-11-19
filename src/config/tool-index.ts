/**
 * GENERATED FILE. Regenerate with: npm run tools:index
 *
 * The two answers the page frame needs from the tool catalogue before anything
 * paints: which addresses are calculators, and what the tools menu lists. The
 * catalogue itself carries body copy, entry prose and search descriptions that a
 * frame does not need, so importing it here cost every visitor those bytes on
 * the first request. Nothing in this file is written by hand; the test beside it
 * fails when it drifts from src/config/construction-tools.ts.
 */
export interface NavTool {
  to: string;
  label: string;
  benefit: string;
}

export interface NavToolGroup {
  id: string;
  label: string;
  tools: NavTool[];
}

export const TOOL_ROUTES: ReadonlySet<string> = new Set([
  "/ai-color-assistant",
  "/bim-ifc-import",
  "/blueprint-takeoff",
  "/boq-generator",
  "/borehole-water-system-estimator",
  "/build-to-roof-estimator",
  "/carbon-footprint",
  "/cash-flow-timeline",
  "/circular-reuse",
  "/code-reference",
  "/color-preview",
  "/concrete-takeoff-calculator",
  "/construction-sequence",
  "/contractor-credit",
  "/conversational-estimator",
  "/count-vision",
  "/defect-diagnosis",
  "/demolition-calculator",
  "/diaspora-budget-tracker",
  "/doors-windows",
  "/drainage-calculator",
  "/drywall-calculator",
  "/earthworks-cut-fill",
  "/electrical",
  "/electrical-conduit-wiring-estimator",
  "/estimate-refresh",
  "/fence-block-calculator",
  "/field-sync",
  "/finish-estimator",
  "/flooring",
  "/foundation",
  "/foundation-calculator",
  "/generator",
  "/german-floor-calculator",
  "/global-site-safety-estimator",
  "/heat-comfort",
  "/icf-wall-estimator",
  "/image-estimator",
  "/increte-flooring-calculator",
  "/insulation-calculator",
  "/labour-estimator",
  "/maintenance-planner",
  "/margin-calculator",
  "/masonry-calculator",
  "/material-advisor",
  "/material-price-index",
  "/material-prices",
  "/mathematical-plan-elevation",
  "/paint-calculator",
  "/paint-comparison",
  "/paving-calculator",
  "/plastering-calculator",
  "/plumbing",
  "/pop-ceiling-calculator",
  "/project-timeline",
  "/quote-check",
  "/rainwater-gutter-soffit-cost-estimator",
  "/regional-cost-index",
  "/reinforcement",
  "/renovation-estimator",
  "/retaining-wall-calculator",
  "/roof-framing-calculator",
  "/screeding-calculator",
  "/septic-sizing-calculator",
  "/smart-calculator",
  "/solar-pv-estimator",
  "/structural-calculator",
  "/structural-steel-i-beam-calculator",
  "/surface-assessment",
  "/tall-building-structure",
  "/temporary-works-calculator",
  "/tile-calculator",
  "/tv-console-calculator",
  "/unit-converter",
  "/wall-finish-estimator",
  "/wallpaper-calculator",
  "/warranty-certificate",
  "/water-tower-staging-estimator",
  "/waterproofing",
  "/window-blind-calculator",
]);

export const NAV_TOOL_GROUPS: readonly NavToolGroup[] = [
  {
    id: "finishes",
    label: "Materials & Finishes",
    tools: [
      {
        to: "/paint-calculator",
        label: "Paint Calculator",
        benefit: "Buckets · Cost · Project estimate",
      },
      {
        to: "/paint-comparison",
        label: "Paint Comparison",
        benefit: "",
      },
      {
        to: "/screeding-calculator",
        label: "Wall Screeding",
        benefit: "Quantity & cost",
      },
      {
        to: "/finish-estimator",
        label: "Finish Comparison",
        benefit: "Tyrolene · Grafitex",
      },
      {
        to: "/pop-ceiling-calculator",
        label: "POP Ceiling",
        benefit: "Materials & cost",
      },
      {
        to: "/tile-calculator",
        label: "Tile Calculator",
        benefit: "Boxes · Adhesive · Cost",
      },
      {
        to: "/increte-flooring-calculator",
        label: "Decorative Concrete Flooring",
        benefit: "Stamped · Overlay · Sealer",
      },
      {
        to: "/flooring",
        label: "Flooring",
        benefit: "",
      },
      {
        to: "/waterproofing",
        label: "Waterproofing",
        benefit: "",
      },
      {
        to: "/wall-finish-estimator",
        label: "Wall Finish Estimator",
        benefit: "",
      },
      {
        to: "/plastering-calculator",
        label: "Plastering & Rendering",
        benefit: "",
      },
      {
        to: "/insulation-calculator",
        label: "Insulation Takeoff",
        benefit: "",
      },
      {
        to: "/surface-assessment",
        label: "Surface Assessment",
        benefit: "",
      },
    ],
  },
  {
    id: "structure",
    label: "Building Structure",
    tools: [
      {
        to: "/german-floor-calculator",
        label: "German Floor Calculator",
        benefit: "Cement · Granite · Hardcore",
      },
      {
        to: "/fence-block-calculator",
        label: "Fence Block Calculator",
        benefit: "Coaches · Trips · Blocks",
      },
      {
        to: "/masonry-calculator",
        label: "Masonry & Blockwork",
        benefit: "",
      },
      {
        to: "/drywall-calculator",
        label: "Drywall & Partitions",
        benefit: "",
      },
      {
        to: "/paving-calculator",
        label: "Paving & External Works",
        benefit: "",
      },
      {
        to: "/temporary-works-calculator",
        label: "Formwork & Temporary Works",
        benefit: "",
      },
      {
        to: "/demolition-calculator",
        label: "Demolition & Debris Takeoff",
        benefit: "",
      },
      {
        to: "/mathematical-plan-elevation",
        label: "Mathematical Plan Elevation",
        benefit: "Reads your plan, then calculates it with its own maths",
      },
      {
        to: "/build-to-roof-estimator",
        label: "Build-to-Roof Estimator",
        benefit: "Foundation to roof",
      },
      {
        to: "/structural-calculator",
        label: "Concrete & Structural",
        benefit: "",
      },
      {
        to: "/concrete-takeoff-calculator",
        label: "Concrete Slab Takeoff",
        benefit: "Free quantity takeoff",
      },
      {
        to: "/earthworks-cut-fill",
        label: "Earthworks Cut & Fill",
        benefit: "",
      },
      {
        to: "/roof-framing-calculator",
        label: "Roof Framing & Board Feet",
        benefit: "",
      },
      {
        to: "/foundation-calculator",
        label: "Foundation Designer",
        benefit: "",
      },
      {
        to: "/retaining-wall-calculator",
        label: "Retaining Wall Calculator",
        benefit: "",
      },
      {
        to: "/icf-wall-estimator",
        label: "ICF Wall Estimator",
        benefit: "Blocks · Core m³ · Rebar",
      },
      {
        to: "/rainwater-gutter-soffit-cost-estimator",
        label: "Soffit, Fascia & Gutter",
        benefit: "",
      },
      {
        to: "/water-tower-staging-estimator",
        label: "Overhead Water Tank Staging",
        benefit: "",
      },
      {
        to: "/structural-steel-i-beam-calculator",
        label: "Steel I-Beam Weight",
        benefit: "",
      },
      {
        to: "/foundation",
        label: "Foundation Cost Estimate",
        benefit: "",
      },
      {
        to: "/reinforcement",
        label: "Reinforcement / Steel",
        benefit: "",
      },
      {
        to: "/tall-building-structure",
        label: "Tall Building Structure",
        benefit: "Wind , Seismic , Piles",
      },
    ],
  },
  {
    id: "services",
    label: "Building Services",
    tools: [
      {
        to: "/drainage-calculator",
        label: "External Drainage Takeoff",
        benefit: "",
      },
      {
        to: "/septic-sizing-calculator",
        label: "Septic & Soakaway Worksheet",
        benefit: "",
      },
      {
        to: "/borehole-water-system-estimator",
        label: "Autonomous Borehole & Water Supply",
        benefit: "",
      },
      {
        to: "/electrical-conduit-wiring-estimator",
        label: "Conduit & Wiring Loops",
        benefit: "",
      },
      {
        to: "/electrical",
        label: "Electrical Wiring",
        benefit: "",
      },
      {
        to: "/plumbing",
        label: "Plumbing",
        benefit: "",
      },
      {
        to: "/solar-pv-estimator",
        label: "Solar PV Estimator",
        benefit: "Panels · Batteries · Cost",
      },
      {
        to: "/generator",
        label: "Backup Power / Generator",
        benefit: "",
      },
      {
        to: "/heat-comfort",
        label: "Heat & Comfort",
        benefit: "",
      },
      {
        to: "/material-price-index",
        label: "Live Material Price Index",
        benefit: "",
      },
      {
        to: "/material-advisor",
        label: "Climate Material Advisor",
        benefit: "",
      },
    ],
  },
  {
    id: "components",
    label: "Building Components",
    tools: [
      {
        to: "/doors-windows",
        label: "Doors & Windows",
        benefit: "",
      },
    ],
  },
  {
    id: "interiors",
    label: "Home Decor",
    tools: [
      {
        to: "/window-blind-calculator",
        label: "Window blind cost calculator",
        benefit: "Per window · Per m2 · Before tax",
      },
      {
        to: "/tv-console-calculator",
        label: "TV Console & Media Unit Calculator",
        benefit:
          "10 editable concepts · panel-by-panel schedule · Pro image parsing",
      },
      {
        to: "/wallpaper-calculator",
        label: "Wallpaper Calculator",
        benefit: "Rolls · Pattern · Budget",
      },
    ],
  },
  {
    id: "project",
    label: "Project & Cost",
    tools: [
      {
        to: "/renovation-estimator",
        label: "Renovation Cost Estimator",
        benefit: "Room by room · Strip out · Repaint",
      },
      {
        to: "/diaspora-budget-tracker",
        label: "Diaspora Budget & Inflation Tracker",
        benefit: "",
      },
      {
        to: "/boq-generator",
        label: "BOQ Generator",
        benefit: "",
      },
      {
        to: "/labour-estimator",
        label: "Labour Cost",
        benefit: "",
      },
      {
        to: "/margin-calculator",
        label: "Margin Calculator",
        benefit: "",
      },
      {
        to: "/quote-check",
        label: "Quote Check",
        benefit: "",
      },
      {
        to: "/cash-flow-timeline",
        label: "Cash-Flow Timeline",
        benefit: "",
      },
      {
        to: "/regional-cost-index",
        label: "Regional Cost Index",
        benefit: "",
      },
      {
        to: "/project-timeline",
        label: "Project Timeline",
        benefit: "",
      },
      {
        to: "/construction-sequence",
        label: "Construction Sequence",
        benefit: "",
      },
      {
        to: "/maintenance-planner",
        label: "Maintenance Planner",
        benefit: "",
      },
      {
        to: "/warranty-certificate",
        label: "Warranty Certificate",
        benefit: "",
      },
      {
        to: "/contractor-credit",
        label: "Contractor Credit",
        benefit: "",
      },
      {
        to: "/carbon-footprint",
        label: "Embodied Carbon Estimator",
        benefit: "",
      },
      {
        to: "/circular-reuse",
        label: "Demolition Recovery",
        benefit: "",
      },
      {
        to: "/conversational-estimator",
        label: "Conversational Estimator",
        benefit: "",
      },
      {
        to: "/estimate-refresh",
        label: "Estimate Refresh",
        benefit: "",
      },
    ],
  },
  {
    id: "ai",
    label: "AI Assistants",
    tools: [
      {
        to: "/image-estimator",
        label: "AI Photo Estimator",
        benefit: "AI-powered · Premium",
      },
      {
        to: "/smart-calculator",
        label: "Smart Calculator",
        benefit: "AI-powered · Free",
      },
      {
        to: "/count-vision",
        label: "Counter-Vision",
        benefit: "",
      },
    ],
  },
  {
    id: "pro",
    label: "Pro & Field",
    tools: [
      {
        to: "/unit-converter",
        label: "Measurement Converter",
        benefit: "Plots · MPa · Tonnes · °C",
      },
      {
        to: "/blueprint-takeoff",
        label: "Blueprint & PDF Plan Takeoff",
        benefit: "",
      },
      {
        to: "/global-site-safety-estimator",
        label: "Global Site Safety & PPE Estimator",
        benefit: "",
      },
      {
        to: "/defect-diagnosis",
        label: "Defect Diagnosis",
        benefit: "",
      },
      {
        to: "/bim-ifc-import",
        label: "BIM / IFC Import",
        benefit: "",
      },
      {
        to: "/field-sync",
        label: "Field Sync",
        benefit: "",
      },
      {
        to: "/material-prices",
        label: "Material Prices",
        benefit: "",
      },
    ],
  },
];

/** Whether a pathname is a catalogued calculator, ignoring a trailing slash. */
export function isToolRoute(pathname: string): boolean {
  return TOOL_ROUTES.has(pathname.replace(/\/+$/, "") || "/");
}
