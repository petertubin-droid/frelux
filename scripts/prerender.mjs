/**
 * Prerender static HTML for all public routes.
 * Reads the built index.html, injects route-specific <title>, meta description,
 * canonical URL, OG tags, and structured data, then writes one HTML file per route.
 *
 * Usage: node scripts/prerender.mjs
 * Run AFTER `vite build` (reads from dist/).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { seoContentMap } from './seo-content-map.mjs';

const SITE_URL = 'https://freluxpaintcalc.com';
const distDir = 'dist';
const ogImage = `${SITE_URL}/og-image.png`;

// ── Route metadata ──────────────────────────────────────────────────
const routes = [
  {
    path: '/',
    title: 'FRELUX PAINT CALC: Plan Your Perfect Paint Project',
    description: 'Free paint calculator, screeding calculator, cost estimator, tile calculator, POP ceiling calculator, and AI color assistant. Plan materials and costs for any painting project.',
    priority: '1.0',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'FRELUX PAINT CALC', url: SITE_URL },
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'FRELUX PAINT CALC', url: SITE_URL },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Featured Calculator Templates',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Standard Living Room Painting', url: `${SITE_URL}/templates/standard-living-room-painting` },
          { '@type': 'ListItem', position: 2, name: '2-Bedroom Flat Painting', url: `${SITE_URL}/templates/2-bedroom-flat-full-painting` },
          { '@type': 'ListItem', position: 3, name: 'Exterior Duplex Painting', url: `${SITE_URL}/templates/exterior-duplex-painting` },
          { '@type': 'ListItem', position: 4, name: 'Standard Floor Tiling', url: `${SITE_URL}/templates/standard-floor-tiling` },
          { '@type': 'ListItem', position: 5, name: 'Large Format Porcelain Floor', url: `${SITE_URL}/templates/terrazzo-porcelain-floor-tiling` },
          { '@type': 'ListItem', position: 6, name: 'Standard Room Screeding', url: `${SITE_URL}/templates/standard-room-screeding` },
          { '@type': 'ListItem', position: 7, name: 'Living Room + Ceiling Screeding', url: `${SITE_URL}/templates/living-room-ceiling-screeding` },
          { '@type': 'ListItem', position: 8, name: 'Large Living Room POP Ceiling', url: `${SITE_URL}/templates/large-living-room-pop-ceiling` },
          { '@type': 'ListItem', position: 9, name: 'Master Bedroom POP Ceiling', url: `${SITE_URL}/templates/master-bedroom-pop-ceiling` },
        ],
      },
    ],
  },
  {
    path: '/paint-calculator',
    title: 'Paint Calculator: How Much Paint Do I Need? | FRELUX',
    description: 'Free paint calculator. Enter your room dimensions, doors, windows, and coats to estimate exactly how many liters of paint your project requires.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Paint Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Paint Calculator', item: `${SITE_URL}/paint-calculator` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How do I calculate how much paint I need?', acceptedAnswer: { '@type': 'Answer', text: 'Enter your room length, width, and wall height into the FRELUX Paint Calculator. Deduct doors and windows, select the number of coats, and the calculator estimates paint quantity in litres.' } },
        { '@type': 'Question', name: 'How accurate is the paint calculator?', acceptedAnswer: { '@type': 'Answer', text: 'The calculator uses standard paint coverage rates and factors in wall area, openings, and coats. Results are estimates for planning.' } },
      ]},
    ],
  },
  {
    path: '/screeding-calculator',
    title: 'Wall Screeding Calculator: FRELUX',
    description: 'Calculate wall screeding area and material quantities. Enter room dimensions to get cement, sand, and labour estimates for wall screeding.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Wall Screeding Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Screeding Calculator', item: `${SITE_URL}/screeding-calculator` },
      ]},
    ],
  },
  {
    path: '/cost-estimator',
    title: 'Paint Cost Estimator: FRELUX',
    description: 'Estimate the practical cost of your painting project. Paint, primer, materials, based on real product prices and your paint quantity.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Cost Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Cost Estimator', item: `${SITE_URL}/cost-estimator` },
      ]},
    ],
  },
  {
    path: '/pop-ceiling-calculator',
    title: 'POP Ceiling Calculator: FRELUX',
    description: 'Calculate POP ceiling material quantities. Enter room dimensions to estimate POP cement, mesh, and other materials for your ceiling project.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX POP Ceiling Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    ],
  },
  {
    path: '/tile-calculator',
    title: 'Tile Calculator: How Many Tiles Do I Need? | FRELUX',
    description: 'Free tile calculator. Enter your floor or wall dimensions to calculate tile quantity, adhesive, grout, and layout recommendations.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Tile Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    ],
  },
  {
    path: '/painting-estimator',
    title: 'Painting Estimator: Room-Based Paint & Cost | FRELUX',
    description: 'Professional painting estimator using the FRELUX methodology. Calculate paint quantity and project cost for multiple rooms with real product prices.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Painting Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    ],
  },
  {
    path: '/screeding-cost-estimator',
    title: 'Screeding Cost Estimator: FRELUX',
    description: 'Estimate the cost of wall screeding based on your wall area and current material prices. Cement, sand, and labour cost breakdown.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/pop-ceiling-cost-estimator',
    title: 'POP Ceiling Cost Estimator: FRELUX',
    description: 'Estimate the cost of your POP ceiling project. POP cement, mesh, and other material costs based on your ceiling area.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/tile-cost-estimator',
    title: 'Tile Cost Estimator: FRELUX',
    description: 'Estimate tiling project cost. Tile, adhesive, grout, and labour costs based on your tile area and current prices.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/finish-estimator',
    title: 'Finish Estimator: Painting, Tyrolene & Grafitex | FRELUX',
    description: 'Estimate material quantities and costs for wall finishes: painting, Tyrolene, and Grafitex. Uses real coverage rates and package sizes.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/tyrolene-estimator',
    title: 'Tyrolene Estimator: Exterior Wall Finish | FRELUX',
    description: 'Calculate Tyrolene material quantities and costs. Cement, sand, acrylic bond, water seal, and anti-fungal estimates for exterior walls.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/colors',
    title: 'Paint Color Library: FRELUX',
    description: 'Browse hundreds of paint colors with real names and codes. Search, filter, and compare colors for your painting project.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/colors/compare',
    title: 'Compare Paint Colors Side by Side: FRELUX',
    description: 'Compare paint colors side by side. See how different shades look together and choose the perfect palette for your space.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/ai-color-assistant',
    title: 'Smart Color Assistant: AI Paint Color Ideas | FRELUX',
    description: 'Get AI-powered paint color recommendations. Describe your room, lighting, and mood to receive personalized color suggestions.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/learn',
    title: 'Learn: Painting Guides & Tips | FRELUX',
    description: 'Expert guides on paint selection, surface preparation, application techniques, and cost planning for your painting projects.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/templates',
    title: 'Calculator Templates: FRELUX',
    description: 'Professionally curated templates for common painting, tiling, screeding, and POP ceiling projects using the FRELUX calculation engine.',
    priority: '0.6',
    changefreq: 'weekly',
  },
  { path: '/templates/standard-living-room-painting', title: 'Paint Calculator Template: Standard Living Room | FRELUX', description: 'Calculate paint needed for a standard living room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/master-bedroom-painting', title: 'Paint Calculator Template: Master Bedroom | FRELUX', description: 'Calculate paint needed for a master bedroom with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-accent-wall-painting', title: 'Paint Calculator Template: Single Accent Wall | FRELUX', description: 'Calculate paint for a single accent wall with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/exterior-bungalow-painting', title: 'Paint Calculator Template: Exterior Bungalow | FRELUX', description: 'Calculate paint for exterior bungalow walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-painting', title: 'Paint Calculator Template: Dining Room | FRELUX', description: 'Calculate paint needed for a dining room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/childrens-room-painting', title: 'Paint Calculator Template: Children\'s Room | FRELUX', description: 'Calculate paint needed for a children\'s room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-walls-painting', title: 'Paint Calculator Template: Kitchen Walls | FRELUX', description: 'Calculate paint needed for kitchen walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-stairwell-painting', title: 'Paint Calculator Template: Corridor & Stairwell | FRELUX', description: 'Calculate paint for corridors and stairwells with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/2-bedroom-flat-full-painting', title: 'Paint Calculator Template: 2-Bedroom Flat | FRELUX', description: 'Calculate paint for a complete 2-bedroom flat with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/office-space-painting', title: 'Paint Calculator Template: Office Space | FRELUX', description: 'Calculate paint needed for office space with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/exterior-duplex-painting', title: 'Paint Calculator Template: Exterior Duplex | FRELUX', description: 'Calculate paint for exterior duplex walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/shop-retail-front-painting', title: 'Paint Calculator Template: Shop / Retail Front | FRELUX', description: 'Calculate paint for shop and retail fronts with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-floor-tiling', title: 'Tile Calculator Template: Standard Floor Tiling | FRELUX', description: 'Calculate tiles, adhesive, and grout for a standard floor with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/bathroom-wall-tiling', title: 'Tile Calculator Template: Bathroom Wall Tiles | FRELUX', description: 'Calculate tiles for bathroom walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/large-hall-floor-tiling', title: 'Tile Calculator Template: Large Hall Floor | FRELUX', description: 'Calculate tiles for a large hall floor with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-backsplash-tiling', title: 'Tile Calculator Template: Kitchen Backsplash | FRELUX', description: 'Calculate tiles for a kitchen backsplash with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/balcony-floor-tiling', title: 'Tile Calculator Template: Balcony Floor Tiling | FRELUX', description: 'Calculate tiles for balcony floors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-floor-tiling', title: 'Tile Calculator Template: Kitchen Floor Tiles | FRELUX', description: 'Calculate tiles for kitchen floors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/guest-toilet-wall-tiling', title: 'Tile Calculator Template: Guest Toilet Wall Tiles | FRELUX', description: 'Calculate tiles for guest toilet walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/staircase-tiling', title: 'Tile Calculator Template: Staircase Tiling | FRELUX', description: 'Calculate tiles for staircases with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/terrazzo-porcelain-floor-tiling', title: 'Tile Calculator Template: Large Format Porcelain Floor | FRELUX', description: 'Calculate tiles for large format porcelain floors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/wall-feature-strip-tiling', title: 'Tile Calculator Template: Wall Feature Strip | FRELUX', description: 'Calculate tiles for decorative wall feature strips with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-room-screeding', title: 'Screeding Calculator Template: Standard Room | FRELUX', description: 'Calculate screeding materials for a standard room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-wall-screeding', title: 'Screeding Calculator Template: Single Wall | FRELUX', description: 'Calculate screeding materials for a single wall with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/living-room-ceiling-screeding', title: 'Screeding Calculator Template: Living Room + Ceiling | FRELUX', description: 'Calculate screeding for living room walls and ceiling with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-walls-screeding', title: 'Screeding Calculator Template: Corridor Walls | FRELUX', description: 'Calculate screeding materials for corridor walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-screeding', title: 'Screeding Calculator Template: Dining Room | FRELUX', description: 'Calculate screeding materials for a dining room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/office-screeding', title: 'Screeding Calculator Template: Office | FRELUX', description: 'Calculate screeding materials for office walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-screeding', title: 'Screeding Calculator Template: Corridor | FRELUX', description: 'Calculate screeding materials for corridors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-feature-wall-screeding', title: 'Screeding Calculator Template: Single Feature Wall | FRELUX', description: 'Calculate screeding materials for a single feature wall with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/shop-front-screeding', title: 'Screeding Calculator Template: Shop Front | FRELUX', description: 'Calculate screeding materials for shop front walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-bedroom-pop-ceiling', title: 'POP Ceiling Calculator Template: Standard Bedroom | FRELUX', description: 'Calculate POP ceiling materials for a standard bedroom with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/large-living-room-pop-ceiling', title: 'POP Ceiling Calculator Template: Large Living Room | FRELUX', description: 'Calculate POP ceiling materials for a large living room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/small-office-pop-ceiling', title: 'POP Ceiling Calculator Template: Small Office | FRELUX', description: 'Calculate POP ceiling materials for a small office with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/hall-cornice-pop-ceiling', title: 'POP Ceiling Calculator Template: Hall Ceiling with Cornice | FRELUX', description: 'Calculate POP ceiling materials for a large hall with cornice with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-pop-ceiling', title: 'POP Ceiling Calculator Template: Dining Room | FRELUX', description: 'Calculate POP ceiling materials for a dining room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-pop-ceiling', title: 'POP Ceiling Calculator Template: Kitchen | FRELUX', description: 'Calculate POP ceiling materials for a kitchen with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-pop-ceiling', title: 'POP Ceiling Calculator Template: Corridor | FRELUX', description: 'Calculate POP ceiling materials for a corridor with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/master-bedroom-pop-ceiling', title: 'POP Ceiling Calculator Template: Master Bedroom | FRELUX', description: 'Calculate POP ceiling materials for a master bedroom with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/conference-room-pop-ceiling', title: 'POP Ceiling Calculator Template: Conference Room | FRELUX', description: 'Calculate POP ceiling materials for a large conference room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },

  {
    path: '/about',
    title: 'About FRELUX PAINT CALC',
    description: 'Learn about FRELUX PAINT CALC: free professional paint calculators, cost estimators, and AI tools for painting projects.',
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    path: '/contact',
    title: 'Contact FRELUX PAINT CALC',
    description: 'Get in touch with the FRELUX team. Send us your questions, feedback, or partnership inquiries.',
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy: FRELUX PAINT CALC',
    description: 'How FRELUX PAINT CALC handles your information when you use our website and tools.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/terms',
    title: 'Terms of Service: FRELUX PAINT CALC',
    description: 'Terms of service for using FRELUX PAINT CALC tools and website.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/cookie-policy',
    title: 'Cookie Policy: FRELUX PAINT CALC',
    description: 'How FRELUX PAINT CALC uses cookies and how they improve your experience.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer: FRELUX PAINT CALC',
    description: 'Disclaimer for FRELUX PAINT CALC tools and estimates. All calculations and estimates are for guidance only.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/ai-disclaimer',
    title: 'AI Disclaimer: FRELUX PAINT CALC',
    description: 'Disclaimer for AI-powered features in FRELUX PAINT CALC.',
    priority: '0.3',
    changefreq: 'yearly',
  },
];

// ── Prerender ──────────────────────────────────────────────────────
const templatePath = join(distDir, 'index.html');
if (!existsSync(templatePath)) {
  console.error('❌ dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

let templateHtml = readFileSync(templatePath, 'utf-8');
let count = 0;

for (const route of routes) {
  let html = templateHtml;

  // Title
  html = html.replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`);

  // Meta description
  if (html.includes('name="description"')) {
    html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${route.description}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${route.description}" />\n</head>`);
  }

  // Canonical
  const canonicalUrl = `${SITE_URL}${route.path}`;
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonicalUrl}" />`);
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`);
  }

  // OG tags
  const ogReplacements = [
    ['og:title', route.title],
    ['og:description', route.description],
    ['og:url', canonicalUrl],
    ['og:image', ogImage],
  ];
  for (const [prop, val] of ogReplacements) {
    const regex = new RegExp(`<meta\\s+property="${prop}"\\s+content="[^"]*"\\s*/?>`);
    if (html.match(regex)) {
      html = html.replace(regex, `<meta property="${prop}" content="${val}" />`);
    } else {
      html = html.replace('</head>', `  <meta property="${prop}" content="${val}" />\n</head>`);
    }
  }

  // Twitter
  const twReplacements = [
    ['twitter:title', route.title],
    ['twitter:description', route.description],
    ['twitter:image', ogImage],
  ];
  for (const [prop, val] of twReplacements) {
    const regex = new RegExp(`<meta\\s+name="${prop}"\\s+content="[^"]*"\\s*/?>`);
    if (html.match(regex)) {
      html = html.replace(regex, `<meta name="${prop}" content="${val}" />`);
    }
  }

  // Robots
  const robotsContent = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  if (html.includes('name="robots"')) {
    html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, `<meta name="robots" content="${robotsContent}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="robots" content="${robotsContent}" />\n</head>`);
  }

  // Structured data
  if (route.structuredData) {
    const sdScripts = route.structuredData
      .map((sd, i) => `  <script type="application/ld+json" id="prerender-sd-${i}">${JSON.stringify(sd)}</script>`)
      .join('\n');
    html = html.replace('</head>', `${sdScripts}\n</head>`);
  }

  // Inject SEO content into #root for crawlers (React replaces it on load)
  const pageContent = seoContentMap[route.path];
  if (pageContent) {
    const contentDiv = `<div style="max-width:48rem;margin:0 auto;padding:3rem 1rem;font-family:system-ui,sans-serif;color:#333;">${pageContent}</div>`;
    html = html.replace('<div id="root">', `<div id="root">${contentDiv}`);
  }

  // Write file
  const outPath = route.path === '/' ? join(distDir, 'index.html') : join(distDir, route.path, 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  count++;
  console.log(`  ✅ ${route.path}`);
}

console.log(`\n prerendered ${count} routes`);
