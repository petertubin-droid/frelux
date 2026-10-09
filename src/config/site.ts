// Central site configuration. Update values here to change brand-wide behavior.
// Construction Tools nav is generated from the tool registry.
import { navToolsByCategory } from "./construction-tools";

export const siteConfig = {
  name: "FRELUX",
  shortName: "FRELUX",
  // Final worldwide positioning (matches the client-approved hero copy,
  // 2026-10-06): premium, platform-level, trade-agnostic.
  tagline: "Every trade. Every cost. One platform.",
  description:
    "Frelux turns your measurements into exact material quantities and real, market-verified costs, from a single room to an entire building, foundation to roof. Free, professional-grade estimation in multiple languages, for builders worldwide.",
  // International format without "+" for wa.me links
  whatsappNumber: "2349063612439",
  whatsappDisplay: "+234 906 361 2439",
  email: "frenzyanthony39@gmail.com",
  // AdSense, leave empty until approved; ads component renders nothing when unset.
  adsense: {
    publisherId: "ca-pub-3404100134534192",
    adSlots: {} as Record<string, string>,
  },
  // Meta Pixel, leave empty until real ID is provided.
  metaPixel: {
    pixelId: "", // numeric string
  },
  // Google Analytics, leave empty until ready.
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
  // Construction Tools is the single tool library. The dropdown is generated
  // from the CONSTRUCTION_TOOLS registry so a tool is categorised in exactly
  // one place (src/config/construction-tools.ts). The old calculator/estimator
  // nav duplicates (e.g. "Paint Cost Estimator" = /paint-calculator?mode=cost)
  // collapse into their authoritative tool.
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
        label: "User Guide",
        path: "/user-guide",
        description: "How to use every FRELUX feature",
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
