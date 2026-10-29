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
import { marketLandingRoutes } from './market-landing-data.mjs';
import { TEMPLATE_CATALOG } from './lib/template-catalog.mjs';
import { SITE_URL } from './lib/site-url.mjs';

const distDir = 'dist';

// Google indexing fix (2026-09-25): prerendered pages are served at their
// trailing-slash URL (Netlify pretty URLs: /paint-calculator 301s to
// /paint-calculator/). Structured-data URLs must therefore (a) use the
// trailing-slash form that is actually served and (b) point at final
// destinations, not at legacy 301 sources. A JSON-LD/canonical URL that
// redirects back to the page itself is a redirect loop for Googlebot and
// lands the page in GSC as "Page with redirect" instead of indexed.
const LEGACY_REDIRECT_TARGETS = {
  '/cost-estimator': '/paint-calculator',
  '/painting-estimator': '/paint-calculator',
  '/screeding-cost-estimator': '/screeding-calculator',
  '/pop-ceiling-cost-estimator': '/pop-ceiling-calculator',
  '/tile-cost-estimator': '/tile-calculator',
  '/tyrolene-estimator': '/finish-estimator',
};
const normalizeSdUrls = (json) => {
  const siteUrlRe = new RegExp(`"${SITE_URL.replace(/\./g, '\\.')}(\/[^"]*)?"`, 'g');
  return json.replace(siteUrlRe, (m, p) => {
    if (!p) return m; // bare home URL — correct as-is
    if (/\.(png|jpe?g|svg|webp|ico|xml|json|txt|css|js)$/i.test(p)) return m; // assets keep extension URLs
    if (LEGACY_REDIRECT_TARGETS[p]) return `"${SITE_URL}${LEGACY_REDIRECT_TARGETS[p]}"`;
    return `"${SITE_URL}${p.endsWith('/') ? p : `${p}/`}"`;
  });
};
const ogImage = `${SITE_URL}/og-image.png`;

// ── Route metadata ──────────────────────────────────────────────────
const routes = [
  {
    path: '/',
    title: 'FRELUX SMART CALC: Calculate Materials & Estimate Construction Costs',
    description: 'Know exactly what materials your construction project needs. Free construction calculators for paint, screeding, POP ceiling, tiles, and finishing. Estimate costs with real market prices.',
    priority: '1.0',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'FRELUX SMART CALC', url: SITE_URL },
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'FRELUX SMART CALC', url: SITE_URL },
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
    path: '/start-building',
    title: 'Start Building: What Are You Building Today? | FRELUX SMART CALC',
    description:
      'Start your construction project with FRELUX. Estimate materials and costs from foundation to roof, then finishing: paint, screeding, POP ceiling, tiles, and exterior. Free construction calculators and estimators.',
    priority: '0.9',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Start Building | FRELUX SMART CALC', description: 'Choose what you are building and FRELUX will help you calculate materials, quantities and estimated project costs.', url: `${SITE_URL}/start-building` },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Start Building', item: `${SITE_URL}/start-building` },
      ]},
      { '@context': 'https://schema.org', '@type': 'ItemList', name: 'FRELUX Building Categories', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Build to Roof', url: `${SITE_URL}/build-to-roof-estimator` },
        { '@type': 'ListItem', position: 2, name: 'Painting', url: `${SITE_URL}/paint-calculator` },
        { '@type': 'ListItem', position: 3, name: 'Screeding', url: `${SITE_URL}/screeding-calculator` },
        { '@type': 'ListItem', position: 4, name: 'POP Ceiling', url: `${SITE_URL}/pop-ceiling-calculator` },
        { '@type': 'ListItem', position: 5, name: 'Tiles & Flooring', url: `${SITE_URL}/tile-calculator` },
        { '@type': 'ListItem', position: 6, name: 'Exterior Finishing', url: `${SITE_URL}/tyrolene-estimator` },
        { '@type': 'ListItem', position: 7, name: 'Colour & Design', url: `${SITE_URL}/colors` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What is the Build-to-Roof Estimator?', acceptedAnswer: { '@type': 'Answer', text: 'The Build-to-Roof Estimator calculates materials and costs for a complete building project from foundation through roofing, including blocks, cement, sand, granite, roofing sheets, structural members, and labour based on practical construction standards.' } },
        { '@type': 'Question', name: 'Can I estimate finishing costs after the build?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. After your structure is built, use FRELUX finishing calculators for paint, screeding, POP ceiling, tiles, and exterior finishes to estimate materials and costs for each stage.' } },
        { '@type': 'Question', name: 'Are FRELUX calculators free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All calculators and estimators are free to use with no sign-up required. Pro features like saved estimates and PDF exports are available with a Pro account.' } },
      ]},
    ],
  },
  {
    path: '/paint-calculator',
    title: 'Paint Calculator: How Much Paint Do I Need? | FRELUX SMART CALC',
    description: 'Room-based paint calculator for any project. Enter room dimensions, wall height, doors, and windows to estimate paint quantity in 20-litre buckets using verified coverage rates.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Paint Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Paint Calculator', item: `${SITE_URL}/paint-calculator` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How does the FRELUX paint calculator differ from a generic area-based calculator?', acceptedAnswer: { '@type': 'Answer', text: 'FRELUX uses a room-based approach: you enter room dimensions (not raw m²), and the calculator handles all area math internally. Coverage rates are verified from the database. Surface condition, colour condition, and wall height all affect the final quantity.' } },
        { '@type': 'Question', name: 'Why does the calculator recommend 20-litre buckets?', acceptedAnswer: { '@type': 'Answer', text: '20-litre buckets are a standard purchase unit in many paint markets. The calculator shows both theoretical litres needed and the practical number of buckets to buy.' } },
        { '@type': 'Question', name: 'Do I need primer?', acceptedAnswer: { '@type': 'Answer', text: 'FRELUX recommends primer for new/unpainted surfaces and when painting light colours over dark surfaces. The calculator flags these conditions automatically based on your colour condition selection.' } },
      ]},
    ],
  },
  {
    path: '/screeding-calculator',
    title: 'Wall Screeding Calculator: FRELUX',
    description: 'Calculate wall screeding area in m² and estimate screeding paint (litres) and white cement (kg). Enter room or fence dimensions in feet or metres.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Wall Screeding Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Screeding Calculator', item: `${SITE_URL}/screeding-calculator` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'Does FRELUX use a cement:sand mix ratio for screeding?', acceptedAnswer: { '@type': 'Answer', text: 'No. The FRELUX screeding methodology calculates screeding paint (litres) and white cement (kg) based on the surface area in m² and verified coverage and consumption rates.' } },
        { '@type': 'Question', name: 'Can I calculate screeding for fences?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Enter fence dimensions in feet or metres. The calculator converts the surface area to m² and calculates materials using the same methodology.' } },
        { '@type': 'Question', name: 'Is the screeding area shown in m²?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All screeding calculations use square metres (m²) as the unit of measurement, even when input dimensions are in feet.' } },
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
    , { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` }, { '@type': 'ListItem', position: 3, name: 'POP Ceiling Calculator', item: `${SITE_URL}/pop-ceiling-calculator` }] }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How do I calculate POP ceiling materials?', acceptedAnswer: { '@type': 'Answer', text: 'Enter your room length and width into the FRELUX POP Ceiling Calculator. It estimates POP cement, fibreglass mesh, bonding agent, and other materials based on your ceiling area.' } }, { '@type': 'Question', name: 'What is a POP ceiling?', acceptedAnswer: { '@type': 'Answer', text: 'Plaster of Paris (POP) ceilings are smooth, elegant ceiling finishes popular in many homes. POP is mixed with water and applied to ceilings, often with decorative mouldings and cornices.' } }] }],
  },
  {
    path: '/tile-calculator',
    title: 'Tile Calculator: How Many Tiles Do I Need? | FRELUX SMART CALC',
    description: 'Free tile calculator. Enter your floor or wall dimensions to calculate tile quantity, adhesive, grout, and layout recommendations.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Tile Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    , { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` }, { '@type': 'ListItem', position: 3, name: 'Tile Calculator', item: `${SITE_URL}/tile-calculator` }] }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How many tiles do I need?', acceptedAnswer: { '@type': 'Answer', text: 'Enter your floor or wall dimensions and tile size into the FRELUX Tile Calculator. It calculates the number of tiles, boxes, adhesive, and grout including a waste factor for cuts and breakages.' } }, { '@type': 'Question', name: 'How much extra tile should I buy?', acceptedAnswer: { '@type': 'Answer', text: 'Always add 10-15% extra tiles for cuts, breakages, and future repairs. The calculator includes this waste factor automatically.' } }] }],
  },
  {
    path: '/painting-estimator',
    title: 'Painting Estimator: Room-Based Paint & Cost | FRELUX SMART CALC',
    description: 'Professional painting estimator using the FRELUX methodology. Calculate paint quantity and project cost for multiple rooms with real product prices.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Painting Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    , { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` }, { '@type': 'ListItem', position: 3, name: 'Painting Estimator', item: `${SITE_URL}/painting-estimator` }] }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does the Painting Estimator work?', acceptedAnswer: { '@type': 'Answer', text: 'Enter each room with its dimensions. The estimator calculates paint quantity and project cost for all rooms combined using the FRELUX methodology with real market product prices.' } }] }],
  },
  {
    path: '/screeding-cost-estimator',
    title: 'Screeding Cost Estimator: FRELUX',
    description: 'Estimate the cost of wall screeding based on your wall area and current material prices. Cement, sand, and labour cost breakdown.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Screeding Cost Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Cost Estimators', item: `${SITE_URL}/cost-estimator` },
        { '@type': 'ListItem', position: 3, name: 'Screeding Cost Estimator', item: `${SITE_URL}/screeding-cost-estimator` },
      ]},
    ],
  },
  {
    path: '/pop-ceiling-cost-estimator',
    title: 'POP Ceiling Cost Estimator: FRELUX',
    description: 'Estimate the cost of your POP ceiling project. POP cement, mesh, and other material costs based on your ceiling area.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX POP Ceiling Cost Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Cost Estimators', item: `${SITE_URL}/cost-estimator` },
        { '@type': 'ListItem', position: 3, name: 'POP Ceiling Cost Estimator', item: `${SITE_URL}/pop-ceiling-cost-estimator` },
      ]},
    ],
  },
  {
    path: '/tile-cost-estimator',
    title: 'Tile Cost Estimator: FRELUX',
    description: 'Estimate tiling project cost. Tile, adhesive, grout, and labour costs based on your tile area and current prices.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Tile Cost Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Cost Estimators', item: `${SITE_URL}/cost-estimator` },
        { '@type': 'ListItem', position: 3, name: 'Tile Cost Estimator', item: `${SITE_URL}/tile-cost-estimator` },
      ]},
    ],
  },
  {
    path: '/finish-estimator',
    title: 'Finish Estimator: Painting, Tyrolene & Grafitex | FRELUX SMART CALC',
    description: 'Estimate material quantities and costs for wall finishes: painting, Tyrolene, and Grafitex. Uses real coverage rates and package sizes.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Finish Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` }, { '@type': 'ListItem', position: 3, name: 'Finish Estimator', item: `${SITE_URL}/finish-estimator` }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'What finishes does the Finish Estimator support?', acceptedAnswer: { '@type': 'Answer', text: 'The Finish Estimator calculates materials and costs for painting, Tyrolene, and Grafitex wall finishes using real coverage rates and standard package sizes.' } }] },
    ],
  },
  {
    path: '/tyrolene-estimator',
    title: 'Tyrolene Estimator: Exterior Wall Finish | FRELUX SMART CALC',
    description: 'Partition-based Tyrolene estimator for exterior walls. Calculate sand, cement, acrylic bond, water seal, and anti-fungal material quantities per standard partition.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Tyrolene Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` }, { '@type': 'ListItem', position: 3, name: 'Tyrolene Estimator', item: `${SITE_URL}/tyrolene-estimator` }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'What is a standard partition in FRELUX?', acceptedAnswer: { '@type': 'Answer', text: 'A standard partition is 3m × 3m (9m²). You can enter the number of standard partitions directly, or provide actual wall dimensions and the calculator converts them to equivalent standard partitions.' } }, { '@type': 'Question', name: 'Can I use the Tyrolene estimator for interior walls?', acceptedAnswer: { '@type': 'Answer', text: 'No. Tyrolene is an exterior-only finish. The FRELUX Tyrolene Estimator is designed for exterior wall applications only.' } }, { '@type': 'Question', name: 'Does the calculator include labour costs?', acceptedAnswer: { '@type': 'Answer', text: 'No. Labour is negotiated separately and is not part of the Tyrolene material estimation.' } }] },
    ],
  },
  {
    path: '/colors',
    title: 'Paint Color Library: FRELUX',
    description: 'Browse hundreds of paint colors with real names and codes. Search, filter, and compare colors for your painting project.',
    priority: '0.8',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Color Library', item: `${SITE_URL}/colors` }] },
    ],
  },
  {
    path: '/colors/compare',
    title: 'Compare Paint Colors Side by Side: FRELUX',
    description: 'Compare paint colors side by side. See how different shades look together and choose the perfect palette for your space.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Color Library', item: `${SITE_URL}/colors` }, { '@type': 'ListItem', position: 3, name: 'Compare Colors', item: `${SITE_URL}/colors/compare` }] },
    ],
  },
  {
    path: '/ai-color-assistant',
    title: 'Smart Color Assistant: AI Paint Color Ideas | FRELUX SMART CALC',
    description: 'Get AI-powered paint color recommendations. Describe your room, lighting, and mood to receive personalized color suggestions.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Smart Color Assistant', item: `${SITE_URL}/ai-color-assistant` }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does the AI Color Assistant work?', acceptedAnswer: { '@type': 'Answer', text: 'Describe your room, lighting, and mood. The AI recommends paint colors that suit your space, with direct links to purchase from the color library.' } }] },
    ],
  },
  {
    path: '/paint-comparison',
    title: 'Paint Comparison Tool: Compare Colours Side by Side | FRELUX SMART CALC',
    description: 'Compare paint colours, finishes, and prices side by side to choose the right option for your project.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Paint Comparison', item: `${SITE_URL}/paint-comparison` }] },
    ],
  },
  {
    path: '/gallery',
    title: 'Project Gallery: Real FRELUX Estimates | FRELUX SMART CALC',
    description: 'Browse real painting, tiling, screeding, and POP ceiling projects with photos and verified cost estimates.',
    priority: '0.7',
    changefreq: 'daily',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Gallery', item: `${SITE_URL}/gallery` }] },
    ],
  },
  {
    path: '/case-studies',
    title: 'Before & After Case Studies | FRELUX SMART CALC',
    description: 'In-depth before and after walkthroughs of Nigerian painting, screeding, POP ceiling and tiling example projects: scope, challenges, outcome and cost breakdown.',
    priority: '0.7',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Case Studies', item: `${SITE_URL}/case-studies` }] },
    ],
  },
  {
    path: '/material-prices',
    title: 'Material Price Tracker: Live Paint & Building Material Prices | FRELUX SMART CALC',
    description: 'Track live prices of paint, cement, tiles, and building materials across supported markets to keep your estimates accurate.',
    priority: '0.7',
    changefreq: 'daily',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Material Prices', item: `${SITE_URL}/material-prices` }] },
    ],
  },
  {
    path: '/surface-assessment',
    title: 'Surface Assessment Tool: Check Wall Conditions | FRELUX SMART CALC',
    description: 'Assess wall and ceiling surface conditions to get accurate paint absorption factors and material estimates.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Surface Assessment', item: `${SITE_URL}/surface-assessment` }] },
    ],
  },
  {
    path: '/learn',
    title: 'Learn: Painting Guides & Tips | FRELUX SMART CALC',
    description: 'Expert guides on paint selection, surface preparation, application techniques, and cost planning for your painting projects.',
    priority: '0.8',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_URL}/learn` }] },
    ],
  },
  {
    path: '/printables',
    title: 'Free Printable Templates: Quotes, Schedules & Checklists | FRELUX SMART CALC',
    description: 'Free, print-ready project sheets from FRELUX: a quote comparison sheet, a paint project schedule, and a material shopping checklist.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Free Templates', item: `${SITE_URL}/printables` }] },
    ],
  },
  {
    path: '/glossary',
    title: 'Construction Glossary: Plain-Language Building Terms Explained | FRELUX SMART CALC',
    description: 'A plain-language glossary of construction, painting and finishing terms: primers, screeds, coverage rates, bills of quantities and more.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: 'FRELUX Construction Glossary', url: `${SITE_URL}/glossary` },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Glossary', item: `${SITE_URL}/glossary` }] },
    ],
  },
  {
    path: '/prices',
    title: 'Material Prices: Live Construction & Paint Price Book | FRELUX SMART CALC',
    description: 'Browse the FRELUX material price book: current prices for cement, paint, aggregates, plumbing, electrical and more, with sources, effective dates, and weekly movement.',
    priority: '0.8',
    changefreq: 'daily',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Material Prices', item: `${SITE_URL}/prices` }] },
    ],
  },
  {
    path: '/learn/library',
    title: 'All Guides: The Complete FRELUX Learn Library | FRELUX SMART CALC',
    description: 'Browse every published guide in the FRELUX Learn library: painting, screeding, POP ceiling, tiling, finishing, and construction tutorials.',
    priority: '0.7',
    changefreq: 'daily',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_URL}/learn` }, { '@type': 'ListItem', position: 3, name: 'All Guides', item: `${SITE_URL}/learn/library` }] },
    ],
  },
  {
    path: '/user-guide',
    title: 'FRELUX User Guide: How to Use Every Calculator and Feature',
    description:
      'Step by step guide to FRELUX: paint, screeding, tiling and POP ceiling calculators, AI floor plan estimation, saving estimates, PDF export, projects, pricing and regional settings.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_URL}/learn` }, { '@type': 'ListItem', position: 3, name: 'User Guide', item: `${SITE_URL}/user-guide` }] },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Do I need an account to use FRELUX calculators?', acceptedAnswer: { '@type': 'Answer', text: 'No. All calculators are free to use with no sign-up required. A free account is only needed to save projects and estimate history.' } },
          { '@type': 'Question', name: 'Can I enter measurements in feet?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Pick metres or feet before you calculate and FRELUX converts internally. Results are always shown in metric units because materials are sold that way.' } },
          { '@type': 'Question', name: 'Where do FRELUX prices come from?', acceptedAnswer: { '@type': 'Answer', text: 'Prices come from, in order of preference: a price you entered yourself, a verified market price for your region where FRELUX has one, or nothing. FRELUX tells you a price is needed instead of guessing.' } },
          { '@type': 'Question', name: 'Is FRELUX a substitute for a qualified engineer?', acceptedAnswer: { '@type': 'Answer', text: 'No. Structural, foundation and roof quantities are budgeting estimates. A qualified engineer must review and approve anything structural before you build.' } },
          { '@type': 'Question', name: 'Does the AI invent numbers?', acceptedAnswer: { '@type': 'Answer', text: 'No. The AI extracts data such as room dimensions from a floor plan image and marks its confidence. All quantities come from the same deterministic calculators, and unconfirmed values are never used.' } },
        ],
      },
    ],
  },
  {
    path: '/templates',
    title: 'Calculator Templates: FRELUX',
    description: 'Professionally curated templates for common painting, tiling, screeding, and POP ceiling projects using the FRELUX calculation engine.',
    priority: '0.6',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` }, { '@type': 'ListItem', position: 2, name: 'Templates', item: `${SITE_URL}/templates` }] },
    ],
  },
  { path: '/templates/standard-living-room-painting', title: 'Paint Calculator Template: Standard Living Room | FRELUX SMART CALC', description: 'Calculate paint needed for a standard living room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/master-bedroom-painting', title: 'Paint Calculator Template: Master Bedroom | FRELUX SMART CALC', description: 'Calculate paint needed for a master bedroom with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-accent-wall-painting', title: 'Paint Calculator Template: Single Accent Wall | FRELUX SMART CALC', description: 'Calculate paint for a single accent wall with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/exterior-bungalow-painting', title: 'Paint Calculator Template: Exterior Bungalow | FRELUX SMART CALC', description: 'Calculate paint for exterior bungalow walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-painting', title: 'Paint Calculator Template: Dining Room | FRELUX SMART CALC', description: 'Calculate paint needed for a dining room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/childrens-room-painting', title: 'Paint Calculator Template: Children\'s Room | FRELUX SMART CALC', description: 'Calculate paint needed for a children\'s room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-walls-painting', title: 'Paint Calculator Template: Kitchen Walls | FRELUX SMART CALC', description: 'Calculate paint needed for kitchen walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-stairwell-painting', title: 'Paint Calculator Template: Corridor & Stairwell | FRELUX SMART CALC', description: 'Calculate paint for corridors and stairwells with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/2-bedroom-flat-full-painting', title: 'Paint Calculator Template: 2-Bedroom Flat | FRELUX SMART CALC', description: 'Calculate paint for a complete 2-bedroom flat with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/office-space-painting', title: 'Paint Calculator Template: Office Space | FRELUX SMART CALC', description: 'Calculate paint needed for office space with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/exterior-duplex-painting', title: 'Paint Calculator Template: Exterior Duplex | FRELUX SMART CALC', description: 'Calculate paint for exterior duplex walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/shop-retail-front-painting', title: 'Paint Calculator Template: Shop / Retail Front | FRELUX SMART CALC', description: 'Calculate paint for shop and retail fronts with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-floor-tiling', title: 'Tile Calculator Template: Standard Floor Tiling | FRELUX SMART CALC', description: 'Calculate tiles, adhesive, and grout for a standard floor with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/bathroom-wall-tiling', title: 'Tile Calculator Template: Bathroom Wall Tiles | FRELUX SMART CALC', description: 'Calculate tiles for bathroom walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/large-hall-floor-tiling', title: 'Tile Calculator Template: Large Hall Floor | FRELUX SMART CALC', description: 'Calculate tiles for a large hall floor with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-backsplash-tiling', title: 'Tile Calculator Template: Kitchen Backsplash | FRELUX SMART CALC', description: 'Calculate tiles for a kitchen backsplash with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/balcony-floor-tiling', title: 'Tile Calculator Template: Balcony Floor Tiling | FRELUX SMART CALC', description: 'Calculate tiles for balcony floors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-floor-tiling', title: 'Tile Calculator Template: Kitchen Floor Tiles | FRELUX SMART CALC', description: 'Calculate tiles for kitchen floors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/guest-toilet-wall-tiling', title: 'Tile Calculator Template: Guest Toilet Wall Tiles | FRELUX SMART CALC', description: 'Calculate tiles for guest toilet walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/staircase-tiling', title: 'Tile Calculator Template: Staircase Tiling | FRELUX SMART CALC', description: 'Calculate tiles for staircases with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/terrazzo-porcelain-floor-tiling', title: 'Tile Calculator Template: Large Format Porcelain Floor | FRELUX SMART CALC', description: 'Calculate tiles for large format porcelain floors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/wall-feature-strip-tiling', title: 'Tile Calculator Template: Wall Feature Strip | FRELUX SMART CALC', description: 'Calculate tiles for decorative wall feature strips with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-room-screeding', title: 'Screeding Calculator Template: Standard Room | FRELUX SMART CALC', description: 'Calculate screeding materials for a standard room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-wall-screeding', title: 'Screeding Calculator Template: Single Wall | FRELUX SMART CALC', description: 'Calculate screeding materials for a single wall with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/living-room-ceiling-screeding', title: 'Screeding Calculator Template: Living Room + Ceiling | FRELUX SMART CALC', description: 'Calculate screeding for living room walls and ceiling with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-walls-screeding', title: 'Screeding Calculator Template: Corridor Walls | FRELUX SMART CALC', description: 'Calculate screeding materials for corridor walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-screeding', title: 'Screeding Calculator Template: Dining Room | FRELUX SMART CALC', description: 'Calculate screeding materials for a dining room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/office-screeding', title: 'Screeding Calculator Template: Office | FRELUX SMART CALC', description: 'Calculate screeding materials for office walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-screeding', title: 'Screeding Calculator Template: Corridor | FRELUX SMART CALC', description: 'Calculate screeding materials for corridors with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-feature-wall-screeding', title: 'Screeding Calculator Template: Single Feature Wall | FRELUX SMART CALC', description: 'Calculate screeding materials for a single feature wall with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/shop-front-screeding', title: 'Screeding Calculator Template: Shop Front | FRELUX SMART CALC', description: 'Calculate screeding materials for shop front walls with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-bedroom-pop-ceiling', title: 'POP Ceiling Calculator Template: Standard Bedroom | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a standard bedroom with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/large-living-room-pop-ceiling', title: 'POP Ceiling Calculator Template: Large Living Room | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a large living room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/small-office-pop-ceiling', title: 'POP Ceiling Calculator Template: Small Office | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a small office with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/hall-cornice-pop-ceiling', title: 'POP Ceiling Calculator Template: Hall Ceiling with Cornice | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a large hall with cornice with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-pop-ceiling', title: 'POP Ceiling Calculator Template: Dining Room | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a dining room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-pop-ceiling', title: 'POP Ceiling Calculator Template: Kitchen | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a kitchen with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-pop-ceiling', title: 'POP Ceiling Calculator Template: Corridor | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a corridor with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/master-bedroom-pop-ceiling', title: 'POP Ceiling Calculator Template: Master Bedroom | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a master bedroom with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/conference-room-pop-ceiling', title: 'POP Ceiling Calculator Template: Conference Room | FRELUX SMART CALC', description: 'Calculate POP ceiling materials for a large conference room with this FRELUX template.', priority: '0.5', changefreq: 'monthly' },

  // ── Construction calculators & estimators (missing from original) ──
  {
    path: '/build-to-roof-estimator',
    title: 'Build-to-Roof Estimator: Full Construction Cost | FRELUX SMART CALC',
    description: 'Estimate materials and costs for a complete build from foundation to roof. Blocks, cement, sand, granite, roofing, labour, and structural members for building projects.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Build-to-Roof Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
        { '@type': 'ListItem', position: 3, name: 'Build-to-Roof Estimator', item: `${SITE_URL}/build-to-roof-estimator` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What does the Build-to-Roof Estimator calculate?', acceptedAnswer: { '@type': 'Answer', text: 'It estimates materials and costs for a full building project from foundation through roof, including blocks, cement, sand, granite, roofing sheets, structural members, and labour based on practical construction standards.' } },
        { '@type': 'Question', name: 'Can I estimate costs for different building types?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The estimator supports bungalows, duplexes, and multi-storey buildings with configurable foundation types, wall heights, and roofing materials.' } },
      ]},
    ],
  },
  {
    path: '/image-estimator',
    title: 'AI Photo Estimator: Estimate from a Photo | FRELUX SMART CALC',
    description: 'Upload a photo of your construction site, room, or building and get an AI-powered material and cost estimate. Visual estimation for painting, tiling, and construction projects.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX AI Photo Estimator', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
        { '@type': 'ListItem', position: 3, name: 'AI Photo Estimator', item: `${SITE_URL}/image-estimator` },
      ]},
    ],
  },
  {
    path: '/smart-calculator',
    title: 'Smart Calculator: AI-Powered Construction Estimator | FRELUX SMART CALC',
    description: 'Describe any construction project in plain language and get an AI-powered cost estimate with material quantities, line items, and savings recommendations.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Smart Calculator', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
        { '@type': 'ListItem', position: 3, name: 'Smart Calculator', item: `${SITE_URL}/smart-calculator` },
      ]},
    ],
  },
  {
    path: '/structural-calculator',
    title: 'Structural Calculator: Beams, Columns & Slabs | FRELUX SMART CALC',
    description: 'Calculate structural member sizes for building projects. Beam dimensions, column sizing, slab thickness, and reinforcement estimates.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Structural Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
        { '@type': 'ListItem', position: 3, name: 'Structural Calculator', item: `${SITE_URL}/structural-calculator` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What does the Structural Calculator compute?', acceptedAnswer: { '@type': 'Answer', text: 'It calculates beam depths and widths, column cross-sections, slab thickness, and reinforcement quantities based on span, loading, and standard concrete mix practice.' } },
      ]},
    ],
  },
  {
    path: '/foundation-calculator',
    title: 'Foundation Calculator: Sizing & Materials | FRELUX SMART CALC',
    description: 'Calculate foundation sizes and materials for building projects. Strip footing, pad foundation, and raft foundation estimates with soil bearing capacity guidance.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Foundation Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
        { '@type': 'ListItem', position: 3, name: 'Foundation Calculator', item: `${SITE_URL}/foundation-calculator` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What foundation types does the calculator support?', acceptedAnswer: { '@type': 'Answer', text: 'The Foundation Calculator supports strip footings, pad foundations, and raft foundations with typical soil bearing capacities for preliminary sizing and budgeting.' } },
        { '@type': 'Question', name: 'Do I need a soil test before using the foundation calculator?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. A geotechnical investigation is mandatory for actual foundation design. The calculator uses typical soil bearing capacities for preliminary sizing only.' } },
      ]},
    ],
  },
  {
    path: '/construction-sequence',
    title: 'Construction Sequence Planner | FRELUX SMART CALC',
    description: 'Plan your building project step by step. From site clearance to finishing, get a construction timeline with material and labour requirements for each phase.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Construction Sequence Planner', applicationCategory: 'ProjectManagementApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
        { '@type': 'ListItem', position: 3, name: 'Construction Sequence', item: `${SITE_URL}/construction-sequence` },
      ]},
    ],
  },
  {
    path: '/project-timeline',
    title: 'Project Timeline Builder | FRELUX SMART CALC',
    description: 'Create a construction project timeline with phases, milestones, and material schedules. Track progress from foundation to finishing.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Project Timeline', applicationCategory: 'ProjectManagementApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
        { '@type': 'ListItem', position: 3, name: 'Project Timeline', item: `${SITE_URL}/project-timeline` },
      ]},
    ],
  },
  {
    path: '/pricing',
    title: 'Pricing & Plans | FRELUX SMART CALC',
    description: 'Compare FRELUX plans. Free calculators, Pro features for professionals, and enterprise options for construction firms.',
    priority: '0.6',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${SITE_URL}/pricing` },
      ]},
    ],
  },
  {
    path: '/marketplace',
    title: 'Construction Marketplace: Buy & Sell Building Materials | FRELUX SMART CALC',
    description: 'Browse construction materials, tools, and services from suppliers across supported markets. Find paints, tiles, cement, tools, and professional services near you.',
    priority: '0.8',
    changefreq: 'daily',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'FRELUX Construction Marketplace', description: 'Buy and sell construction materials, tools, and services across supported markets.' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${SITE_URL}/marketplace` },
      ]},
    ],
  },
  {
    path: '/pro-connect',
    title: 'Pro Connect: Find Verified Construction Professionals | FRELUX SMART CALC',
    description: 'Connect with verified painters, tilers, screeders, POP ceiling specialists, and builders across supported markets. Browse profiles, compare services, and hire professionals.',
    priority: '0.8',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'FRELUX Pro Connect Directory', description: 'Find verified construction professionals near you.' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
        { '@type': 'ListItem', position: 2, name: 'Pro Connect', item: `${SITE_URL}/pro-connect` },
      ]},
    ],
  },
  {
    path: '/calculators',
    title: 'All Calculators & Estimators | FRELUX SMART CALC',
    description: 'Browse every FRELUX calculator and estimator: paint, screeding, POP ceiling, tiles, tyrolene, finishing, structural, foundation, build-to-roof, and cost estimators. Free construction material calculators.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'FRELUX Calculators & Estimators',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Build-to-Roof Estimator', url: `${SITE_URL}/build-to-roof-estimator` },
          { '@type': 'ListItem', position: 2, name: 'Paint Calculator', url: `${SITE_URL}/paint-calculator` },
          { '@type': 'ListItem', position: 3, name: 'Painting Estimator', url: `${SITE_URL}/painting-estimator` },
          { '@type': 'ListItem', position: 4, name: 'Screeding Calculator', url: `${SITE_URL}/screeding-calculator` },
          { '@type': 'ListItem', position: 5, name: 'POP Ceiling Calculator', url: `${SITE_URL}/pop-ceiling-calculator` },
          { '@type': 'ListItem', position: 6, name: 'Tile Calculator', url: `${SITE_URL}/tile-calculator` },
          { '@type': 'ListItem', position: 7, name: 'Structural Calculator', url: `${SITE_URL}/structural-calculator` },
          { '@type': 'ListItem', position: 8, name: 'Foundation Calculator', url: `${SITE_URL}/foundation-calculator` },
          { '@type': 'ListItem', position: 9, name: 'AI Photo Estimator', url: `${SITE_URL}/image-estimator` },
          { '@type': 'ListItem', position: 10, name: 'Finish Estimator', url: `${SITE_URL}/finish-estimator` },
          { '@type': 'ListItem', position: 11, name: 'Tyrolene Estimator', url: `${SITE_URL}/tyrolene-estimator` },
          { '@type': 'ListItem', position: 12, name: 'Cost Estimator', url: `${SITE_URL}/cost-estimator` },
          { '@type': 'ListItem', position: 13, name: 'Screeding Cost Estimator', url: `${SITE_URL}/screeding-cost-estimator` },
          { '@type': 'ListItem', position: 14, name: 'POP Ceiling Cost Estimator', url: `${SITE_URL}/pop-ceiling-cost-estimator` },
          { '@type': 'ListItem', position: 15, name: 'Tile Cost Estimator', url: `${SITE_URL}/tile-cost-estimator` },
        ],
      },
    ],
  },

  // ── About / Contact / Legal ──
  {
    path: '/about',
    title: 'About FRELUX SMART CALC',
    description: 'Learn about FRELUX, a global construction intelligence and project estimation platform helping homeowners, decorators, and construction professionals across international markets plan projects with confidence.',
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    path: '/contact',
    title: 'Contact FRELUX SMART CALC',
    description: 'Get in touch with the FRELUX team. Send us your questions, feedback, or partnership inquiries.',
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy: FRELUX SMART CALC',
    description: 'How FRELUX SMART CALC handles your information when you use our website and tools.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/terms',
    title: 'Terms of Service: FRELUX SMART CALC',
    description: 'Terms of service for using FRELUX SMART CALC tools and website.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/cookie-policy',
    title: 'Cookie Policy: FRELUX SMART CALC',
    description: 'How FRELUX SMART CALC uses cookies and how they improve your experience.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer: FRELUX SMART CALC',
    description: 'Disclaimer for FRELUX SMART CALC tools and estimates. All calculations and estimates are for guidance only.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/bim-ifc-import',
    title: 'BIM IFC Import | FRELUX SMART CALC',
    description:
      'Import IFC building models and generate material quantities and cost estimates from your BIM data.',
  },
  {
    path: '/boq-generator',
    title: 'BOQ Generator | FRELUX SMART CALC',
    description:
      'Generate a professional bill of quantities from your FRELUX estimates.',
  },
  {
    path: '/brand-studio',
    title: 'FRELUX Brand Studio | FRELUX SMART CALC',
    description:
      'FRELUX brand assets, usage guidance, and design resources for partners and contributors.',
  },
  {
    path: '/carbon-footprint',
    title: 'Carbon Footprint Calculator | FRELUX SMART CALC',
    description:
      'Estimate the embodied carbon of your construction materials and compare choices.',
  },
  {
    path: '/cash-flow-timeline',
    title: 'Cash Flow Timeline | FRELUX SMART CALC',
    description:
      'Map project payments against construction milestones to see when money is needed.',
  },
  {
    path: '/circular-reuse',
    title: 'Circular Reuse Planner | FRELUX SMART CALC',
    description:
      'Plan material reuse across projects to cut cost and construction waste.',
  },
  {
    path: '/construction-tools',
    title: 'All Construction Tools and Calculators | FRELUX SMART CALC',
    description:
      'Browse every FRELUX construction calculator, cost estimator, and property intelligence tool in one directory. Free, no sign-up required.',
  },
  {
    path: '/tools/finishes',
    title: 'Materials and Finishes Tools | FRELUX SMART CALC',
    description: 'Browse FRELUX calculators and estimators for paint, screeding, tiling, flooring, waterproofing, and ceiling finishes.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/tools/structure',
    title: 'Building Structure Tools | FRELUX SMART CALC',
    description: 'Browse FRELUX tools for building structure, concrete, foundations, reinforcement, and build-to-roof planning.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/tools/services',
    title: 'Building Services Tools | FRELUX SMART CALC',
    description: 'Browse FRELUX electrical, plumbing, solar, backup power, and indoor comfort tools.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/tools/components',
    title: 'Building Components Tools | FRELUX SMART CALC',
    description: 'Browse FRELUX tools for doors, windows, and configurable building components.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/tools/project',
    title: 'Project and Cost Tools | FRELUX SMART CALC',
    description: 'Browse FRELUX project and cost tools for budgets, bills of quantities, labour, timelines, and cost planning.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    path: '/tools/ai',
    title: 'AI Construction Tools | FRELUX SMART CALC',
    description: 'Browse FRELUX photo, chat, and vision assistants for construction estimation and planning.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/tools/pro',
    title: 'Pro and Field Tools | FRELUX SMART CALC',
    description: 'Browse FRELUX tools for construction professionals working with plans, projects, and on-site data.',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    path: '/contractor-credit',
    title: 'Contractor Credit | FRELUX SMART CALC',
    description:
      'Explore credit options for contractors and material financing for your projects.',
  },
  {
    path: '/conversational-estimator',
    title: 'Conversational Estimator | FRELUX SMART CALC',
    description:
      'Describe your project in plain language and get a structured material and cost estimate you can refine.',
  },
  {
    path: '/count-vision',
    title: 'Count Vision | FRELUX SMART CALC',
    description:
      'Count construction objects such as blocks, bags, and tiles from a photo using AI vision, then feed the numbers into estimates.',
  },
  {
    path: '/credits',
    title: 'FRELUX Credits | FRELUX SMART CALC',
    description:
      'Buy AI credits and token packs to power FRELUX AI features. Check balances and purchase history.',
  },
  {
    path: '/data-request',
    title: 'Data Subject Request | FRELUX SMART CALC',
    description:
      'Request a copy of your FRELUX account data or ask us to delete it. We verify your identity and respond within statutory timeframes.',
  },
  {
    path: '/defect-diagnosis',
    title: 'Defect Diagnosis | FRELUX SMART CALC',
    description:
      'Diagnose common construction defects, understand causes, and get remediation guidance.',
  },
  {
    path: '/developers',
    title: 'FRELUX Developer Resources | FRELUX SMART CALC',
    description:
      'FRELUX APIs, integration guides, and developer documentation.',
  },
  {
    path: '/global-markets',
    title: 'Construction Markets and Regional Standards | FRELUX SMART CALC',
    description:
      'Browse every market FRELUX supports: local block and cement standards, electrical and plumbing practice, currencies, and the calculators preconfigured for each country.',
  },
  {
    path: '/doors-windows',
    title: 'Doors and Windows Estimator | FRELUX SMART CALC',
    description:
      'Estimate door and window quantities, hardware, and installation labour.',
  },
  {
    path: '/electrical',
    title: 'Electrical Estimator | FRELUX SMART CALC',
    description:
      'Estimate electrical materials, wiring, fittings, and labour for residential and commercial projects.',
  },
  {
    path: '/estimate-refresh',
    title: 'Estimate Refresh | FRELUX SMART CALC',
    description:
      'Reprice saved estimates with current market prices so old numbers stay useful.',
  },
  {
    path: '/feedback',
    title: 'Send Feedback to FRELUX | FRELUX SMART CALC',
    description:
      'Share feedback on FRELUX calculators, estimators, and the website. Tell us what to improve.',
  },
  {
    path: '/field-sync',
    title: 'Field Sync | FRELUX SMART CALC',
    description:
      'Sync project measurements and estimates between the office and the construction site.',
  },
  {
    path: '/flooring',
    title: 'Flooring Estimator | FRELUX SMART CALC',
    description:
      'Estimate flooring materials, quantities, and labour for any room or building.',
  },
  {
    path: '/foundation',
    title: 'Foundation Estimator | FRELUX SMART CALC',
    description:
      'Estimate foundation materials and cost from footings to ground slab, with engineer referral for structural sizing.',
  },
  {
    path: '/generator',
    title: 'Generator Estimator | FRELUX SMART CALC',
    description:
      'Size a generator for your load profile and estimate purchase and installation cost.',
  },
  {
    path: '/heat-comfort',
    title: 'Heat and Comfort Analyser | FRELUX SMART CALC',
    description:
      'Analyse indoor heat comfort for your building design and material choices.',
  },
  {
    path: '/labour-estimator',
    title: 'Labour Estimator | FRELUX SMART CALC',
    description:
      'Estimate labour costs by trade and task with configurable rates for your market.',
  },
  {
    path: '/maintenance-planner',
    title: 'Maintenance Planner | FRELUX SMART CALC',
    description:
      'Plan building maintenance schedules with cost estimates for each task.',
  },
  {
    path: '/concrete-takeoff-calculator',
    title: 'Concrete Slab Takeoff | FRELUX SMART CALC',
    description: 'Estimate concrete slab quantities from measured dimensions, a specified mix ratio and an optional engineer-provided rebar schedule.',
  },
  {
    path: '/margin-calculator',
    title: 'Margin Calculator | FRELUX SMART CALC',
    description:
      'Calculate profit margins on construction quotes with material, labour, and overhead inputs.',
  },
  {
    path: '/plumbing',
    title: 'Plumbing Estimator | FRELUX SMART CALC',
    description:
      'Estimate plumbing materials, pipes, fittings, and labour for residential and commercial projects.',
  },
  {
    path: '/regional-cost-index',
    title: 'Regional Cost Index | FRELUX SMART CALC',
    description:
      'Compare construction costs across regions with the FRELUX regional cost index.',
  },
  {
    path: '/reinforcement',
    title: 'Reinforcement Estimator | FRELUX SMART CALC',
    description:
      'Estimate reinforcement bars, mesh, and accessories for slabs, beams, columns, and foundations.',
  },
  {
    path: '/partners',
    title: 'Partner with FRELUX | FRELUX SMART CALC',
    description:
      'Partner with FRELUX to bring construction intelligence to your audience, products, or professional network.',
  },
  {
    path: '/rewards',
    title: 'FRELUX Rewards | FRELUX SMART CALC',
    description:
      'Earn FRELUX credits through rewards, referrals, and community contributions.',
  },
  {
    path: '/solar-pv-estimator',
    title: 'Solar PV Estimator | FRELUX SMART CALC',
    description:
      'Size a solar power system, get the bill of materials, and estimate installation cost for your market.',
  },
  {
    path: '/masonry-calculator',
    title: 'Masonry & Blockwork Calculator | FRELUX SMART CALC',
    description: 'Estimate masonry units and mortar quantities from wall measurements.',
  },
  {
    path: '/plastering-calculator',
    title: 'Plastering & Rendering Calculator | FRELUX SMART CALC',
    description: 'Estimate plaster and render material quantities from surface area and thickness.',
  },
  {
    path: '/drywall-calculator',
    title: 'Drywall & Partition Calculator | FRELUX SMART CALC',
    description: 'Estimate drywall boards, framing and jointing material quantities.',
  },
  {
    path: '/paving-calculator',
    title: 'Paving Takeoff Calculator | FRELUX SMART CALC',
    description: 'Estimate pavers, bedding and sub-base quantities for external works.',
  },
  {
    path: '/drainage-calculator',
    title: 'External Drainage Takeoff | FRELUX SMART CALC',
    description: 'Estimate drainage pipe, trench and bedding quantities; not a hydraulic design.',
  },
  {
    path: '/septic-sizing-calculator',
    title: 'Septic & Soakaway Worksheet | FRELUX SMART CALC',
    description: 'Estimate preliminary tank volume and soakaway area from locally approved, user-entered design criteria.',
  },
  {
    path: '/temporary-works-calculator',
    title: 'Formwork & Temporary Works Calculator | FRELUX SMART CALC',
    description: 'Estimate form contact area and simplified temporary works quantities; not a design.',
  },
  {
    path: '/insulation-calculator',
    title: 'Insulation Takeoff Calculator | FRELUX SMART CALC',
    description: 'Estimate insulation product quantities by area, thickness and coverage.',
  },
  {
    path: '/demolition-calculator',
    title: 'Demolition & Debris Takeoff | FRELUX SMART CALC',
    description: 'Estimate demolition debris volumes and indicative skip loads.',
  },
  {
    path: '/blueprint-takeoff',
    title: 'Blueprint & PDF Plan Takeoff | FRELUX SMART CALC',
    description: 'Calibrate a plan drawing and measure linear, area and counted quantities.',
  },
  {
    path: '/wall-finish-estimator',
    title: 'Wall Finish Estimator | FRELUX SMART CALC',
    description:
      'Estimate modern wall finish systems including mineral stone and stucco with layers, labour, and quality control.',
  },
  {
    path: '/warranty-certificate',
    title: 'Warranty Certificate | FRELUX SMART CALC',
    description:
      'Generate a professional warranty certificate for completed construction work.',
  },
  {
    path: '/waterproofing',
    title: 'Waterproofing Estimator | FRELUX SMART CALC',
    description:
      'Estimate waterproofing materials for roofs, walls, wet areas, and foundations.',
  },
  {
    path: '/ai-disclaimer',
    title: 'AI Disclaimer: FRELUX SMART CALC',
    description: 'Disclaimer for AI-powered features in FRELUX SMART CALC.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    path: '/earthworks-cut-fill',
    title: 'Earthworks Cut & Fill Calculator | FRELUX SMART CALC',
    description:
      'Calculate cut, fill and haul quantities from surveyed or designed cross-sections using the average-end-area method.',
  },
  {
    path: '/roof-framing-calculator',
    title: 'Roof Framing & Board Feet Calculator | FRELUX SMART CALC',
    description:
      'Calculate timber quantities, member counts, lengths, linear metres and board feet for regular gable and hip roofs.',
  },
  {
    path: '/increte-flooring-calculator',
    title: 'Increte Flooring Calculator & Estimator | FRELUX SMART CALC',
    description:
      'Estimate decorative concrete flooring quantities using explicit product coverage, coats, waste, local prices and installation inputs.',
  },
  {
    path: '/visual-finishing-estimator',
    title: 'Visual Finishing Estimator | FRELUX Global Visual Construction Intelligence',
    description:
      'Estimate painting, screeding, tiling, POP ceilings, and flooring directly from room and surface photographs with verified metric calibration.',
  },
  {
    path: '/tools/visual-finishing-estimator',
    title: 'Visual Finishing Estimator | FRELUX Global Visual Construction Intelligence',
    description:
      'Estimate painting, screeding, tiling, POP ceilings, and flooring directly from room and surface photographs with verified metric calibration.',
  },
];

// Locales whose reviewed translations are live. A locale page is only
// indexable when a published content_translations row exists for it; every
// other locale page is emitted as a noindex stub pointing at the English
// canonical. Keep in sync with src/lib/translation-index.ts.
// Mirrors INDEXABLE_LOCALES in src/lib/translation-index.ts. Raising this list
// alone does nothing yet: the loop below only emits locale pages for translated
// learn articles. Locale route emission has to exist before a locale goes live.
const INDEXABLE_LOCALES = ['es'];

// ── Learn section: dynamic article + category pages from Supabase ───
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Convert article markdown into safe static HTML for prerendered routes.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function mdInline(s) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return out;
}
function markdownToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  let listType = null; // 'ul' | 'ol'
  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      closeList();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(escapeHtml(lines[i])); i++; }
      i++;
      out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${mdInline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    if (ul) {
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${mdInline(ul[1])}</li>`);
      i++;
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ol) {
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${mdInline(ol[1])}</li>`);
      i++;
      continue;
    }
    if (trimmed === '') {
      closeList();
      i++;
      continue;
    }
    // Table rows: render as a simple definition list (pipes are rare in prose)
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map((c) => c.trim()).filter((c) => c && !/^[\-: ]+$/.test(c));
      if (cells.length) {
        if (!out.length || !out[out.length - 1].startsWith('<table>')) {
          closeList();
          out.push('<table>');
        }
        out.push(`<tr>${cells.map((c) => `<td>${mdInline(c)}</td>`).join('')}</tr>`);
        i++;
        continue;
      }
    }
    if (out.length && out[out.length - 1].startsWith('<table>')) {
      out.push('</table>');
    }
    closeList();
    out.push(`<p>${mdInline(trimmed)}</p>`);
    i++;
  }
  if (out.length && out[out.length - 1].startsWith('<table>')) out.push('</table>');
  closeList();
  return out.join('\n');
}


// On Netlify builds, a failed Supabase fetch must fail the build: without
// prerendered article pages every /learn/<slug> URL serves a duplicate
// of the home page, which Google and AdSense both read as low-value
// content. Local dev (no env / no NETLIFY) keeps the skip.
const failBuildIfNetlify = (reason) => {
  if (process.env.NETLIFY) {
    console.error(`\n ❌ ${reason} — failing the build so article pages cannot silently vanish.\n`);
    process.exit(1);
  }
  console.log(`  ⚠️  ${reason} — skipping dynamic Learn pages (local dev)`);
};

async function fetchLearnPages() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    failBuildIfNetlify('Supabase env vars missing — dynamic Learn article pages skipped');
    return { routes: [], content: {} };
  }
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const learnRoutes = [];
  const learnContent = {};
  try {
    const [catRes, artRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/learn_categories?select=slug,name,description,is_active&is_active=eq.true&order=sort_order.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/learn_articles?select=slug,title,excerpt,content,meta_title,meta_description,category_slug,author,read_time_minutes,cover_image_url,published_at,updated_at,wall_market_code&status=eq.published&order=published_at.desc&limit=200`, { headers }),
    ]);

    if (catRes.ok && artRes.ok) {
      const cats = await catRes.json();
      const arts = await artRes.json();

      // Reviewed translations: the ONLY source of indexable locale pages.
      let translations = [];
      try {
        const trRes = await fetch(
          `${SUPABASE_URL}/rest/v1/content_translations?select=content_type,content_key,locale,title,description,body_md&status=eq.published&content_type=eq.article`,
          { headers },
        );
        if (trRes.ok) translations = await trRes.json();
      } catch {
        // Never fail a build over translations: English pages still ship, and
        // unpreviewed locales simply stay noindex.
        translations = [];
      }
      const trByLocaleKey = new Map(
        translations.map((t) => [`${t.locale}:${t.content_key}`, t]),
      );
      const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

      // Category pages — /learn/category/{slug}
      for (const c of cats) {
        const catArts = arts.filter((a) => a.category_slug === c.slug);
        learnRoutes.push({
          path: `/learn/category/${c.slug}`,
          title: `${c.name} Guides | FRELUX Learn`,
          description: (c.description || `Guides and articles about ${c.name.toLowerCase()} from the FRELUX Learn hub.`).slice(0, 160),
          priority: '0.6',
          changefreq: 'weekly',
          structuredData: [
            { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_URL}/learn` },
              { '@type': 'ListItem', position: 3, name: c.name, item: `${SITE_URL}/learn/category/${c.slug}` },
            ] },
            { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${c.name} | FRELUX Learn`, description: (c.description || '').slice(0, 300), url: `${SITE_URL}/learn/category/${c.slug}` },
          ],
        });
        const listing = catArts
          .map((a) => `<li><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a>${a.excerpt ? `: ${escapeHtml(a.excerpt.slice(0, 140))}` : ''}</li>`)
          .join('');
        learnContent[`/learn/category/${c.slug}`] = `<h1>${escapeHtml(c.name)} Guides</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a> &rsaquo; ${escapeHtml(c.name)}</nav>${c.description ? `<p>${escapeHtml(c.description)}</p>` : ''}${listing ? `<h2>Articles in this category</h2><ul>${listing}</ul>` : '<p>New guides are coming soon to this category.</p>'}`;
      }

      // Article pages — /learn/{slug}
      for (const a of arts) {
        const cat = catBySlug[a.category_slug];
        const desc = (a.meta_description || a.excerpt || a.title).slice(0, 160);
        const datePublished = (a.published_at || a.updated_at || '').split('T')[0];
        const dateModified = (a.updated_at || a.published_at || '').split('T')[0];
        // Wall-finishing articles are canonical on their market path
        // (src/pages/learn/WallFinishingArticle.tsx). Writing them at
        // /learn/<slug> would leave the sitemap URL serving an SPA shell.
        const articlePath = a.wall_market_code
          ? `/learn/wall-finishing/${String(a.wall_market_code).toLowerCase()}/${a.slug}`
          : `/learn/${a.slug}`;
        learnRoutes.push({
          path: articlePath,
          title: (a.meta_title || `${a.title} | FRELUX Learn`).slice(0, 100),
          description: desc,
          priority: '0.7',
          changefreq: 'monthly',
          structuredData: [
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: a.title.slice(0, 110),
              description: desc,
              image: a.cover_image_url || ogImage,
              author: { '@type': 'Organization', name: 'FRELUX' },
              publisher: { '@type': 'Organization', name: 'FRELUX', logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon-32.png` } },
              datePublished,
              dateModified,
              mainEntityOfPage: `${SITE_URL}${articlePath}`,
            },
            { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_URL}/learn` },
              ...(cat ? [{ '@type': 'ListItem', position: 3, name: cat.name, item: `${SITE_URL}/learn/category/${cat.slug}` }] : []),
              { '@type': 'ListItem', position: cat ? 4 : 3, name: a.title, item: `${SITE_URL}${articlePath}` },
            ] },
          ],
        });
        const altLocales = INDEXABLE_LOCALES.filter((l) =>
          trByLocaleKey.has(`${l}:${a.slug}`),
        );
        if (altLocales.length) {
          learnRoutes[learnRoutes.length - 1].alternates = [
            { hreflang: 'x-default', href: `${SITE_URL}${articlePath}/` },
            { hreflang: 'en', href: `${SITE_URL}${articlePath}/` },
            ...altLocales.map((l) => ({
              hreflang: l,
              href: `${SITE_URL}/${l}${articlePath}/`,
            })),
          ];
        }

        // One localized page per launched locale. A published translation is
        // indexable in its own language; without one the page still works for
        // readers (same English body) but stays noindex and canonical to the
        // English URL, so it can never compete with it.
        for (const locale of INDEXABLE_LOCALES) {
          const t = trByLocaleKey.get(`${locale}:${a.slug}`);
          const altSet = t
            ? [
                { hreflang: 'x-default', href: `${SITE_URL}${articlePath}/` },
                { hreflang: 'en', href: `${SITE_URL}${articlePath}/` },
                ...INDEXABLE_LOCALES.filter((l) =>
                  trByLocaleKey.has(`${l}:${a.slug}`),
                ).map((l) => ({
                  hreflang: l,
                  href: `${SITE_URL}/${l}${articlePath}/`,
                })),
              ]
            : undefined;
          learnRoutes.push({
            path: `/${locale}${articlePath}`,
            title: ((t && t.title) || a.meta_title || a.title).slice(0, 100),
            description: ((t && t.description) || desc).slice(0, 160),
            priority: '0.5',
            changefreq: 'monthly',
            lang: locale,
            robots: t
              ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
              : 'noindex, follow',
            alternates: altSet,
            canonical: t ? undefined : `${SITE_URL}${articlePath}/`,
            structuredData: t
              ? [
                  {
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: t.title.slice(0, 110),
                    description: ((t.description || desc) || '').slice(0, 300),
                    image: a.cover_image_url || ogImage,
                    inLanguage: locale,
                    author: { '@type': 'Organization', name: 'FRELUX' },
                    publisher: { '@type': 'Organization', name: 'FRELUX' },
                    datePublished: (t.published_at || a.published_at || '').split('T')[0],
                    dateModified: (a.updated_at || a.published_at || '').split('T')[0],
                    mainEntityOfPage: `${SITE_URL}/${locale}/learn/${a.slug}`,
                  },
                ]
              : undefined,
          });
          const localizedBody = t && t.body_md ? t.body_md : a.content || '';
          learnContent[`/${locale}/learn/${a.slug}`] =
            `<div lang="${locale}"><h1>${escapeHtml((t && t.title) || a.title)}</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a> &rsaquo; ${escapeHtml((t && t.title) || a.title)}</nav>${markdownToHtml(localizedBody)}</div>`;
        }

        const bodyHtml = markdownToHtml(a.content || '');
        learnContent[`/learn/${a.slug}`] = `<h1>${escapeHtml(a.title)}</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a>${cat ? ` &rsaquo; <a href="/learn/category/${cat.slug}">${escapeHtml(cat.name)}</a>` : ''} &rsaquo; ${escapeHtml(a.title)}</nav>${bodyHtml}`;
      }
      console.log(`  ✅ Learn: ${learnRoutes.length} dynamic pages (${arts.length} articles, ${cats.length} categories)`);
    } else {
      failBuildIfNetlify(`Learn fetch failed (${catRes.status}/${artRes.status})`);
    }
  } catch (err) {
    failBuildIfNetlify(`Learn fetch failed (${err.message})`);
  }
  // Wall-finishing market hubs: the library page each market's articles
  // belong to (/learn/wall-finishing/<market>).
  const wallMarketCodes = [...new Set(arts.filter((a) => a.wall_market_code).map((a) => String(a.wall_market_code).toLowerCase()))];
  for (const code of wallMarketCodes) {
    const country = marketLandingRoutes.find((mm) => mm.code.toLowerCase() === code)?.countryName || code.toUpperCase();
    const path = `/learn/wall-finishing/${code}`;
    const marketArts = arts.filter((a) => String(a.wall_market_code || '').toLowerCase() === code);
    learnRoutes.push({
      path,
      title: `Wall Finishing Guides for ${country} | FRELUX Learn`,
      description: `Wall finishing library for ${country}: paint, screeding, POP ceiling and tiling guides written against ${country} materials, units and standards.`,
      priority: '0.6',
      changefreq: 'weekly',
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Wall Finishing Guides for ${country}`, url: `${SITE_URL}${path}` },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_URL}/learn` },
          { '@type': 'ListItem', position: 3, name: country, item: `${SITE_URL}${path}` },
        ]},
      ],
    });
    const listing = marketArts
      .map((a) => `<li><a href="${path}/${a.slug}">${escapeHtml(a.title)}</a>${a.excerpt ? `: ${escapeHtml(a.excerpt.slice(0, 140))}` : ''}</li>`)
      .join('');
    learnContent[path] = `<h1>Wall Finishing Guides for ${escapeHtml(country)}</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a> &rsaquo; ${escapeHtml(country)}</nav><ul>${listing}</ul>`;
  }

  return { routes: learnRoutes, content: learnContent };
}

const { routes: learnDynamicRoutes, content: learnDynamicContent } = await fetchLearnPages();
routes.push(...learnDynamicRoutes);
const contentMap = { ...seoContentMap, ...learnDynamicContent };

// Route content goes into #root for crawlers. React replaces it on mount, but
// until then it renders as bare HTML (no utility classes), which showed up as a
// flash of raw text on every reload. The shield is a plain-CSS branded cover
// that keeps that markup out of sight while the app boots, and lifts by itself
// after a few seconds so non-JavaScript visitors still reach the content.
const prerenderShell = (inner) =>
  `<div class="frelux-prerender"><div class="frelux-prerender__shield" aria-hidden="true">` +
  `<span class="frelux-prerender__mark">FRELUX SMART CALC</span>` +
  `<span class="frelux-prerender__bar"></span></div>${inner}</div>`;


// ── Prerender ──────────────────────────────────────────────────────
const templatePath = join(distDir, 'index.html');
if (!existsSync(templatePath)) {
  console.error('❌ dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

let templateHtml = readFileSync(templatePath, 'utf-8');
// Remove the old generic no-JavaScript fallback; route content is injected into #root.
templateHtml = templateHtml.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
// Normalize URLs inside the template's own static JSON-LD blocks (index.html
// carries a hand-written structured-data block whose URLs must follow the
// same trailing-slash + non-redirect rules as the per-route data above).
templateHtml = templateHtml.replace(
  /(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,
  (m, open, body, close) => open + normalizeSdUrls(body) + close
);
let count = 0;

// ── Market × template pages (32 markets × curated templates) ────────
// Mirrors src/lib/templates-market.ts: every market gets a template hub and
// one page per curated template, each with its own canonical and hreflang
// family. These are prerendered so Google receives real HTML, not an SPA shell.
for (const m of marketLandingRoutes) {
  const hubPath = `/market/${m.code.toLowerCase()}/templates`;
  routes.push({
    path: hubPath,
    alternates: [
      { hreflang: 'x-default', href: `${SITE_URL}/templates/` },
      ...marketLandingRoutes.map((mm) => ({
        hreflang: mm.code.toLowerCase(),
        href: `${SITE_URL}/market/${mm.code.toLowerCase()}/templates/`,
      })),
    ],
    title: `Construction Estimate Templates for ${m.countryName} | FRELUX SMART CALC`,
    description: `Pre-configured paint, screeding, POP ceiling and tile estimate templates for ${m.countryName}. Dimensions in market units and costs in ${m.currency} (${m.currencySymbol}) from live local material prices.`,
    priority: '0.7',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Estimate templates for ${m.countryName}`, url: `${SITE_URL}${hubPath}` },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: m.countryName, item: `${SITE_URL}/market/${m.code.toLowerCase()}` },
        { '@type': 'ListItem', position: 3, name: 'Templates', item: `${SITE_URL}${hubPath}` },
      ]},
    ],
  });
  for (const t of TEMPLATE_CATALOG) {
    const path = `${hubPath}/${t.slug}`;
    routes.push({
      path,
      alternates: [
        { hreflang: 'x-default', href: `${SITE_URL}/templates/${t.slug}/` },
        ...marketLandingRoutes.map((mm) => ({
          hreflang: mm.code.toLowerCase(),
          href: `${SITE_URL}/market/${mm.code.toLowerCase()}/templates/${t.slug}/`,
        })),
      ],
      title: `${t.name} Template for ${m.countryName} (${m.currency}) | FRELUX SMART CALC`,
      description: `Run the ${t.name} template in ${m.countryName}: quantities in market units and costs in ${m.currency} (${m.currencySymbol}), priced from live ${m.countryName} material prices. ${t.seoDescription || t.description || ''}`.trim(),
      priority: '0.6',
      changefreq: 'monthly',
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'TechArticle', headline: `${t.name} (${m.countryName})`, author: { '@type': 'Organization', name: 'FRELUX' }, publisher: { '@type': 'Organization', name: 'FRELUX' }, url: `${SITE_URL}${path}` },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: m.countryName, item: `${SITE_URL}/market/${m.code.toLowerCase()}` },
          { '@type': 'ListItem', position: 3, name: 'Templates', item: `${SITE_URL}${hubPath}` },
          { '@type': 'ListItem', position: 4, name: t.name, item: `${SITE_URL}${path}` },
        ]},
      ],
    });
  }
}

// ── Market landing pages (Phase 3 globalization, 2026-10-27) ────────
// One data-addressable SEO lander per market, built from the same
// bundle data the calculators use. Canonical English URLs; locale
// variants serve translated UI through the /<lang>/ prefix routing.
for (const m of marketLandingRoutes) {
  const path = `/market/${m.code.toLowerCase()}`;
  routes.push({
    path,
    title: `Construction Calculator for ${m.countryName} | FRELUX SMART CALC`,
    description: `Free construction calculators preconfigured for ${m.countryName}: ${m.blockName} (${m.blockLengthMm}x${m.blockHeightMm}x${m.blockWidthMm}mm), ${m.cementBagKg}kg cement bags, electrical practice per ${m.electricalStandard}, plumbing per ${m.plumbingStandard}. Prices in ${m.currency} (${m.currencySymbol}).`,
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: `FRELUX Construction Calculator (${m.countryName})`, applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: m.currency } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: m.countryName, item: `${SITE_URL}${path}` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: `What is the standard wall block size in ${m.countryName}?`, acceptedAnswer: { '@type': 'Answer', text: `The default wall unit in the FRELUX ${m.countryName} market profile is the ${m.blockName}, ${m.blockLengthMm} x ${m.blockHeightMm} x ${m.blockWidthMm} mm. The calculators use this size for block and mortar quantities; always confirm the actual unit with your supplier.` } },
        { '@type': 'Question', name: `What electrical standards does FRELUX use for ${m.countryName}?`, acceptedAnswer: { '@type': 'Answer', text: `Electrical quantity takeoffs for ${m.countryName} follow ${m.electricalStandard} at ${m.electricalVoltage}. FRELUX produces material takeoffs, not certified electrical designs - consult a licensed local electrician.` } },
      ]},
    ],
  });
}


// Reciprocal hreflang: the global template page declares its 32 market
// variants so the family is discoverable from either direction.
for (const route of routes) {
  const m = /^\/templates\/([^/]+)$/.exec(route.path);
  if (!m || route.alternates) continue;
  route.alternates = [
    { hreflang: 'x-default', href: `${SITE_URL}${route.path}/` },
    ...marketLandingRoutes.map((mm) => ({
      hreflang: mm.code.toLowerCase(),
      href: `${SITE_URL}/market/${mm.code.toLowerCase()}/templates/${m[1]}/`,
    })),
  ];
}

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

  // Canonical — must match the URL Netlify actually serves. Prerendered
  // files land at dist/<path>/index.html, so the served URL carries a
  // trailing slash; the extensionless form 301s back to it. A non-slash
  // canonical is a redirect loop for Googlebot (GSC: "Page with redirect").
  const canonicalUrl = route.canonical || `${SITE_URL}${route.path}${route.path === '/' ? '' : '/'}`;
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
  const robotsContent = route.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  if (html.includes('name="robots"')) {
    html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, `<meta name="robots" content="${robotsContent}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="robots" content="${robotsContent}" />\n</head>`);
  }

  // html lang for localized pages (default template ships lang="en")
  if (route.lang) {
    html = html.replace(/<html([^>]*)\slang="[^"]*"/, `<html$1 lang="${route.lang}"`);
    if (!/<html[^>]*\slang="/.test(html)) {
      html = html.replace(/<html([^>]*)>/, `<html$1 lang="${route.lang}">`);
    }
  }

  // Reciprocal hreflang. Only emitted where published translations exist, so
  // the alternate set never points at machine-translated duplicates.
  if (route.alternates && route.alternates.length) {
    const altLinks = route.alternates
      .map((a) => `  <link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
      .join('\n');
    html = html.replace('</head>', `${altLinks}\n</head>`);
  }

  // Structured data
  if (route.structuredData) {
    const sdScripts = route.structuredData
      .map((sd, i) => `  <script type="application/ld+json" id="prerender-sd-${i}">${normalizeSdUrls(JSON.stringify(sd))}</script>`)
      .join('\n');
    html = html.replace('</head>', `${sdScripts}\n</head>`);
  }

  // Put useful route content directly in the initial DOM so crawlers and users
  // without JavaScript receive the same page content as the prerendered metadata.
  const pageContent = contentMap[route.path];
  if (pageContent) {
    html = html.replace(/(<div id="root">)[\s\S]*(\n\s*<\/div>\s*<\/body>)/, (_match, opening, closing) => `${opening}\n      ${prerenderShell(pageContent)}${closing}`);
  }

  // Write file
  const outPath = route.path === '/' ? join(distDir, 'index.html') : join(distDir, route.path, 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  count++;
  console.log(`  ✅ ${route.path}`);
}

// ── 404 page ────────────────────────────────────────────────────────
// Generate a proper 404.html that returns real content, not the homepage shell.
{
  let html404 = templateHtml;
  html404 = html404.replace(/<title>.*?<\/title>/, '<title>Page Not Found | FRELUX SMART CALC</title>');
  html404 = html404.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex, nofollow" />');
  html404 = html404.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '');
  const notFoundContent = '<main><h1>Page Not Found</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; 404</nav><p>The page you are looking for does not exist. Browse our calculators and tools:</p><ul><li><a href="/paint-calculator/">Paint Calculator</a></li><li><a href="/tile-calculator/">Tile Calculator</a></li><li><a href="/screeding-calculator/">Screeding Calculator</a></li><li><a href="/pop-ceiling-calculator/">POP Ceiling Calculator</a></li><li><a href="/calculators/">All Calculators</a></li></ul><p><a href="/">Back to home</a></p></main>';
  html404 = html404.replace(/(<div id="root">)[\s\S]*(\n\s*<\/div>\s*<\/body>)/, (_match, opening, closing) => `${opening}\n      ${prerenderShell(notFoundContent)}${closing}`);
  html404 = html404.replace(/\s*<script type="module"[^>]*src="[^"]+"><\/script>/, '');
  writeFileSync(join(distDir, '404.html'), html404);
  console.log('  ✅ /404.html');
}

console.log(`\n prerendered ${count} routes`);
