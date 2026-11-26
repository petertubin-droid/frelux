import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Window Blinds Estimator.
 *
 * Estimating window blinds requires collecting a schedule of openings,
 * recording precise width and drop dimensions, accounting for inside versus
 * outside mount allowances, cassette enclosures, motorisation wiring, and
 * fabric roll cutting waste.
 */
export const windowBlindsEstimatorGuide: CalculatorGuide = {
  slug: "window-blinds-estimator",
  heading: "How the window blinds schedule estimator works",
  howItWorks: [
    "Compile an opening-by-opening window schedule. Record each room label, window opening width, window opening drop (height), and quantity of matching openings.",
    "Select mounting configuration for each window opening. Inside-recess mounts require deducting approximately 10 mm (3/8 inch) from total width to allow bracket clearance without dragging against window reveals. Outside-face mounts require adding 50 mm to 100 mm past the opening on both sides and top to prevent light bleeding.",
    "Choose blind fabric type and grade. Common options include roller blinds (blackout, sunscreen, or translucent), vertical louvres, aluminium or timber venetian slats, and dual-layer day-night zebra blinds.",
    "Incorporate optional accessories and automation hardware. Motorised tubular motors, wireless remote controls, wall power supply conduits, decorative aluminium cassettes or pelmets, and old blind removal must be itemised as unit add-ons.",
    "Apply fabric roll cutting waste and minimum billing areas. Commercial blind manufacturers enforce minimum billing thresholds (typically 1.0 to 1.5 square metres per blind unit) to offset hardware fabrication overhead on small transom and toilet windows.",
  ],
  workedExample: {
    intro:
      "A complete window blinds installation for a 3-bedroom detached bungalow with 10 window openings, using premium blackout roller blinds with inside-recess mounts, decorative cassette headrails, and motorized control in the master suite.",
    steps: [
      {
        label: "Living room windows",
        value: "3 openings, 1.80 m wide x 1.50 m drop = 8.10 m2",
      },
      {
        label: "Dining area windows",
        value: "1 opening, 1.50 m wide x 1.50 m drop = 2.25 m2",
      },
      {
        label: "Master bedroom windows",
        value: "2 openings, 1.50 m wide x 1.50 m drop = 4.50 m2",
      },
      {
        label: "Guest bedroom 1 windows",
        value: "2 openings, 1.20 m wide x 1.20 m drop = 2.88 m2",
      },
      {
        label: "Guest bedroom 2 windows",
        value: "1 opening, 1.20 m wide x 1.20 m drop = 1.44 m2",
      },
      {
        label: "Kitchen window",
        value: "1 opening, 0.90 m wide x 1.00 m drop (min billed at 1.0 m2)",
      },
      {
        label: "Total net fabric area",
        value: "20.17 m2 (measured opening schedule)",
      },
      {
        label: "Decorative top cassettes",
        value: "10 matching anodised aluminium headrail cassettes",
      },
      {
        label: "Motorisation upgrades",
        value: "2 rechargeable tubular motors with remote control",
      },
      {
        label: "Installation brackets & fixings",
        value: "20 heavy-duty top/face mounting bracket pairs",
      },
    ],
    result:
      "Total measured schedule covers 10 blinds (20.17 m2 billed area), 10 decorative cassette headrails, and 2 motorised units with remote control.",
    note: "Exact widths must be verified on site at top, middle, and bottom of each window opening prior to factory fabrication.",
  },
  ratioTable: {
    caption:
      "Window blind fabric options, recess clearance allowances, and hardware benchmarks",
    columns: [
      "Blind Type & Mechanism",
      "Standard Fabric Roll Width",
      "Recess Width Deduction",
      "Minimum Billing Threshold",
    ],
    rows: [
      [
        "Roller Blinds (Blackout)",
        "2.0 m to 2.8 m rolls",
        "10 mm to 12 mm total clearance",
        "1.0 m2 per individual blind",
      ],
      [
        "Roller Blinds (Sunscreen 5%)",
        "2.5 m to 3.0 m rolls",
        "10 mm to 12 mm total clearance",
        "1.0 m2 per individual blind",
      ],
      [
        "Zebra Day-Night Dual Blinds",
        "2.4 m to 2.8 m rolls",
        "12 mm to 15 mm total clearance",
        "1.2 m2 per individual blind",
      ],
      [
        "Vertical Louvre Blinds (89mm/127mm)",
        "Narrow continuous fabric rolls",
        "15 mm to 20 mm floor/sill clearance",
        "1.5 m2 per individual blind",
      ],
      [
        "Aluminium Venetian (25mm slats)",
        "Modular pre-formed headrails",
        "10 mm recess clearance",
        "1.0 m2 per individual blind",
      ],
      [
        "Faux Wood Venetian (50mm slats)",
        "Extruded PVC / composite slats",
        "12 mm recess clearance",
        "1.2 m2 per individual blind",
      ],
      [
        "Motorisation Power Supply",
        "Rechargeable lithium or 240V mains",
        "Additional 5 mm motor head space",
        "Per-motor hardware unit rate",
      ],
      [
        "Installation Hardware Allowance",
        "Masonry plugs, screws, clips",
        "2 brackets for width under 1.8m",
        "3 brackets for width over 1.8m",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between inside-recess and outside-face mounting?",
      answer:
        "Inside-recess mounting fits the blind completely within the window frame reveal, creating a flush, uncluttered appearance that highlights the surrounding architectural trim. Outside-face mounting attaches the blind to the wall or architrave above the window, which is ideal when window frames lack sufficient depth, when window handles obstruct operation, or when maximum blackout coverage is needed to eliminate light halos.",
    },
    {
      question:
        "How do I measure windows correctly for inside-recess blind installation?",
      answer:
        "Always measure with a rigid steel tape measure rather than a flexible fabric tape. Measure the width across three locations: top, middle, and bottom of the reveal. Record the smallest width to ensure the blind does not jam in out-of-square openings. Then measure the drop (height) in three places: left, centre, and right, recording the longest measurement. The manufacturer will apply standard deductions to the width.",
    },
    {
      question:
        "Why do blind manufacturers charge a minimum square metre billing size?",
      answer:
        "Every blind requires a dedicated aluminium headrail, roller tube, internal spring or clutch mechanism, control chain or motor, bottom rail, and mounting brackets, regardless of size. On small windows (such as a 600 mm x 900 mm bathroom window), the cost of the mechanical hardware and labour exceeds the fabric cost, so suppliers enforce a 1.0 to 1.5 square metre minimum price floor.",
    },
    {
      question:
        "Should I select rechargeable battery or hardwired electric motorized blinds?",
      answer:
        "Rechargeable battery tubular motors are the most popular retrofit solution because they require zero wall chasing, electrical conduit, or licensed electrician call-outs; a single charge lasts 4 to 6 months under standard daily use. Hardwired 240V or 24V motors are recommended for new construction and large commercial glazed facades where permanent power can be run during the first-fix electrical rough-in.",
    },
    {
      question: "Does this estimator order the blinds directly from a factory?",
      answer:
        "No. This calculator produces a precise preliminary schedule of dimensions, square metre areas, and hardware accessories to assist in budgeting and obtaining competitive trade quotes. Final manufacturing measurements must be physically verified by your chosen installer before custom fabrication, as made-to-measure blinds cannot be returned.",
    },
  ],
  limits:
    "This calculator provides preliminary schedule takeoffs for budgeting and quotation comparison. It does not replace on-site certified laser measurements, structural lintel depth checks, or trade installation contracts.",
};
