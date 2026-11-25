/**
 * Public hub pages that both the sitemap and the prerenderer must know about.
 *
 * These routes were reachable and crawlable, but absent from sitemap.xml: the
 * sitemap listed thousands of market and locale variants of the tool pages
 * while the hubs that link to them (/calculators, /cost-estimator, /price-index,
 * /building-types) were missing. A crawler that only follows the sitemap never
 * arrived at them, and a hub that is not in the sitemap is a page Google has to
 * discover by luck.
 *
 * One file, imported by both scripts, because the two lists had drifted: the
 * prerenderer already had /engineering-standards and the sitemap did not.
 *
 * Every entry here is public: no auth guard on the route, no entry in the
 * robots.txt disallow list.
 */
export const publicHubRoutes = [
  {
    path: "/calculators",
    title: "Construction Calculators and Estimators | FRELUX",
    description:
      "Every FRELUX calculator in one place: concrete, blockwork, roofing, finishes, structural and cost estimators. Enter your own figures and see the quantities and the method behind them.",
    priority: "0.9",
    changefreq: "weekly",
  },
  {
    path: "/building-types",
    title: "Building Types and What They Cost to Build | FRELUX",
    description:
      "Compare building types from shop unit to clinic and school block: typical sizes, material schedules and the cost drivers behind each one.",
    priority: "0.9",
    changefreq: "monthly",
  },
  {
    path: "/cost-estimator",
    title: "Construction Cost Estimator | FRELUX",
    description:
      "Estimate what a building will cost before you tender it: measured quantities, current material rates and preliminaries in one priced breakdown.",
    priority: "0.9",
    changefreq: "weekly",
  },
  {
    path: "/engineering-standards",
    title: "Engineering Methodology and Accuracy | FRELUX",
    description:
      "How each FRELUX calculator derives its quantities: disclosed assumptions, code references and the limits of the method. Informational only, not a certification.",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/price-index",
    title: "Construction Material Price Index | FRELUX",
    description:
      "Track what cement, reinforcement, blocks and finishes actually cost, with movement over time instead of a single undated figure.",
    priority: "0.8",
    changefreq: "weekly",
  },
  {
    path: "/prices/regional-indices",
    title: "Regional Construction Cost Indices | FRELUX",
    description:
      "Compare material and labour cost levels between regions before you price a job, so a rate that works in one city is not carried into another.",
    priority: "0.7",
    changefreq: "weekly",
  },
  {
    path: "/learn/glossary",
    title: "Construction Glossary: Terms, Units and Abbreviations | FRELUX",
    description:
      "Plain definitions of the construction and quantity surveying terms used across the site, including the units and abbreviations that trip people up in a bill.",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    path: "/intelligence",
    title: "Construction Market Intelligence | FRELUX",
    description:
      "Material price movements, regional cost pressure and demand signals, read together so a quotation is based on the market rather than last year's rate.",
    priority: "0.8",
    changefreq: "daily",
  },
  {
    path: "/document-studio",
    title: "Document Studio: Quotes, Invoices and BOQs | FRELUX",
    description:
      "Turn measurements into client-ready documents: quotations, invoices and bills of quantities with your branding, sealed and verifiable.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/compliance/data-residency",
    title: "Data Residency and Compliance | FRELUX",
    description:
      "Where FRELUX stores your project data, which regions it is held in, and what that means for your own data protection obligations.",
    priority: "0.4",
    changefreq: "yearly",
  },
  {
    path: "/borehole-estimator",
    title: "Borehole Drilling Cost Estimator | FRELUX",
    description:
      "Estimate borehole depth, casing, pump and drilling costs from your target yield and ground conditions, with the assumptions stated.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/eifs-calculator",
    title: "EIFS and External Insulation Calculator | FRELUX",
    description:
      "Work out EIFS board, adhesive, mesh and finish quantities from wall area, including openings and the waste allowance you actually use.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/etics-calculator",
    title: "ETICS External Wall Insulation Calculator | FRELUX",
    description:
      "Calculate ETICS insulation thickness, fixings and render quantities by wall area, with thermal and waste assumptions shown.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/icf-calculator",
    title: "ICF Insulating Concrete Formwork Calculator | FRELUX",
    description:
      "Estimate ICF blocks, concrete volume and reinforcement for walls built in insulating concrete formwork, from your own wall dimensions.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/painting-estimator",
    title: "Painting Cost Estimator: Paint, Primer and Labour | FRELUX",
    description:
      "Estimate litres of paint, primer and labour from wall and ceiling area, with coats, coverage rates and openings accounted for.",
    priority: "0.8",
    changefreq: "monthly",
  },
  {
    path: "/pop-ceiling-cost-estimator",
    title: "POP Ceiling Cost Estimator | FRELUX",
    description:
      "Price a POP ceiling from the area and design: plaster of Paris, framing, cornice and labour, with waste included rather than guessed.",
    priority: "0.8",
    changefreq: "monthly",
  },
];
