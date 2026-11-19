/**
 * Listing copy for the pages the tool registry does not own.
 *
 * A search result shows about 62 characters of title and 158 of description.
 * Anything longer is cut mid-phrase, which reads as carelessness and costs the
 * click. These are the informational, legal, template and directory pages; the
 * calculators take their copy from the tool registry instead.
 *
 * House rules, same as the registry: no currency symbol, no market name, no
 * claim the page cannot support. Nothing here is region-locked, so the same
 * sentence is true in every market the site serves.
 */

/** @type {Record<string, {title: string, description: string}>} */
export const LISTING_COPY = {
  "/": {
    title: "FRELUX: Free Construction Calculators and Cost Estimates",
    description:
      "Estimate materials and cost for concrete, blocks, roofing, tiles, paint and services, with quantities from your own measurements and prices from your market.",
  },
  "/about": {
    title: "About FRELUX: Construction Estimation Tools",
    description:
      "Why FRELUX exists: deterministic quantity engines, disclosed assumptions, market price books and standards from several jurisdictions, in one toolset.",
  },
  "/contact": {
    title: "Contact FRELUX: Support and Feedback",
    description:
      "Reach the FRELUX team about a calculator, a price, an export or your account. Support, corrections to market data and partnership enquiries all start here.",
  },
  "/privacy-policy": {
    title: "Privacy Policy: What FRELUX Stores and Why",
    description:
      "What FRELUX collects, where it is stored, how long it is kept, and how to export or delete your data, including estimates saved without an account.",
  },
  "/terms": {
    title: "Terms of Service: Using FRELUX",
    description:
      "The terms that govern use of FRELUX: what the estimates are, what they are not, who owns the data you enter, and how the paid plans and exports work.",
  },
  "/cookie-policy": {
    title: "Cookie Policy: Storage FRELUX Uses",
    description:
      "The cookies and local storage FRELUX relies on, what each one holds, which are optional, and how to clear or refuse them without losing saved work.",
  },
  "/ai-disclaimer": {
    title: "AI Disclaimer: Where AI Is Used in FRELUX",
    description:
      "Which parts of FRELUX use AI, which are deterministic engines, and why a quantity from an engine is authoritative while an AI reading is a starting point.",
  },
  "/engineering-standards": {
    title: "Engineering Standards: Codes FRELUX Cites",
    description:
      "The design codes and standards behind each engine, which edition is cited, what is checked and what is left to a qualified engineer, stated plainly.",
  },
  "/user-guide": {
    title: "User Guide: How Every FRELUX Tool Works",
    description:
      "How to use each FRELUX calculator end to end: what to measure, which inputs are optional, how waste and labour are applied, and how to export the result.",
  },
  "/glossary": {
    title: "Construction Glossary: Building Terms Explained",
    description:
      "Plain-language definitions of the terms FRELUX uses, from blinding and hardcore to screeding and soffit, with the unit each one is measured in.",
  },
  "/faq": {
    title: "FRELUX FAQ: Estimates, Prices and Exports",
    description:
      "Answers on how the estimates are calculated, where prices come from, how accurate a takeoff can be, and what a Pro export adds to a free result.",
  },
  "/feedback": {
    title: "Send Feedback: Corrections and Requests",
    description:
      "Report a wrong price, a confusing input or a missing material, or ask for a calculator you need. Corrections to market data are checked first.",
  },
  "/rewards": {
    title: "FRELUX Rewards: Earn Credits for Referrals",
    description:
      "How FRELUX credits are earned, what they unlock, when they expire, and how a referral is counted, with the balance shown on your account page.",
  },
  "/credits": {
    title: "FRELUX Credits: Balance and What They Unlock",
    description:
      "Your credit balance, the actions that spend credits, the actions that never do, and when the balance resets, with the ledger behind each entry.",
  },
  "/brand-studio": {
    title: "Brand Studio: Branded Estimates and Exports",
    description:
      "Add your logo, colours and contact details so every estimate, BOQ and receipt export carries your business identity instead of FRELUX's.",
  },
  "/developers": {
    title: "Developer Resources: API and Webhooks",
    description:
      "Integrate FRELUX pricing and takeoff into your own systems: authentication, endpoints, the payload shapes and the events a webhook delivers.",
  },
  "/developers/merchant-webhooks": {
    title: "Merchant API: Inventory and Price Webhooks",
    description:
      "Publish your material inventory and prices to FRELUX, and receive events when a quote, order or price change affects your listings, with retries.",
  },
  "/case-studies": {
    title: "Case Studies: Estimates Compared to Actuals",
    description:
      "Projects costed with FRELUX and then built, showing the estimate against the actual spend, the variance and what caused the difference.",
  },
  "/printables": {
    title: "Free Printables: Checklists and Site Sheets",
    description:
      "Printable site sheets, checklists and measurement forms that pair with the calculators, ready to take to site without a screen.",
  },
  "/start-building": {
    title: "Start Building: Pick Your Project Type",
    description:
      "Choose what you are building, from a fence to a full duplex, and FRELUX opens the right sequence of calculators with the inputs each one needs.",
  },
  "/marketplace": {
    title: "Marketplace: Buy and Sell Building Materials",
    description:
      "Browse materials listed by suppliers, compare prices per unit and per delivery, and contact the seller directly, with the listing date shown.",
  },
  "/pro-connect": {
    title: "Pro Connect: Find Verified Construction Professionals",
    description:
      "Find painters, tilers, screeders, ceiling specialists and builders by market and trade, see the work they list, and request a quote directly.",
  },
  "/suppliers": {
    title: "Suppliers: Material Prices from Verified Vendors",
    description:
      "Supplier listings with the prices they publish, the unit each price is quoted in, the market served and the date the price was last confirmed.",
  },
  "/suppliers/register": {
    title: "Register a Supply Business on FRELUX",
    description:
      "List your material supply business, publish your prices and units, and appear in supplier comparisons for the markets you actually deliver to.",
  },
  "/suppliers/compare": {
    title: "Compare Suppliers and Landed Prices",
    description:
      "Put supplier prices side by side, including delivery, so the cheapest headline price is not mistaken for the cheapest delivered material.",
  },
  "/global-markets": {
    title: "Markets and Standards FRELUX Covers",
    description:
      "The markets FRELUX serves, the currency and measurement units each one uses, the standards applied and how complete each market's price book is.",
  },
  "/planning-approvals": {
    title: "Planning Approvals: Permits and Setbacks",
    description:
      "What a building permit application usually needs, which setbacks and coverage limits commonly apply, and where to confirm the rule for your area.",
  },
  "/diaspora-tracker": {
    title: "Diaspora Site Tracker: Follow Work Remotely",
    description:
      "Follow a build from abroad: progress updates against the estimate, spend against budget and photo records, with the currency of each entry.",
  },
  "/site-intelligence": {
    title: "Site and Soil Intelligence: Ground Conditions",
    description:
      "Record what the ground tells you, from soil type and bearing capacity to groundwater, and see which foundation type the evidence supports.",
  },
  "/escrow": {
    title: "Escrow for Cross-Border Construction Payments",
    description:
      "How milestone escrow works when the client and the builder are in different countries: what releases a payment, and what happens on a dispute.",
  },
  "/learn/library": {
    title: "Learn Library: Every FRELUX Guide",
    description:
      "The complete set of FRELUX guides on measurement, quantities, materials and cost, grouped by trade and by market so the right one is easy to find.",
  },
  "/market-intelligence": {
    title: "Market Intelligence: Prices and Indices",
    description:
      "Material prices, official index data and listed-company coverage by market, each with the date it was verified and the source it came from.",
  },
  "/market-intelligence/materials": {
    title: "Material Prices and Index Data by Market",
    description:
      "Track cement, steel, timber, aggregates and finishes by market, with the price history, the unit quoted and the date of the last observation.",
  },
  "/market-intelligence/trends": {
    title: "Price Trends: What Materials Are Doing",
    description:
      "How material prices have moved over recent periods by market, shown as changes rather than as levels, with the window each movement covers.",
  },
  "/market-intelligence/investment": {
    title: "Sector Performance: Construction Investment",
    description:
      "How construction and building-materials companies have performed, with the period covered and the caveat that this is not investment advice.",
  },
  "/market-intelligence/stocks": {
    title: "Listed Builders and Materials Companies",
    description:
      "Listed construction and building-materials companies by market, with the exchange, the ticker and the reporting currency for each listing.",
  },
  "/market-intelligence/companies": {
    title: "Company Profiles: Builders and Suppliers",
    description:
      "Profiles of listed builders and materials companies, including what each one produces, the markets it operates in and the exchange it trades on.",
  },
  "/learn/build-in-nigeria-from-abroad": {
    title: "Build in Nigeria from Abroad: Costs and Stages",
    description:
      "How to budget a Nigerian build from the US or UK: the stages, where money actually goes, how to verify prices remotely and how to control remittances.",
  },
};

/**
 * The room templates all say the same useful thing, so they are generated from
 * the room they describe rather than written out one by one.
 *
 * @type {Array<{pattern: RegExp, trade: string, label: (slug: string) => string}>}
 */
const TEMPLATE_TRADES = [
  { prefix: "/templates/", suffix: "-painting", trade: "Painting" },
  { prefix: "/templates/", suffix: "-tiling", trade: "Tiling" },
  { prefix: "/templates/", suffix: "-pop-ceiling", trade: "POP Ceiling" },
  { prefix: "/templates/", suffix: "-screeding", trade: "Screeding" },
];

const titleCase = (slug) =>
  slug
    .split("-")
    .map((w) =>
      w.length <= 2 && w !== "pop" ? w : w[0].toUpperCase() + w.slice(1),
    )
    .join(" ");

/**
 * Listing copy for one path, or null when the path has none.
 *
 * @param {string} path
 * @returns {{title: string, description: string} | null}
 */
export function listingCopyFor(path) {
  const fixed = LISTING_COPY[path];
  if (fixed) return fixed;
  for (const t of TEMPLATE_TRADES) {
    if (!path.startsWith(t.prefix) || !path.endsWith(t.suffix)) continue;
    const room = titleCase(path.slice(t.prefix.length, -t.suffix.length));
    const title = `${t.trade} Template: ${room} | FRELUX`;
    return {
      title: title.length <= 62 ? title : `${t.trade} Template | FRELUX`,
      // Kept short enough that the longest room name still fits the 158 the
      // search result shows.
      description: `A pre-filled ${t.trade.toLowerCase()} template for a ${room.toLowerCase()}: adjust the measurements, then read quantities, waste and cost at your own rates.`,
    };
  }
  return null;
}
