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
  email: 'frenzyanthony39@gmail.com',
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
}

export const navWorkspaces: NavWorkspace[] = [
  {
    label: 'Home',
    path: '/',
  },
  {
    label: 'Calculators',
    path: '/painting-estimator',
    children: [
      // Section: All Calculators
      { label: 'View All Calculators', path: '/calculators', section: 'Browse', description: 'Browse every FRELUX calculator in one place' },
      // Section: Quantity Estimators
      { label: 'Painting Estimator', path: '/painting-estimator', section: 'Estimators', description: 'Room-based paint quantity calculator' },
      { label: 'Screeding Calculator', path: '/screeding-calculator', section: 'Estimators', description: 'Screeding material quantities' },
      { label: 'POP Ceiling Calculator', path: '/pop-ceiling-calculator', section: 'Estimators', description: 'POP ceiling board & material estimate' },
      { label: 'Tile Calculator', path: '/tile-calculator', section: 'Estimators', description: 'Tile quantity & layout planner' },
      { label: 'Tyrolene Estimator', path: '/tyrolene-estimator', section: 'Estimators', description: 'Tyrolene putty estimator' },
      { label: 'Finish Estimator', path: '/finish-estimator', section: 'Estimators', description: 'Multi-surface finish calculator' },
      { label: 'Build-to-Roof Estimator', path: '/build-to-roof-estimator', section: 'Estimators', description: 'Foundation to roof construction cost estimator' },
      { label: 'AI Photo Estimator', path: '/image-estimator', section: 'Estimators', description: 'Upload a building photo and get an instant AI cost estimate (Premium)' },
      { label: 'Structural Calculator', path: '/structural-calculator', section: 'Engineering', description: 'Beam, column, and slab sizing with BS 8110 formulas' },
      { label: 'Foundation Designer', path: '/foundation-calculator', section: 'Engineering', description: 'Strip, pad, and raft foundation sizing by soil type' },
      { label: 'Project Timeline', path: '/project-timeline', section: 'Engineering', description: 'How long will your build take? Stage-by-stage schedule' },
      { label: 'Construction Sequence', path: '/construction-sequence', section: 'Engineering', description: 'The correct build order with quality gates and checks' },
      // Section: Cost Estimators
      { label: 'Paint Cost Estimator', path: '/cost-estimator', section: 'Cost Estimators', description: 'Full painting project cost breakdown' },
      { label: 'Screeding Cost Estimator', path: '/screeding-cost-estimator', section: 'Cost Estimators', description: 'Screeding project cost analysis' },
      { label: 'POP Ceiling Cost Estimator', path: '/pop-ceiling-cost-estimator', section: 'Cost Estimators', description: 'POP ceiling cost estimation' },
      { label: 'Tile Cost Estimator', path: '/tile-cost-estimator', section: 'Cost Estimators', description: 'Tile installation cost breakdown' },
      // Section: Tools
      { label: 'Calculator Templates', path: '/templates', section: 'Tools', description: 'Save & reuse calculator presets' },
      { label: 'Paint Calculator (Legacy)', path: '/paint-calculator', section: 'Tools', description: 'Original quick paint calculator' },
    ],
  },
  {
    label: 'Colors',
    path: '/colors',
    children: [
      { label: 'Color Library', path: '/colors', description: 'Browse thousands of paint colors' },
      { label: 'Compare Colors', path: '/colors/compare', description: 'Side-by-side color comparison' },
      { label: 'Smart Color Assistant', path: '/ai-color-assistant', description: 'AI-powered color recommendations' },
      { label: 'AI Color Preview', path: '/color-preview', description: 'Before & after room visualization' },
    ],
  },
  {
    label: 'Community',
    path: '/pro-connect',
    children: [
      { label: 'Find Professionals', path: '/pro-connect', section: 'Pro Connect', description: 'Browse verified FRELUX professionals' },
      { label: 'Become a Professional', path: '/pro-connect/register', section: 'Pro Connect', description: 'List your services on FRELUX' },
      { label: 'Professional Dashboard', path: '/pro-connect/dashboard', section: 'Pro Connect', description: 'Manage your pro profile' },
      { label: 'Worker Channels', path: '/worker-channels', section: 'Worker Hub', description: 'Chat, price updates & networking' },
      { label: 'Messages', path: '/messages', section: 'Worker Hub', description: 'Your direct messages' },
    ],
  },
  {
    label: 'Learn',
    path: '/learn',
    children: [
      { label: 'Guides & Tutorials', path: '/learn', description: 'Step-by-step building guides' },
      { label: 'About FRELUX', path: '/about', description: 'Our story & mission' },
      { label: 'Contact', path: '/contact', description: 'Get in touch with our team' },
    ],
  },
];

// Legacy export kept for backward compatibility (footer uses similar structure)
export const navLinks = navWorkspaces.map((w) => ({ label: w.label, path: w.path }));
