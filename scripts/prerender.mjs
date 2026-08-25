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

const SITE_URL = 'https://freluxtools.netlify.app';
const distDir = 'dist';
const ogImage = `${SITE_URL}/og-image.png`;

// ── Route metadata ──────────────────────────────────────────────────
const routes = [
  {
    path: '/',
    title: 'FRELUX PAINT CALC: Calculate Materials & Estimate Construction Costs',
    description: 'Know exactly what materials your construction project needs. Free Nigerian construction calculators for paint, screeding, POP ceiling, tiles, and finishing. Estimate costs with real market prices.',
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
    path: '/calculators',
    title: 'All Calculators | FRELUX PAINT CALC',
    description:
      'Browse every FRELUX calculator — paint, screeding, POP ceiling, tiles, tyrolene, finishing, and cost estimators. Free Nigerian construction material calculators.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'FRELUX Calculators',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Painting Estimator', url: `${SITE_URL}/painting-estimator` },
          { '@type': 'ListItem', position: 2, name: 'Paint Calculator', url: `${SITE_URL}/paint-calculator` },
          { '@type': 'ListItem', position: 3, name: 'Screeding Calculator', url: `${SITE_URL}/screeding-calculator` },
          { '@type': 'ListItem', position: 4, name: 'POP Ceiling Calculator', url: `${SITE_URL}/pop-ceiling-calculator` },
          { '@type': 'ListItem', position: 5, name: 'Tile Calculator', url: `${SITE_URL}/tile-calculator` },
          { '@type': 'ListItem', position: 6, name: 'Tyrolene Estimator', url: `${SITE_URL}/tyrolene-estimator` },
          { '@type': 'ListItem', position: 7, name: 'Finish Estimator', url: `${SITE_URL}/finish-estimator` },
        ],
      },
    ],
  },
  {
    path: '/start-building',
    title: 'Start Building: What Are You Building Today? | FRELUX',
    description:
      'Start your construction project with FRELUX. Estimate materials and costs from foundation to roof, then finishing — paint, screeding, POP ceiling, tiles, and exterior. Free Nigerian construction calculators and estimators.',
    priority: '0.9',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Start Building — FRELUX', description: 'Choose what you are building and FRELUX will help you calculate materials, quantities and estimated project costs.', url: 'https://freluxtools.netlify.app/start-building' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Start Building', item: 'https://freluxtools.netlify.app/start-building' },
      ]},
      { '@context': 'https://schema.org', '@type': 'ItemList', name: 'FRELUX Building Categories', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Build to Roof', url: 'https://freluxtools.netlify.app/build-to-roof-estimator' },
        { '@type': 'ListItem', position: 2, name: 'Painting', url: 'https://freluxtools.netlify.app/paint-calculator' },
        { '@type': 'ListItem', position: 3, name: 'Screeding', url: 'https://freluxtools.netlify.app/screeding-calculator' },
        { '@type': 'ListItem', position: 4, name: 'POP Ceiling', url: 'https://freluxtools.netlify.app/pop-ceiling-calculator' },
        { '@type': 'ListItem', position: 5, name: 'Tiles & Flooring', url: 'https://freluxtools.netlify.app/tile-calculator' },
        { '@type': 'ListItem', position: 6, name: 'Exterior Finishing', url: 'https://freluxtools.netlify.app/tyrolene-estimator' },
        { '@type': 'ListItem', position: 7, name: 'Colour & Design', url: 'https://freluxtools.netlify.app/colors' },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What is the Build-to-Roof Estimator?', acceptedAnswer: { '@type': 'Answer', text: 'The Build-to-Roof Estimator calculates materials and costs for a complete building project from foundation through roofing, including blocks, cement, sand, granite, roofing sheets, structural members, and labour based on Nigerian construction standards.' } },
        { '@type': 'Question', name: 'Can I estimate finishing costs after the build?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. After your structure is built, use FRELUX finishing calculators for paint, screeding, POP ceiling, tiles, and exterior finishes to estimate materials and costs for each stage.' } },
        { '@type': 'Question', name: 'Are FRELUX calculators free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All calculators and estimators are free to use with no sign-up required. Pro features like saved estimates and PDF exports are available with a Pro account.' } },
      ]},
    ],
  },
  {
    path: '/paint-calculator',
    title: 'Paint Calculator: How Much Paint Do I Need? | FRELUX',
    description: 'Room-based paint calculator for Nigerian projects. Enter room dimensions, wall height, doors, and windows to estimate paint quantity in 20-litre buckets using admin-configured coverage rates.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Paint Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Paint Calculator', item: `${SITE_URL}/paint-calculator` },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'How does the FRELUX paint calculator differ from a generic area-based calculator?', acceptedAnswer: { '@type': 'Answer', text: 'FRELUX uses a room-based approach: you enter room dimensions (not raw m²), and the calculator handles all area math internally. Coverage rates are admin-configured from the database. Surface condition, colour condition, and wall height all affect the final quantity.' } },
        { '@type': 'Question', name: 'Why does the calculator recommend 20-litre buckets?', acceptedAnswer: { '@type': 'Answer', text: '20-litre buckets are the standard purchase unit in the Nigerian paint market. The calculator shows both theoretical litres needed and the practical number of buckets to buy.' } },
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
        { '@type': 'Question', name: 'Does FRELUX use a cement:sand mix ratio for screeding?', acceptedAnswer: { '@type': 'Answer', text: 'No. The FRELUX screeding methodology calculates screeding paint (litres) and white cement (kg) based on the surface area in m² and admin-configured coverage and consumption rates.' } },
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
    , { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' }, { '@type': 'ListItem', position: 3, name: 'POP Ceiling Calculator', item: 'https://freluxtools.netlify.app/pop-ceiling-calculator' }] }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How do I calculate POP ceiling materials?', acceptedAnswer: { '@type': 'Answer', text: 'Enter your room length and width into the FRELUX POP Ceiling Calculator. It estimates POP cement, fibreglass mesh, bonding agent, and other materials based on your ceiling area.' } }, { '@type': 'Question', name: 'What is a POP ceiling?', acceptedAnswer: { '@type': 'Answer', text: 'Plaster of Paris (POP) ceilings are smooth, elegant ceiling finishes popular in Nigerian homes. POP is mixed with water and applied to ceilings, often with decorative mouldings and cornices.' } }] }],
  },
  {
    path: '/tile-calculator',
    title: 'Tile Calculator: How Many Tiles Do I Need? | FRELUX',
    description: 'Free tile calculator. Enter your floor or wall dimensions to calculate tile quantity, adhesive, grout, and layout recommendations.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Tile Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    , { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' }, { '@type': 'ListItem', position: 3, name: 'Tile Calculator', item: 'https://freluxtools.netlify.app/tile-calculator' }] }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How many tiles do I need?', acceptedAnswer: { '@type': 'Answer', text: 'Enter your floor or wall dimensions and tile size into the FRELUX Tile Calculator. It calculates the number of tiles, boxes, adhesive, and grout including a waste factor for cuts and breakages.' } }, { '@type': 'Question', name: 'How much extra tile should I buy?', acceptedAnswer: { '@type': 'Answer', text: 'Always add 10-15% extra tiles for cuts, breakages, and future repairs. The calculator includes this waste factor automatically.' } }] }],
  },
  {
    path: '/painting-estimator',
    title: 'Painting Estimator: Room-Based Paint & Cost | FRELUX',
    description: 'Professional painting estimator using the FRELUX methodology. Calculate paint quantity and project cost for multiple rooms with real product prices.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Painting Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
    , { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' }, { '@type': 'ListItem', position: 3, name: 'Painting Estimator', item: 'https://freluxtools.netlify.app/painting-estimator' }] }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does the Painting Estimator work?', acceptedAnswer: { '@type': 'Answer', text: 'Enter each room with its dimensions. The estimator calculates paint quantity and project cost for all rooms combined using the FRELUX methodology with real Nigerian product prices.' } }] }],
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
    title: 'Finish Estimator: Painting, Tyrolene & Grafitex | FRELUX',
    description: 'Estimate material quantities and costs for wall finishes: painting, Tyrolene, and Grafitex. Uses real coverage rates and package sizes.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Finish Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' }, { '@type': 'ListItem', position: 3, name: 'Finish Estimator', item: 'https://freluxtools.netlify.app/finish-estimator' }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'What finishes does the Finish Estimator support?', acceptedAnswer: { '@type': 'Answer', text: 'The Finish Estimator calculates materials and costs for painting, Tyrolene, and Grafitex wall finishes using real coverage rates and Nigerian package sizes.' } }] },
    ],
  },
  {
    path: '/tyrolene-estimator',
    title: 'Tyrolene Estimator: Exterior Wall Finish | FRELUX',
    description: 'Partition-based Tyrolene estimator for exterior walls. Calculate sand, cement, acrylic bond, water seal, and anti-fungal material quantities per standard partition.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Tyrolene Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' }, { '@type': 'ListItem', position: 3, name: 'Tyrolene Estimator', item: 'https://freluxtools.netlify.app/tyrolene-estimator' }] },
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
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Color Library', item: 'https://freluxtools.netlify.app/colors' }] },
    ],
  },
  {
    path: '/colors/compare',
    title: 'Compare Paint Colors Side by Side: FRELUX',
    description: 'Compare paint colors side by side. See how different shades look together and choose the perfect palette for your space.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Color Library', item: 'https://freluxtools.netlify.app/colors' }, { '@type': 'ListItem', position: 3, name: 'Compare Colors', item: 'https://freluxtools.netlify.app/colors/compare' }] },
    ],
  },
  {
    path: '/ai-color-assistant',
    title: 'Smart Color Assistant: AI Paint Color Ideas | FRELUX',
    description: 'Get AI-powered paint color recommendations. Describe your room, lighting, and mood to receive personalized color suggestions.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Smart Color Assistant', item: 'https://freluxtools.netlify.app/ai-color-assistant' }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does the AI Color Assistant work?', acceptedAnswer: { '@type': 'Answer', text: 'Describe your room, lighting, and mood. The AI recommends paint colors that suit your space, with direct links to purchase from the color library.' } }] },
    ],
  },
  {
    path: '/learn',
    title: 'Learn: Painting Guides & Tips | FRELUX',
    description: 'Expert guides on paint selection, surface preparation, application techniques, and cost planning for your painting projects.',
    priority: '0.8',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://freluxtools.netlify.app/learn' }] },
    ],
  },
  {
    path: '/templates',
    title: 'Calculator Templates: FRELUX',
    description: 'Professionally curated templates for common painting, tiling, screeding, and POP ceiling projects using the FRELUX calculation engine.',
    priority: '0.6',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' }, { '@type': 'ListItem', position: 2, name: 'Templates', item: 'https://freluxtools.netlify.app/templates' }] },
    ],
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

  // ── Construction calculators & estimators (missing from original) ──
  {
    path: '/build-to-roof-estimator',
    title: 'Build-to-Roof Estimator: Full Construction Cost | FRELUX',
    description: 'Estimate materials and costs for a complete build from foundation to roof. Blocks, cement, sand, granite, roofing, labour, and structural members for Nigerian building projects.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Build-to-Roof Estimator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' },
        { '@type': 'ListItem', position: 3, name: 'Build-to-Roof Estimator', item: 'https://freluxtools.netlify.app/build-to-roof-estimator' },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What does the Build-to-Roof Estimator calculate?', acceptedAnswer: { '@type': 'Answer', text: 'It estimates materials and costs for a full building project from foundation through roof, including blocks, cement, sand, granite, roofing sheets, structural members, and labour based on Nigerian construction standards.' } },
        { '@type': 'Question', name: 'Can I estimate costs for different building types?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The estimator supports bungalows, duplexes, and multi-storey buildings with configurable foundation types, wall heights, and roofing materials.' } },
      ]},
    ],
  },
  {
    path: '/image-estimator',
    title: 'AI Photo Estimator: Estimate from a Photo | FRELUX',
    description: 'Upload a photo of your construction site, room, or building and get an AI-powered material and cost estimate. Visual estimation for Nigerian painting, tiling, and construction projects.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX AI Photo Estimator', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' },
        { '@type': 'ListItem', position: 3, name: 'AI Photo Estimator', item: 'https://freluxtools.netlify.app/image-estimator' },
      ]},
    ],
  },
  {
    path: '/structural-calculator',
    title: 'Structural Calculator: Beams, Columns & Slabs | FRELUX',
    description: 'Calculate structural member sizes for Nigerian building projects. Beam dimensions, column sizing, slab thickness, and reinforcement estimates.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Structural Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' },
        { '@type': 'ListItem', position: 3, name: 'Structural Calculator', item: 'https://freluxtools.netlify.app/structural-calculator' },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What does the Structural Calculator compute?', acceptedAnswer: { '@type': 'Answer', text: 'It calculates beam depths and widths, column cross-sections, slab thickness, and reinforcement quantities based on span, loading, and Nigerian concrete mix standards.' } },
      ]},
    ],
  },
  {
    path: '/foundation-calculator',
    title: 'Foundation Calculator: Sizing & Materials | FRELUX',
    description: 'Calculate foundation sizes and materials for Nigerian building projects. Strip footing, pad foundation, and raft foundation estimates with soil bearing capacity guidance.',
    priority: '0.8',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Foundation Calculator', applicationCategory: 'CalculatorApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' },
        { '@type': 'ListItem', position: 3, name: 'Foundation Calculator', item: 'https://freluxtools.netlify.app/foundation-calculator' },
      ]},
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What foundation types does the calculator support?', acceptedAnswer: { '@type': 'Answer', text: 'The Foundation Calculator supports strip footings, pad foundations, and raft foundations with typical Nigerian soil bearing capacities for preliminary sizing and budgeting.' } },
        { '@type': 'Question', name: 'Do I need a soil test before using the foundation calculator?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. A geotechnical investigation is mandatory for actual foundation design. The calculator uses typical soil bearing capacities for preliminary sizing only.' } },
      ]},
    ],
  },
  {
    path: '/construction-sequence',
    title: 'Construction Sequence Planner | FRELUX',
    description: 'Plan your building project step by step. From site clearance to finishing, get a construction timeline with material and labour requirements for each phase.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Construction Sequence Planner', applicationCategory: 'ProjectManagementApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' },
        { '@type': 'ListItem', position: 3, name: 'Construction Sequence', item: 'https://freluxtools.netlify.app/construction-sequence' },
      ]},
    ],
  },
  {
    path: '/project-timeline',
    title: 'Project Timeline Builder | FRELUX',
    description: 'Create a construction project timeline with phases, milestones, and material schedules. Track progress from foundation to finishing.',
    priority: '0.7',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'FRELUX Project Timeline', applicationCategory: 'ProjectManagementApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://freluxtools.netlify.app/calculators' },
        { '@type': 'ListItem', position: 3, name: 'Project Timeline', item: 'https://freluxtools.netlify.app/project-timeline' },
      ]},
    ],
  },
  {
    path: '/pricing',
    title: 'Pricing & Plans | FRELUX PAINT CALC',
    description: 'Compare FRELUX plans. Free calculators, Pro features for professionals, and enterprise options for construction firms in Nigeria.',
    priority: '0.6',
    changefreq: 'monthly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://freluxtools.netlify.app/pricing' },
      ]},
    ],
  },
  {
    path: '/marketplace',
    title: 'Construction Marketplace: Buy & Sell Building Materials | FRELUX',
    description: 'Browse construction materials, tools, and services from suppliers across Nigeria. Find paints, tiles, cement, tools, and professional services near you.',
    priority: '0.8',
    changefreq: 'daily',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'FRELUX Construction Marketplace', description: 'Buy and sell construction materials, tools, and services across Nigeria.' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Marketplace', item: 'https://freluxtools.netlify.app/marketplace' },
      ]},
    ],
  },
  {
    path: '/pro-connect',
    title: 'Pro Connect: Find Verified Construction Professionals | FRELUX',
    description: 'Connect with verified painters, tilers, screeders, POP ceiling specialists, and builders across Nigeria. Browse profiles, compare services, and hire professionals.',
    priority: '0.8',
    changefreq: 'weekly',
    structuredData: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'FRELUX Pro Connect Directory', description: 'Find verified construction professionals across Nigeria.' },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://freluxtools.netlify.app' },
        { '@type': 'ListItem', position: 2, name: 'Pro Connect', item: 'https://freluxtools.netlify.app/pro-connect' },
      ]},
    ],
  },
  {
    path: '/calculators',
    title: 'All Calculators & Estimators | FRELUX PAINT CALC',
    description: 'Browse every FRELUX calculator and estimator — paint, screeding, POP ceiling, tiles, tyrolene, finishing, structural, foundation, build-to-roof, and cost estimators. Free Nigerian construction material calculators.',
    priority: '0.9',
    changefreq: 'monthly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'FRELUX Calculators & Estimators',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Build-to-Roof Estimator', url: 'https://freluxtools.netlify.app/build-to-roof-estimator' },
          { '@type': 'ListItem', position: 2, name: 'Paint Calculator', url: 'https://freluxtools.netlify.app/paint-calculator' },
          { '@type': 'ListItem', position: 3, name: 'Painting Estimator', url: 'https://freluxtools.netlify.app/painting-estimator' },
          { '@type': 'ListItem', position: 4, name: 'Screeding Calculator', url: 'https://freluxtools.netlify.app/screeding-calculator' },
          { '@type': 'ListItem', position: 5, name: 'POP Ceiling Calculator', url: 'https://freluxtools.netlify.app/pop-ceiling-calculator' },
          { '@type': 'ListItem', position: 6, name: 'Tile Calculator', url: 'https://freluxtools.netlify.app/tile-calculator' },
          { '@type': 'ListItem', position: 7, name: 'Structural Calculator', url: 'https://freluxtools.netlify.app/structural-calculator' },
          { '@type': 'ListItem', position: 8, name: 'Foundation Calculator', url: 'https://freluxtools.netlify.app/foundation-calculator' },
          { '@type': 'ListItem', position: 9, name: 'AI Photo Estimator', url: 'https://freluxtools.netlify.app/image-estimator' },
          { '@type': 'ListItem', position: 10, name: 'Finish Estimator', url: 'https://freluxtools.netlify.app/finish-estimator' },
          { '@type': 'ListItem', position: 11, name: 'Tyrolene Estimator', url: 'https://freluxtools.netlify.app/tyrolene-estimator' },
          { '@type': 'ListItem', position: 12, name: 'Cost Estimator', url: 'https://freluxtools.netlify.app/cost-estimator' },
          { '@type': 'ListItem', position: 13, name: 'Screeding Cost Estimator', url: 'https://freluxtools.netlify.app/screeding-cost-estimator' },
          { '@type': 'ListItem', position: 14, name: 'POP Ceiling Cost Estimator', url: 'https://freluxtools.netlify.app/pop-ceiling-cost-estimator' },
          { '@type': 'ListItem', position: 15, name: 'Tile Cost Estimator', url: 'https://freluxtools.netlify.app/tile-cost-estimator' },
        ],
      },
    ],
  },

  // ── About / Contact / Legal ──
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
// Remove the old generic "JavaScript Required" noscript — we inject per-route content instead
templateHtml = templateHtml.replace(/<noscript>[\s\S]*?<\/noscript>/, '');
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

  // Inject SEO content into <noscript> — visible to crawlers and no-JS users.
  // Googlebot reads <noscript> content. When JS loads, React replaces #root
  // entirely, so the noscript content is never visible to JS-enabled users.
  // The loading spinner remains visible only to JS users until hydration.
  const pageContent = seoContentMap[route.path];
  if (pageContent) {
    const noscriptContent = `<noscript><div style="font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:1rem 1.5rem;line-height:1.6;color:#1e293b;">${pageContent}</div></noscript>`;
    html = html.replace('<div id="root">', `${noscriptContent}\n    <div id="root">`);
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
  html404 = html404.replace(/<title>.*?<\/title>/, '<title>Page Not Found | FRELUX PAINT CALC</title>');
  html404 = html404.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex, nofollow" />');
  if (html404.includes('rel="canonical"')) {
    html404 = html404.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '<link rel="canonical" href="https://freluxtools.netlify.app/404" />');
  }
  const notFoundContent = '<h1>Page Not Found</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> <h1>Page Not Found</h1>rsaquo; 404</nav><p>The page you are looking for does not exist. Browse our calculators and tools:</p><ul><li><a href="/paint-calculator">Paint Calculator</a></li><li><a href="/tile-calculator">Tile Calculator</a></li><li><a href="/screeding-calculator">Screeding Calculator</a></li><li><a href="/pop-ceiling-calculator">POP Ceiling Calculator</a></li><li><a href="/calculators">All Calculators</a></li></ul><p><a href="/">Back to home</a></p>';
  const noscript404 = `<noscript><div style="font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:1rem 1.5rem;line-height:1.6;color:#1e293b;">${notFoundContent}</div></noscript>`;
  html404 = html404.replace('<div id="root">', `${noscript404}\n    <div id="root">`);
  writeFileSync(join(distDir, '404.html'), html404);
  console.log('  ✅ /404.html');
}

console.log(`\n prerendered ${count} routes`);
