// Central site configuration. Update values here to change brand-wide behavior.
// Construction Tools nav is generated from the tool registry.
import { navToolsByCategory } from "./construction-tools";

export const siteConfig = {
  name: "FRELUX SMART CALC",
  shortName: "FRELUX",
  tagline: "Construction intelligence for projects across markets.",
  description:
    "FRELUX turns measurements into material quantities and estimates, with market-specific data where available. Save calculations as reusable templates, explore project information, and review the assumptions behind each estimate. Built for construction professionals working across different regions.",
  email: "freluxtools@gmail.com",
  // Verified support contact options and operating response standards
  supportContact: {
    email: "freluxtools@gmail.com",
    whatsappPhone: "+2349063612439",
    whatsappDisplay: "+234 906 361 2439",
    whatsappUrl: "https://wa.me/2349063612439",
    operatingHours: "Monday – Friday: 8:00 AM – 6:00 PM (WAT / UTC+1)",
    responseExpectation:
      "WhatsApp: typically within hours during business days. Email: within 1 business day.",
  },
  // AdSense, leave empty until approved; ads component renders nothing when unset.
  adsense: {
    // Primary account: the loader in index.html, the site-ownership meta tag and
    // the runtime slots use this one. It is the account being verified, so it has
    // to be the ID the AdSense crawler finds first on the page.
    publisherId: "ca-pub-4906239537212380",
    // Additional authorised accounts. These do not replace the primary; they are
    // listed alongside it in ads.txt and app-ads.txt so both can bid.
    additionalPublisherIds: ["ca-pub-3404100134534192"],
    adSlots: {} as Record<string, string>,
  },
  // Meta Pixel, leave empty until real ID is provided.
  metaPixel: {
    pixelId: "", // numeric string
  },
  // Google Analytics, leave empty until ready.
  analytics: {
    gaMeasurementId: "", // e.g. 'G-XXXXXXXXXX'
    // Google Tag Manager container. The container loads through
    // AnalyticsScripts (never hardcoded in index.html) so admin surfaces stay
    // untagged and the consent default is always pushed first.
    gtmContainerId: "GTM-NLVBFFH7",
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
  // Construction Tools is the single tool library. The dropdown is generated
  // from the CONSTRUCTION_TOOLS registry so a tool is categorised in exactly
  // one place (src/config/construction-tools.ts). The old calculator/estimator
  // nav duplicates (e.g. "Paint Cost Estimator" = /paint-calculator?mode=cost)
  // collapse into their authoritative tool.
  // The two pages people reach for between calculators: a converter for
  // whatever unit a drawing or data sheet arrives in, and the map of who and
  // what is where. Both sat several clicks deep before, which on a phone meant
  // they were never found, so they get their own workspace near the top.
  {
    label: "Convert & Explore",
    path: "/unit-converter",
    children: [
      {
        label: "Unit Converter",
        path: "/unit-converter",
        description:
          "Feet, plots, tonnes, bags, MPa, psi, kN, kWh, kW, gpm, °C and °F",
      },
      {
        label: "Explore Map",
        path: "/map",
        description: "Professionals, projects and material stock on a 3D globe",
      },
    ],
  },
  {
    label: "Construction Tools",
    path: "/construction-tools",
    children: navToolsByCategory().flatMap(({ category, tools }) =>
      tools.map((t) => ({
        label: t.title,
        path: t.to,
        section: category.label,
        description: t.benefit,
      })),
    ),
  },
  // Market Intelligence workspace: the public market data platform. Kept as
  // its own workspace because it answers a different question from the
  // calculators (what the market is doing, not what your wall needs).
  {
    label: "Market Intelligence",
    path: "/market-intelligence",
    children: [
      {
        label: "Market Overview",
        path: "/market-intelligence",
        description: "Construction markets, materials and listed companies",
      },
      {
        label: "Stock Market",
        path: "/market-intelligence/stocks",
        description: "Listed construction and infrastructure companies",
      },
      {
        label: "Materials Market",
        path: "/market-intelligence/materials",
        description: "Material prices and official price indices by market",
      },
      {
        label: "Industry Trends",
        path: "/market-intelligence/trends",
        description: "Index movements, rankings and sector direction",
      },
      {
        label: "Investment Insights",
        path: "/market-intelligence/investment",
        description: "Capital markets context for construction",
      },
      {
        label: "Market News",
        path: "/market-intelligence/news",
        description: "Sourced industry headlines",
      },
      {
        label: "Company Profiles",
        path: "/market-intelligence/companies",
        description: "Who the listed players are",
      },
    ],
  },
  // Colors & Design workspace (restored 2026-10-04 - these pages were
  // accidentally dropped from the menu during the Construction Tools merge).
  {
    label: "Colors & Design",
    path: "/colors",
    children: [
      {
        label: "Color Library",
        path: "/colors",
        description: "Browse and pick paint colors",
      },
      {
        label: "Compare Colors",
        path: "/colors/compare",
        description: "Side-by-side color comparison",
      },
      {
        label: "Smart Color Assistant",
        path: "/ai-color-assistant",
        description: "AI-guided color selection",
      },
      {
        label: "AI Color Preview",
        path: "/color-preview",
        description: "Preview colors on your walls",
      },
    ],
  },
  // Services workspace: the commercial layer beyond calculators -
  // surfaced top-level so first-time visitors see the full platform.
  {
    label: "Services",
    path: "/marketplace",
    children: [
      {
        label: "Marketplace",
        path: "/marketplace",
        description: "Materials, jobs & verified sellers",
      },
      {
        label: "Pro Connect",
        path: "/pro-connect",
        description: "Hire verified construction professionals",
      },
      {
        label: "Developer API",
        path: "/developers",
        description: "Estimation APIs for developers",
      },
      {
        label: "Pricing",
        path: "/pricing",
        description: "Premium plans & credits",
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
  // Learn workspace (restored 2026-10-04 - Learn Hub, guides and friends were
  // accidentally dropped from the menu during the Construction Tools merge).
  {
    label: "Learn",
    path: "/learn",
    children: [
      {
        label: "Learn Hub",
        path: "/learn",
        description: "Guides, tutorials & building knowledge",
      },
      {
        label: "FAQ Articles",
        path: "/faq",
        description: "Every question FRELUX answers, by trade",
      },
      {
        label: "Building from Abroad",
        path: "/learn/build-in-nigeria-from-abroad",
        description: "Budget a Nigerian construction project from abroad",
      },
      {
        label: "User Guide",
        path: "/user-guide",
        description: "How to use every FRELUX feature",
      },
      {
        label: "Roadmap",
        path: "/roadmap",
        description: "See what is live, building and planned",
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
      {
        label: "Feedback",
        path: "/feedback",
        description: "Tell us what to build next",
      },
      // Legal pages surfaced in the hamburger/dropdown menus (also kept in
      // the footer for SEO sitewide linking). Grouped under a "Legal" header
      // by the section-aware dropdown renderer.
      {
        label: "Privacy Policy",
        path: "/privacy-policy",
        section: "Legal",
        description: "How we handle your data",
      },
      {
        label: "Terms of Service",
        path: "/terms",
        section: "Legal",
        description: "Rules for using FRELUX",
      },
      {
        label: "Cookie Policy",
        path: "/cookie-policy",
        section: "Legal",
        description: "Cookies & tracking",
      },
      {
        label: "Disclaimer",
        path: "/disclaimer",
        section: "Legal",
        description: "Estimates & professional advice",
      },
      {
        label: "AI Disclaimer",
        path: "/ai-disclaimer",
        section: "Legal",
        description: "How our AI features work",
      },
    ],
  },
];

// Legacy export kept for backward compatibility (footer uses similar structure)
export const navLinks = navWorkspaces.map((w) => ({
  label: w.label,
  path: w.path,
}));
