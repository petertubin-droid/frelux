// =========================================================
// PAGE HEADER IMAGES — config-driven, niche-matched backdrops
// =========================================================
// Owner directive (2026-10-10): every page header on the site gets
// a subtle background photo related to its niche (paint pages get
// paint, tiles get tiles, and so on), matching the treatment the
// homepage hero, footer and welcome screen already use.
//
// Resolution is additive: a PageHeader caller can still pass an
// explicit `image` prop and it wins. When none is passed, the
// header resolves its image here from the locale-stripped route,
// first matching rule wins, falling back to the shared
// architectural shot from the welcome screen.
//
// Assets live in public/assets/headers/ (1600px JPEGs, lazy-loaded
// by PageHeader). To retune a page: edit or add a rule here - no
// component changes required.
// =========================================================

/** Fallback for every route without a niche image (about, legal,
 *  admin, account pages, and anything added in the future). */
export const DEFAULT_HEADER_IMAGE = "/assets/entry/entry-bg.jpg";

export interface HeaderImageRule {
  /** Tested against the locale-stripped pathname. */
  test: RegExp;
  image: string;
}

/** Ordered rules: first match wins, most specific patterns first. */
const HEADER_IMAGE_RULES: HeaderImageRule[] = [
  // ── Trade tools ──────────────────────────────────────────
  { test: /^\/screeding/, image: "/assets/headers/screed.jpg" },
  { test: /^\/pop-ceiling/, image: "/assets/headers/pop.jpg" },
  { test: /^\/(tile|flooring)/, image: "/assets/headers/tile.jpg" },
  {
    // Painting and wall finishing: paint calculators, finish
    // estimators, surface prep, waterproofing, Tyrolene.
    test: /^\/paint|^\/(finish-estimator|wall-finish-estimator|surface-assessment|tyrolene-estimator|waterproofing)/,
    image: "/assets/headers/paint.jpg",
  },
  {
    // Color library, comparison and the color AI assistant.
    test: /^\/colors|^\/color-preview|^\/ai-color-assistant/,
    image: "/assets/headers/colors.jpg",
  },
  {
    // Specialty takeoffs: retaining wall, steel sections, eaves finishing,
    // conduit runs. Specific routes first, so the broad rules below only
    // catch what these do not.
    test: /^\/(retaining-wall-calculator|structural-steel-i-beam-calculator)/,
    image: "/assets/headers/structural.jpg",
  },
  {
    test: /^\/(rainwater-gutter-soffit-cost-estimator)/,
    image: "/assets/headers/build.jpg",
  },
  {
    test: /^\/(electrical-conduit-wiring-estimator)/,
    image: "/assets/headers/mep.jpg",
  },
  {
    // Structural & foundation: rebar, formwork, defect checks.
    test: /^\/(structural-calculator|foundation|reinforcement|defect-diagnosis)/,
    image: "/assets/headers/structural.jpg",
  },
  {
    // Building envelope & construction sequence.
    test: /^\/(build-to-roof-estimator|start-building|construction-sequence|construction-tools|cost-estimator|roof|blueprint-takeoff|masonry-calculator|plastering-calculator|drywall-calculator|paving-calculator|drainage-calculator|septic-sizing-calculator|temporary-works-calculator|insulation-calculator|demolition-calculator)/,
    image: "/assets/headers/build.jpg",
  },
  {
    // AI-assisted tools: photo estimation, conversational
    // estimating, smart calculator, BIM/IFC import.
    test: /^\/(image-estimator|conversational-estimator|smart-calculator|bim-ifc-import|estimate)/,
    image: "/assets/headers/ai.jpg",
  },
  {
    // MEP: electrical, plumbing, doors & windows, maintenance.
    test: /^\/(electrical|plumbing|doors-windows|maintenance-planner)/,
    image: "/assets/headers/mep.jpg",
  },
  {
    // Sustainability: solar, carbon, reuse, thermal comfort.
    test: /^\/(solar-pv|carbon-footprint|circular-reuse|heat-comfort)/,
    image: "/assets/headers/green.jpg",
  },

  // ── Market & business ─────────────────────────────────────
  {
    // Material prices, indices, rates and cash flows.
    test: /^\/(prices|material-prices|regional-cost-index|margin-calculator|labour-estimator|cash-flow-timeline)/,
    image: "/assets/headers/materials.jpg",
  },
  {
    // Marketplace, pros, workers, contractors and messages.
    test: /^\/(marketplace|pro-connect|worker-channels|contractor|sellers|pro\/|messages)/,
    image: "/assets/headers/pro.jpg",
  },
  {
    // Learning center, glossary, templates and guides.
    test: /^\/(learn|glossary|printables|templates|my-templates|user-guide)/,
    image: "/assets/headers/learn.jpg",
  },
  {
    // Finished-work showcase.
    test: /^\/(gallery|case-studies)/,
    image: "/assets/headers/gallery.jpg",
  },
  {
    // Project management: workspaces, timelines, clients,
    // dashboards, analytics.
    test: /^\/(my-projects|project-|clients|dashboard|properties|analytics|profile|quotations?)/,
    image: "/assets/headers/projects.jpg",
  },
];

// =========================================================
// IMAGE LIBRARY — the picker shown in Admin > Header Images
// =========================================================

export interface HeaderImageOption {
  id: string;
  label: string;
  src: string;
}

/** The default architectural shot plus every niche asset. */
export const HEADER_IMAGE_LIBRARY: HeaderImageOption[] = [
  {
    id: "default",
    label: "Architectural (default)",
    src: DEFAULT_HEADER_IMAGE,
  },
  {
    id: "paint",
    label: "Painting & finishing",
    src: "/assets/headers/paint.jpg",
  },
  { id: "screed", label: "Screeding", src: "/assets/headers/screed.jpg" },
  { id: "pop", label: "POP ceiling", src: "/assets/headers/pop.jpg" },
  { id: "tile", label: "Tiling & flooring", src: "/assets/headers/tile.jpg" },
  { id: "colors", label: "Colors", src: "/assets/headers/colors.jpg" },
  {
    id: "build",
    label: "Building & roofing",
    src: "/assets/headers/build.jpg",
  },
  {
    id: "structural",
    label: "Structural & foundation",
    src: "/assets/headers/structural.jpg",
  },
  { id: "ai", label: "AI & estimation", src: "/assets/headers/ai.jpg" },
  { id: "mep", label: "Electrical & plumbing", src: "/assets/headers/mep.jpg" },
  {
    id: "green",
    label: "Solar & sustainability",
    src: "/assets/headers/green.jpg",
  },
  {
    id: "materials",
    label: "Materials & prices",
    src: "/assets/headers/materials.jpg",
  },
  { id: "pro", label: "Pros & marketplace", src: "/assets/headers/pro.jpg" },
  { id: "learn", label: "Learning & docs", src: "/assets/headers/learn.jpg" },
  {
    id: "gallery",
    label: "Finished projects",
    src: "/assets/headers/gallery.jpg",
  },
  {
    id: "projects",
    label: "Plans & projects",
    src: "/assets/headers/projects.jpg",
  },
];

// =========================================================
// PAGE CATALOG — every user-facing page that shows a header
// =========================================================
// Backs the Admin > Header Images grid (grouped, paginated). The
// admin can override any entry with a library image or a custom
// URL; the grid shows the *effective* image (override if set,
// otherwise the route's registry match). Append new public routes
// here as they are added.

export interface CatalogEntry {
  path: string;
  title: string;
  group: string;
}

export const PAGE_CATALOG: CatalogEntry[] = [
  // ── Calculators ─────────────────────────────────────────
  {
    path: "/paint-calculator",
    title: "Painting Calculator",
    group: "Calculators",
  },
  {
    path: "/painting-estimator",
    title: "Painting Estimator",
    group: "Calculators",
  },
  {
    path: "/paint-comparison",
    title: "Paint Comparison",
    group: "Calculators",
  },
  {
    path: "/finish-estimator",
    title: "Finishing Estimator",
    group: "Calculators",
  },
  {
    path: "/wall-finish-estimator",
    title: "Wall Finish Estimator",
    group: "Calculators",
  },
  {
    path: "/screeding-calculator",
    title: "Screeding Calculator",
    group: "Calculators",
  },
  {
    path: "/screeding-cost-estimator",
    title: "Screeding Cost Estimator",
    group: "Calculators",
  },
  {
    path: "/surface-assessment",
    title: "Surface Assessment",
    group: "Calculators",
  },
  {
    path: "/pop-ceiling-calculator",
    title: "POP Ceiling Calculator",
    group: "Calculators",
  },
  {
    path: "/pop-ceiling-cost-estimator",
    title: "POP Ceiling Cost Estimator",
    group: "Calculators",
  },
  { path: "/tile-calculator", title: "Tile Calculator", group: "Calculators" },
  {
    path: "/tile-cost-estimator",
    title: "Tile Cost Estimator",
    group: "Calculators",
  },
  { path: "/flooring", title: "Flooring", group: "Calculators" },
  { path: "/waterproofing", title: "Waterproofing", group: "Calculators" },
  {
    path: "/tyrolene-estimator",
    title: "Tyrolene Estimator",
    group: "Calculators",
  },
  {
    path: "/structural-calculator",
    title: "Structural Calculator",
    group: "Calculators",
  },
  {
    path: "/foundation-calculator",
    title: "Foundation Calculator",
    group: "Calculators",
  },
  { path: "/foundation", title: "Foundation Guide", group: "Calculators" },
  { path: "/reinforcement", title: "Reinforcement", group: "Calculators" },
  { path: "/electrical", title: "Electrical", group: "Calculators" },
  { path: "/plumbing", title: "Plumbing", group: "Calculators" },
  { path: "/doors-windows", title: "Doors & Windows", group: "Calculators" },
  {
    path: "/construction-tools",
    title: "Construction Tools Hub",
    group: "Calculators",
  },
  {
    path: "/blueprint-takeoff",
    title: "Blueprint & Plan Takeoff",
    group: "Calculators",
  },
  {
    path: "/masonry-calculator",
    title: "Masonry & Blockwork Calculator",
    group: "Calculators",
  },
  {
    path: "/plastering-calculator",
    title: "Plastering & Render Calculator",
    group: "Calculators",
  },
  {
    path: "/drywall-calculator",
    title: "Drywall & Partition Calculator",
    group: "Calculators",
  },
  {
    path: "/paving-calculator",
    title: "Paving & External Works Calculator",
    group: "Calculators",
  },
  {
    path: "/drainage-calculator",
    title: "Drainage & Trench Calculator",
    group: "Calculators",
  },
  {
    path: "/septic-sizing-calculator",
    title: "Septic Tank & Soakaway Sizing",
    group: "Calculators",
  },
  {
    path: "/temporary-works-calculator",
    title: "Temporary Works & Formwork Calculator",
    group: "Calculators",
  },
  {
    path: "/insulation-calculator",
    title: "Insulation Quantity Calculator",
    group: "Calculators",
  },
  {
    path: "/demolition-calculator",
    title: "Demolition & Debris Calculator",
    group: "Calculators",
  },

  // ── Estimators & AI ─────────────────────────────────────
  {
    path: "/build-to-roof-estimator",
    title: "Build-to-Roof Estimator",
    group: "Estimators & AI",
  },
  {
    path: "/cost-estimator",
    title: "Cost Estimator",
    group: "Estimators & AI",
  },
  {
    path: "/labour-estimator",
    title: "Labour Estimator",
    group: "Estimators & AI",
  },
  {
    path: "/margin-calculator",
    title: "Margin Calculator",
    group: "Estimators & AI",
  },
  {
    path: "/smart-calculator",
    title: "Smart Calculator",
    group: "Estimators & AI",
  },
  {
    path: "/image-estimator",
    title: "AI Photo Estimator",
    group: "Estimators & AI",
  },
  {
    path: "/conversational-estimator",
    title: "Conversational Estimator",
    group: "Estimators & AI",
  },
  {
    path: "/bim-ifc-import",
    title: "BIM / IFC Import",
    group: "Estimators & AI",
  },
  {
    path: "/defect-diagnosis",
    title: "Defect Diagnosis",
    group: "Estimators & AI",
  },
  { path: "/count-vision", title: "Count Vision", group: "Estimators & AI" },
  {
    path: "/start-building",
    title: "Start Building",
    group: "Estimators & AI",
  },
  {
    path: "/construction-sequence",
    title: "Construction Sequence",
    group: "Estimators & AI",
  },
  {
    path: "/maintenance-planner",
    title: "Maintenance Planner",
    group: "Estimators & AI",
  },
  {
    path: "/solar-pv-estimator",
    title: "Solar PV Estimator",
    group: "Estimators & AI",
  },
  {
    path: "/carbon-footprint",
    title: "Carbon Footprint",
    group: "Estimators & AI",
  },
  {
    path: "/circular-reuse",
    title: "Circular Reuse",
    group: "Estimators & AI",
  },
  { path: "/heat-comfort", title: "Heat Comfort", group: "Estimators & AI" },
  {
    path: "/cash-flow-timeline",
    title: "Cash Flow Timeline",
    group: "Estimators & AI",
  },
  {
    path: "/regional-cost-index",
    title: "Regional Cost Index",
    group: "Estimators & AI",
  },
  {
    path: "/project-timeline",
    title: "Project Timeline",
    group: "Estimators & AI",
  },

  // ── Colors ───────────────────────────────────────────────
  { path: "/colors", title: "Color Library", group: "Colors" },
  { path: "/colors/compare", title: "Compare Colors", group: "Colors" },
  { path: "/color-preview", title: "Color Preview", group: "Colors" },
  {
    path: "/ai-color-assistant",
    title: "Smart Color Assistant",
    group: "Colors",
  },

  // ── Prices & Learning ───────────────────────────────────
  { path: "/prices", title: "Material Prices", group: "Prices & Learning" },
  {
    path: "/material-prices",
    title: "Material Prices Hub",
    group: "Prices & Learning",
  },
  { path: "/learn", title: "Learn Hub", group: "Prices & Learning" },
  {
    path: "/learn/library",
    title: "Learn Library",
    group: "Prices & Learning",
  },
  { path: "/glossary", title: "Glossary", group: "Prices & Learning" },
  { path: "/templates", title: "Templates", group: "Prices & Learning" },
  { path: "/printables", title: "Free Templates", group: "Prices & Learning" },
  { path: "/user-guide", title: "User Guide", group: "Prices & Learning" },
  {
    path: "/boq-generator",
    title: "BOQ Generator",
    group: "Prices & Learning",
  },

  // ── Marketplace & Pros ──────────────────────────────────
  { path: "/marketplace", title: "Marketplace", group: "Marketplace & Pros" },
  { path: "/pro-connect", title: "Pro Connect", group: "Marketplace & Pros" },
  {
    path: "/worker-channels",
    title: "Worker Channels",
    group: "Marketplace & Pros",
  },
  { path: "/contractor", title: "Contractor Hub", group: "Marketplace & Pros" },
  {
    path: "/contractor/wizard",
    title: "Contractor Wizard",
    group: "Marketplace & Pros",
  },

  // ── Projects & Account ──────────────────────────────────
  { path: "/my-projects", title: "My Projects", group: "Projects & Account" },
  {
    path: "/project-workspace",
    title: "Project Workspace",
    group: "Projects & Account",
  },
  { path: "/quotes", title: "Quotes", group: "Projects & Account" },
  { path: "/clients", title: "Clients", group: "Projects & Account" },
  { path: "/dashboard", title: "Dashboard", group: "Projects & Account" },
  { path: "/properties", title: "Properties", group: "Projects & Account" },
  { path: "/analytics", title: "Analytics", group: "Projects & Account" },
  { path: "/profile", title: "Profile", group: "Projects & Account" },
  { path: "/rewards", title: "Rewards", group: "Projects & Account" },
  { path: "/credits", title: "Credits", group: "Projects & Account" },
  { path: "/achievements", title: "Achievements", group: "Projects & Account" },
  { path: "/messages", title: "Messages", group: "Projects & Account" },
  { path: "/my-templates", title: "My Templates", group: "Projects & Account" },
  { path: "/onboarding", title: "Onboarding", group: "Projects & Account" },

  // ── Showcase & Company ──────────────────────────────────
  { path: "/gallery", title: "Project Gallery", group: "Showcase & Company" },
  { path: "/gallery/new", title: "Add Project", group: "Showcase & Company" },
  { path: "/case-studies", title: "Case Studies", group: "Showcase & Company" },
  { path: "/about", title: "About", group: "Showcase & Company" },
  { path: "/contact", title: "Contact", group: "Showcase & Company" },
  { path: "/partners", title: "Partners", group: "Showcase & Company" },
  { path: "/developers", title: "Developer API", group: "Showcase & Company" },
  { path: "/pricing", title: "Pricing", group: "Showcase & Company" },
  { path: "/feedback", title: "Feedback", group: "Showcase & Company" },
  { path: "/data-request", title: "Data Request", group: "Showcase & Company" },

  // ── Legal ────────────────────────────────────────────────
  { path: "/privacy-policy", title: "Privacy Policy", group: "Legal" },
  { path: "/terms", title: "Terms of Service", group: "Legal" },
  { path: "/cookie-policy", title: "Cookie Policy", group: "Legal" },
  { path: "/disclaimer", title: "Disclaimer", group: "Legal" },
  { path: "/ai-disclaimer", title: "AI Disclaimer", group: "Legal" },
];

// =========================================================
// RESOLUTION — manual overrides win, then the rule registry
// =========================================================

/**
 * Resolves the header backdrop for a route.
 *
 * `pathname` should be locale-stripped. An admin override (from the
 * `header_image_overrides` table) wins when its route key equals the
 * pathname or is a parent prefix of it ("/learn" also covers
 * "/learn/library"); the longest matching key wins. Unknown paths
 * fall back to the default architectural image.
 */
export function resolveHeaderImage(
  pathname: string,
  overrides?: Record<string, string>,
): string {
  if (overrides) {
    let best = "";
    let bestImage = "";
    for (const [route, image] of Object.entries(overrides)) {
      if (!image) continue;
      const matches = pathname === route || pathname.startsWith(`${route}/`);
      if (matches && route.length > best.length) {
        best = route;
        bestImage = image;
      }
    }
    if (bestImage) return bestImage;
  }
  for (const rule of HEADER_IMAGE_RULES) {
    if (rule.test.test(pathname)) return rule.image;
  }
  return DEFAULT_HEADER_IMAGE;
}
