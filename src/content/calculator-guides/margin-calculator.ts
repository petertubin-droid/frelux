import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Profit Margin and Contractor Markup Calculator.
 *
 * Construction commercial pricing requires rigorous understanding of the
 * mathematical difference between markup on cost and gross or net profit margin
 * on contract revenue, alongside proper recovery of jobsite and office overheads.
 */
export const marginCalculatorGuide: CalculatorGuide = {
  slug: "margin-calculator",
  heading: "How the construction profit margin and markup calculator works",
  howItWorks: [
    "Compile base direct costs directly attributable to the job, including materials, plant and tool hire, specialized trade subcontracts, and site labor wages.",
    "Apportion jobsite general conditions (project overheads), such as site management supervision, temporary site power and water, waste skips, and storage facilities.",
    "Allocate general and administrative (G and A) head office overhead as an agreed percentage of direct cost to recover fixed enterprise expenses.",
    "Apply the mathematical formula converting target profit margin on revenue into the equivalent cost markup: Markup equals Margin divided by the quantity one minus Margin.",
    "Layer statutory project allowances, client withholding taxes, and risk contingency buffers to calculate the final unburdened tender submission quotation.",
  ],
  workedExample: {
    intro:
      "A commercial renovation contractor pricing a tenant fit-out package with direct base costs of 85,000 currency units. General conditions site overhead is established at 7%, corporate office overhead at 5%, target net profit margin at 15% on contract revenue, and unforeseen contingency at 3%.",
    steps: [
      { label: "Base direct project cost", value: "85,000 units (materials, labour, plant)" },
      {
        label: "Jobsite general conditions (7%)",
        value: "5,950 units (site management and utilities)",
      },
      {
        label: "Direct subtotal with site overhead",
        value: "90,950 units (all project-level costs)",
      },
      {
        label: "Corporate head office overhead (5%)",
        value: "4,250 units (enterprise overhead recovery)",
      },
      {
        label: "Total contract cost basis",
        value: "95,200 units (breakeven cost threshold)",
      },
      {
        label: "Target net profit margin (15% on sales)",
        value: "17.65% equivalent markup on total cost",
      },
      {
        label: "Contract price before contingency",
        value: "112,000 units (calculated as 95,200 / [1 - 0.15])",
      },
      {
        label: "Net profit generated",
        value: "16,800 units (exactly 15.0% of the 112,000 contract value)",
      },
      {
        label: "Unforeseen site contingency (3%)",
        value: "3,360 units (reserved for concealed substrate repairs)",
      },
      {
        label: "Final client tender price",
        value: "115,360 units (total lump-sum contract quotation)",
      },
    ],
    result:
      "Contractor quotation of 115,360 units yields 16,800 units net profit (15.0% profit margin), while fully recovering 95,200 total costs and holding a 3,360 contingency buffer.",
    note: "Does not include value-added tax (VAT) or reverse-charge sales tax obligations.",
  },
  ratioTable: {
    caption:
      "Contractor markup versus margin equivalence table and typical industry overhead benchmarks",
    columns: [
      "Target Profit Margin",
      "Equivalent Cost Markup",
      "Contract Type / Scale",
      "Typical Overhead Range",
    ],
    rows: [
      [
        "5.0% Net Margin",
        "5.26% Cost Markup",
        "Large Civil Infrastructure Projects",
        "4% to 6% G and A Overhead",
      ],
      [
        "10.0% Net Margin",
        "11.11% Cost Markup",
        "Commercial Core and Shell Works",
        "6% to 9% G and A Overhead",
      ],
      [
        "15.0% Net Margin",
        "17.65% Cost Markup",
        "Residential Building and Fit-Out",
        "8% to 12% G and A Overhead",
      ],
      [
        "20.0% Net Margin",
        "25.00% Cost Markup",
        "Specialty Subcontracting Packages",
        "10% to 15% G and A Overhead",
      ],
      [
        "25.0% Net Margin",
        "33.33% Cost Markup",
        "Small Renovations and Fit-Outs",
        "12% to 18% G and A Overhead",
      ],
      [
        "30.0% Net Margin",
        "42.86% Cost Markup",
        "High-Risk Restoration and Repairs",
        "15% to 22% G and A Overhead",
      ],
      [
        "Site Overhead (General Conditions)",
        "5% to 10% on direct costs",
        "All active jobsite operations",
        "Supervision, power, temporary access",
      ],
      [
        "Contingency Reserve Buffer",
        "3% to 8% on total bid",
        "Renovation and brownfield sites",
        "Hidden structural or utility defects",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the mathematical difference between markup and profit margin?",
      answer:
        "Markup is the percentage added to direct project cost to determine the price (Markup equals Profit divided by Cost). Profit margin is the percentage of total sales revenue that remains as earnings after deducting all costs (Margin equals Profit divided by Price). Because revenue is always larger than cost, a 20% markup yields only a 16.67% profit margin. Confusing these two figures leads contractors to underprice bids and suffer unexpected financial losses.",
    },
    {
      question:
        "What expenses should be included in site-level general conditions overhead?",
      answer:
        "General conditions (jobsite overhead) encompass indirect expenses specific to a project that are not tied to a single physical work item. Typical components include site superintendent salaries, temporary construction fencing and site hoardings, jobsite electricity and water connections, toilet rentals, waste disposal skips, and site security services.",
    },
    {
      question:
        "How should general and administrative (G and A) overhead be recovered?",
      answer:
        "General and administrative overhead represents non-project fixed expenses incurred to run the company, such as office rent, executive salaries, accounting, legal fees, and marketing. Contractors calculate total annual G and A overhead as a percentage of projected annual volume and apply that percentage across all bids to ensure head office operations are fully reimbursed.",
    },
    {
      question:
        "Why is an explicit contingency line item recommended on renovation tenders?",
      answer:
        "Renovation and brownfield construction projects routinely encounter concealed defects once finishes are stripped away, such as decayed framing, substandard electrical wiring, or unrecorded plumbing lines. Allocating a 3% to 8% contingency protects the contractor against absorption of these unexpected costs without having to file contentious change orders immediately upon site possession.",
    },
    {
      question:
        "Does this calculator provide legally binding tax or financial audit advice?",
      answer:
        "No. This calculator is a mathematical commercial pricing tool for contractors and estimators. Corporate tax structuring, local sales tax or VAT compliance, and statutory audited accounting statements must be managed in consultation with a certified construction accountant or financial advisor.",
    },
  ],
  limits:
    "This calculator provides commercial pricing and markup calculations for contracting. It does not replace corporate financial auditing, jurisdiction-specific tax compliance, or binding legal tender documents.",
};
