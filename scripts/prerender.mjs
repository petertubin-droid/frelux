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

const SITE_URL = 'https://freluxpaintcalc.com';
const distDir = 'dist';
const ogImage = `${SITE_URL}/og-image.png`;

// ── Route metadata ──────────────────────────────────────────────────
const routes = [
  {
    path: '/',
    title: 'FRELUX PAINT CALC — Plan Your Perfect Paint Project',
    description: 'Free paint calculator, screeding calculator, cost estimator, tile calculator, POP ceiling calculator, and AI color assistant. Plan materials and costs for any painting project.',
    priority: '1.0',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'FRELUX PAINT CALC', url: SITE_URL },
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'FRELUX PAINT CALC', url: SITE_URL },
    ],
  },
  {
    path: '/paint-calculator',
    title: 'Paint Calculator — How Much Paint Do I Need? | FRELUX',
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
    title: 'Wall Screeding Calculator — FRELUX',
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
    title: 'Paint Cost Estimator — FRELUX',
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
    title: 'POP Ceiling Calculator — FRELUX',
    description: 'Calculate POP ceiling material quantities. Enter room dimensions to estimate POP cement, mesh, and other materials for your ceiling project.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX POP Ceiling Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    ],
  },
  {
    path: '/tile-calculator',
    title: 'Tile Calculator — How Many Tiles Do I Need? | FRELUX',
    description: 'Free tile calculator. Enter your floor or wall dimensions to calculate tile quantity, adhesive, grout, and layout recommendations.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Tile Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    ],
  },
  {
    path: '/painting-estimator',
    title: 'Painting Estimator — Room-Based Paint & Cost | FRELUX',
    description: 'Professional painting estimator using the FRELUX methodology. Calculate paint quantity and project cost for multiple rooms with real product prices.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Painting Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    ],
  },
  {
    path: '/screeding-cost-estimator',
    title: 'Screeding Cost Estimator — FRELUX',
    description: 'Estimate the cost of wall screeding based on your wall area and current material prices. Cement, sand, and labour cost breakdown.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/pop-ceiling-cost-estimator',
    title: 'POP Ceiling Cost Estimator — FRELUX',
    description: 'Estimate the cost of your POP ceiling project. POP cement, mesh, and other material costs based on your ceiling area.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/tile-cost-estimator',
    title: 'Tile Cost Estimator — FRELUX',
    description: 'Estimate tiling project cost. Tile, adhesive, grout, and labour costs based on your tile area and current prices.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/finish-estimator',
    title: 'Finish Estimator — Painting, Tyrolene & Grafitex | FRELUX',
    description: 'Estimate material quantities and costs for wall finishes: painting, Tyrolene, and Grafitex. Uses real coverage rates and package sizes.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/tyrolene-estimator',
    title: 'Tyrolene Estimator — Exterior Wall Finish | FRELUX',
    description: 'Calculate Tyrolene material quantities and costs. Cement, sand, acrylic bond, water seal, and anti-fungal estimates for exterior walls.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/colors',
    title: 'Paint Color Library — FRELUX',
    description: 'Browse hundreds of paint colors with real names and codes. Search, filter, and compare colors for your painting project.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/colors/compare',
    title: 'Compare Paint Colors Side by Side — FRELUX',
    description: 'Compare paint colors side by side. See how different shades look together and choose the perfect palette for your space.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/ai-color-assistant',
    title: 'Smart Color Assistant — AI Paint Color Ideas | FRELUX',
    description: 'Get AI-powered paint color recommendations. Describe your room, lighting, and mood to receive personalized color suggestions.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/learn',
    title: 'Learn — Painting Guides & Tips | FRELUX',
    description: 'Expert guides on paint selection, surface preparation, application techniques, and cost planning for your painting projects.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/templates',
    title: 'Calculator Templates — FRELUX',
    description: 'Professionally curated templates for common painting, tiling, screeding, and POP ceiling projects using the FRELUX calculation engine.',
    priority: '0.6',
    changefreq: 'weekly',
  },
  {
    path: '/about',
    title: 'About FRELUX PAINT CALC',
    description: 'Learn about FRELUX PAINT CALC — free professional paint calculators, cost estimators, and AI tools for painting projects.',
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
    title: 'Privacy Policy — FRELUX PAINT CALC',
    description: 'How FRELUX PAINT CALC handles your information when you use our website and tools.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/terms',
    title: 'Terms of Service — FRELUX PAINT CALC',
    description: 'Terms of service for using FRELUX PAINT CALC tools and website.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/cookie-policy',
    title: 'Cookie Policy — FRELUX PAINT CALC',
    description: 'How FRELUX PAINT CALC uses cookies and how they improve your experience.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer — FRELUX PAINT CALC',
    description: 'Disclaimer for FRELUX PAINT CALC tools and estimates. All calculations and estimates are for guidance only.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/ai-disclaimer',
    title: 'AI Disclaimer — FRELUX PAINT CALC',
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

  // Write file
  const outPath = route.path === '/' ? join(distDir, 'index.html') : join(distDir, route.path, 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  count++;
  console.log(`  ✅ ${route.path}`);
}

console.log(`\n prerendered ${count} routes`);
