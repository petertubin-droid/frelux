// Central site configuration. Update values here to change brand-wide behavior.

export const siteConfig = {
  name: 'FRELUX PAINT CALC',
  shortName: 'FRELUX',
  tagline: 'Smart calculators for painting, tiles & building projects',
  description:
    'Smart calculators for painting, tiles & building projects',
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
// Public navigation — organized into logical workspaces
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
    label: 'Calculators',
    path: '/paint-calculator',
    children: [
      { label: 'Paint Calculator', path: '/paint-calculator' },
      { label: 'Screeding Calculator', path: '/screeding-calculator' },
      { label: 'POP Ceiling Calculator', path: '/pop-ceiling-calculator' },
      { label: 'Tile Calculator', path: '/tile-calculator' },
      { label: 'Painting Estimator', path: '/painting-estimator' },
      { label: 'Tyrolene Estimator', path: '/tyrolene-estimator' },
      { label: 'Finish Estimator', path: '/finish-estimator' },
      { label: 'Calculator Templates', path: '/templates' },
    ],
  },
  {
    label: 'Cost Estimators',
    path: '/cost-estimator',
    children: [
      { label: 'Paint Cost Estimator', path: '/cost-estimator' },
      { label: 'Screeding Cost Estimator', path: '/screeding-cost-estimator' },
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
      { label: 'Smart Color Assistant', path: '/ai-color-assistant' },
      { label: 'AI Color Preview (Before/After)', path: '/color-preview' },
    ],
  },
  {
    label: 'Templates',
    path: '/templates',
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
      { label: 'My Templates', path: '/my-templates' },
      { label: 'Client Management', path: '/clients' },
      { label: 'Estimate Analytics', path: '/analytics' },
      { label: 'Contact', path: '/contact' },
      { label: 'About', path: '/about' },
    ],
  },
  {
    label: 'Projects',
    path: '/my-projects',
  },

];

// Legacy export kept for backward compatibility (footer uses similar structure)
export const navLinks = navWorkspaces.map((w) => ({ label: w.label, path: w.path }));
