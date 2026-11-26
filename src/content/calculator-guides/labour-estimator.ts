import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Construction Labour and Crew Productivity Estimator.
 *
 * Deterministic labour estimation transforms bill of quantities work items
 * into required craftsman worker-days, helper ratios, and project duration
 * based on empirical trade outputs and site-specific efficiency factors.
 */
export const labourEstimatorGuide: CalculatorGuide = {
  slug: "labour-estimator",
  heading: "How the construction labour and crew productivity estimator works",
  howItWorks: [
    "Compile net work item quantities from architectural and structural schedules across key construction trades (masonry, concrete, plastering, screeding, tiling, rebar, carpentry, and painting).",
    "Apply benchmark trade labour productivity constants (worker-days or man-hours per unit of work) derived from standard contractor cost books and empirical site time studies.",
    "Adjust baseline productivity with site efficiency loss factors to account for adverse weather, vertical material hoisting heights, restricted access, and trade congestion.",
    "Structure balanced crew gangs by matching skilled master craftsmen with appropriate ratios of semi-skilled assistants and unskilled labourers for efficient material transport and staging.",
    "Calculate project calendar duration by dividing total trade worker-days by daily gang headcounts, factoring in statutory rest days and reasonable weather contingency buffers.",
  ],
  workedExample: {
    intro:
      "A 2-storey residential construction package requiring 450 square metres of 225 mm (9-inch) hollow sandcrete blockwork. Project conditions specify manual mortar mixing, second-storey scaffold hoisting, and a standard 8-hour workday program.",
    steps: [
      { label: "Net blockwork installation area", value: "450.0 m2 (4,500 blocks)" },
      {
        label: "Benchmark mason daily output",
        value: "7.0 m2 per 8-hour day (70 blocks laid per mason)",
      },
      {
        label: "Standard crew gang ratio",
        value: "1 skilled mason paired with 2 unskilled labourers",
      },
      {
        label: "Baseline skilled mason-days",
        value: "64.3 mason-days (450 m2 / 7.0 m2 per day)",
      },
      {
        label: "Baseline labourer worker-days",
        value: "128.6 labourer-days (2 labourers per mason)",
      },
      {
        label: "Site vertical hoisting loss factor",
        value: "15% productivity loss for second-storey staging",
      },
      {
        label: "Adjusted skilled mason-days",
        value: "74.0 mason-days (including vertical handling loss)",
      },
      {
        label: "Adjusted labourer worker-days",
        value: "148.0 labourer-days (including mortar mixing and staging)",
      },
      {
        label: "Assigned active site gang",
        value: "3 masons plus 6 labourers (9 total personnel daily)",
      },
      {
        label: "Calculated gang completion duration",
        value: "25 working days (74 mason-days divided across 3 masons)",
      },
    ],
    result:
      "Estimated labour package requires 74 mason-days and 148 labourer-days, completing the 450 m2 blockwork in 25 working days (5 calendar weeks at 5 days per week).",
    note: "Does not include material supply costs, scaffolding hire, or crane operator fees.",
  },
  ratioTable: {
    caption:
      "Trade labour productivity outputs, crew gang compositions, and unit man-hours",
    columns: [
      "Trade Work Item",
      "Typical Daily Output",
      "Crew Gang Composition",
      "Unit Man-Hours (Total)",
    ],
    rows: [
      [
        "Blockwork (225mm / 9-inch)",
        "6.0 to 8.0 m2 per day",
        "1 Mason plus 2 Labourers",
        "3.0 to 4.0 man-hrs / m2",
      ],
      [
        "Wall Plastering (15mm 2-coat)",
        "18 to 25 m2 per day",
        "1 Plasterer plus 1 Labourer",
        "0.6 to 0.9 man-hrs / m2",
      ],
      [
        "Floor Screeding (50mm)",
        "25 to 35 m2 per day",
        "1 Screeder plus 2 Labourers",
        "0.7 to 1.0 man-hrs / m2",
      ],
      [
        "Ceramic Floor Tiling",
        "12 to 16 m2 per day",
        "1 Tiler plus 1 Helper",
        "1.0 to 1.3 man-hrs / m2",
      ],
      [
        "Rebar Cutting and Bending",
        "200 to 300 kg per day",
        "1 Steel fixer plus 1 Helper",
        "5.0 to 8.0 man-hrs / tonne",
      ],
      [
        "Concrete Placing (Manual Pour)",
        "4.0 to 6.0 m3 per day",
        "1 Concreter plus 4 Labourers",
        "6.5 to 10.0 man-hrs / m3",
      ],
      [
        "Wall Painting (2-coat finish)",
        "50 to 70 m2 per day",
        "1 Painter plus 0.5 Helper",
        "0.18 to 0.25 man-hrs / m2",
      ],
      [
        "Roof Timber Truss Assembly",
        "15 to 22 m2 plan area / day",
        "2 Carpenters plus 2 Labourers",
        "1.5 to 2.2 man-hrs / m2",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between a man-hour and a worker-day in construction?",
      answer:
        "A man-hour represents one hour of continuous labor performed by an individual worker. A worker-day represents the output of one worker over a standard single shift (typically 8 productive hours, excluding meal breaks). Labour estimating equations often convert man-hours into worker-days to establish realistic daily staffing levels and progress schedules.",
    },
    {
      question:
        "How do site efficiency loss factors affect trade productivity rates?",
      answer:
        "Productivity references assume ideal ground-level conditions. In practice, site realities reduce output: carrying materials up multiple floors without hoists adds 10% to 20% handling time; extreme heat or rainfall slows manual tasks by 15% to 25%; and crowded workspaces where multiple trades overlap cause congestion losses of 10% to 15%. Applying site efficiency factors ensures tenders do not underestimate required labor.",
    },
    {
      question:
        "Why is it essential to maintain proper craftsman-to-helper gang ratios?",
      answer:
        "Skilled craftsmen (such as masons, carpenters, and tile setters) earn higher daily wage rates and should spend their time installing finished work, not fetching sand, mixing mortar, or carrying blocks. Supplying the correct ratio of helpers (such as 2 laborers per blocklayer) keeps master trades fully productive and minimizes total package labour costs.",
    },
    {
      question:
        "Can project duration be reduced simply by doubling the number of workers?",
      answer:
        "Only up to a point of diminishing returns. The law of site congestion means adding too many workers into a finite room or work face causes trade interference, tool shortages, and safety risks. Accelerating schedules requires expanding multiple independent work faces or operating sequential shifts rather than overcrowding a single floor plate.",
    },
    {
      question:
        "Does this estimator determine statutory minimum wage rates or union agreements?",
      answer:
        "No. This calculator produces physical worker-days, crew compositions, and task durations. Actual daily wage rates and payroll burdens (taxes, social insurance, worker compensation) must be applied in accordance with prevailing local labor market agreements and contractor union contracts.",
    },
  ],
  limits:
    "This calculator provides preliminary trade worker-day and crew productivity takeoffs. It does not replace detailed critical path method (CPM) scheduling, union work rules, or formal contract labor pricing.",
};
