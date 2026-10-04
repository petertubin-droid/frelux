// Central site configuration. Update values here to change brand-wide behavior.
// Construction Tools nav is generated from the tool registry.
import { navToolsByCategory } from "./construction-tools";

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
];

// Legacy export kept for backward compatibility (footer uses similar structure)
export const navLinks = navWorkspaces.map((w) => ({
  label: w.label,
  path: w.path,
}));
