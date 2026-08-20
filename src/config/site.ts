// Central site configuration. Update values here to change brand-wide behavior.

export const siteConfig = {
  name: 'FRELUX PAINT CALC',
  shortName: 'FRELUX',
  tagline: 'Plan Your Perfect Paint Project',
  description:
    'Calculate what you need, estimate what it may cost, and discover colors that can transform your space.',
  // International format without "+" for wa.me links
  whatsappNumber: '2349063612439',
  whatsappDisplay: '+234 906 361 2439',
  email: 'hello@freluxpaintcalc.com',
  // AdSense — leave empty until approved; ads component renders nothing when unset.
  adsense: {
    publisherId: '', // e.g. 'ca-pub-XXXXXXXXXXXXXXXX'
    adSlots: {} as Record<string, string>,
  },
  // Meta Pixel — leave empty until real ID is provided.
  metaPixel: {
    pixelId: '', // numeric string
  },
  // Google Analytics — leave empty until ready.
  analytics: {
    gaMeasurementId: '', // e.g. 'G-XXXXXXXXXX'
  },
} as const;

// =========================================================
// Public navigation — organized into 8 workspaces
// =========================================================
// Each workspace is a top-level nav item. Workspaces with children
// render as dropdown menus on desktop and expandable sections on mobile.
// No admin links appear anywhere in the public navigation.

export interface NavChild {
  label: string;
  path: string;
}

export interface NavWorkspace {
  label: string;
  path: string; // landing path for the workspace
  children?: NavChild[];
}

export const navWorkspaces: NavWorkspace[] = [
  {
    label: 'Home',
    path: '/',
  },
  {
    label: 'Calculate',
    path: '/screeding-calculator',
    children: [
      { label: 'Wall Screeding Calculator', path: '/screeding-calculator' },
      { label: 'Paint Calculator', path: '/paint-calculator' },
      { label: 'POP Ceiling Calculator', path: '/pop-ceiling-calculator' },
      { label: 'Tile Calculator', path: '/tile-calculator' },
    ],
  },
  {
    label: 'Estimate',
    path: '/cost-estimator',
    children: [
      { label: 'Finish Estimator', path: '/finish-estimator' },
      { label: 'Screeding Cost Estimator', path: '/screeding-cost-estimator' },
      { label: 'Paint Cost Estimator', path: '/cost-estimator' },
      { label: 'POP Ceiling Cost Estimator', path: '/pop-ceiling-cost-estimator' },
      { label: 'Tile Cost Estimator', path: '/tile-cost-estimator' },
    ],
  },
  {
    label: 'Colors',
    path: '/colors',
    children: [
      { label: 'Color Library', path: '/colors' },
      { label: 'Compare Colors', path: '/colors/compare' },
    ],
  },
  {
    label: 'AI',
    path: '/ai-color-assistant',
    children: [
      { label: 'Smart Color Assistant', path: '/ai-color-assistant' },
    ],
  },
  {
    label: 'Projects',
    path: '/my-projects',
  },
  {
    label: 'Learn',
    path: '/learn',
  },
  {
    label: 'Account',
    path: '/login',
    children: [
      { label: 'Sign In', path: '/login' },
      { label: 'My Projects', path: '/my-projects' },
      { label: 'Contact', path: '/contact' },
      { label: 'About', path: '/about' },
    ],
  },
];

// Legacy export kept for backward compatibility (footer uses similar structure)
export const navLinks = navWorkspaces.map((w) => ({ label: w.label, path: w.path }));
