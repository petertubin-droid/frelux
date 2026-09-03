// Central site configuration. Update values here to change brand-wide behavior.

export const siteConfig = {
  name: "FRELUX PROJECT CALC",
  shortName: "FRELUX",
  tagline:
    "Construction estimation, painting, finishing & project planning platform",
  description:
    "Construction estimation, painting, finishing & project planning platform for professionals and homeowners.",
  // International format without "+" for wa.me links
  whatsappNumber: "2349063612439",
  whatsappDisplay: "+234 906 361 2439",
  email: "frenzyanthony39@gmail.com",
  // AdSense — leave empty until approved; ads component renders nothing when unset.
  adsense: {
    publisherId: "ca-pub-3404100134534192",
    adSlots: {} as Record<string, string>,
  },
  // Meta Pixel — leave empty until real ID is provided.
  metaPixel: {
    pixelId: "", // numeric string
  },
  // Google Analytics — leave empty until ready.
  analytics: {
    gaMeasurementId: "", // e.g. 'G-XXXXXXXXXX'
  },
} as const;

// =========================================================
// Premium navigation structure.
// Top-level items are kept to 5 for a clean, uncluttered bar.
// Dropdowns use grouped sections with optional headers + icons.
// No admin links appear anywhere in the public navigation.

export interface NavChild {
  label: string;
  path: string;
  description?: string;
  section?: string;
}

export interface NavWorkspace {
  label: string;
  path: string;
  children?: NavChild[];
  external?: boolean;
}

export const navWorkspaces: NavWorkspace[] = [
  {
    label: "Home",
    path: "/",
  },
  {
    label: "Calculators",
    path: "/calculators",
    children: [
      // Section: Painting
      {
        label: "Paint Calculator",
        path: "/paint-calculator",
        section: "Painting",
        description: "How many paint buckets do I need?",
      },
      {
        label: "Paint Cost Estimator",
        path: "/cost-estimator",
        section: "Painting",
        description: "How much will my paint materials cost?",
      },
      {
        label: "Painting Estimator",
        path: "/painting-estimator",
        section: "Painting",
        description: "Complete painting project estimate & summary",
      },
      // Section: Finishing
      {
        label: "Screeding Calculator",
        path: "/screeding-calculator",
        section: "Finishing",
        description: "Screeding material quantities (m²)",
      },
      {
        label: "Screeding Cost Estimator",
        path: "/screeding-calculator?mode=cost",
        section: "Finishing",
        description: "Screeding project cost estimate",
      },
      {
        label: "Tyrolene Estimator",
        path: "/finish-estimator?mode=tyrolene",
        section: "Finishing",
        description: "Tyrolene putty estimator",
      },
      {
        label: "Finish Estimator",
        path: "/finish-estimator",
        section: "Finishing",
        description: "Compare paint, Tyrolene & Grafitex finishes",
      },
      {
        label: "POP Ceiling Calculator",
        path: "/pop-ceiling-calculator",
        section: "Finishing",
        description: "POP ceiling board & material estimate",
      },
      {
        label: "POP Cost Estimator",
        path: "/pop-ceiling-calculator?mode=cost",
        section: "Finishing",
        description: "POP ceiling cost estimation",
      },
      {
        label: "Tile Calculator",
        path: "/tile-calculator",
        section: "Finishing",
        description: "Tile quantity & layout planner",
      },
      {
        label: "Tile Cost Estimator",
        path: "/tile-calculator?mode=cost",
        section: "Finishing",
        description: "Tile installation cost breakdown",
      },
    ],
  },
  {
    label: "Construction",
    path: "/build-to-roof-estimator",
    children: [
      // Section: Construction Estimation
      {
        label: "Build-to-Roof Estimator",
        path: "/build-to-roof-estimator",
        section: "Estimation",
        description: "Foundation to roof construction estimate",
      },
      {
        label: "Structural Calculator",
        path: "/structural-calculator",
        section: "Estimation",
        description: "Beam, column & slab sizing (preliminary)",
      },
      {
        label: "Foundation Calculator",
        path: "/foundation-calculator",
        section: "Estimation",
        description: "Foundation sizing by soil type (preliminary)",
      },
      // Section: AI Tools
      {
        label: "AI Photo Estimator",
        path: "/image-estimator",
        section: "AI Tools",
        description: "AI-assisted photo-based estimate (Premium)",
      },
      {
        label: "Smart Calculator",
        path: "/smart-calculator",
        section: "AI Tools",
        description: "AI-powered estimation for any project type",
      },
      // Section: Planning
      {
        label: "Project Timeline",
        path: "/project-timeline",
        section: "Planning",
        description: "Stage-by-stage construction schedule",
      },
      {
        label: "Construction Sequence",
        path: "/construction-sequence",
        section: "Planning",
        description: "Correct build order with quality gates",
      },
    ],
  },
  {
    label: "Colors & Design",
    path: "/colors",
    children: [
      {
        label: "Color Library",
        path: "/colors",
        description: "Browse paint colors with HEX, RGB & HSL",
      },
      {
        label: "Compare Colors",
        path: "/colors/compare",
        description: "Side-by-side color comparison",
      },
      {
        label: "Smart Color Assistant",
        path: "/ai-color-assistant",
        description: "AI-powered color recommendations",
      },
      {
        label: "AI Color Preview",
        path: "/color-preview",
        description: "Before & after room visualization",
      },
    ],
  },
  {
    label: "Projects",
    path: "/my-projects",
    children: [
      {
        label: "My Projects",
        path: "/my-projects",
        section: "Project Management",
        description: "View and manage your saved projects",
      },
      {
        label: "Project Workspace",
        path: "/project-workspace",
        section: "Project Management",
        description: "Full project planning workspace",
      },
      {
        label: "Estimate Analytics",
        path: "/dashboard",
        section: "Project Management",
        description: "Insights across your estimates",
      },
      {
        label: "Templates",
        path: "/templates",
        section: "Project Management",
        description: "Reusable calculation templates",
      },
      {
        label: "Brand Studio",
        path: "/brand-studio",
        section: "Tools",
        description: "Custom PDF branding & AI logo generation",
      },
    ],
  },
  {
    label: "Learn",
    path: "/learn",
    children: [
      {
        label: "Guides & Tutorials",
        path: "/learn",
        description: "Step-by-step building guides",
      },
      {
        label: "About FRELUX",
        path: "/about",
        description: "Our story & mission",
      },
      {
        label: "Contact",
        path: "/contact",
        description: "Get in touch with our team",
      },
    ],
  },
];

// Legacy export kept for backward compatibility (footer uses similar structure)
export const navLinks = navWorkspaces.map((w) => ({
  label: w.label,
  path: w.path,
}));
