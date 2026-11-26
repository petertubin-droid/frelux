import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Global Site Safety and PPE Estimator.
 *
 * Construction occupational health and safety planning requires systematic
 * personal protective equipment (PPE) budgeting, compliant ISO 7010 signage,
 * first aid equipment, and emergency response provisioning based on site
 * headcount, duration, and trade risk exposure.
 */
export const globalSiteSafetyEstimatorGuide: CalculatorGuide = {
  slug: "global-site-safety-estimator",
  heading: "How the global construction site safety and PPE estimator works",
  howItWorks: [
    "Assess peak site workforce headcount, scheduled duration in months, and active trade packages to determine aggregate personal protective equipment (PPE) consumption.",
    "Schedule mandatory baseline PPE (industrial safety helmets, high-visibility reflective vests, safety footwear with steel toe and puncture-resistant midsoles, and impact eye protection) with realistic duty replacement factors.",
    "Apportion high-risk trade specialty PPE (full-body fall-arrest harnesses, double lanyards with energy absorbers, welding face shields, heavy cut-resistant gloves, and particulate dust respirators) based on trade headcounts.",
    "Plan site perimeter and work zone safety signage compliant with ISO 7010 graphical hazard symbols, including mandatory PPE notices, caution warnings, prohibition directives, and emergency egress routing.",
    "Size emergency response equipment, including certified workplace first aid trauma kits, portable emergency eye wash stations, chemical spill kits, and multi-purpose ABC dry powder fire extinguishers distributed across work levels.",
  ],
  workedExample: {
    intro:
      "A commercial construction project with a peak on-site workforce of 45 operatives over a 9-month (36-week) structural, envelope, and MEP finishing program. Site scope involves working at heights, concrete cutting, steel fabrication, and crane lifting operations.",
    steps: [
      { label: "Peak active site workforce", value: "45 trades operatives" },
      { label: "Project duration schedule", value: "36 active working weeks" },
      {
        label: "Industrial safety helmets (Type 1)",
        value: "50 helmets (45 crew plus 5 allocated for site visitors)",
      },
      {
        label: "High-visibility vests (Class 2)",
        value: "90 vests (2 garments per operative across project duration)",
      },
      {
        label: "Puncture-resistant safety boots",
        value: "45 pairs (EN ISO 20345 S3 certified with steel toe)",
      },
      {
        label: "UV and impact safety glasses",
        value: "90 pairs (allowing 2 pairs per worker for replacement)",
      },
      {
        label: "Fall-arrest harness and lanyard sets",
        value: "14 complete kits (for scaffolders, steel fixers, and roofers)",
      },
      {
        label: "Particulate respirators (FFP2/N95)",
        value: "40 boxes of 20 masks (800 total masks for dust and cutting)",
      },
      {
        label: "ISO 7010 site signage schedule",
        value: "38 rigid sign boards (entrance gate, hazard zones, fire points)",
      },
      {
        label: "Workplace first aid trauma stations",
        value: "3 wall-mounted Class B stations (BS 8599-1 compliant)",
      },
      {
        label: "ABC dry powder fire extinguishers (6 kg)",
        value: "8 units (2 at site welfare/offices, 6 across active work levels)",
      },
    ],
    result:
      "Safety equipment schedule supplies 50 hard hats, 90 hi-vis vests, 45 safety boots, 90 protective glasses, 14 fall harnesses, 800 dust masks, 38 safety signs, 3 first aid stations, and 8 fire extinguishers.",
    note: "Does not include edge protection scaffolding netting, heavy noise barriers, or perimeter security guard services.",
  },
  ratioTable: {
    caption:
      "Construction site safety equipment distribution ratios, replacement cycles, and standards",
    columns: [
      "Safety Category & Item",
      "Distribution Ratio / Baseline",
      "Replacement Cycle",
      "Safety Standard / Reference",
    ],
    rows: [
      [
        "Industrial Safety Helmet (Hard Hat)",
        "1 unit per worker plus 5 visitors",
        "3 to 5 years (replace on impact)",
        "EN 397 / ANSI Z89.1 Type I",
      ],
      [
        "High-Visibility Vest (Class 2)",
        "2 units per worker per year",
        "6 months under site exposure",
        "ISO 20471 / ANSI 107 Class 2",
      ],
      [
        "Protective Safety Footwear",
        "1 pair per worker per contract",
        "6 to 12 months heavy site wear",
        "ISO 20345 S3 / ASTM F2413",
      ],
      [
        "Safety Glasses / Eye Protection",
        "2 pairs per worker per year",
        "Replace when scratched or pitted",
        "EN 166 / ANSI Z87.1",
      ],
      [
        "Full-Body Fall-Arrest Harness",
        "1 kit per operative working at height",
        "Annual certified inspection",
        "EN 361 / OSHA 1926.502",
      ],
      [
        "ISO 7010 Site Safety Signage",
        "1 composite gate board plus zone signs",
        "Full construction project duration",
        "ISO 7010 / OSHA 1926.200",
      ],
      [
        "Workplace First Aid Station",
        "1 station per 25 to 50 operatives",
        "Monthly inspection and restocking",
        "BS 8599-1 / ANSI Z308.1 Class B",
      ],
      [
        "ABC Dry Powder Extinguisher (6kg)",
        "1 unit per 200 m2 floor area",
        "Annual certified maintenance",
        "EN 3-7 / NFPA 10",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What are the mandatory baseline PPE requirements on modern building sites?",
      answer:
        "International health and safety regulations (such as OSHA and UK HSE) establish a mandatory four-point PPE baseline for all personnel entering an active construction zone: Type 1 impact-resistant hard hats, high-visibility reflective vests or outerwear, safety footwear with steel or composite protective toe caps and puncture-resistant soles, and wrap-around impact-rated eye protection.",
    },
    {
      question:
        "When is specialized fall-arrest equipment mandatory for trades working at height?",
      answer:
        "Fall protection is required whenever personnel work at unprotected elevations of 1.8 metres (6 feet) or higher in general construction (or 2.0 metres under European regulations). Where passive guardrails or safety nets are impractical, operatives must wear a certified full-body harness connected to an engineered overhead anchorage point via a shock-absorbing lanyard or self-retracting lifeline.",
    },
    {
      question:
        "How are ISO 7010 safety signs color-coded on a construction jobsite?",
      answer:
        "ISO 7010 uses standardized shapes and colors: circular blue signs with white pictograms indicate mandatory actions (such as Hard Hats Required); triangular yellow signs with black borders indicate warnings and hazards (such as Overhead Crane Risk); circular red signs with diagonal slash bars indicate prohibitions (such as No Unauthorized Entry); and rectangular green signs designate emergency exits, first aid, and assembly stations.",
    },
    {
      question:
        "How frequently should construction first aid kits be inspected and restocked?",
      answer:
        "First aid stations must be formally inspected at minimum once every 30 days by a designated site safety officer or qualified first aider. Consumable items like sterile adhesive dressings, antiseptic wipes, eye wash solution vials, burn dressings, and sterile gauze pads must be replenished immediately after any reported site incident or upon reaching manufacturer expiration dates.",
    },
    {
      question:
        "Can this tool replace a statutory site occupational health and safety plan?",
      answer:
        "No. This calculator provides planning budgets and quantity takeoffs for safety equipment, PPE provisioning, and signage schedules. A certified Construction Phase Health and Safety Plan (HSE CPP or OSHA safety manual) must be drafted by a qualified site safety manager in compliance with municipal and national workplace safety statutes.",
    },
  ],
  limits:
    "This calculator provides preliminary material takeoffs and equipment budgeting for site safety. It does not replace a site-specific occupational health and safety risk assessment, engineered scaffolding plans, or statutory regulatory filings.",
};
