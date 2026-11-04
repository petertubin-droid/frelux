/**
 * Prerender static HTML for all public routes.
 * Reads the built index.html, injects route-specific <title>, meta description,
 * canonical URL, OG tags, and structured data, then writes one HTML file per route.
 *
 * Usage: node scripts/prerender.mjs
 * Run AFTER `vite build` (reads from dist/).
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "fs";
import { join, dirname } from "path";
import { seoContentMap } from "./seo-content-map.mjs";
import { marketLandingRoutes } from "./market-landing-data.mjs";
import { marketHreflang } from "./lib/market-hreflang.mjs";
import {
  loadMarketPriceFacts,
  renderPriceFacts,
} from "./lib/market-price-facts.mjs";
import {
  loadTileMaterialFacts,
  renderTilePriceFacts,
} from "./lib/tile-price-facts.mjs";
import { TEMPLATE_CATALOG } from "./lib/template-catalog.mjs";
import {
  colourFaq,
  colourFaqJsonLd,
  colourSeo,
  mixRecipe,
  recipeCaveat,
  recipeSentence,
} from "./lib/color-mixing.mjs";
import { renderTemplateInputs } from "./lib/template-input-summary.mjs";
import { legalPageContent } from "./lib/legal-page-content.mjs";
import { repairInternalLinks } from "./lib/internal-link-repair.mjs";
import { loadToolRegistry } from "./lib/tool-registry.mjs";
import {
  buildToolsDirectoryContent,
  buildToolPageContent,
} from "./lib/tools-directory-content.mjs";
import {
  buildToolContent,
  toolSeoDescription,
  toolSeoTitle,
} from "./lib/tool-seo.mjs";
import { faqPrerenderRoutes } from "./generated/faq-prerender.mjs";
import { buildingTypeRoutes } from "./generated/building-types.mjs";
import { SITE_URL } from "./lib/site-url.mjs";

const distDir = "dist";

// Google indexing fix (2026-09-25): prerendered pages are served at their
// trailing-slash URL (Netlify pretty URLs: /paint-calculator 301s to
// /paint-calculator/). Structured-data URLs must therefore (a) use the
// trailing-slash form that is actually served and (b) point at final
// destinations, not at legacy 301 sources. A JSON-LD/canonical URL that
// redirects back to the page itself is a redirect loop for Googlebot and
// lands the page in GSC as "Page with redirect" instead of indexed.
const LEGACY_REDIRECT_TARGETS = {
  "/cost-estimator": "/paint-calculator",
  "/painting-estimator": "/paint-calculator",
  "/screeding-cost-estimator": "/screeding-calculator",
  "/pop-ceiling-cost-estimator": "/pop-ceiling-calculator",
  "/tile-cost-estimator": "/tile-calculator",
  "/tyrolene-estimator": "/finish-estimator",
};
const normalizeSdUrls = (json) => {
  const siteUrlRe = new RegExp(
    `"${SITE_URL.replace(/\./g, "\\.")}(\/[^"]*)?"`,
    "g",
  );
  return json.replace(siteUrlRe, (m, p) => {
    if (!p) return m; // bare home URL — correct as-is
    if (/\.(png|jpe?g|svg|webp|ico|xml|json|txt|css|js)$/i.test(p)) return m; // assets keep extension URLs
    if (LEGACY_REDIRECT_TARGETS[p])
      return `"${SITE_URL}${LEGACY_REDIRECT_TARGETS[p]}"`;
    return `"${SITE_URL}${p.endsWith("/") ? p : `${p}/`}"`;
  });
};
const ogImage = `${SITE_URL}/social-cover.png`;

// ── Route metadata ──────────────────────────────────────────────────
const routes = [
  {
    path: "/learn/build-in-nigeria-from-abroad",
    title:
      "How to Estimate and Budget Construction Costs in Nigeria from the US or UK | FRELUX",
    description:
      "A practical process for diaspora builders: measure in feet or metres, price quantities in naira, read costs in USD or GBP without mistaking a conversion for a local price, and send a builder a document.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/map",
    title: "Construction Map: Pros, Projects, Materials | FRELUX",
    description:
      "Explore construction professionals, open projects and material stock on one globe. Search any place and see real distances from your site.",
    priority: "0.7",
    changefreq: "weekly",
  },
  {
    path: "/market-intelligence",
    title:
      "Construction Market Intelligence: Prices, Indices and Listed Companies | FRELUX",
    description:
      "FRELUX market intelligence: construction material price indices by market, listed construction companies, and sourced industry news. Every figure carries its publisher and date.",
  },
  {
    path: "/market-intelligence/stocks",
    title:
      "Construction Stock Market: Listed Builders and Materials Companies | FRELUX",
    description:
      "Track listed construction and infrastructure companies: quotes, daily change, market capitalisation and interactive charts, with the provider and delay shown on every price.",
  },
  {
    path: "/market-intelligence/materials",
    title:
      "Construction Material Prices and Official Index Data by Market | FRELUX",
    description:
      "Compare construction material prices across markets and follow official producer price indices for cement, steel, timber, paints and plumbing, with publisher attribution and update dates.",
  },
  {
    path: "/market-intelligence/trends",
    title: "Construction Industry Trends and Index Movements | FRELUX",
    description:
      "Follow index movements across cement, steel, timber, paints and plumbing categories, with percentage change, publisher, licence and the period each figure covers.",
  },
  {
    path: "/market-intelligence/investment",
    title: "Construction Investment Insights and Sector Performance | FRELUX",
    description:
      "Construction investment context: listed company performance, sector composition of the tracked universe, funding and consolidation news, and sourced market developments.",
  },
  {
    path: "/market-intelligence/news",
    title: "Construction Market News with Sources and Dates | FRELUX",
    description:
      "Curated construction industry headlines with the publication named and the date shown, organised by market, materials, companies and policy.",
  },
  {
    path: "/market-intelligence/companies",
    title:
      "Listed Construction and Building Materials Company Profiles | FRELUX",
    description:
      "Profiles of the listed companies tracked on FRELUX: what each one does, where it lists, its sector, and the market data available for it.",
  },
  {
    path: "/unit-converter",
    title: "Unit Converter: Feet, Metres, Tonnes, Bags | FRELUX",
    description:
      "Convert feet to metres, plots to square metres, tonnes and 50 kg bags, litres and buckets. Every conversion factor is exact and each assumption is stated.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/",
    title:
      "FRELUX SMART CALC: Calculate Materials & Estimate Construction Costs",
    description:
      "Know exactly what materials your construction project needs. Free construction calculators for paint, screeding, POP ceiling, tiles, and finishing. Estimate costs with real market prices.",
    priority: "1.0",
    changefreq: "weekly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "FRELUX SMART CALC",
        url: SITE_URL,
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "FRELUX SMART CALC",
        url: SITE_URL,
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Featured Calculator Templates",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Standard Living Room Painting",
            url: `${SITE_URL}/templates/standard-living-room-painting`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "2-Bedroom Flat Painting",
            url: `${SITE_URL}/templates/2-bedroom-flat-full-painting`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Exterior Duplex Painting",
            url: `${SITE_URL}/templates/exterior-duplex-painting`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "Standard Floor Tiling",
            url: `${SITE_URL}/templates/standard-floor-tiling`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "Large Format Porcelain Floor",
            url: `${SITE_URL}/templates/terrazzo-porcelain-floor-tiling`,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "Standard Room Screeding",
            url: `${SITE_URL}/templates/standard-room-screeding`,
          },
          {
            "@type": "ListItem",
            position: 7,
            name: "Living Room + Ceiling Screeding",
            url: `${SITE_URL}/templates/living-room-ceiling-screeding`,
          },
          {
            "@type": "ListItem",
            position: 8,
            name: "Large Living Room POP Ceiling",
            url: `${SITE_URL}/templates/large-living-room-pop-ceiling`,
          },
          {
            "@type": "ListItem",
            position: 9,
            name: "Master Bedroom POP Ceiling",
            url: `${SITE_URL}/templates/master-bedroom-pop-ceiling`,
          },
        ],
      },
    ],
  },
  {
    path: "/escrow",
    title: "Cross-Border Diaspora Escrow for Construction | FRELUX",
    description:
      "How milestone-based escrow works for diaspora-funded builds: funds are held against verified construction stages and released as work is confirmed, with a documented audit trail.",
    priority: "0.6",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Cross-Border Diaspora Escrow",
        url: `${SITE_URL}/escrow`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Pro Connect",
            item: `${SITE_URL}/pro-connect`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Escrow",
            item: `${SITE_URL}/escrow`,
          },
        ],
      },
    ],
  },
  {
    path: "/developers/merchant-webhooks",
    title: "Merchant API and Live Inventory Webhooks | FRELUX Developers",
    description:
      "Connect a merchant catalogue to FRELUX: price and stock feeds, inventory webhook events, and the API surface used to quote construction materials against real supplier data.",
    priority: "0.6",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "FRELUX Merchant API and Webhooks",
        url: `${SITE_URL}/developers/merchant-webhooks`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Developers",
            item: `${SITE_URL}/developers`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Merchant API",
            item: `${SITE_URL}/developers/merchant-webhooks`,
          },
        ],
      },
    ],
  },
  {
    path: "/start-building",
    title: "Start Building: What Are You Building Today? | FRELUX SMART CALC",
    description:
      "Start your construction project with FRELUX. Estimate materials and costs from foundation to roof, then finishing: paint, screeding, POP ceiling, tiles, and exterior. Free construction calculators and estimators.",
    priority: "0.9",
    changefreq: "weekly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Start Building | FRELUX SMART CALC",
        description:
          "Choose what you are building and FRELUX will help you calculate materials, quantities and estimated project costs.",
        url: `${SITE_URL}/start-building`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Start Building",
            item: `${SITE_URL}/start-building`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "FRELUX Building Categories",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Build to Roof",
            url: `${SITE_URL}/build-to-roof-estimator`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Painting",
            url: `${SITE_URL}/paint-calculator`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Screeding",
            url: `${SITE_URL}/screeding-calculator`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "POP Ceiling",
            url: `${SITE_URL}/pop-ceiling-calculator`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "Tiles & Flooring",
            url: `${SITE_URL}/tile-calculator`,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "Exterior Finishing",
            url: `${SITE_URL}/tyrolene-estimator`,
          },
          {
            "@type": "ListItem",
            position: 7,
            name: "Colour & Design",
            url: `${SITE_URL}/colors`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is the Build-to-Roof Estimator?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Build-to-Roof Estimator calculates materials and costs for a complete building project from foundation through roofing, including blocks, cement, sand, granite, roofing sheets, structural members, and labour based on practical construction standards.",
            },
          },
          {
            "@type": "Question",
            name: "Can I estimate finishing costs after the build?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. After your structure is built, use FRELUX finishing calculators for paint, screeding, POP ceiling, tiles, and exterior finishes to estimate materials and costs for each stage.",
            },
          },
          {
            "@type": "Question",
            name: "Are FRELUX calculators free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. All calculators and estimators are free to use with no sign-up required. Pro features like saved estimates and PDF exports are available with a Pro account.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/paint-calculator",
    title: "Paint Calculator: How Much Paint Do I Need? | FRELUX SMART CALC",
    description:
      "Room-based paint calculator for any project. Enter room dimensions, wall height, doors, and windows to estimate paint quantity in 20-litre buckets using verified coverage rates.",
    priority: "0.9",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Paint Calculator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Paint Calculator",
            item: `${SITE_URL}/paint-calculator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How does the FRELUX paint calculator differ from a generic area-based calculator?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FRELUX uses a room-based approach: you enter room dimensions (not raw m²), and the calculator handles all area math internally. Coverage rates are verified from the database. Surface condition, colour condition, and wall height all affect the final quantity.",
            },
          },
          {
            "@type": "Question",
            name: "Why does the calculator recommend 20-litre buckets?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "20-litre buckets are a standard purchase unit in many paint markets. The calculator shows both theoretical litres needed and the practical number of buckets to buy.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need primer?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "FRELUX recommends primer for new/unpainted surfaces and when painting light colours over dark surfaces. The calculator flags these conditions automatically based on your colour condition selection.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/screeding-calculator",
    title: "Wall Screeding Calculator: FRELUX",
    description:
      "Calculate wall screeding area in m² and estimate screeding paint (litres) and white cement (kg). Enter room or fence dimensions in feet or metres.",
    priority: "0.9",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Wall Screeding Calculator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Screeding Calculator",
            item: `${SITE_URL}/screeding-calculator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Does FRELUX use a cement:sand mix ratio for screeding?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. The FRELUX screeding methodology calculates screeding paint (litres) and white cement (kg) based on the surface area in m² and verified coverage and consumption rates.",
            },
          },
          {
            "@type": "Question",
            name: "Can I calculate screeding for fences?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Enter fence dimensions in feet or metres. The calculator converts the surface area to m² and calculates materials using the same methodology.",
            },
          },
          {
            "@type": "Question",
            name: "Is the screeding area shown in m²?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. All screeding calculations use square metres (m²) as the unit of measurement, even when input dimensions are in feet.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/cost-estimator",
    title: "Paint Cost Estimator: FRELUX",
    description:
      "Estimate the practical cost of your painting project. Paint, primer, materials, based on real product prices and your paint quantity.",
    priority: "0.9",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Cost Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Cost Estimator",
            item: `${SITE_URL}/cost-estimator`,
          },
        ],
      },
    ],
  },
  {
    path: "/pop-ceiling-calculator",
    title: "POP Ceiling Calculator: FRELUX",
    description:
      "Calculate POP ceiling material quantities. Enter room dimensions to estimate POP cement, mesh, and other materials for your ceiling project.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX POP Ceiling Calculator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      ,
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "POP Ceiling Calculator",
            item: `${SITE_URL}/pop-ceiling-calculator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How do I calculate POP ceiling materials?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Enter your room length and width into the FRELUX POP Ceiling Calculator. It estimates POP cement, fibreglass mesh, bonding agent, and other materials based on your ceiling area.",
            },
          },
          {
            "@type": "Question",
            name: "What is a POP ceiling?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Plaster of Paris (POP) ceilings are smooth, elegant ceiling finishes popular in many homes. POP is mixed with water and applied to ceilings, often with decorative mouldings and cornices.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/tile-calculator",
    title: "Tile Calculator: How Many Tiles Do I Need? | FRELUX SMART CALC",
    description:
      "Free tile calculator. Enter your floor or wall dimensions to calculate tile quantity, adhesive, grout, and layout recommendations.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Tile Calculator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      ,
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Tile Calculator",
            item: `${SITE_URL}/tile-calculator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How many tiles do I need?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Enter your floor or wall dimensions and tile size into the FRELUX Tile Calculator. It calculates the number of tiles, boxes, adhesive, and grout including a waste factor for cuts and breakages.",
            },
          },
          {
            "@type": "Question",
            name: "How much extra tile should I buy?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Always add 10-15% extra tiles for cuts, breakages, and future repairs. The calculator includes this waste factor automatically.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/painting-estimator",
    title: "Painting Estimator: Room-Based Paint & Cost | FRELUX SMART CALC",
    description:
      "Professional painting estimator using the FRELUX methodology. Calculate paint quantity and project cost for multiple rooms with real product prices.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Painting Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      ,
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Painting Estimator",
            item: `${SITE_URL}/painting-estimator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How does the Painting Estimator work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Enter each room with its dimensions. The estimator calculates paint quantity and project cost for all rooms combined using the FRELUX methodology with real market product prices.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/screeding-cost-estimator",
    title: "Screeding Cost Estimator: FRELUX",
    description:
      "Estimate the cost of wall screeding based on your wall area and current material prices. Cement, sand, and labour cost breakdown.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Screeding Cost Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Cost Estimators",
            item: `${SITE_URL}/cost-estimator`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Screeding Cost Estimator",
            item: `${SITE_URL}/screeding-cost-estimator`,
          },
        ],
      },
    ],
  },
  {
    path: "/pop-ceiling-cost-estimator",
    title: "POP Ceiling Cost Estimator: FRELUX",
    description:
      "Estimate the cost of your POP ceiling project. POP cement, mesh, and other material costs based on your ceiling area.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX POP Ceiling Cost Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Cost Estimators",
            item: `${SITE_URL}/cost-estimator`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "POP Ceiling Cost Estimator",
            item: `${SITE_URL}/pop-ceiling-cost-estimator`,
          },
        ],
      },
    ],
  },
  {
    path: "/tile-cost-estimator",
    title: "Tile Cost Estimator: FRELUX",
    description:
      "Estimate tiling project cost. Tile, adhesive, grout, and labour costs based on your tile area and current prices.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Tile Cost Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Cost Estimators",
            item: `${SITE_URL}/cost-estimator`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Tile Cost Estimator",
            item: `${SITE_URL}/tile-cost-estimator`,
          },
        ],
      },
    ],
  },
  {
    path: "/finish-estimator",
    title:
      "Finish Estimator: Painting, Tyrolene & Grafitex | FRELUX SMART CALC",
    description:
      "Estimate material quantities and costs for wall finishes: painting, Tyrolene, and Grafitex. Uses real coverage rates and package sizes.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Finish Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Finish Estimator",
            item: `${SITE_URL}/finish-estimator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What finishes does the Finish Estimator support?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Finish Estimator calculates materials and costs for painting, Tyrolene, and Grafitex wall finishes using real coverage rates and standard package sizes.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/tyrolene-estimator",
    title: "Tyrolene Estimator: Exterior Wall Finish | FRELUX SMART CALC",
    description:
      "Partition-based Tyrolene estimator for exterior walls. Calculate sand, cement, acrylic bond, water seal, and anti-fungal material quantities per standard partition.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Tyrolene Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Tyrolene Estimator",
            item: `${SITE_URL}/tyrolene-estimator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is a standard partition in FRELUX?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A standard partition is 3m × 3m (9m²). You can enter the number of standard partitions directly, or provide actual wall dimensions and the calculator converts them to equivalent standard partitions.",
            },
          },
          {
            "@type": "Question",
            name: "Can I use the Tyrolene estimator for interior walls?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Tyrolene is an exterior-only finish. The FRELUX Tyrolene Estimator is designed for exterior wall applications only.",
            },
          },
          {
            "@type": "Question",
            name: "Does the calculator include labour costs?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Labour is negotiated separately and is not part of the Tyrolene material estimation.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/colors",
    title: "Paint Color Library: FRELUX",
    description:
      "Browse hundreds of paint colors with real names and codes. Search, filter, and compare colors for your painting project.",
    priority: "0.8",
    changefreq: "weekly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Color Library",
            item: `${SITE_URL}/colors`,
          },
        ],
      },
    ],
  },
  {
    path: "/colors/compare",
    title: "Compare Paint Colors Side by Side: FRELUX",
    description:
      "Compare paint colors side by side. See how different shades look together and choose the perfect palette for your space.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Color Library",
            item: `${SITE_URL}/colors`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Compare Colors",
            item: `${SITE_URL}/colors/compare`,
          },
        ],
      },
    ],
  },
  {
    path: "/ai-color-assistant",
    title: "Smart Color Assistant: AI Paint Color Ideas | FRELUX SMART CALC",
    description:
      "Get AI-powered paint color recommendations. Describe your room, lighting, and mood to receive personalized color suggestions.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Smart Color Assistant",
            item: `${SITE_URL}/ai-color-assistant`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How does the AI Color Assistant work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Describe your room, lighting, and mood. The AI recommends paint colors that suit your space, with direct links to purchase from the color library.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/paint-comparison",
    title:
      "Paint Comparison Tool: Compare Colours Side by Side | FRELUX SMART CALC",
    description:
      "Compare paint colours, finishes, and prices side by side to choose the right option for your project.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Paint Comparison",
            item: `${SITE_URL}/paint-comparison`,
          },
        ],
      },
    ],
  },
  {
    path: "/gallery",
    title: "Project Gallery: Real FRELUX Estimates | FRELUX SMART CALC",
    description:
      "Browse real painting, tiling, screeding, and POP ceiling projects with photos and verified cost estimates.",
    priority: "0.7",
    changefreq: "daily",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Gallery",
            item: `${SITE_URL}/gallery`,
          },
        ],
      },
    ],
  },
  {
    path: "/case-studies",
    title: "Before & After Case Studies | FRELUX SMART CALC",
    description:
      "In-depth before and after walkthroughs of Nigerian painting, screeding, POP ceiling and tiling example projects: scope, challenges, outcome and cost breakdown.",
    priority: "0.7",
    changefreq: "weekly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Case Studies",
            item: `${SITE_URL}/case-studies`,
          },
        ],
      },
    ],
  },
  {
    path: "/material-prices",
    title:
      "Material Price Tracker: Live Paint & Building Material Prices | FRELUX SMART CALC",
    description:
      "Track live prices of paint, cement, tiles, and building materials across supported markets to keep your estimates accurate.",
    priority: "0.7",
    changefreq: "daily",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Material Prices",
            item: `${SITE_URL}/material-prices`,
          },
        ],
      },
    ],
  },
  {
    path: "/surface-assessment",
    title: "Surface Assessment Tool: Check Wall Conditions | FRELUX SMART CALC",
    description:
      "Assess wall and ceiling surface conditions to get accurate paint absorption factors and material estimates.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Surface Assessment",
            item: `${SITE_URL}/surface-assessment`,
          },
        ],
      },
    ],
  },
  {
    path: "/learn",
    title: "Learn: Painting Guides & Tips | FRELUX SMART CALC",
    description:
      "Expert guides on paint selection, surface preparation, application techniques, and cost planning for your painting projects.",
    priority: "0.8",
    changefreq: "weekly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Learn",
            item: `${SITE_URL}/learn`,
          },
        ],
      },
    ],
  },
  {
    path: "/printables",
    title:
      "Free Printable Templates: Quotes, Schedules & Checklists | FRELUX SMART CALC",
    description:
      "Free, print-ready project sheets from FRELUX: a quote comparison sheet, a paint project schedule, and a material shopping checklist.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Free Templates",
            item: `${SITE_URL}/printables`,
          },
        ],
      },
    ],
  },
  {
    path: "/glossary",
    title:
      "Construction Glossary: Plain-Language Building Terms Explained | FRELUX SMART CALC",
    description:
      "A plain-language glossary of construction, painting and finishing terms: primers, screeds, coverage rates, bills of quantities and more.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        name: "FRELUX Construction Glossary",
        url: `${SITE_URL}/glossary`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Glossary",
            item: `${SITE_URL}/glossary`,
          },
        ],
      },
    ],
  },
  {
    path: "/prices",
    title:
      "Material Prices: Live Construction & Paint Price Book | FRELUX SMART CALC",
    description:
      "Browse the FRELUX material price book: current prices for cement, paint, aggregates, plumbing, electrical and more, with sources, effective dates, and weekly movement.",
    priority: "0.8",
    changefreq: "daily",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Material Prices",
            item: `${SITE_URL}/prices`,
          },
        ],
      },
    ],
  },
  {
    path: "/learn/library",
    title: "All Guides: The Complete FRELUX Learn Library | FRELUX SMART CALC",
    description:
      "Browse every published guide in the FRELUX Learn library: painting, screeding, POP ceiling, tiling, finishing, and construction tutorials.",
    priority: "0.7",
    changefreq: "daily",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Learn",
            item: `${SITE_URL}/learn`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "All Guides",
            item: `${SITE_URL}/learn/library`,
          },
        ],
      },
    ],
  },
  {
    path: "/user-guide",
    title: "FRELUX User Guide: How to Use Every Calculator and Feature",
    description:
      "Step by step guide to FRELUX: paint, screeding, tiling and POP ceiling calculators, AI floor plan estimation, saving estimates, PDF export, projects, pricing and regional settings.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Learn",
            item: `${SITE_URL}/learn`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "User Guide",
            item: `${SITE_URL}/user-guide`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Do I need an account to use FRELUX calculators?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. All calculators are free to use with no sign-up required. A free account is only needed to save projects and estimate history.",
            },
          },
          {
            "@type": "Question",
            name: "Can I enter measurements in feet?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Pick metres or feet before you calculate and FRELUX converts internally. Results are always shown in metric units because materials are sold that way.",
            },
          },
          {
            "@type": "Question",
            name: "Where do FRELUX prices come from?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Prices come from, in order of preference: a price you entered yourself, a verified market price for your region where FRELUX has one, or nothing. FRELUX tells you a price is needed instead of guessing.",
            },
          },
          {
            "@type": "Question",
            name: "Is FRELUX a substitute for a qualified engineer?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Structural, foundation and roof quantities are budgeting estimates. A qualified engineer must review and approve anything structural before you build.",
            },
          },
          {
            "@type": "Question",
            name: "Does the AI invent numbers?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. The AI extracts data such as room dimensions from a floor plan image and marks its confidence. All quantities come from the same deterministic calculators, and unconfirmed values are never used.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/templates",
    title: "Calculator Templates: FRELUX",
    description:
      "Professionally curated templates for common painting, tiling, screeding, and POP ceiling projects using the FRELUX calculation engine.",
    priority: "0.6",
    changefreq: "weekly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Templates",
            item: `${SITE_URL}/templates`,
          },
        ],
      },
    ],
  },
  {
    path: "/templates/standard-living-room-painting",
    title:
      "Paint Calculator Template: Standard Living Room | FRELUX SMART CALC",
    description:
      "Calculate paint needed for a standard living room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/master-bedroom-painting",
    title: "Paint Calculator Template: Master Bedroom | FRELUX SMART CALC",
    description:
      "Calculate paint needed for a master bedroom with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/single-accent-wall-painting",
    title: "Paint Calculator Template: Single Accent Wall | FRELUX SMART CALC",
    description:
      "Calculate paint for a single accent wall with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/exterior-bungalow-painting",
    title: "Paint Calculator Template: Exterior Bungalow | FRELUX SMART CALC",
    description:
      "Calculate paint for exterior bungalow walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/dining-room-painting",
    title: "Paint Calculator Template: Dining Room | FRELUX SMART CALC",
    description:
      "Calculate paint needed for a dining room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/childrens-room-painting",
    title: "Paint Calculator Template: Children's Room | FRELUX SMART CALC",
    description:
      "Calculate paint needed for a children's room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-walls-painting",
    title: "Paint Calculator Template: Kitchen Walls | FRELUX SMART CALC",
    description:
      "Calculate paint needed for kitchen walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-stairwell-painting",
    title:
      "Paint Calculator Template: Corridor & Stairwell | FRELUX SMART CALC",
    description:
      "Calculate paint for corridors and stairwells with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/2-bedroom-flat-full-painting",
    title: "Paint Calculator Template: 2-Bedroom Flat | FRELUX SMART CALC",
    description:
      "Calculate paint for a complete 2-bedroom flat with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/office-space-painting",
    title: "Paint Calculator Template: Office Space | FRELUX SMART CALC",
    description:
      "Calculate paint needed for office space with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/exterior-duplex-painting",
    title: "Paint Calculator Template: Exterior Duplex | FRELUX SMART CALC",
    description:
      "Calculate paint for exterior duplex walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/shop-retail-front-painting",
    title: "Paint Calculator Template: Shop / Retail Front | FRELUX SMART CALC",
    description:
      "Calculate paint for shop and retail fronts with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/standard-floor-tiling",
    title:
      "Tile Calculator Template: Standard Floor Tiling | FRELUX SMART CALC",
    description:
      "Calculate tiles, adhesive, and grout for a standard floor with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/bathroom-wall-tiling",
    title: "Tile Calculator Template: Bathroom Wall Tiles | FRELUX SMART CALC",
    description:
      "Calculate tiles for bathroom walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/large-hall-floor-tiling",
    title: "Tile Calculator Template: Large Hall Floor | FRELUX SMART CALC",
    description:
      "Calculate tiles for a large hall floor with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-backsplash-tiling",
    title: "Tile Calculator Template: Kitchen Backsplash | FRELUX SMART CALC",
    description:
      "Calculate tiles for a kitchen backsplash with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/balcony-floor-tiling",
    title: "Tile Calculator Template: Balcony Floor Tiling | FRELUX SMART CALC",
    description:
      "Calculate tiles for balcony floors with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-floor-tiling",
    title: "Tile Calculator Template: Kitchen Floor Tiles | FRELUX SMART CALC",
    description:
      "Calculate tiles for kitchen floors with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/guest-toilet-wall-tiling",
    title:
      "Tile Calculator Template: Guest Toilet Wall Tiles | FRELUX SMART CALC",
    description:
      "Calculate tiles for guest toilet walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/staircase-tiling",
    title: "Tile Calculator Template: Staircase Tiling | FRELUX SMART CALC",
    description: "Calculate tiles for staircases with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/terrazzo-porcelain-floor-tiling",
    title:
      "Tile Calculator Template: Large Format Porcelain Floor | FRELUX SMART CALC",
    description:
      "Calculate tiles for large format porcelain floors with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/wall-feature-strip-tiling",
    title: "Tile Calculator Template: Wall Feature Strip | FRELUX SMART CALC",
    description:
      "Calculate tiles for decorative wall feature strips with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/standard-room-screeding",
    title: "Screeding Calculator Template: Standard Room | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for a standard room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/single-wall-screeding",
    title: "Screeding Calculator Template: Single Wall | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for a single wall with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/living-room-ceiling-screeding",
    title:
      "Screeding Calculator Template: Living Room + Ceiling | FRELUX SMART CALC",
    description:
      "Calculate screeding for living room walls and ceiling with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-walls-screeding",
    title: "Screeding Calculator Template: Corridor Walls | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for corridor walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/dining-room-screeding",
    title: "Screeding Calculator Template: Dining Room | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for a dining room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/office-screeding",
    title: "Screeding Calculator Template: Office | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for office walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-screeding",
    title: "Screeding Calculator Template: Corridor | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for corridors with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/single-feature-wall-screeding",
    title:
      "Screeding Calculator Template: Single Feature Wall | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for a single feature wall with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/shop-front-screeding",
    title: "Screeding Calculator Template: Shop Front | FRELUX SMART CALC",
    description:
      "Calculate screeding materials for shop front walls with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/standard-bedroom-pop-ceiling",
    title:
      "POP Ceiling Calculator Template: Standard Bedroom | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a standard bedroom with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/large-living-room-pop-ceiling",
    title:
      "POP Ceiling Calculator Template: Large Living Room | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a large living room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/small-office-pop-ceiling",
    title: "POP Ceiling Calculator Template: Small Office | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a small office with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/hall-cornice-pop-ceiling",
    title:
      "POP Ceiling Calculator Template: Hall Ceiling with Cornice | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a large hall with cornice with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/dining-room-pop-ceiling",
    title: "POP Ceiling Calculator Template: Dining Room | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a dining room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/kitchen-pop-ceiling",
    title: "POP Ceiling Calculator Template: Kitchen | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a kitchen with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/corridor-pop-ceiling",
    title: "POP Ceiling Calculator Template: Corridor | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a corridor with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/master-bedroom-pop-ceiling",
    title:
      "POP Ceiling Calculator Template: Master Bedroom | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a master bedroom with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/templates/conference-room-pop-ceiling",
    title:
      "POP Ceiling Calculator Template: Conference Room | FRELUX SMART CALC",
    description:
      "Calculate POP ceiling materials for a large conference room with this FRELUX template.",
    priority: "0.5",
    changefreq: "monthly",
  },

  // ── Construction calculators & estimators (missing from original) ──
  {
    path: "/build-to-roof-estimator",
    title:
      "Build-to-Roof Estimator: Full Construction Cost | FRELUX SMART CALC",
    description:
      "Estimate materials and costs for a complete build from foundation to roof. Blocks, cement, sand, granite, roofing, labour, and structural members for building projects.",
    priority: "0.9",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Build-to-Roof Estimator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Build-to-Roof Estimator",
            item: `${SITE_URL}/build-to-roof-estimator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What does the Build-to-Roof Estimator calculate?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It estimates materials and costs for a full building project from foundation through roof, including blocks, cement, sand, granite, roofing sheets, structural members, and labour based on practical construction standards.",
            },
          },
          {
            "@type": "Question",
            name: "Can I estimate costs for different building types?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. The estimator supports bungalows, duplexes, and multi-storey buildings with configurable foundation types, wall heights, and roofing materials.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/image-estimator",
    title: "AI Photo Estimator: Estimate from a Photo | FRELUX SMART CALC",
    description:
      "Upload a photo of your construction site, room, or building and get an AI-powered material and cost estimate. Visual estimation for painting, tiling, and construction projects.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX AI Photo Estimator",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "AI Photo Estimator",
            item: `${SITE_URL}/image-estimator`,
          },
        ],
      },
    ],
  },
  {
    path: "/smart-calculator",
    title:
      "Smart Calculator: AI-Powered Construction Estimator | FRELUX SMART CALC",
    description:
      "Describe any construction project in plain language and get an AI-powered cost estimate with material quantities, line items, and savings recommendations.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Smart Calculator",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Smart Calculator",
            item: `${SITE_URL}/smart-calculator`,
          },
        ],
      },
    ],
  },
  {
    path: "/structural-calculator",
    title: "Structural Calculator: Beams, Columns & Slabs | FRELUX SMART CALC",
    description:
      "Calculate structural member sizes for building projects. Beam dimensions, column sizing, slab thickness, and reinforcement estimates.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Structural Calculator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Structural Calculator",
            item: `${SITE_URL}/structural-calculator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What does the Structural Calculator compute?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It calculates beam depths and widths, column cross-sections, slab thickness, and reinforcement quantities based on span, loading, and standard concrete mix practice.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/foundation-calculator",
    title: "Foundation Calculator: Sizing & Materials | FRELUX SMART CALC",
    description:
      "Calculate foundation sizes and materials for building projects. Strip footing, pad foundation, and raft foundation estimates with soil bearing capacity guidance.",
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Foundation Calculator",
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Foundation Calculator",
            item: `${SITE_URL}/foundation-calculator`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What foundation types does the calculator support?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Foundation Calculator supports strip footings, pad foundations, and raft foundations with typical soil bearing capacities for preliminary sizing and budgeting.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need a soil test before using the foundation calculator?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. A geotechnical investigation is mandatory for actual foundation design. The calculator uses typical soil bearing capacities for preliminary sizing only.",
            },
          },
        ],
      },
    ],
  },
  {
    path: "/construction-sequence",
    title: "Construction Sequence Planner | FRELUX SMART CALC",
    description:
      "Plan your building project step by step. From site clearance to finishing, get a construction timeline with material and labour requirements for each phase.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Construction Sequence Planner",
        applicationCategory: "ProjectManagementApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Construction Sequence",
            item: `${SITE_URL}/construction-sequence`,
          },
        ],
      },
    ],
  },
  {
    path: "/project-timeline",
    title: "Project Timeline Builder | FRELUX SMART CALC",
    description:
      "Create a construction project timeline with phases, milestones, and material schedules. Track progress from foundation to finishing.",
    priority: "0.7",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FRELUX Project Timeline",
        applicationCategory: "ProjectManagementApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Project Timeline",
            item: `${SITE_URL}/project-timeline`,
          },
        ],
      },
    ],
  },
  {
    path: "/pricing",
    title: "Pricing & Plans | FRELUX SMART CALC",
    description:
      "Compare FRELUX plans. Free calculators, Pro features for professionals, and enterprise options for construction firms.",
    priority: "0.6",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Pricing",
            item: `${SITE_URL}/pricing`,
          },
        ],
      },
    ],
  },
  {
    path: "/marketplace",
    title:
      "Construction Marketplace: Buy & Sell Building Materials | FRELUX SMART CALC",
    description:
      "Browse construction materials, tools, and services from suppliers across supported markets. Find paints, tiles, cement, tools, and professional services near you.",
    priority: "0.8",
    changefreq: "daily",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "FRELUX Construction Marketplace",
        description:
          "Buy and sell construction materials, tools, and services across supported markets.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Marketplace",
            item: `${SITE_URL}/marketplace`,
          },
        ],
      },
    ],
  },
  {
    path: "/pro-connect",
    title:
      "Pro Connect: Find Verified Construction Professionals | FRELUX SMART CALC",
    description:
      "Connect with verified painters, tilers, screeders, POP ceiling specialists, and builders across supported markets. Browse profiles, compare services, and hire professionals.",
    priority: "0.8",
    changefreq: "weekly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "FRELUX Pro Connect Directory",
        description: "Find verified construction professionals near you.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Pro Connect",
            item: `${SITE_URL}/pro-connect`,
          },
        ],
      },
    ],
  },
  {
    path: "/calculators",
    title: "All Calculators & Estimators | FRELUX SMART CALC",
    description:
      "Browse every FRELUX calculator and estimator: paint, screeding, POP ceiling, tiles, tyrolene, finishing, structural, foundation, build-to-roof, and cost estimators. Free construction material calculators.",
    priority: "0.9",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "FRELUX Calculators & Estimators",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Build-to-Roof Estimator",
            url: `${SITE_URL}/build-to-roof-estimator`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Paint Calculator",
            url: `${SITE_URL}/paint-calculator`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Painting Estimator",
            url: `${SITE_URL}/painting-estimator`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "Screeding Calculator",
            url: `${SITE_URL}/screeding-calculator`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "POP Ceiling Calculator",
            url: `${SITE_URL}/pop-ceiling-calculator`,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "Tile Calculator",
            url: `${SITE_URL}/tile-calculator`,
          },
          {
            "@type": "ListItem",
            position: 7,
            name: "Structural Calculator",
            url: `${SITE_URL}/structural-calculator`,
          },
          {
            "@type": "ListItem",
            position: 8,
            name: "Foundation Calculator",
            url: `${SITE_URL}/foundation-calculator`,
          },
          {
            "@type": "ListItem",
            position: 9,
            name: "AI Photo Estimator",
            url: `${SITE_URL}/image-estimator`,
          },
          {
            "@type": "ListItem",
            position: 10,
            name: "Finish Estimator",
            url: `${SITE_URL}/finish-estimator`,
          },
          {
            "@type": "ListItem",
            position: 11,
            name: "Tyrolene Estimator",
            url: `${SITE_URL}/tyrolene-estimator`,
          },
          {
            "@type": "ListItem",
            position: 12,
            name: "Cost Estimator",
            url: `${SITE_URL}/cost-estimator`,
          },
          {
            "@type": "ListItem",
            position: 13,
            name: "Screeding Cost Estimator",
            url: `${SITE_URL}/screeding-cost-estimator`,
          },
          {
            "@type": "ListItem",
            position: 14,
            name: "POP Ceiling Cost Estimator",
            url: `${SITE_URL}/pop-ceiling-cost-estimator`,
          },
          {
            "@type": "ListItem",
            position: 15,
            name: "Tile Cost Estimator",
            url: `${SITE_URL}/tile-cost-estimator`,
          },
        ],
      },
    ],
  },

  // ── About / Contact / Legal ──
  {
    path: "/about",
    title: "About FRELUX SMART CALC",
    description:
      "Learn about FRELUX, a construction intelligence and project estimation platform designed for international use, with localized settings and market data available where supported.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/contact",
    title: "Contact FRELUX SMART CALC",
    description:
      "Get in touch with the FRELUX team. Send us your questions, feedback, or partnership inquiries.",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy: FRELUX SMART CALC",
    description:
      "How FRELUX SMART CALC handles your information when you use our website and tools.",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/terms",
    title: "Terms of Service: FRELUX SMART CALC",
    description:
      "Terms of service for using FRELUX SMART CALC tools and website.",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/cookie-policy",
    title: "Cookie Policy: FRELUX SMART CALC",
    description:
      "How FRELUX SMART CALC uses cookies and how they improve your experience.",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/disclaimer",
    title: "Disclaimer: FRELUX SMART CALC",
    description:
      "Disclaimer for FRELUX SMART CALC tools and estimates. All calculations and estimates are for guidance only.",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/bim-ifc-import",
    title: "BIM IFC Import | FRELUX SMART CALC",
    description:
      "Import IFC building models and generate material quantities and cost estimates from your BIM data.",
  },
  {
    path: "/boq-generator",
    title: "BOQ Generator | FRELUX SMART CALC",
    description:
      "Generate a professional bill of quantities from your FRELUX estimates.",
  },
  {
    path: "/suppliers",
    title:
      "Construction material suppliers and verified prices | FRELUX SMART CALC",
    description:
      "Find construction material suppliers by city, category and verification level. Compare specifications, prices and delivery coverage, then request quotations.",
  },
  {
    path: "/suppliers/register",
    title:
      "Register a construction material supply business | FRELUX SMART CALC",
    description:
      "List your material catalogue, delivery coverage and prices for FRELUX buyers. Registration starts unverified and each level states what was checked.",
  },
  {
    path: "/suppliers/compare",
    title: "Compare material suppliers and landed prices | FRELUX SMART CALC",
    description:
      "Compare supplier prices, specifications and delivery charges. Offers with different specifications are shown separately, never ranked as identical.",
  },
  {
    path: "/procurement",
    title: "Material requests and supplier quotations | FRELUX SMART CALC",
    description:
      "Post a material request, collect supplier quotations, compare them line by line, award the best one and track delivery.",
  },
  {
    path: "/boq-studio",
    title: "Bill of Quantities Studio | FRELUX SMART CALC",
    description:
      "Build a structured bill of quantities from your FRELUX calculator results and export it to PDF, Excel or print.",
  },
  {
    path: "/brand-studio",
    title: "FRELUX Brand Studio | FRELUX SMART CALC",
    description:
      "FRELUX brand assets, usage guidance, and design resources for partners and contributors.",
  },
  {
    path: "/carbon-footprint",
    title: "Carbon Footprint Calculator | FRELUX SMART CALC",
    description:
      "Estimate the embodied carbon of your construction materials and compare choices.",
  },
  {
    path: "/cash-flow-timeline",
    title: "Cash Flow Timeline | FRELUX SMART CALC",
    description:
      "Map project payments against construction milestones to see when money is needed.",
  },
  {
    path: "/circular-reuse",
    title: "Circular Reuse Planner | FRELUX SMART CALC",
    description:
      "Plan material reuse across projects to cut cost and construction waste.",
  },
  {
    path: "/construction-tools",
    title: "All Construction Tools and Calculators | FRELUX SMART CALC",
    description:
      "Browse every FRELUX construction calculator, cost estimator, and property intelligence tool in one directory. Free, no sign-up required.",
  },
  {
    path: "/tools/finishes",
    title: "Materials and Finishes Tools | FRELUX SMART CALC",
    description:
      "Browse FRELUX calculators and estimators for paint, screeding, tiling, flooring, waterproofing, and ceiling finishes.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/tools/structure",
    title: "Building Structure Tools | FRELUX SMART CALC",
    description:
      "Browse FRELUX tools for building structure, concrete, foundations, reinforcement, and build-to-roof planning.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/tools/services",
    title: "Building Services Tools | FRELUX SMART CALC",
    description:
      "Browse FRELUX electrical, plumbing, solar, backup power, and indoor comfort tools.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/tools/components",
    title: "Building Components Tools | FRELUX SMART CALC",
    description:
      "Browse FRELUX tools for doors, windows, and configurable building components.",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/tools/project",
    title: "Project and Cost Tools | FRELUX SMART CALC",
    description:
      "Browse FRELUX project and cost tools for budgets, bills of quantities, labour, timelines, and cost planning.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/tools/ai",
    title: "AI Construction Tools | FRELUX SMART CALC",
    description:
      "Browse FRELUX photo, chat, and vision assistants for construction estimation and planning.",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/tools/pro",
    title: "Pro and Field Tools | FRELUX SMART CALC",
    description:
      "Browse FRELUX tools for construction professionals working with plans, projects, and on-site data.",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/contractor-credit",
    title: "Contractor Credit | FRELUX SMART CALC",
    description:
      "Explore credit options for contractors and material financing for your projects.",
  },
  {
    path: "/conversational-estimator",
    title: "Conversational Estimator | FRELUX SMART CALC",
    description:
      "Describe your project in plain language and get a structured material and cost estimate you can refine.",
  },
  {
    path: "/count-vision",
    title: "Count Vision | FRELUX SMART CALC",
    description:
      "Count construction objects such as blocks, bags, and tiles from a photo using AI vision, then feed the numbers into estimates.",
  },
  {
    path: "/credits",
    title: "FRELUX Credits | FRELUX SMART CALC",
    description:
      "Buy AI credits and token packs to power FRELUX AI features. Check balances and purchase history.",
  },
  {
    path: "/data-request",
    title: "Data Subject Request | FRELUX SMART CALC",
    description:
      "Request a copy of your FRELUX account data or ask us to delete it. We verify your identity and respond within statutory timeframes.",
  },
  {
    path: "/defect-diagnosis",
    title: "Defect Diagnosis | FRELUX SMART CALC",
    description:
      "Diagnose common construction defects, understand causes, and get remediation guidance.",
  },
  {
    path: "/developers",
    title: "FRELUX Developer Resources | FRELUX SMART CALC",
    description:
      "FRELUX APIs, integration guides, and developer documentation.",
  },
  {
    path: "/global-markets",
    title: "Construction Markets and Regional Standards | FRELUX SMART CALC",
    description:
      "Browse FRELUX market profiles, including available local standards, electrical and plumbing practices, currencies, and calculator settings. Coverage varies by market and feature.",
  },
  {
    path: "/faq",
    title: "Construction and Material Questions, Answered | FRELUX SMART CALC",
    description:
      "Answers to the questions people ask before buying building materials: paint and tile quantities, screed and POP materials, foundation concrete, retaining wall footings, gutters, conduit and steel beam weight.",
  },
  {
    path: "/retaining-wall-calculator",
    title: "Retaining Wall Material and Cost Calculator | FRELUX SMART CALC",
    description:
      "Size footing concrete, blocks, reinforcement and weep holes for a retaining wall from wall length, height and soil type, with every quantity traced to its rule.",
  },
  {
    path: "/rainwater-gutter-soffit-cost-estimator",
    title: "Soffit, Fascia and Rainwater Gutter Estimator | FRELUX SMART CALC",
    description:
      "Turn the eaves perimeter into fascia, gutter, soffit area, downpipes and brackets, with a cutting allowance and downpipes every 12 metres.",
  },
  {
    path: "/electrical-conduit-wiring-estimator",
    title:
      "Electrical Conduit and Wiring Material Estimator | FRELUX SMART CALC",
    description:
      "Estimate PVC conduit lengths, 1.5 mm and 2.5 mm cable coils, junction boxes, switch plates and sockets from floor area and point counts.",
  },
  {
    path: "/water-tower-staging-estimator",
    title: "Overhead Water Tank Staging Estimator | FRELUX SMART CALC",
    description:
      "Calculate dead load, wind overturning safety factor and a preliminary steel or concrete bill of quantities for overhead water tank towers, with pad footing sizes and a step by step animated build sequence.",
  },
  {
    path: "/global-site-safety-estimator",
    title: "Global Site Safety & PPE Estimator | FRELUX SMART CALC",
    description:
      "Plan PPE, site warning signs, excavation barriers and emergency inventory with editable assumptions and OSHA, UK HSE/CDM or ISO 7010 references. Not a compliance certification.",
  },
  {
    path: "/diaspora-budget-tracker",
    title:
      "Diaspora Construction Budget and Inflation Tracker | FRELUX SMART CALC",
    description:
      "Track overseas construction funds against local currency inflation, parallel exchange rates, and on-site material deviations.",
  },
  {
    path: "/structural-steel-i-beam-calculator",
    title:
      "Structural Steel I-Beam Weight and Cost Calculator | FRELUX SMART CALC",
    description:
      "Convert span and steel profile into kilograms and tonnes, then cost them at your own merchant rate per tonne.",
  },
  {
    path: "/doors-windows",
    title: "Doors and Windows Estimator | FRELUX SMART CALC",
    description:
      "Estimate door and window quantities, hardware, and installation labour.",
  },
  {
    path: "/electrical",
    title: "Electrical Estimator | FRELUX SMART CALC",
    description:
      "Estimate electrical materials, wiring, fittings, and labour for residential and commercial projects.",
  },
  {
    path: "/estimate-refresh",
    title: "Estimate Refresh | FRELUX SMART CALC",
    description:
      "Reprice saved estimates with current market prices so old numbers stay useful.",
  },
  {
    path: "/feedback",
    title: "Send Feedback to FRELUX | FRELUX SMART CALC",
    description:
      "Share feedback on FRELUX calculators, estimators, and the website. Tell us what to improve.",
  },
  {
    path: "/field-sync",
    title: "Field Sync | FRELUX SMART CALC",
    description:
      "Sync project measurements and estimates between the office and the construction site.",
  },
  {
    path: "/flooring",
    title: "Flooring Estimator | FRELUX SMART CALC",
    description:
      "Estimate flooring materials, quantities, and labour for any room or building.",
  },
  {
    path: "/foundation",
    title: "Foundation Estimator | FRELUX SMART CALC",
    description:
      "Estimate foundation materials and cost from footings to ground slab, with engineer referral for structural sizing.",
  },
  {
    path: "/generator",
    title: "Generator Estimator | FRELUX SMART CALC",
    description:
      "Size a generator for your load profile and estimate purchase and installation cost.",
  },
  {
    path: "/heat-comfort",
    title: "Heat and Comfort Analyser | FRELUX SMART CALC",
    description:
      "Analyse indoor heat comfort for your building design and material choices.",
  },
  {
    path: "/material-price-index",
    title: "Live Material Price Index | FRELUX SMART CALC",
    description:
      "Construction material prices across Lagos, Abuja, Port Harcourt, Onitsha, Ibadan, Kano and more, with sample sizes, sources and last verification dates. Figures are published only when at least three independent prices support them.",
  },
  {
    path: "/code-reference",
    title: "International Building Code Reference | FRELUX SMART CALC",
    description:
      "Select your project country and building type to see the applicable building code, edition and standards for concrete, reinforcement, loads, wind, snow, foundations, durability and materials, with unsupported regulations identified and no cross-country parameter substitution.",
  },
  {
    path: "/material-advisor",
    title: "Climate-Responsive Material Advisor | FRELUX SMART CALC",
    description:
      "Choose your project location and get construction material guidance for its real climate: rainfall, humidity, UV, coastal exposure and frost, across paints, waterproofing, roofing, tiles, concrete exposure, steel protection, insulation and drainage.",
  },
  {
    path: "/diaspora-tracker",
    title: "Diaspora Site Tracker | FRELUX SMART CALC",
    description:
      "Monitor a construction project in Nigeria from abroad: daily site reports, owner-approved expenditure, material delivery discrepancies, milestone decisions and private photographic evidence, with role-based access for owners, site managers, contractors and inspectors.",
  },
  {
    path: "/site-intelligence",
    title: "Site & Soil Intelligence | FRELUX SMART CALC",
    description:
      "Screen a project location for soil classification, groundwater, flood and terrain signals, compare preliminary foundation scenarios on a bearing capacity you supply, and attach geotechnical reports for review. Screening information only, never a foundation design.",
  },
  {
    path: "/labour-estimator",
    title: "Labour Estimator | FRELUX SMART CALC",
    description:
      "Estimate labour costs by trade and task with configurable rates for your market.",
  },
  {
    path: "/maintenance-planner",
    title: "Maintenance Planner | FRELUX SMART CALC",
    description:
      "Plan building maintenance schedules with cost estimates for each task.",
  },
  {
    path: "/concrete-takeoff-calculator",
    title: "Concrete Slab Takeoff | FRELUX SMART CALC",
    description:
      "Estimate concrete slab quantities from measured dimensions, a specified mix ratio and an optional engineer-provided rebar schedule.",
  },
  {
    path: "/margin-calculator",
    title: "Margin Calculator | FRELUX SMART CALC",
    description:
      "Calculate profit margins on construction quotes with material, labour, and overhead inputs.",
  },
  {
    path: "/quote-check",
    title: "Contractor Quote Check Against Market Prices | FRELUX",
    description:
      "Check a contractor or supplier quote line by line against the market price book, and see which lines are above market and which have no reference price.",
  },
  {
    path: "/plumbing",
    title: "Plumbing Estimator | FRELUX SMART CALC",
    description:
      "Estimate plumbing materials, pipes, fittings, and labour for residential and commercial projects.",
  },
  {
    path: "/regional-cost-index",
    title: "Regional Cost Index | FRELUX SMART CALC",
    description:
      "Compare construction costs across regions with the FRELUX regional cost index.",
  },
  {
    path: "/reinforcement",
    title: "Reinforcement Estimator | FRELUX SMART CALC",
    description:
      "Estimate reinforcement bars, mesh, and accessories for slabs, beams, columns, and foundations.",
  },
  {
    path: "/partners",
    title: "Partner with FRELUX | FRELUX SMART CALC",
    description:
      "Partner with FRELUX to bring construction intelligence to your audience, products, or professional network.",
  },
  {
    path: "/rewards",
    title: "FRELUX Rewards | FRELUX SMART CALC",
    description:
      "Earn FRELUX credits through rewards, referrals, and community contributions.",
  },
  {
    path: "/solar-pv-estimator",
    title: "Solar PV Estimator | FRELUX SMART CALC",
    description:
      "Size a solar power system, get the bill of materials, and estimate installation cost for your market.",
  },
  {
    path: "/masonry-calculator",
    title: "Masonry & Blockwork Calculator | FRELUX SMART CALC",
    description:
      "Estimate masonry units and mortar quantities from wall measurements.",
  },
  {
    path: "/plastering-calculator",
    title: "Plastering & Rendering Calculator | FRELUX SMART CALC",
    description:
      "Estimate plaster and render material quantities from surface area and thickness.",
  },
  {
    path: "/drywall-calculator",
    title: "Drywall & Partition Calculator | FRELUX SMART CALC",
    description:
      "Estimate drywall boards, framing and jointing material quantities.",
  },
  {
    path: "/paving-calculator",
    title: "Paving Takeoff Calculator | FRELUX SMART CALC",
    description:
      "Estimate pavers, bedding and sub-base quantities for external works.",
  },
  {
    path: "/drainage-calculator",
    title: "External Drainage Takeoff | FRELUX SMART CALC",
    description:
      "Estimate drainage pipe, trench and bedding quantities; not a hydraulic design.",
  },
  {
    path: "/septic-sizing-calculator",
    title: "Septic & Soakaway Worksheet | FRELUX SMART CALC",
    description:
      "Estimate preliminary tank volume and soakaway area from locally approved, user-entered design criteria.",
  },
  {
    path: "/temporary-works-calculator",
    title: "Formwork & Temporary Works Calculator | FRELUX SMART CALC",
    description:
      "Estimate form contact area and simplified temporary works quantities; not a design.",
  },
  {
    path: "/insulation-calculator",
    title: "Insulation Takeoff Calculator | FRELUX SMART CALC",
    description:
      "Estimate insulation product quantities by area, thickness and coverage.",
  },
  {
    path: "/demolition-calculator",
    title: "Demolition & Debris Takeoff | FRELUX SMART CALC",
    description:
      "Estimate demolition debris volumes and indicative skip loads.",
  },
  {
    path: "/blueprint-takeoff",
    title: "Blueprint & PDF Plan Takeoff | FRELUX SMART CALC",
    description:
      "Calibrate a plan drawing and measure linear, area and counted quantities.",
  },
  {
    path: "/wall-finish-estimator",
    title: "Wall Finish Estimator | FRELUX SMART CALC",
    description:
      "Estimate modern wall finish systems including mineral stone and stucco with layers, labour, and quality control.",
  },
  {
    path: "/warranty-certificate",
    title: "Warranty Certificate | FRELUX SMART CALC",
    description:
      "Generate a professional warranty certificate for completed construction work.",
  },
  {
    path: "/waterproofing",
    title: "Waterproofing Estimator | FRELUX SMART CALC",
    description:
      "Estimate waterproofing materials for roofs, walls, wet areas, and foundations.",
  },
  {
    path: "/ai-disclaimer",
    title: "AI Disclaimer: FRELUX SMART CALC",
    description: "Disclaimer for AI-powered features in FRELUX SMART CALC.",
    priority: "0.3",
    changefreq: "yearly",
  },
  {
    path: "/earthworks-cut-fill",
    title: "Earthworks Cut & Fill Calculator | FRELUX SMART CALC",
    description:
      "Calculate cut, fill and haul quantities from surveyed or designed cross-sections using the average-end-area method.",
  },
  {
    path: "/roof-framing-calculator",
    title: "Roof Framing & Board Feet Calculator | FRELUX SMART CALC",
    description:
      "Calculate timber quantities, member counts, lengths, linear metres and board feet for regular gable and hip roofs.",
  },
  {
    path: "/increte-flooring-calculator",
    title: "Increte Flooring Calculator & Estimator | FRELUX SMART CALC",
    description:
      "Estimate decorative concrete flooring quantities using explicit product coverage, coats, waste, local prices and installation inputs.",
  },
  {
    path: "/visual-finishing-estimator",
    title:
      "Visual Finishing Estimator | FRELUX Global Visual Construction Intelligence",
    description:
      "Estimate painting, screeding, tiling, POP ceilings, and flooring directly from room and surface photographs with verified metric calibration.",
  },
  {
    path: "/tools/visual-finishing-estimator",
    title:
      "Visual Finishing Estimator | FRELUX Global Visual Construction Intelligence",
    description:
      "Estimate painting, screeding, tiling, POP ceilings, and flooring directly from room and surface photographs with verified metric calibration.",
  },
];

// Locales whose reviewed translations are live. A locale page is only
// indexable when a published content_translations row exists for it; every
// other locale page is emitted as a noindex stub pointing at the English
// canonical. Keep in sync with src/lib/translation-index.ts.
// Mirrors INDEXABLE_LOCALES in src/lib/translation-index.ts. Raising this list
// alone does nothing yet: the loop below only emits locale pages for translated
// learn articles. Locale route emission has to exist before a locale goes live.
const INDEXABLE_LOCALES = ["es"];

// ── Learn section: dynamic article + category pages from Supabase ───
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

// Convert article markdown into safe static HTML for prerendered routes.
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function mdInline(s) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return out;
}
function markdownToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  let listType = null; // 'ul' | 'ol'
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      closeList();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++;
      out.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
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
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${mdInline(ul[1])}</li>`);
      i++;
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${mdInline(ol[1])}</li>`);
      i++;
      continue;
    }
    if (trimmed === "") {
      closeList();
      i++;
      continue;
    }
    // Table rows: render as a simple definition list (pipes are rare in prose)
    if (trimmed.startsWith("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c && !/^[\-: ]+$/.test(c));
      if (cells.length) {
        if (!out.length || !out[out.length - 1].startsWith("<table>")) {
          closeList();
          out.push("<table>");
        }
        out.push(
          `<tr>${cells.map((c) => `<td>${mdInline(c)}</td>`).join("")}</tr>`,
        );
        i++;
        continue;
      }
    }
    if (out.length && out[out.length - 1].startsWith("<table>")) {
      out.push("</table>");
    }
    closeList();
    out.push(`<p>${mdInline(trimmed)}</p>`);
    i++;
  }
  if (out.length && out[out.length - 1].startsWith("<table>"))
    out.push("</table>");
  closeList();
  return out.join("\n");
}

// On Netlify builds, a failed Supabase fetch must fail the build: without
// prerendered article pages every /learn/<slug> URL serves a duplicate
// of the home page, which Google and AdSense both read as low-value
// content. Local dev (no env / no NETLIFY) keeps the skip.
const failBuildIfNetlify = (reason) => {
  if (process.env.NETLIFY) {
    console.error(
      `\n ❌ ${reason} — failing the build so article pages cannot silently vanish.\n`,
    );
    process.exit(1);
  }
  console.log(`  ⚠️  ${reason} — skipping dynamic Learn pages (local dev)`);
};

async function fetchLearnPages() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    failBuildIfNetlify(
      "Supabase env vars missing — dynamic Learn article pages skipped",
    );
    return { routes: [], content: {} };
  }
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const learnRoutes = [];
  // Article bodies carry their own markdown H1 for the title. Each page injects
  // exactly one H1, so every body H1 is demoted to H2 (315 pages previously
  // shipped two H1s with the same text).
  const demoteH1 = (md) => String(md || "").replace(/^#[ \t]+/gm, "## ");

  const learnContent = {};
  // Hoisted so the wall-finishing market hubs below can read them even when
  // the Learn tables are unreachable (local dev, rate limits).
  let cats = [];
  let arts = [];
  try {
    const [catRes, artRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/learn_categories?select=slug,name,description,is_active&is_active=eq.true&order=sort_order.asc`,
        { headers },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/learn_articles?select=slug,title,excerpt,content,meta_title,meta_description,category_slug,author,read_time_minutes,cover_image_url,published_at,updated_at,wall_market_code&status=eq.published&order=published_at.desc&limit=1000`,
        { headers },
      ),
    ]);

    if (catRes.ok && artRes.ok) {
      cats = await catRes.json();
      arts = await artRes.json();

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
          description: (
            c.description ||
            `Guides and articles about ${c.name.toLowerCase()} from the FRELUX Learn hub.`
          ).slice(0, 160),
          priority: "0.6",
          changefreq: "weekly",
          structuredData: [
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Learn",
                  item: `${SITE_URL}/learn`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: c.name,
                  item: `${SITE_URL}/learn/category/${c.slug}`,
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: `${c.name} | FRELUX Learn`,
              description: (c.description || "").slice(0, 300),
              url: `${SITE_URL}/learn/category/${c.slug}`,
            },
          ],
        });
        const listing = catArts
          .map(
            (a) =>
              `<li><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a>${a.excerpt ? `: ${escapeHtml(a.excerpt.slice(0, 140))}` : ""}</li>`,
          )
          .join("");
        // An active category with no published article yet is not a dead end:
        // say so plainly and route the reader to the categories that do have
        // guides, with their real counts. No placeholder article is invented.
        const siblings = cats
          .filter((other) => other.slug !== c.slug)
          .map((other) => ({
            name: other.name,
            slug: other.slug,
            count: arts.filter((a) => a.category_slug === other.slug).length,
          }))
          .filter((other) => other.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        const siblingList = siblings
          .map(
            (other) =>
              `<li><a href="/learn/category/${other.slug}">${escapeHtml(other.name)}</a>: ${other.count} published ${
                other.count === 1 ? "guide" : "guides"
              }</li>`,
          )
          .join("");
        const emptyBody =
          `<p>No guide has been published in this category yet. Everything below is already written and published, and the calculators cover the same work.</p>` +
          (siblingList
            ? `<h2>Categories with published guides</h2><ul>${siblingList}</ul>`
            : "") +
          `<p><a href="/construction-tools">Browse the calculators</a> &middot; <a href="/learn">Back to the Learn hub</a> &middot; <a href="/faq">Read the most asked questions</a></p>`;
        learnContent[`/learn/category/${c.slug}`] =
          `<h1>${escapeHtml(c.name)} Guides</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a> &rsaquo; ${escapeHtml(c.name)}</nav>${c.description ? `<p>${escapeHtml(c.description)}</p>` : ""}${listing ? `<h2>Articles in this category</h2><ul>${listing}</ul>` : emptyBody}`;
      }

      // Article pages — /learn/{slug}
      for (const a of arts) {
        const cat = catBySlug[a.category_slug];
        const desc = (a.meta_description || a.excerpt || a.title).slice(0, 160);
        const datePublished = (a.published_at || a.updated_at || "").split(
          "T",
        )[0];
        const dateModified = (a.updated_at || a.published_at || "").split(
          "T",
        )[0];
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
          priority: "0.7",
          changefreq: "monthly",
          structuredData: [
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: a.title.slice(0, 110),
              description: desc,
              image: a.cover_image_url || ogImage,
              author: { "@type": "Organization", name: "FRELUX" },
              publisher: {
                "@type": "Organization",
                name: "FRELUX",
                logo: {
                  "@type": "ImageObject",
                  url: `${SITE_URL}/favicon-32.png`,
                },
              },
              datePublished,
              dateModified,
              mainEntityOfPage: `${SITE_URL}${articlePath}`,
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Learn",
                  item: `${SITE_URL}/learn`,
                },
                ...(cat
                  ? [
                      {
                        "@type": "ListItem",
                        position: 3,
                        name: cat.name,
                        item: `${SITE_URL}/learn/category/${cat.slug}`,
                      },
                    ]
                  : []),
                {
                  "@type": "ListItem",
                  position: cat ? 4 : 3,
                  name: a.title,
                  item: `${SITE_URL}${articlePath}`,
                },
              ],
            },
          ],
        });
        const altLocales = (a.wall_market_code ? [] : INDEXABLE_LOCALES).filter(
          (l) => trByLocaleKey.has(`${l}:${a.slug}`),
        );
        if (altLocales.length) {
          learnRoutes[learnRoutes.length - 1].alternates = [
            { hreflang: "x-default", href: `${SITE_URL}${articlePath}/` },
            { hreflang: "en", href: `${SITE_URL}${articlePath}/` },
            ...altLocales.map((l) => ({
              hreflang: l,
              href: `${SITE_URL}/${l}${articlePath}/`,
            })),
          ];
        }

        // Market-tagged articles are localised by definition: their body is
        // already written for one market, so a /es/ or /fr/ copy would be a
        // duplicate with the wrong language. Emit them once, at articlePath.
        // One localized page per launched locale. A published translation is
        // indexable in its own language; without one the page still works for
        // readers (same English body) but stays noindex and canonical to the
        // English URL, so it can never compete with it.
        for (const locale of a.wall_market_code ? [] : INDEXABLE_LOCALES) {
          const t = trByLocaleKey.get(`${locale}:${a.slug}`);
          const altSet = t
            ? [
                { hreflang: "x-default", href: `${SITE_URL}${articlePath}/` },
                { hreflang: "en", href: `${SITE_URL}${articlePath}/` },
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
            priority: "0.5",
            changefreq: "monthly",
            lang: locale,
            robots: t
              ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
              : "noindex, follow",
            alternates: altSet,
            canonical: t ? undefined : `${SITE_URL}${articlePath}/`,
            structuredData: t
              ? [
                  {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    headline: t.title.slice(0, 110),
                    description: (t.description || desc || "").slice(0, 300),
                    image: a.cover_image_url || ogImage,
                    inLanguage: locale,
                    author: { "@type": "Organization", name: "FRELUX" },
                    publisher: { "@type": "Organization", name: "FRELUX" },
                    datePublished: (
                      t.published_at ||
                      a.published_at ||
                      ""
                    ).split("T")[0],
                    dateModified: (a.updated_at || a.published_at || "").split(
                      "T",
                    )[0],
                    mainEntityOfPage: `${SITE_URL}/${locale}/learn/${a.slug}`,
                  },
                ]
              : undefined,
          });
          const localizedBody = t && t.body_md ? t.body_md : a.content || "";
          const localizedBodySafe = demoteH1(localizedBody);
          learnContent[`/${locale}${articlePath}`] =
            `<div lang="${locale}"><h1>${escapeHtml((t && t.title) || a.title)}</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a> &rsaquo; ${escapeHtml((t && t.title) || a.title)}</nav>${markdownToHtml(localizedBodySafe)}</div>`;
        }

        const bodySource = demoteH1(a.content);
        const bodyHtml = markdownToHtml(bodySource);
        // Related guides give every article a second crawl path from the hub
        // and from its siblings. Wall-finishing articles are excluded because
        // their canonical URL lives on the market path, not /learn/<slug>.
        const relPool = arts.filter(
          (r) => r.slug !== a.slug && !r.wall_market_code,
        );
        const related = [
          ...relPool.filter((r) => r.category_slug === a.category_slug),
          ...relPool.filter((r) => r.category_slug !== a.category_slug),
        ].slice(0, 6);
        const relatedHtml = related.length
          ? `<nav aria-label="Related guides"><h2>Related guides</h2><ul>${related
              .map(
                (r) =>
                  `<li><a href="/learn/${r.slug}">${escapeHtml(r.title)}</a></li>`,
              )
              .join("")}</ul></nav>`
          : "";
        learnContent[articlePath] =
          `<h1>${escapeHtml(a.title)}</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a>${cat ? ` &rsaquo; <a href="/learn/category/${cat.slug}">${escapeHtml(cat.name)}</a>` : ""} &rsaquo; ${escapeHtml(a.title)}</nav>${bodyHtml}${relatedHtml}`;
      }
      // The /learn hub was a 120 word shell with no crawlable article links.
      // Give it real content: what the library is for, the categories with
      // counts, and the most recent guides.
      const hubCats = cats
        .map((c) => {
          const n = arts.filter((a) => a.category_slug === c.slug).length;
          return `<li><a href="/learn/category/${c.slug}">${escapeHtml(c.name)}</a> (${n} guides)${c.description ? `: ${escapeHtml(String(c.description).slice(0, 140))}` : ""}</li>`;
        })
        .join("");
      const hubRecent = arts
        .filter((a) => !a.wall_market_code)
        .slice(0, 40)
        .map(
          (a) =>
            `<li><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a>${a.excerpt ? `: ${escapeHtml(String(a.excerpt).slice(0, 140))}` : ""}</li>`,
        )
        .join("");
      // The library page is the complete index: every published guide grouped
      // by category, so no article depends on a single crawl path.
      const libSections = cats
        .map((c) => {
          const items = arts
            .filter((a) => a.category_slug === c.slug && !a.wall_market_code)
            .map(
              (a) =>
                `<li><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a></li>`,
            )
            .join("");
          return items ? `<h2>${escapeHtml(c.name)}</h2><ul>${items}</ul>` : "";
        })
        .join("");
      const libTotal = arts.filter((a) => !a.wall_market_code).length;
      learnContent["/learn/library"] =
        `<h1>All Guides: The Complete FRELUX Learn Library</h1>` +
        `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a> &rsaquo; Library</nav>` +
        `<p>Every published guide in one place: ${libTotal} articles on painting, screeding, plastering, drywall, structural work, measurement, pricing and project management. Each one works through real quantities and real costs rather than general advice, and each links to the calculators that will do the arithmetic for you.</p>` +
        `<p>New here? Start with the <a href="/learn/">Learn hub</a> for the latest guides, or browse the categories below.</p>` +
        libSections;
      learnContent["/learn"] =
        `<h1>FRELUX Learn: construction and painting guides</h1>` +
        `<p>Measured, practical guides for people who price and build work. Every article works through the quantities, the specification and the cost, written for contractors, site managers and owners who need a number they can defend rather than a rough idea.</p>` +
        (hubCats ? `<h2>Browse by category</h2><ul>${hubCats}</ul>` : "") +
        (hubRecent ? `<h2>Latest guides</h2><ul>${hubRecent}</ul>` : "");
      console.log(
        `  ✅ Learn: ${learnRoutes.length} dynamic pages (${arts.length} articles, ${cats.length} categories)`,
      );
    } else {
      failBuildIfNetlify(
        `Learn fetch failed (${catRes.status}/${artRes.status})`,
      );
    }
  } catch (err) {
    failBuildIfNetlify(`Learn fetch failed (${err.message})`);
  }
  // Wall-finishing market hubs: the library page each market's articles
  // belong to (/learn/wall-finishing/<market>).
  const wallMarketCodes = [
    ...new Set(
      arts
        .filter((a) => a.wall_market_code)
        .map((a) => String(a.wall_market_code).toLowerCase()),
    ),
  ];
  for (const code of wallMarketCodes) {
    const country =
      marketLandingRoutes.find((mm) => mm.code.toLowerCase() === code)
        ?.countryName || code.toUpperCase();
    const path = `/learn/wall-finishing/${code}`;
    const marketArts = arts.filter(
      (a) => String(a.wall_market_code || "").toLowerCase() === code,
    );
    learnRoutes.push({
      path,
      title: `Wall Finishing Guides for ${country} | FRELUX Learn`,
      description: `Wall finishing library for ${country}: paint, screeding, POP ceiling and tiling guides written against ${country} materials, units and standards.`,
      priority: "0.6",
      changefreq: "weekly",
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Wall Finishing Guides for ${country}`,
          url: `${SITE_URL}${path}`,
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "Learn",
              item: `${SITE_URL}/learn`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: country,
              item: `${SITE_URL}${path}`,
            },
          ],
        },
      ],
    });
    const listing = marketArts
      .map(
        (a) =>
          `<li><a href="${path}/${a.slug}">${escapeHtml(a.title)}</a>${a.excerpt ? `: ${escapeHtml(a.excerpt.slice(0, 140))}` : ""}</li>`,
      )
      .join("");
    learnContent[path] =
      `<h1>Wall Finishing Guides for ${escapeHtml(country)}</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/learn">Learn</a> &rsaquo; ${escapeHtml(country)}</nav><ul>${listing}</ul>`;
  }

  return { routes: learnRoutes, content: learnContent };
}

const { routes: learnDynamicRoutes, content: learnDynamicContent } =
  await fetchLearnPages();
routes.push(...learnDynamicRoutes);
// Building type library: the hub plus one page per type, generated from the
// same catalogue the calculators compile, so a page cannot describe a schedule
// the engine does not have.
routes.push(...buildingTypeRoutes);
const contentMap = { ...seoContentMap, ...learnDynamicContent };

// ── Construction tool pages ─────────────────────────────────────────
// Titles and descriptions come from the tool registry through one composer, so
// the listing can only promise what the calculator does. The same module drives
// the React page, which removes the old drift between the prerendered title and
// the hydrated one. Body copy is only added where the old content map had
// nothing, so hand-written pages keep their own text.
const toolRegistry = loadToolRegistry();
const toolByPath = new Map(toolRegistry.map((t) => [t.path, t]));
const toolsByCategory = new Map();
for (const t of toolRegistry) {
  if (!toolsByCategory.has(t.category)) toolsByCategory.set(t.category, []);
  toolsByCategory.get(t.category).push(t);
}
for (const tool of toolRegistry) {
  let route = routes.find((r) => r.path === tool.path);
  if (!route) {
    route = {
      path: tool.path,
      title: toolSeoTitle(tool),
      description: toolSeoDescription(tool),
      priority: "0.8",
      changefreq: "monthly",
    };
    routes.push(route);
  } else {
    route.title = toolSeoTitle(tool);
    route.description = toolSeoDescription(tool);
  }
  if (!contentMap[tool.path]) {
    contentMap[tool.path] = buildToolContent(
      tool,
      toolsByCategory.get(tool.category) ?? [],
    );
  }
}

// ── Colour library, palette and template families (2026-11-01) ───────
// These routes have always existed in the SPA router, but nothing prerendered
// them. A crawler therefore received the home shell with canonical "/", which
// is why they could not be advertised in the sitemap and why ~800 pages were
// unindexable. Each page below is built from the same database row the React
// page renders, so the static copy cannot drift from the live one, and nothing
// is invented: only stored fields are published.
const dbRows = async (table, query) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn(`[prerender] ${table} skipped: HTTP ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[prerender] ${table} skipped:`, err.message);
    return [];
  }
};

// Some columns are text[] rather than text; normalise before interpolating.
const asText = (v) =>
  Array.isArray(v) ? v.filter(Boolean).join(", ") : v == null ? "" : String(v);

const swatch = (hex, label) =>
  `<span style="display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid rgba(0,0,0,.25);background:${escapeHtml(hex || "#fff")};vertical-align:-3px"></span> ${escapeHtml(label || "")}`;

const paintColors = await dbRows(
  "paint_colors",
  "select=slug,name,hex_code,rgb_r,rgb_g,rgb_b,hsl_h,hsl_s,hsl_l,recommended_usage,is_interior,is_exterior,finish_compatibility,updated_at&is_active=eq.true&order=slug.asc&limit=1000",
);
const colorPalettes = await dbRows(
  "color_combinations",
  "select=slug,title,description,style,property_type,recommended_rooms,main_color_name,main_color_code,secondary_color_name,secondary_color_code,accent_color_name,accent_color_code,trim_color_name,trim_color_code,ceiling_color_name,ceiling_color_code,door_color_name,door_color_code,updated_at&is_published=eq.true&order=slug.asc&limit=500",
);
const dbTemplates = await dbRows(
  "calculator_templates",
  "select=slug,name,description,is_published,calculator_type,input_data&is_published=eq.true&order=slug.asc&limit=500",
);

// Only templates the catalog does not already cover: catalog templates are
// prerendered (and cross-linked into every market) further down.
// Case studies: the hub ranks around 6th for 340 impressions a month with no
// text in the static HTML (the list is fetched in the browser), so a crawler
// saw an empty page. The published set is read here and written into the page.
const caseStudies = await dbRows(
  "case_studies",
  "select=id,headline,summary,project_scope,challenges,outcome,materials_used,project_duration,budget,currency,updated_at&is_published=eq.true&order=updated_at.desc&limit=50",
);

// Glossary: 51 definitions lived only in a client-side fetch, so /glossary/
// shipped with no H1 and no text. Read once here and render the definitions,
// grouped the way the page groups them.
const glossaryTerms = await dbRows(
  "construction_glossary",
  "select=term,slug,definition,category&is_active=eq.true&order=category.asc,sort_order.asc&limit=500",
);

// Price book coverage, used to describe /prices/ honestly. Only counts and
// category names are read: prices themselves are deliberately left out of the
// static HTML so a crawler never caches a figure that has since moved.
const priceMaterials = await dbRows(
  "estimation_materials",
  "select=category&limit=2000",
);

const catalogSlugs = new Set(TEMPLATE_CATALOG.map((t) => t.slug));
const extraTemplates = dbTemplates.filter(
  (t) => t.slug && !catalogSlugs.has(t.slug),
);

const dynamicFamilyRoutes = [];
const dynamicFamilyContent = {};

// Paint colour pages carried a swatch and three values, which left 773 colour
// URLs under 140 words. The stored numbers are turned here into the questions
// a decorator or a homeowner actually asks: the undertone, how the shade reads
// in daylight, the trim and accent colours that sit beside it, the rooms it
// suits and how far a 20 litre bucket goes. Every figure is derived from the
// row itself, and the approximations are labelled as approximations.
const rgbFromRow = (c) => {
  const raw = (c.hex_code || "").replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  }
  const nums = [c.rgb_r, c.rgb_g, c.rgb_b].map((n) =>
    n === null || n === undefined ? NaN : Number(n),
  );
  return nums.every((n) => Number.isFinite(n)) ? nums : null;
};

const hslToHex = (h, s, l) => {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lig = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + hue / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) =>
    lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
};

const hueFamilyOf = (h) => {
  if (h === null || h === undefined || Number.isNaN(Number(h))) return null;
  const hue = ((Number(h) % 360) + 360) % 360;
  if (hue < 15 || hue >= 330) return "red";
  if (hue < 45) return "terracotta and orange";
  if (hue < 70) return "ochre and yellow";
  if (hue < 100) return "yellow green";
  if (hue < 160) return "green";
  if (hue < 200) return "teal";
  if (hue < 250) return "blue";
  if (hue < 285) return "violet";
  return "magenta and plum";
};

const lrvPercent = (rgb) =>
  rgb
    ? Math.round(
        ((0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255) * 100,
      )
    : null;

const toneWord = (lrv) => {
  if (lrv === null) return null;
  if (lrv >= 78) return "light";
  if (lrv >= 62) return "off white to pale";
  if (lrv >= 46) return "mid tone";
  if (lrv >= 30) return "strong mid tone";
  return "deep";
};

const roomAdvice = (lrv, warm) => {
  if (lrv === null)
    return "Walls take this colour in most rooms; test a patch first, because sheen changes how it reads.";
  if (lrv >= 78)
    return "At this lightness it carries a whole room, including a small one, and it is the safer choice for a north facing space that never gets direct sun. It also works on ceilings, where a light tone keeps the ceiling feeling higher.";
  if (lrv >= 62)
    return "It suits a full room in good light and a single feature wall in a darker one. Paired with a whiter trim it stays calm; paired with a deeper tone from the same family it lifts the scheme.";
  if (lrv >= 46)
    return `It reads as a considered mid tone rather than a neutral, so it suits a living room, a dining room or a bedroom used in the evening. In a ${warm ? "south or west facing" : "north facing"} room expect it to ${warm ? "warm further as the afternoon light comes in" : "cool down noticeably after midday"}.`;
  if (lrv >= 30)
    return "Use it on one or two walls, an alcove or the wall behind a bed or a fireplace. All four walls in this depth shrink a room, and the effect is strongest in a space with low ceilings.";
  return "At this depth it is a feature colour, not a wall colour for a whole room. It works on joinery, a chimney breast, a door or a single panel, and it needs plenty of light around it to show its true hue.";
};

const sheenAdvice = (usageText) => {
  const u = (usageText || "").toLowerCase();
  if (u.includes("exterior") && u.includes("interior"))
    return "Because it is listed for both inside and out, check the data sheet for the exterior variant before you use it on masonry: exterior grades carry more binder and a different preservative package.";
  if (u.includes("exterior"))
    return "On exterior work use the exterior grade of the same colour, with a primer matched to the substrate, and expect the finish to chalk slowly rather than fail suddenly.";
  return "Inside, a mid sheen on walls is the practical compromise: it wipes clean in a hallway or a kitchen, and it shows fewer marks than matt without the glare of gloss. Ceilings in the same colour want a flat finish, which hides the slight undulation every ceiling has.";
};

const coverageText = (lrv) => {
  const bucket = 20;
  const perLitre = 10;
  const oneCoat = bucket * perLitre;
  const twoCoat = oneCoat / 2;
  const room = 4 * 2.4 * 4 - 4; // 4 x 4 m room, 2.4 m walls, one door deducted
  return `A 20 litre bucket of emulsion at about ${perLitre} square metres per litre covers roughly ${oneCoat} square metres in one coat, which is about ${twoCoat} square metres at the two coats FRELUX treats as standard. A 4 by 4 metre room with 2.4 metre walls and one door takes about ${room} square metres of wall, so one bucket does that room more than once.${
    lrv !== null && lrv < 46
      ? " Deeper colours usually need the extra coat that a lighter tone gets away without, so plan on three coats over a light existing colour."
      : " Over an existing dark colour, expect an extra coat regardless of how light this shade is."
  }`;
};

const colorIndex = paintColors
  .filter((c) => c.slug && c.name)
  .map((c) => ({
    slug: c.slug,
    name: c.name,
    hue: Number(c.hsl_h),
    hex: (c.hex_code || "").toUpperCase(),
  }))
  .filter((c) => Number.isFinite(c.hue));

// The tint build and the questions are computed from the stored HEX value by
// scripts/lib/color-mixing.mjs, the same module the React page uses, so the
// static copy and the live page cannot disagree. The build is labelled as a
// tint proportion for a machine or a test pot, never as a factory formula.
const mixContent = (c) => {
  const recipe = mixRecipe(c.hex_code);
  if (!recipe) return "";
  const rows = recipe.components
    .map(
      (component) =>
        `<li>${swatch(component.hex, component.name)}: ${component.millilitresPerLitre} ml per litre of mixed paint</li>`,
    )
    .join("");
  return (
    `<h2>What to mix to get ${escapeHtml(c.name)}</h2>` +
    `<p>${escapeHtml(recipeSentence(c.name, recipe))}</p>` +
    `<ul>${rows}</ul>` +
    `<p>${escapeHtml(recipeCaveat(recipe))}</p>`
  );
};

const faqContent = (c) => {
  const faq = colourFaq(c.name, c.hex_code);
  if (!faq.length) return "";
  const schema = colourFaqJsonLd(faq);
  return (
    `<h2>Questions about ${escapeHtml(c.name)}</h2>` +
    faq
      .map(
        (entry) =>
          `<h3>${escapeHtml(entry.question)}</h3><p>${escapeHtml(entry.answer)}</p>`,
      )
      .join("") +
    (schema
      ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
      : "")
  );
};

for (const c of paintColors) {
  if (!c.slug || !c.name) continue;
  const path = `/colors/paint/${c.slug}`;
  if (routes.some((r) => r.path === path)) continue;
  const hex = (c.hex_code || "").toUpperCase();
  const usage = asText(c.recommended_usage).trim();
  const placement = [
    c.is_interior ? "interior walls and ceilings" : "",
    c.is_exterior ? "exterior surfaces" : "",
  ]
    .filter(Boolean)
    .join(" and");
  const rgb = rgbFromRow(c);
  const hue =
    c.hsl_h === null || c.hsl_h === undefined ? null : Number(c.hsl_h);
  const sat =
    c.hsl_s === null || c.hsl_s === undefined ? null : Number(c.hsl_s);
  const lig =
    c.hsl_l === null || c.hsl_l === undefined ? null : Number(c.hsl_l);
  const lrv = lrvPercent(rgb);
  const family = hueFamilyOf(hue);
  const warm = hue === null ? true : hue < 90 || hue >= 300;
  const tone = toneWord(lrv);
  const greyed = sat !== null && sat < 12;
  const neutralNote =
    sat === null
      ? ""
      : greyed
        ? "Saturation sits low, so it behaves as a neutral that borrows the cast of the light in the room rather than holding a colour of its own."
        : sat >= 45
          ? "Saturation is high, so the colour stays itself even in a poorly lit room, which is why it is often used on joinery and doors rather than on a large wall."
          : "Saturation is moderate, so it reads as a colour without shouting, and it shifts gently with the light through the day.";
  const undertone = family
    ? `${escapeHtml(c.name)} sits in the ${escapeHtml(family)} family${warm ? ", on the warm side of the wheel" : ", on the cool side of the wheel"}${
        greyed ? " with its chroma knocked back toward grey" : ""
      }.`
    : "";
  const complementHex =
    hue === null ? null : hslToHex(hue + 180, sat ?? 20, lig ?? 50);
  const accentHex =
    hue === null
      ? null
      : hslToHex(
          hue + 30,
          Math.min(100, (sat ?? 20) + 10),
          Math.max(18, (lig ?? 50) - 22),
        );
  const trimHex =
    hue === null
      ? null
      : hslToHex(hue, Math.max(4, Math.min(20, sat ?? 8)), 94);
  const neighbours = colorIndex
    .map((o) => ({
      ...o,
      d: Math.abs(((o.hue - (hue ?? 0) + 540) % 360) - 180),
    }))
    .filter((o) => o.slug !== c.slug)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
  dynamicFamilyRoutes.push({
    path,
    title: colourSeo(c.name, c.hex_code).title,
    description: colourSeo(c.name, c.hex_code).description,
    priority: "0.5",
    changefreq: "monthly",
  });
  dynamicFamilyContent[path] =
    `<main><h1>${escapeHtml(c.name)}${hex ? ` <span style="font-weight:400">(${escapeHtml(hex)})</span>` : ""}</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/colors/">Colour library</a> &rsaquo; ${escapeHtml(c.name)}</nav>` +
    `<p style="max-width:520px"><span style="display:block;height:140px;border-radius:10px;border:1px solid rgba(0,0,0,.2);background:${escapeHtml(c.hex_code || "#ffffff")}"></span></p>` +
    (undertone || tone
      ? `<h2>How ${escapeHtml(c.name)} reads on a wall</h2><p>${undertone}${
          tone
            ? ` With an estimated light reflectance value of about ${lrv}, it is a ${escapeHtml(tone)} colour.`
            : ""
        } ${neutralNote}</p><p>Light reflectance matters more than the swatch for a wall colour: it decides how bright the room feels and how much of the ceiling bounce comes back into the space. The figure above is worked out from the stored RGB values, so treat it as a close estimate rather than a lab measurement.</p>`
      : "") +
    `<h2>The colour values in plain terms</h2><ul>` +
    (hex ? `<li>HEX: ${escapeHtml(hex)}</li>` : "") +
    (rgb ? `<li>RGB: ${rgb[0]}, ${rgb[1]}, ${rgb[2]}</li>` : "") +
    (hue !== null
      ? `<li>HSL: ${Math.round(hue)}&deg;, ${Math.round(sat ?? 0)}%, ${Math.round(lig ?? 0)}%</li>`
      : "") +
    (lrv !== null ? `<li>Estimated LRV: ${lrv} of 100</li>` : "") +
    `</ul><p>The hue sets the family, the saturation sets how much colour survives the grey, and the lightness sets how much daylight the finished wall throws back. Two colours can share a name and a hue and still behave differently on site if their lightness is a few points apart.</p>` +
    `<h2>Trim, ceiling and accent pairings</h2><ul>` +
    (trimHex ? `<li>Trim and woodwork: ${swatch(trimHex, trimHex)}</li>` : "") +
    (complementHex
      ? `<li>Complementary accent: ${swatch(complementHex, complementHex)}</li>`
      : "") +
    (accentHex
      ? `<li>Warmer accent from the same family: ${swatch(accentHex, accentHex)}</li>`
      : "") +
    `</ul><p>A near white trim keeps the room calm and lets the wall colour do the talking. The complementary accent is the colour opposite ${escapeHtml(c.name)} on the wheel, which is why it works in small amounts: a door edge, a shelf, a single chair. The warmer accent sits a step around the wheel and holds the scheme together without a contrast.</p>` +
    `<h2>Where it belongs</h2><p>${roomAdvice(lrv, warm)}</p>` +
    (usage || placement || c.finish_compatibility
      ? `<h2>Finish and surface</h2><p>${[
          usage,
          placement ? `Listed for ${placement}.` : "",
          asText(c.finish_compatibility)
            ? `Compatible finishes: ${asText(c.finish_compatibility)}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ")}</p><p>${sheenAdvice(usage)}</p>`
      : "") +
    `<h2>How much paint a room needs</h2><p>${coverageText(lrv)}</p>` +
    `<p>The FRELUX wall finishing estimator does that arithmetic room by room: enter the length, width and height, deduct the doors and windows, choose the quality and the coats, and it returns the 20 litre buckets to buy with the theoretical and practical figure side by side.</p>` +
    (neighbours.length
      ? `<h2>Colours close to ${escapeHtml(c.name)}</h2><ul>` +
        neighbours
          .map(
            (n) =>
              `<li><a href="/colors/paint/${n.slug}/">${escapeHtml(n.name)}</a>${n.hex ? ` ${swatch(n.hex, n.hex)}` : ""}</li>`,
          )
          .join("") +
        `</ul><p>These sit nearest on the hue wheel, so they are the shades to compare against ${escapeHtml(c.name)} when a client wants the same feel a shade lighter or deeper.</p>`
      : "") +
    (mixContent(c) || "") +
    (faqContent(c) || "") +
    `<h2>Price the job</h2><ul><li><a href="/paint-calculator/">Paint calculator</a></li><li><a href="/colors/">Browse the colour library</a></li><li><a href="/colors/compare/">Compare colours</a></li><li><a href="/wall-finish-estimator/">Wall finishing estimator</a></li></ul></main>`;
}
// Palette pages list their colours by name and hex only, which left them as
// near-empty swatch lists. Each colour in a palette usually exists in the colour
// library, so the page can state its RGB, HSL, where it may be used and how it
// should be finished, and link to the colour page itself.
const normaliseHex = (value) =>
  value ? String(value).trim().toUpperCase().replace(/^#/, "") : "";

const colourByHex = new Map();
const colourByName = new Map();
for (const c of paintColors) {
  if (!c.slug) continue;
  const hex = normaliseHex(c.hex_code);
  if (hex) colourByHex.set(hex, c);
  if (c.name) colourByName.set(String(c.name).trim().toLowerCase(), c);
}

// A palette row is matched by its own hex. A name is only accepted when that
// colour's stored hex is the same, so a palette cannot borrow another shade's
// RGB just because the names overlap.
const findPaletteColour = (name, code) => {
  const hex = normaliseHex(code);
  if (hex) return colourByHex.get(hex) ?? null;
  const byName = name
    ? colourByName.get(String(name).trim().toLowerCase())
    : null;
  return byName && normaliseHex(byName.hex_code) === hex ? byName : null;
};

const paletteColourFacts = (colour) => {
  if (!colour) return "";
  const facts = [];
  const rgb = rgbFromRow(colour);
  if (rgb) facts.push(`RGB ${rgb}`);
  if (
    colour.hsl_h !== null &&
    colour.hsl_h !== undefined &&
    colour.hsl_s !== null &&
    colour.hsl_s !== undefined &&
    colour.hsl_l !== null &&
    colour.hsl_l !== undefined
  ) {
    const round1 = (v) => Math.round(Number(v) * 10) / 10;
    facts.push(
      `HSL ${round1(colour.hsl_h)}, ${round1(colour.hsl_s)}%, ${round1(colour.hsl_l)}%`,
    );
  }
  const placement = [
    colour.is_interior ? "interior walls and ceilings" : "",
    colour.is_exterior ? "exterior surfaces" : "",
  ]
    .filter(Boolean)
    .join(" and ");
  if (placement) facts.push(`for ${placement}`);
  const usage = asText(colour.recommended_usage).trim();
  if (usage) facts.push(usage);
  const finishes = asText(colour.finish_compatibility).trim();
  if (finishes) facts.push(`finishes ${finishes}`);
  return facts.join("; ");
};

for (const p of colorPalettes) {
  if (!p.slug || !p.title) continue;
  const path = `/colors/${p.slug}`;
  if (routes.some((r) => r.path === path)) continue;
  const rows = [
    ["Main", p.main_color_name, p.main_color_code],
    ["Secondary", p.secondary_color_name, p.secondary_color_code],
    ["Accent", p.accent_color_name, p.accent_color_code],
    ["Trim", p.trim_color_name, p.trim_color_code],
    ["Ceiling", p.ceiling_color_name, p.ceiling_color_code],
    ["Door", p.door_color_name, p.door_color_code],
  ].filter(([, name]) => name);
  dynamicFamilyRoutes.push({
    path,
    title: `${p.title} Paint Colour Palette | FRELUX`,
    description: `${p.title} colour palette${p.style ? ` in ${p.style}` : ""}${p.property_type ? ` for ${p.property_type}` : ""}: the full colour set with HEX codes.`,
    priority: "0.5",
    changefreq: "monthly",
  });
  dynamicFamilyContent[path] =
    `<main><h1>${escapeHtml(p.title)} paint colour palette</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/colors/">Colour library</a> &rsaquo; ${escapeHtml(p.title)}</nav>` +
    (p.description ? `<p>${escapeHtml(p.description)}</p>` : "") +
    (asText(p.recommended_rooms)
      ? `<p>Recommended rooms: ${escapeHtml(asText(p.recommended_rooms))}.</p>`
      : "") +
    `<h2>Colours in this palette</h2><table><caption>${escapeHtml(p.title)} colour set</caption>` +
    `<thead><tr><th scope="col">Role</th><th scope="col">Colour</th><th scope="col">Hex</th><th scope="col">Details</th></tr></thead><tbody>` +
    rows
      .map(([role, name, code]) => {
        const colour = findPaletteColour(name, code);
        // swatch() escapes its label, so the link is added outside it.
        const cell =
          swatch(code, name) +
          (colour
            ? ` <a href="/colors/paint/${colour.slug}">Colour page</a>`
            : "");
        const facts = paletteColourFacts(colour);
        return (
          `<tr><th scope="row">${escapeHtml(role)}</th>` +
          `<td>${cell}</td>` +
          `<td>${code ? escapeHtml(String(code).toUpperCase()) : "&mdash;"}</td>` +
          `<td>${facts || "Not in the colour library yet"}</td></tr>`
        );
      })
      .join("") +
    `</tbody></table>` +
    (p.style || p.property_type
      ? `<p>This set is filed as ${escapeHtml([p.style, p.property_type].filter(Boolean).join(" for "))}, so it is chosen for the way that room type is usually lit rather than for a single feature wall.</p>`
      : "") +
    `<h2>Plan the paint</h2><p>The FRELUX paint estimator works the same way for every colour in the palette: room dimensions, height, openings, paint quality and coats, priced in 20-litre buckets.</p>` +
    `<ul><li><a href="/paint-calculator/">Paint calculator</a></li><li><a href="/colors/">Colour library</a></li><li><a href="/colors/compare/">Compare colours</a></li></ul></main>`;
}

for (const t of extraTemplates) {
  const path = `/templates/${t.slug}`;
  if (routes.some((r) => r.path === path)) continue;
  const name = t.name || t.slug.replace(/-/g, " ");
  dynamicFamilyRoutes.push({
    path,
    title: `${name} | FRELUX calculator template`,
    description: `${name} template for FRELUX estimators: pre-set measurements and finishing scope you can adjust before pricing.`,
    priority: "0.6",
    changefreq: "monthly",
  });
  dynamicFamilyContent[path] =
    `<main><h1>${escapeHtml(name)}</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/templates/">Templates</a> &rsaquo; ${escapeHtml(name)}</nav>` +
    (t.description ? `<p>${escapeHtml(t.description)}</p>` : "") +
    `<h2>How this template works</h2><p>${escapeHtml(name)} pre-fills the scope for this kind of job so you can go straight to measuring. You still enter the room dimensions and openings, and material rates come from the market you select, so the output reflects local pricing rather than a generic table.</p>` +
    renderTemplateInputs(
      {
        type: t.calculator_type ?? "",
        inputs:
          t.input_data && typeof t.input_data === "object" ? t.input_data : {},
      },
      "meters",
    ) +
    (() => {
      const siblings = dbTemplates
        .filter(
          (o) =>
            o.slug &&
            o.slug !== t.slug &&
            o.calculator_type &&
            o.calculator_type === t.calculator_type,
        )
        .slice(0, 8);
      if (siblings.length === 0) return "";
      return (
        `<h2>Other ${escapeHtml(String(t.calculator_type).toLowerCase())} templates</h2><ul>` +
        siblings
          .map(
            (o) =>
              `<li><a href="/templates/${o.slug}">${escapeHtml(o.name || o.slug)}</a></li>`,
          )
          .join("") +
        `</ul>`
      );
    })() +
    `<ul><li><a href="/templates/">All templates</a></li><li><a href="/calculators/">All calculators</a></li><li><a href="/market/">Markets</a></li></ul></main>`;
}

// Case study detail pages: the hub links to them, and without a prerendered
// file every one of those links lands on the 404 catch-all. Each page is built
// from its own published row, so nothing here is invented.
for (const c of caseStudies) {
  const path = `/case-studies/${c.id}`;
  if (routes.some((r) => r.path === path)) continue;
  const headline = (c.headline || "Case study").trim();
  const title =
    headline.length <= 50
      ? `${headline} | FRELUX`
      : headline.slice(0, 50).replace(/[\s,;:.-]+$/, "");
  const summary = (c.summary || "").trim();
  const description = (
    summary || `${headline}: scope, challenges, materials and outcome.`
  ).slice(0, 158);
  const section = (heading, body) =>
    body ? `<h2>${heading}</h2><p>${escapeHtml(String(body))}</p>` : "";
  const budgetLine = c.budget
    ? `<li>Budget: ${escapeHtml(String(c.currency || ""))} ${escapeHtml(String(c.budget))}</li>`
    : "";
  const durationLine = c.project_duration
    ? `<li>Duration: ${escapeHtml(String(c.project_duration))}</li>`
    : "";
  const materialsLine = c.materials_used
    ? `<li>Materials: ${escapeHtml(String(c.materials_used))}</li>`
    : "";
  routes.push({
    path,
    title,
    description,
    priority: "0.5",
    changefreq: "monthly",
    content:
      `<main><h1>${escapeHtml(headline)}</h1>` +
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/case-studies/">Case studies</a> &rsaquo; ${escapeHtml(headline)}</nav>` +
      (summary ? `<p>${escapeHtml(summary)}</p>` : "") +
      section("Project scope", c.project_scope) +
      section("What made it difficult", c.challenges) +
      section("Outcome", c.outcome) +
      (budgetLine || durationLine || materialsLine
        ? `<h2>Project facts</h2><ul>${materialsLine}${durationLine}${budgetLine}</ul>`
        : "") +
      `<h2>Estimate a similar project</h2><p>The quantities in this project came from the free FRELUX calculators. Start with the tool that matches your scope.</p>` +
      `<ul><li><a href="/paint-calculator/">Paint calculator</a></li><li><a href="/screeding-calculator/">Screeding calculator</a></li><li><a href="/tile-calculator/">Tile calculator</a></li><li><a href="/pop-ceiling-calculator/">POP ceiling calculator</a></li><li><a href="/case-studies/">All case studies</a></li></ul></main>`,
  });
}

// /case-studies hub body
if (caseStudies.length) {
  const hub = routes.find((r) => r.path === "/case-studies");
  if (hub && !contentMap["/case-studies"]) {
    contentMap["/case-studies"] =
      `<main><h1>Before and after construction case studies</h1>` +
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Case studies</nav>` +
      `<p>Walkthroughs of finished projects: what the job started as, what had to be repaired first, the quantities the FRELUX calculators produced and what it cost. Each one shows the scope in real measurements so you can compare it with your own job.</p>` +
      `<h2>Published case studies</h2><ul>` +
      caseStudies
        .map((c) => {
          const budget = c.budget
            ? ` Budget: ${escapeHtml(c.currency || "")} ${escapeHtml(String(c.budget))}.`
            : "";
          return `<li><a href="/case-studies/${c.id}/">${escapeHtml(c.headline || "Case study")}</a>${
            c.summary ? `: ${escapeHtml(c.summary)}` : ""
          }${budget}</li>`;
        })
        .join("") +
      `</ul><h2>Estimate your own project</h2><p>The same calculators used in these projects are free and need no account: paint and wall finishes, screeding, POP ceilings, tiling and full build-to-roof costing.</p>` +
      `<ul><li><a href="/paint-calculator/">Paint calculator</a></li><li><a href="/screeding-calculator/">Screeding calculator</a></li><li><a href="/tile-calculator/">Tile calculator</a></li><li><a href="/build-to-roof-estimator/">Build-to-roof estimator</a></li></ul></main>`;
  }
}

// /glossary body
if (glossaryTerms.length && !contentMap["/glossary"]) {
  const label = (c) =>
    ({
      materials: "Materials",
      finishes: "Finishes",
      techniques: "Techniques",
      tools: "Tools",
      measurement: "Measurement",
      structure: "Structure",
      planning: "Planning",
    })[c] ||
    String(c || "General")
      .replace(/-/g, " ")
      .replace(/^./, (m) => m.toUpperCase());
  const byCategory = new Map();
  for (const t of glossaryTerms) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, []);
    byCategory.get(t.category).push(t);
  }
  contentMap["/glossary/"] = contentMap["/glossary"] =
    `<main><h1>Construction glossary: ${glossaryTerms.length} terms explained</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Glossary</nav>` +
    `<p>The words used on site and in an estimate, defined plainly. Each entry explains what the term means in practice, so a quotation or a specification stops being ambiguous.</p>` +
    [...byCategory.entries()]
      .map(
        ([cat, terms]) =>
          `<h2>${label(cat)}</h2><dl>` +
          terms
            .map(
              (t) =>
                `<dt id="${escapeHtml(t.slug || "")}">${escapeHtml(t.term || "")}</dt><dd>${escapeHtml(t.definition || "")}</dd>`,
            )
            .join("") +
          `</dl>`,
      )
      .join("") +
    `<h2>Put the terms to work</h2><p>Once the vocabulary is clear, run the numbers: the same definitions are used by the FRELUX calculators when they describe coverage, wastage and coats.</p>` +
    `<ul><li><a href="/construction-tools/">All construction tools</a></li><li><a href="/calculators/">Calculator library</a></li><li><a href="/prices/">Material price intelligence</a></li><li><a href="/learn/">Guides</a></li></ul></main>`;
}

// /prices body
if (priceMaterials.length && !contentMap["/prices"]) {
  const label = (c) =>
    String(c || "other")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (m) => m.toUpperCase());
  const counts = new Map();
  for (const m of priceMaterials) {
    const k = m.category || "other";
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  contentMap["/prices/"] = contentMap["/prices"] =
    `<main><h1>Material price book</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Material prices</nav>` +
    `<p>The FRELUX price book holds ${priceMaterials.length} priced materials across ${counts.size} categories, in the currency of the market you select. Every calculator reads from it, so a quantity and its cost come from the same source.</p>` +
    `<h2>What is covered</h2><ul>` +
    top.map(([k, n]) => `<li>${label(k)}: ${n} priced items</li>`).join("") +
    `</ul>` +
    `<h2>How a price gets into the book</h2>` +
    `<p>A price enters only from a configured source for that market and is dated. Where a verified local supplier price exists it is used directly; where it does not, the line is shown as a reference rate rather than presented as a quote. Nothing on this page is an average of unrelated markets.</p>` +
    `<h2>Using it in an estimate</h2><p>Pick your market in any calculator and the quantities are priced from this book, not from a generic table. Change the market and both the units and the prices change with it.</p>` +
    `<ul><li><a href="/construction-tools/">All construction tools</a></li><li><a href="/market/">Markets and currencies</a></li><li><a href="/calculators/">Calculator library</a></li><li><a href="/glossary/">Glossary of terms</a></li></ul></main>`;
}

routes.push(...dynamicFamilyRoutes);

// ── Template page metadata ─────────────────────────────────────────
// A template page is a real page with real dimensions, so its metadata says
// what the template sets up and what it produces. The hand-written one-liners
// ("Calculate paint needed for a standard living room") told a search engine
// nothing it could not read from the title.
const TEMPLATE_TYPE_LABEL = {
  paint: "Paint",
  tile: "Tile",
  screeding: "Screeding",
  pop: "POP Ceiling",
};

const fitDescription = (sentences, limit = 158) => {
  const clean = sentences
    .map((sentence) =>
      String(sentence || "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .map((sentence) => (/[.!?]$/.test(sentence) ? sentence : `${sentence}.`));
  let out = "";
  for (const sentence of clean) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > limit && out) break;
    out = next;
  }
  return out;
};

for (const route of routes) {
  const match = /^\/templates\/([^/]+)$/.exec(route.path);
  if (!match) continue;
  const template = TEMPLATE_CATALOG.find((t) => t.slug === match[1]);
  if (!template) continue;
  const typeLabel = TEMPLATE_TYPE_LABEL[template.type] ?? template.type;
  route.title =
    route.title && route.title.includes(template.name)
      ? route.title
      : `${template.name} ${typeLabel} Calculator Template | FRELUX`;
  route.description = fitDescription([
    template.description || template.seoDescription,
    `Open the ${typeLabel.toLowerCase()} template to set rooms and openings`,
    `Prices come from the current market book`,
  ]);
}
Object.assign(contentMap, dynamicFamilyContent);

// Legal, company and account pages: their real text lives in React components, so
// the served HTML carried a one-line stub. These bodies summarise the same
// document and list its real section headings; the full text still renders.
Object.assign(contentMap, legalPageContent);

// Below this many words of real body copy, a tool page is rebuilt from its
// registry entry. The theoretical shell text (market hubs, breadcrumb) is not
// counted, so this measures content rather than chrome.
const TOOL_BODY_MIN_WORDS = 150;

// Global template pages carried the generated family blurb only: a name and one
// sentence, so all 40 read alike. Anything under the tool threshold is rebuilt
// with the template's real stored configuration and links to its type's
// siblings and to the market versions of itself.
{
  const wordCount = (html) =>
    String(html ?? "")
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
  let rebuilt = 0;
  for (const t of TEMPLATE_CATALOG) {
    const path = `/templates/${t.slug}`;
    if (wordCount(contentMap[path]) >= TOOL_BODY_MIN_WORDS) continue;
    const siblings = TEMPLATE_CATALOG.filter(
      (o) => o.type === t.type && o.slug !== t.slug,
    );
    contentMap[path] =
      `<h1>${t.name} template</h1>` +
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/templates">Templates</a> &rsaquo; ${t.name}</nav>` +
      (t.description ? `<p>${t.description}</p>` : "") +
      renderTemplateInputs(t, "meters") +
      `<h2>What the estimate gives you</h2><p>The ${TEMPLATE_TYPE_LABEL[t.type] ?? t.type} calculator runs these settings through the deterministic engine for that discipline: measured quantities first, then the material and labour lines the quantities imply, priced from the market book for your currency. Nothing in the estimate is guessed by an AI.</p>` +
      (siblings.length
        ? `<h2>Other ${(TEMPLATE_TYPE_LABEL[t.type] ?? t.type).toLowerCase()} templates</h2><ul>${siblings
            .slice(0, 8)
            .map(
              (o) =>
                `<li><a href="/templates/${o.slug}">${o.name}</a>${o.description ? `: ${o.description}` : ""}</li>`,
            )
            .join("")}</ul>`
        : "") +
      `<p><a href="/global-markets">Run this template in your market</a> &middot; <a href="/templates">All templates</a></p>`;
    rebuilt += 1;
  }
  console.log(
    `[prerender] template bodies rebuilt from stored inputs: ${rebuilt} pages`,
  );
}

console.log(
  `[prerender] dynamic families: ${paintColors.length} colours, ${colorPalettes.length} palettes, ${extraTemplates.length} extra templates`,
);

// Route content goes into #root for crawlers. React replaces it on mount, but
// until then it renders as bare HTML (no utility classes), which showed up as a
// flash of raw text on every reload. The shield is a plain-CSS branded cover
// that keeps that markup out of sight while the app boots, and lifts by itself
// after a few seconds so non-JavaScript visitors still reach the content.
const marketHubNav =
  `<nav aria-label="Market template hubs"><h2>Estimate templates by market</h2><ul>` +
  marketLandingRoutes
    .map(
      (m) =>
        `<li><a href="/market/${m.code.toLowerCase()}/templates">${escapeHtml(m.countryName)} estimates</a></li>`,
    )
    .join("") +
  `</ul></nav>`;

const prerenderShell = (inner) =>
  `<div class="frelux-prerender"><div class="frelux-prerender__shield" aria-hidden="true">` +
  `<span class="frelux-prerender__mark">FRELUX SMART CALC</span>` +
  `<span class="frelux-prerender__bar"></span></div>${inner}${marketHubNav}</div>`;

// ── Prerender ──────────────────────────────────────────────────────
const templatePath = join(distDir, "index.html");
if (!existsSync(templatePath)) {
  console.error("❌ dist/index.html not found. Run `vite build` first.");
  process.exit(1);
}

let templateHtml = readFileSync(templatePath, "utf-8");
// Remove the old generic no-JavaScript fallback; route content is injected into #root.
templateHtml = templateHtml.replace(/<noscript>[\s\S]*?<\/noscript>/, "");
// Normalize URLs inside the template's own static JSON-LD blocks (index.html
// carries a hand-written structured-data block whose URLs must follow the
// same trailing-slash + non-redirect rules as the per-route data above).
templateHtml = templateHtml.replace(
  /(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,
  (m, open, body, close) => open + normalizeSdUrls(body) + close,
);
let count = 0;

// Real per-market material prices for the template pages. Loaded once: the
// market template loop below writes 1,280 pages from the same three tables.
const marketPriceFacts = await loadMarketPriceFacts();
const tileMaterialFacts = loadTileMaterialFacts();
let priceFactPages = 0;

const templatePriceSection = (market, template) => {
  const html =
    template.type === "tile"
      ? renderTilePriceFacts(tileMaterialFacts, market.code, market.countryName)
      : renderPriceFacts(
          marketPriceFacts,
          market.code,
          template.type,
          market.countryName,
          market.currency,
        );
  if (html) priceFactPages += 1;
  return html;
};

// ── Market × template pages (32 markets × curated templates) ────────
// Mirrors src/lib/templates-market.ts: every market gets a template hub and
// one page per curated template, each with its own canonical and hreflang
// family. These are prerendered so Google receives real HTML, not an SPA shell.
for (const m of marketLandingRoutes) {
  const hubPath = `/market/${m.code.toLowerCase()}/templates`;
  routes.push({
    path: hubPath,
    alternates: [
      { hreflang: "x-default", href: `${SITE_URL}/templates/` },
      ...marketLandingRoutes.map((mm) => ({
        hreflang: marketHreflang(mm.code),
        href: `${SITE_URL}/market/${mm.code.toLowerCase()}/templates/`,
      })),
    ],
    title: `Estimate Templates – ${m.countryName} | FRELUX`,
    description:
      `Paint, screeding, POP ceiling and tile estimate templates for ${m.countryName}, with dimensions in local units and costs in ${m.currency} (${m.currencySymbol}).`.slice(
        0,
        158,
      ),
    priority: "0.7",
    changefreq: "weekly",
    content:
      `<main><h1>Construction estimate templates for ${m.countryName}</h1>` +
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/market/${m.code.toLowerCase()}/">${m.countryName}</a> &rsaquo; Templates</nav>` +
      `<p>These templates pre-fill a whole job: room sizes, ceiling heights, openings and coats for the common ${m.countryName} painting, screeding, POP ceiling and tiling scopes. Pick one, adjust what differs on site, and the estimate runs in ${m.currency} (${m.currencySymbol}) with ${m.countryName} material prices.</p>` +
      `<h2>Templates in this market</h2><ul>` +
      TEMPLATE_CATALOG.map(
        (t) =>
          `<li><a href="${hubPath}/${t.slug}/">${t.name}</a>: ${t.description || t.seoDescription || ""}</li>`,
      ).join("") +
      `</ul><h2>Before you start</h2><p>Check the room measurements and the number of coats. FRELUX applies two coats as standard, and quantities are shown in the units used on ${m.countryName} sites rather than in a generic metric table.</p>` +
      `<ul><li><a href="/market/${m.code.toLowerCase()}/">${m.countryName} market overview</a></li><li><a href="/calculators/">All FRELUX calculators</a></li><li><a href="/prices/">Material price intelligence</a></li></ul></main>`,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Estimate templates for ${m.countryName}`,
        url: `${SITE_URL}${hubPath}`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: m.countryName,
            item: `${SITE_URL}/market/${m.code.toLowerCase()}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Templates",
            item: `${SITE_URL}${hubPath}`,
          },
        ],
      },
    ],
  });
  for (const t of TEMPLATE_CATALOG) {
    const path = `${hubPath}/${t.slug}`;
    routes.push({
      path,
      alternates: [
        { hreflang: "x-default", href: `${SITE_URL}/templates/${t.slug}/` },
        ...marketLandingRoutes.map((mm) => ({
          hreflang: marketHreflang(mm.code),
          href: `${SITE_URL}/market/${mm.code.toLowerCase()}/templates/${t.slug}/`,
        })),
      ],
      title: `${t.name} Template – ${m.countryName} | FRELUX`,
      description:
        `${t.description || t.seoDescription || t.name}. Run it in ${m.countryName} with ${m.currency} (${m.currencySymbol}) prices from the local material price book.`.slice(
          0,
          158,
        ),
      priority: "0.6",
      changefreq: "monthly",
      content:
        `<main><h1>${t.name} template for ${m.countryName}</h1>` +
        `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/market/${m.code.toLowerCase()}/">${m.countryName}</a> &rsaquo; <a href="${hubPath}/">Templates</a> &rsaquo; ${t.name}</nav>` +
        (t.description ? `<p>${t.description}</p>` : "") +
        `<h2>What this template sets up</h2><p>${t.name} pre-fills the scope for this kind of ${t.type} job so you start from realistic dimensions instead of a blank form. You still adjust every measurement, opening and coat before the estimate runs.</p>` +
        renderTemplateInputs(t, m.code === "US" ? "feet" : "meters") +
        `<h2>${m.countryName} units and pricing</h2><p>Quantities follow ${m.countryName} practice and costs are shown in ${m.currency} (${m.currencySymbol}). Where the price book holds a verified local material price it is used directly; otherwise the line is marked as a reference rate.</p>` +
        templatePriceSection(m, t) +
        `<h2>Run it</h2><ul><li><a href="${hubPath}/">All templates for ${m.countryName}</a></li><li><a href="/templates/${t.slug}/">${t.name} (global version)</a></li><li><a href="/market/${m.code.toLowerCase()}/">${m.countryName} market page</a></li><li><a href="/calculators/">All FRELUX calculators</a></li></ul></main>`,
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: `${t.name} (${m.countryName})`,
          author: { "@type": "Organization", name: "FRELUX" },
          publisher: { "@type": "Organization", name: "FRELUX" },
          url: `${SITE_URL}${path}`,
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: m.countryName,
              item: `${SITE_URL}/market/${m.code.toLowerCase()}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Templates",
              item: `${SITE_URL}${hubPath}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: t.name,
              item: `${SITE_URL}${path}`,
            },
          ],
        },
      ],
    });
  }
}

console.log(
  `[prerender] market template pages carrying stored local prices: ${priceFactPages}`,
);

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
    priority: "0.8",
    changefreq: "monthly",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: `FRELUX Construction Calculator (${m.countryName})`,
        applicationCategory: "CalculatorApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: m.currency },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: m.countryName,
            item: `${SITE_URL}${path}`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `What is the standard wall block size in ${m.countryName}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `The default wall unit in the FRELUX ${m.countryName} market profile is the ${m.blockName}, ${m.blockLengthMm} x ${m.blockHeightMm} x ${m.blockWidthMm} mm. The calculators use this size for block and mortar quantities; always confirm the actual unit with your supplier.`,
            },
          },
          {
            "@type": "Question",
            name: `What electrical standards does FRELUX use for ${m.countryName}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Electrical quantity takeoffs for ${m.countryName} follow ${m.electricalStandard} at ${m.electricalVoltage}. FRELUX produces material takeoffs, not certified electrical designs - consult a licensed local electrician.`,
            },
          },
        ],
      },
    ],
  });
}

// Reciprocal hreflang: the global template page declares its 32 market
// variants so the family is discoverable from either direction.
for (const route of routes) {
  const m = /^\/templates\/([^/]+)$/.exec(route.path);
  if (!m || route.alternates) continue;
  route.alternates = [
    { hreflang: "x-default", href: `${SITE_URL}${route.path}/` },
    ...marketLandingRoutes.map((mm) => ({
      hreflang: marketHreflang(mm.code),
      href: `${SITE_URL}/market/${mm.code.toLowerCase()}/templates/${m[1]}/`,
    })),
  ];
}

// FAQ surfaces (2026-11-01): the hub and all 62 answer pages ship as static
// HTML carrying the article body and FAQPage data, because most AI crawlers and
// several search crawlers do not run JavaScript. The payload is generated from
// the same registries the pages render from, so the static copy cannot drift.
const faqContentByPath = {};
for (const faqRoute of faqPrerenderRoutes) {
  faqContentByPath[faqRoute.path] = faqRoute.content;
  const existing = routes.find((route) => route.path === faqRoute.path);
  if (existing) {
    existing.structuredData = [
      ...(existing.structuredData ?? []),
      ...faqRoute.structuredData,
    ];
    continue;
  }
  routes.push({
    path: faqRoute.path,
    title: faqRoute.title,
    description: faqRoute.description,
    priority: "0.7",
    changefreq: "monthly",
    structuredData: faqRoute.structuredData,
  });
}

// Search results cut a title at roughly 60 characters, so a brand suffix that
// pushes past that hides the part that earns the click. Only the suffix is
// shortened, never the subject, and a title with nothing to trim is left alone.
const TITLE_LIMIT = 62;
for (const route of routes) {
  const t = route.title ?? "";
  if (t.length <= TITLE_LIMIT) continue;
  const longBrand = " | FRELUX SMART CALC";
  const shortBrand = " | FRELUX";
  if (t.endsWith(longBrand)) {
    const short = `${t.slice(0, -longBrand.length)}${shortBrand}`;
    route.title =
      short.length <= TITLE_LIMIT ? short : short.slice(0, -shortBrand.length);
  } else if (t.endsWith(shortBrand) && t.length - shortBrand.length > 20) {
    route.title = t.slice(0, -shortBrand.length);
  }
}

// Tool pages whose static body is a sentence and no links. Anything under the
// threshold is rebuilt from the registry (the same strings the page renders)
// plus real internal links: its guide, its sibling tools and the directory.
// A page that already carries a real body is left alone.
{
  const faqSlugs = Object.keys(contentMap)
    .filter((key) => key.startsWith("/faq/"))
    .map((key) => key.slice("/faq/".length).replace(/\/$/, ""));
  const detailPages = buildToolPageContent(loadToolRegistry(), { faqSlugs });
  const wordCount = (html) =>
    String(html)
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
  let rebuilt = 0;
  for (const [path, entry] of Object.entries(detailPages)) {
    const existing = contentMap[path];
    if (wordCount(existing ?? "") >= TOOL_BODY_MIN_WORDS) continue;
    contentMap[path] = entry.html;
    rebuilt += 1;
  }
  console.log(
    `[prerender] tool bodies rebuilt from registry: ${rebuilt} pages under ${TOOL_BODY_MIN_WORDS} words`,
  );
}

// Tool directory pages: the registry is the only honest source for what each
// tool does, so the category and directory bodies are generated from it rather
// than from a hand-written blurb that can drift from the calculators.
{
  const toolPages = buildToolsDirectoryContent(loadToolRegistry());
  for (const route of routes) {
    const entry = toolPages[route.path];
    if (entry) {
      route.content = entry.html;
      // The generated directory body replaces the generic one-sentence blurb:
      // it lists the real tools with their real inputs and outputs.
      contentMap[route.path] = entry.html;
      console.log(
        `[prerender] tool directory body for ${route.path}: ${
          entry.html
            .replace(/<[^>]+>/g, " ")
            .split(/\s+/)
            .filter(Boolean).length
        } words`,
      );
    }
  }
}

for (const route of routes) {
  let html = templateHtml;

  // Title
  html = html.replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`);

  // Meta description
  if (html.includes('name="description"')) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${route.description}" />`,
    );
  } else {
    html = html.replace(
      "</head>",
      `  <meta name="description" content="${route.description}" />\n</head>`,
    );
  }

  // Canonical — must match the URL Netlify actually serves. Prerendered
  // files land at dist/<path>/index.html, so the served URL carries a
  // trailing slash; the extensionless form 301s back to it. A non-slash
  // canonical is a redirect loop for Googlebot (GSC: "Page with redirect").
  const canonicalUrl =
    route.canonical ||
    `${SITE_URL}${route.path}${route.path === "/" ? "" : "/"}`;
  if (html.includes('rel="canonical"')) {
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    );
  } else {
    html = html.replace(
      "</head>",
      `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`,
    );
  }

  // OG tags
  const ogReplacements = [
    ["og:title", route.title],
    ["og:description", route.description],
    ["og:url", canonicalUrl],
    ["og:image", ogImage],
  ];
  for (const [prop, val] of ogReplacements) {
    const regex = new RegExp(
      `<meta\\s+property="${prop}"\\s+content="[^"]*"\\s*/?>`,
    );
    if (html.match(regex)) {
      html = html.replace(
        regex,
        `<meta property="${prop}" content="${val}" />`,
      );
    } else {
      html = html.replace(
        "</head>",
        `  <meta property="${prop}" content="${val}" />\n</head>`,
      );
    }
  }

  // Twitter
  const twReplacements = [
    ["twitter:title", route.title],
    ["twitter:description", route.description],
    ["twitter:image", ogImage],
  ];
  for (const [prop, val] of twReplacements) {
    const regex = new RegExp(
      `<meta\\s+name="${prop}"\\s+content="[^"]*"\\s*/?>`,
    );
    if (html.match(regex)) {
      html = html.replace(regex, `<meta name="${prop}" content="${val}" />`);
    }
  }

  // Robots
  const robotsContent =
    route.robots ||
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  if (html.includes('name="robots"')) {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${robotsContent}" />`,
    );
  } else {
    html = html.replace(
      "</head>",
      `  <meta name="robots" content="${robotsContent}" />\n</head>`,
    );
  }

  // html lang for localized pages (default template ships lang="en")
  if (route.lang) {
    html = html.replace(
      /<html([^>]*)\slang="[^"]*"/,
      `<html$1 lang="${route.lang}"`,
    );
    if (!/<html[^>]*\slang="/.test(html)) {
      html = html.replace(/<html([^>]*)>/, `<html$1 lang="${route.lang}">`);
    }
  }

  // Reciprocal hreflang. Only emitted where published translations exist, so
  // the alternate set never points at machine-translated duplicates.
  if (route.alternates && route.alternates.length) {
    const altLinks = route.alternates
      .map(
        (a) =>
          `  <link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`,
      )
      .join("\n");
    html = html.replace("</head>", `${altLinks}\n</head>`);
  }

  // Structured data
  if (route.structuredData) {
    const sdScripts = route.structuredData
      .map(
        (sd, i) =>
          `  <script type="application/ld+json" id="prerender-sd-${i}">${normalizeSdUrls(JSON.stringify(sd))}</script>`,
      )
      .join("\n");
    html = html.replace("</head>", `${sdScripts}\n</head>`);
  }

  // Put useful route content directly in the initial DOM so crawlers and users
  // without JavaScript receive the same page content as the prerendered metadata.
  // route.content covers families whose copy is built inline (market
  // templates); contentMap covers the curated pages; FAQ bodies are generated
  // from the article registries.
  const pageContent =
    contentMap[route.path] ?? route.content ?? faqContentByPath[route.path];
  if (pageContent) {
    html = html.replace(
      /(<div id="root">)[\s\S]*(\n\s*<\/div>\s*<\/body>)/,
      (_match, opening, closing) =>
        `${opening}\n      ${prerenderShell(pageContent)}${closing}`,
    );
  }

  // Write file
  const outPath =
    route.path === "/"
      ? join(distDir, "index.html")
      : join(distDir, route.path, "index.html");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  count++;
  console.log(`  ✅ ${route.path}`);
}

// ── 404 page ────────────────────────────────────────────────────────
// Generate a proper 404.html that returns real content, not the homepage shell.
{
  let html404 = templateHtml;
  html404 = html404.replace(
    /<title>.*?<\/title>/,
    "<title>Page Not Found | FRELUX SMART CALC</title>",
  );
  html404 = html404.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="noindex, nofollow" />',
  );
  html404 = html404.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    "",
  );
  const notFoundContent =
    '<main><h1>Page Not Found</h1><nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; 404</nav><p>The page you are looking for does not exist. Browse our calculators and tools:</p><ul><li><a href="/paint-calculator/">Paint Calculator</a></li><li><a href="/tile-calculator/">Tile Calculator</a></li><li><a href="/screeding-calculator/">Screeding Calculator</a></li><li><a href="/pop-ceiling-calculator/">POP Ceiling Calculator</a></li><li><a href="/calculators/">All Calculators</a></li></ul><p><a href="/">Back to home</a></p></main>';
  html404 = html404.replace(
    /(<div id="root">)[\s\S]*(\n\s*<\/div>\s*<\/body>)/,
    (_match, opening, closing) =>
      `${opening}\n      ${prerenderShell(notFoundContent)}${closing}`,
  );
  html404 = html404.replace(
    /\s*<script type="module"[^>]*src="[^"]+"><\/script>/,
    "",
  );
  writeFileSync(join(distDir, "404.html"), html404);
  console.log("  ✅ /404.html");
}

// Ground-truth manifest of every static page this build can serve. The sitemap
// generator reads it so it can never advertise a URL that has no file (the
// 2026-11-01 audit found 1,216 such URLs live), and never silently omit a page
// that does have one.
function collectPrerenderedPaths(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_") || entry.name === "assets") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectPrerenderedPaths(full, `${prefix}/${entry.name}`));
    } else if (entry.name === "index.html") {
      out.push(prefix === "" ? "/" : prefix);
    }
  }
  return out;
}
const manifestPaths = collectPrerenderedPaths(distDir).sort();
writeFileSync(
  join(distDir, "_prerender-manifest.json"),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      paths: manifestPaths,
      // What the build had data for. A build with no reachable database emits
      // only the static routes, so the guards can tell an empty data source
      // apart from a family that was advertised but never written.
      families: {
        colours: paintColors.length,
        palettes: colorPalettes.length,
        templates: extraTemplates.length,
      },
    },
    null,
    0,
  ),
);
console.log(`\n prerendered ${count} routes`);
console.log(` manifest: ${manifestPaths.length} static pages`);

// ── Internal link repair ──────────────────────────────────────────────────────
// Spanish articles were machine-translated, and the translator translated their
// link targets as well: a body points at /aprender/como-calcular-las-cantidades
// when the real page is /es/learn/<english-slug>. The served pages therefore
// linked at 404s.
//
// This pass runs last, over what was actually written. For every internal link
// whose target does not exist it tries, in order:
//   1. the anchor text against the real article titles (the translator kept the
//      titles intact, so "cómo planificar su proyecto de construcción hasta el
//      techo" resolves to the article that carries that heading);
//   2. a small alias table for translated calculator names;
//   3. the nearest existing ancestor of the path (…/learn/x -> …/learn).
// Anything still unresolved is left alone and reported, never silently pointed
// at the home page.

repairInternalLinks(distDir);
