/**
 * FRELUX User Guide — public, structured content.
 *
 * Single source of truth for the /user-guide page. Mirrors
 * docs/user-guide.md. Keep both in sync when features change.
 *
 * Content rules (site-wide):
 *   - No invented quantities or claims: text describes behavior only.
 *   - No hyphen-heavy marketing prose; technical identifiers unchanged.
 */

export interface GuideLink {
  label: string;
  to: string;
}

export interface GuideTable {
  columns: string[];
  rows: string[][];
}

export interface GuideSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Rendered as inline links within a bullet (label → route). */
  linkBullets?: { text: string; link?: GuideLink }[];
  table?: GuideTable;
  note?: string;
  /** Optional second content block (paragraph bullets heading + list). */
  paragraphs2?: string[];
  bullets2?: string[];
}

export const GUIDE_LAST_REVIEWED = "2026-09-08";

export const guideSections: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    paragraphs: [
      "FRELUX is a construction estimation platform. It helps you estimate materials, quantities and costs for building and finishing work, with or without a floor plan.",
    ],
    bullets: [
      "Quick calculators. Open any calculator, enter your measurements, get results instantly. No account needed.",
      "AI Image Estimator. Upload a floor plan image and let AI extract the rooms, then calculate from the plan.",
      "Build to Roof Estimator. A guided flow for whole building estimates from foundation to roof.",
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    paragraphs: [
      "On a phone, the main sections live in the menu, and the most used calculators sit on the home screen.",
    ],
    linkBullets: [
      {
        text: "Home explains FRELUX and links to everything.",
        link: { label: "Home", to: "/" },
      },
      {
        text: "Calculators lists every estimator.",
        link: { label: "Calculators", to: "/calculators" },
      },
      {
        text: "AI groups the AI features (Image Estimator, Copilot, color tools).",
        link: { label: "AI features", to: "/image-estimator" },
      },
      {
        text: "Learn (Learn Hub) hosts guides and articles.",
        link: { label: "Learn Hub", to: "/learn" },
      },
      {
        text: "My Projects holds your saved projects, estimates and timeline once you are signed in.",
        link: { label: "My Projects", to: "/my-projects" },
      },
      {
        text: "Pricing shows plans and what each includes.",
        link: { label: "Pricing", to: "/pricing" },
      },
      {
        text: "Contact reaches the FRELUX team.",
        link: { label: "Contact", to: "/contact" },
      },
    ],
  },
  {
    id: "calculators",
    title: "The Calculators and What They Need",
    paragraphs: [
      "Every calculator states which measurements it needs before you calculate. If a required value is missing, FRELUX asks for it instead of guessing.",
    ],
    table: {
      columns: ["Calculator", "Route", "Required input", "What you get"],
      rows: [
        [
          "Paint Calculator",
          "/paint-calculator",
          "Room length, width, wall height (metres or feet)",
          "Paint litres, number of containers, primer",
        ],
        [
          "Painting Estimator",
          "/painting-estimator",
          "Same as paint calculator plus paint type and quality",
          "Estimate with costs",
        ],
        [
          "Paint Comparison",
          "/paint-comparison",
          "Two or more paint scenarios",
          "Side by side comparison",
        ],
        [
          "Screeding Calculator",
          "/screeding-calculator",
          "Room length, width, height (wall surface)",
          "Screeding materials",
        ],
        [
          "Screeding Cost Estimator",
          "/screeding-cost-estimator",
          "Wall area or room dimensions",
          "Materials with costs",
        ],
        [
          "Tile Calculator",
          "/tile-calculator",
          "Floor length and width, tile size",
          "Tiles, boxes, adhesive",
        ],
        [
          "Tile Cost Estimator",
          "/tile-cost-estimator",
          "Same plus tile price",
          "Full cost estimate",
        ],
        [
          "POP Ceiling Calculator",
          "/pop-ceiling-calculator",
          "Room length and width (ceiling area)",
          "POP boards and materials",
        ],
        [
          "POP Ceiling Cost Estimator",
          "/pop-ceiling-cost-estimator",
          "Ceiling area",
          "Materials with costs",
        ],
        [
          "Finish Estimator (Grafitex)",
          "/finish-estimator",
          "Wall area",
          "Grafitex materials",
        ],
        [
          "Tyrolene Estimator",
          "/tyrolene-estimator",
          "Partition width and height",
          "Partition materials",
        ],
        [
          "Cost Estimator",
          "/cost-estimator",
          "Paint area and your material prices",
          "Total cost breakdown",
        ],
        [
          "Foundation Calculator",
          "/foundation-calculator",
          "Building footprint and foundation type",
          "Foundation quantities",
        ],
        [
          "Structural Calculator",
          "/structural-calculator",
          "Structural member dimensions",
          "Member quantities",
        ],
        [
          "Build to Roof Estimator",
          "/build-to-roof-estimator",
          "Building size and build choices",
          "Full building estimate",
        ],
        [
          "Project Timeline",
          "/project-timeline",
          "Project scope",
          "Phased schedule",
        ],
        [
          "Image Estimator",
          "/image-estimator",
          "A floor plan image",
          "Extracted rooms plus estimates",
        ],
      ],
    },
  },
  {
    id: "units",
    title: "Units and Conversions",
    paragraphs: [
      "You can enter measurements in metres or feet. Pick the unit before you calculate and FRELUX converts internally. Results are always shown in metric units (square metres, litres) because materials are sold that way.",
      "Money is shown in your market's currency. Where FRELUX has verified price information for your market, it is used and labeled with its source. Where it does not, FRELUX asks you for the price instead of inventing one.",
    ],
  },
  {
    id: "how-results",
    title: "How Results Are Calculated (Plain Language)",
    paragraphs: [
      "FRELUX measures real surfaces first, then applies material rules.",
    ],
    bullets: [
      "Screeding is calculated on the wall surface area: the room perimeter multiplied by wall height, minus door and window openings. It is never the floor area.",
      "Tiling is calculated on the floor area: length times width.",
      "POP ceiling is calculated on the ceiling area: room length times width.",
      "Painting follows the FRELUX room method: wall and ceiling areas, minus openings, then litres, then whole containers (buckets). You buy containers, so FRELUX tells you containers, not just square metres.",
      "Tyrolene follows the partition method: partition width and height.",
      "Grafitex is a square metre method applied to the wall area.",
      "Every result states the area it used, so you can check the number yourself. Waste allowance and rounding rules are shown on the result, and each quantity line names its unit (litres, bags, buckets, boxes, pieces).",
    ],
  },
  {
    id: "material-quantities",
    title: "Material Quantities",
    paragraphs: [
      "For each material you get the quantity needed and, where sizes matter, the purchase quantity: for example five buckets rather than 4.81 buckets when buckets are sold whole. Rounding is always visible, and extra material for waste is included and labeled.",
    ],
  },
  {
    id: "cost-estimates",
    title: "Cost Estimates",
    paragraphs: [
      "Cost estimates multiply quantities by prices. Prices come from, in order of preference:",
    ],
    bullets: [
      "A price you entered yourself.",
      "A verified market price for your region, where FRELUX has one.",
      "Nothing. If FRELUX has no price, it tells you a price is needed instead of guessing.",
      "Labour costs are separate line items where a calculator offers them.",
    ],
  },
  {
    id: "saving",
    title: "Saving Estimates and Estimate History",
    paragraphs: [
      "With an account you can save any result to a project. Saved estimates keep the exact numbers you saw at the moment of saving, including the prices and configuration used. If market prices change later, your saved estimate does not silently change; it is a record of that moment. You can recalculate any time for fresh numbers.",
      "Estimate history lists your saved calculations with dates, and you can reopen them from the project.",
    ],
  },
  {
    id: "pdf-export",
    title: "PDF, Export and Sharing",
    paragraphs: ["From a result screen you can:"],
    bullets: [
      "Export a PDF quote with your own company details and branding where the calculator supports it.",
      "Share a cost summary to WhatsApp with a link.",
      "Copy the numbers into your own documents.",
      "The PDF shows the same numbers as the screen. It does not recalculate.",
    ],
  },
  {
    id: "projects",
    title: "Projects",
    paragraphs: [
      "My Projects groups your estimates, plans and timelines per property or project. You can keep several projects, each with its own saved calculations and documents. Project Workspace shows everything about one project in one place.",
    ],
    linkBullets: [
      { text: "Open", link: { label: "My Projects", to: "/my-projects" } },
      {
        text: "Open the",
        link: { label: "Project Workspace", to: "/project-workspace" },
      },
    ],
  },
  {
    id: "ai-features",
    title: "AI Features",
    linkBullets: [
      {
        text: "AI Image Estimator. Upload a floor plan image. The AI extracts rooms, dimensions and openings, marks how confident it is about each value, and asks you to confirm uncertain measurements before calculating. Only confirmed values are used.",
        link: { label: "AI Image Estimator", to: "/image-estimator" },
      },
      {
        text: "AI Copilot. Chat about your project. When a question involves a calculation, the AI runs the same certified calculators behind the scenes and reports their output; it does not invent numbers.",
        link: { label: "AI Copilot", to: "/assistant" },
      },
      {
        text: "AI Color Assistant and Color Preview help you choose and preview paint colors.",
        link: { label: "Color Assistant", to: "/ai-color-assistant" },
      },
      {
        text: "Construction Sequence explains the order of building work.",
        link: { label: "Construction Sequence", to: "/construction-sequence" },
      },
    ],
  },
  {
    id: "build-to-roof",
    title: "Build to Roof Estimator",
    paragraphs: [
      "A guided estimator for a whole building from foundation to roof level. You choose the building size and build options; FRELUX shows each stage with its quantities.",
    ],
    note: "Structural stages carry a safety notice: FRELUX quantities are budgeting guides, and a qualified engineer must confirm structural elements before construction.",
    linkBullets: [
      {
        text: "Open the",
        link: {
          label: "Build to Roof Estimator",
          to: "/build-to-roof-estimator",
        },
      },
    ],
  },
  {
    id: "regional",
    title: "Regional and International Settings",
    paragraphs: [
      "FRELUX starts with Nigeria as the default market. Where a calculator supports other regions, you choose yours and FRELUX uses that region's verified prices only. It never substitutes Nigerian prices for another region silently. If your region lacks verified price data, FRELUX says so and asks you for prices.",
    ],
  },
  {
    id: "account",
    title: "Account and Premium Features",
    paragraphs: [
      "Create a free account to save projects and history. Paid plans unlock premium features such as advanced AI usage and premium tools. Your plan and what it includes always show on your profile. You can buy plans and AI tokens online; payments are processed by a secure payment provider.",
    ],
    linkBullets: [
      { text: "See the", link: { label: "Pricing page", to: "/pricing" } },
    ],
  },
  {
    id: "rewarded",
    title: "Rewarded Access",
    paragraphs: [
      "Where you hit a limit on a free plan, you can sometimes unlock extra AI usage by watching a rewarded ad, or by upgrading. This keeps the free tier usable while keeping FRELUX running.",
    ],
  },
  {
    id: "learn-hub",
    title: "Learn Hub",
    paragraphs: [
      "The Learn Hub contains plain language guides: how to measure a room, how screeding works, choosing tiles, and more. Articles are written for the Nigerian market first, with international notes where relevant.",
    ],
    linkBullets: [
      { text: "Open the", link: { label: "Learn Hub", to: "/learn" } },
    ],
  },
  {
    id: "limits",
    title: "What FRELUX Can and Cannot Calculate",
    paragraphs: ["FRELUX can:"],
    bullets: [
      "Estimate material quantities and costs for painting, screeding, tiling, POP ceiling, finishes, partitions, foundations, structures and whole buildings.",
      "Read floor plans with AI and calculate from confirmed dimensions.",
      "Save, export and share estimates.",
    ],
    paragraphs2: ["FRELUX cannot:"],
    bullets2: [
      "Replace a qualified engineer, architect or quantity surveyor.",
      "Account for hidden site conditions (soil tests, existing damage) it cannot see.",
      "Guarantee market prices; prices change and estimates are guides.",
      "Approve structural designs. Structural results are indicative only.",
    ],
  },
  {
    id: "safety",
    title: "Safety Limitations",
    bullets: [
      "Structural, foundation and roof quantities are budgeting estimates. A qualified engineer must review and approve anything structural before you build.",
      "AI extracted dimensions must be confirmed by you. FRELUX shows confidence levels and asks for confirmation.",
      "If information is missing, FRELUX refuses to calculate rather than inventing values.",
    ],
  },
  {
    id: "errors",
    title: "Errors and Missing Information",
    paragraphs: [
      "When something is missing you will see a clear message. These messages mean exactly what they say: give FRELUX the missing information and try again.",
    ],
    bullets: [
      "Select a paint quality before calculating.",
      "Tile selection required: choose a tile size and price before we calculate tiling.",
      "Screeding configuration is unavailable right now: use the Screeding Cost Estimator directly.",
      "No approved price available for this product in your market: enter a price or try another region.",
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    bullets: [
      "Result looks wrong. Check the inputs: units, dimensions, openings. Every result states the area it used, so you can verify it yourself.",
      "Cannot save. Sign in first; saving needs an account.",
      "App will not update. Close and reopen, or reinstall from the browser; the app updates itself in the background.",
    ],
  },
  {
    id: "contact",
    title: "Contact and Help",
    paragraphs: [
      "Use the Contact page to reach the team, and the in-app messaging channels where available. Legal pages (Privacy Policy, Terms, Disclaimer) are in the site footer. The Disclaimer states clearly that FRELUX estimates are guides and professional confirmation is required before construction.",
    ],
    linkBullets: [
      { text: "Open the", link: { label: "Contact page", to: "/contact" } },
    ],
  },
  {
    id: "api",
    title: "FRELUX API (For Developers)",
    paragraphs: [
      "If you want to connect your own tools to FRELUX's calculators and intelligence, visit the developers section of the website. You can create a personal API key, read the endpoint documentation, and track your usage. Keys are shown once at creation; keep them safe. Calculation results through the API come from the same engines as the website calculators, with the same honesty: FRELUX never invents missing values or unobserved prices.",
    ],
    linkBullets: [
      {
        text: "Open the",
        link: { label: "Developer Portal", to: "/developers" },
      },
    ],
  },
];

/** FAQ derived directly from guide content, used for FAQPage structured data. */
export const guideFaq: { question: string; answer: string }[] = [
  {
    question: "Do I need an account to use FRELUX calculators?",
    answer:
      "No. All calculators are free to use with no sign-up required. A free account is only needed to save projects and estimate history.",
  },
  {
    question: "Can I enter measurements in feet?",
    answer:
      "Yes. Pick metres or feet before you calculate and FRELUX converts internally. Results are always shown in metric units because materials are sold that way.",
  },
  {
    question: "Where do FRELUX prices come from?",
    answer:
      "Prices come from, in order of preference: a price you entered yourself, a verified market price for your region where FRELUX has one, or nothing. FRELUX tells you a price is needed instead of guessing.",
  },
  {
    question: "Is FRELUX a substitute for a qualified engineer?",
    answer:
      "No. Structural, foundation and roof quantities are budgeting estimates. A qualified engineer must review and approve anything structural before you build.",
  },
  {
    question: "Does the AI invent numbers?",
    answer:
      "No. The AI extracts data (for example room dimensions from a floor plan image) and marks its confidence. All quantities come from the same deterministic calculators, and unconfirmed values are never used.",
  },
];
