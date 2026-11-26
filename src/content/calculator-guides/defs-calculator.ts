import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the Direct-applied Exterior Finishing System (DEFS) Calculator.
 *
 * Direct-applied Exterior Finishing Systems (DEFS) apply polymer-modified
 * cementitious base coats with embedded reinforcing fiberglass mesh and
 * synthetic textured finishes directly over sheathing or masonry substrates,
 * omitting the continuous foam insulation boards used in EIFS.
 */
export const defsCalculatorGuide: CalculatorGuide = {
  slug: "defs-calculator",
  heading: "How the direct applied exterior finishing system estimator works",
  howItWorks: [
    "Measure facade surface areas from architectural elevations, excluding doors, windows, and unrendered penetrations to calculate net substrate contact area.",
    "Verify approved exterior sheathing substrates (such as cement backer board or exterior glass-mat gypsum panels) and schedule joint reinforcement taping using polymer-coated alkali-resistant mesh tape and setting mortar.",
    "Quantify polymer-modified cementitious base coat mortar consumption across the entire net wall face to bed the continuous fiberglass reinforcement mesh.",
    "Schedule continuous alkali-resistant fiberglass mesh (160 g/m2) with standard 65 mm to 100 mm edge overlaps and 45-degree diagonal stress patches at all opening corners.",
    "Apportion exterior tinted acrylic primer and flexible synthetic aggregate finish plaster pails, together with PVC casing beads, reveal screeds, and expansion control joints.",
  ],
  workedExample: {
    intro:
      "Exterior canopy soffits, architectural fascia bands, and non-insulated parapet wall returns totalling 180.0 square metres net surface area. Substrate is exterior cement backer board. Specification calls for taped joints, polymer base coat, 160 g/m2 alkali-resistant mesh, tinted primer, and 1.5 mm synthetic acrylic finish render.",
    steps: [
      { label: "Net DEFS application area", value: "180.0 m2" },
      {
        label: "Substrate joint reinforcing tape (100 mm)",
        value: "135 linear metres (3 rolls of 50 m, covering board seams)",
      },
      {
        label: "Joint treatment base mortar",
        value: "54 kg (3 bags of 25 kg, based on 0.35 kg/m joint)",
      },
      {
        label: "Cementitious base coat mortar",
        value: "810 kg (33 bags of 25 kg, based on 4.5 kg/m2)",
      },
      {
        label: "Alkali-resistant mesh (160 g/m2)",
        value: "202.0 m2 (5 rolls of 50 m2, allowing 12% for lap overlaps)",
      },
      {
        label: "Exterior tinted acrylic primer",
        value: "36.0 litres (2 pails of 20 L, coverage 5.0 m2/L)",
      },
      {
        label: "Synthetic acrylic finish (1.5 mm texture)",
        value: "432 kg (18 pails of 25 kg, coverage 2.4 kg/m2)",
      },
      {
        label: "PVC casing beads and drip screeds",
        value: "54.0 linear metres along perimeter edges and terminations",
      },
      {
        label: "PVC expansion control joints",
        value: "24.0 linear metres (spaced every 6 metres across field)",
      },
    ],
    result:
      "Calculated system bill of materials covers 3 rolls joint tape, 36 total bags mortar, 5 rolls mesh, 2 pails primer, 18 pails finish, and 78 metres PVC trims.",
    note: "Does not include cement backer board sheets, corrosion-resistant substrate screws, or scaffolding access.",
  },
  ratioTable: {
    caption:
      "DEFS material consumption rates, substrate specifications, and component coverage",
    columns: [
      "Assembly Component",
      "Application Rate / Metric",
      "Supply Packaging",
      "Recommended Waste Allowance",
    ],
    rows: [
      [
        "Substrate Joint Reinforcing Tape",
        "1.0 m per linear metre joint",
        "50 m roll (100 mm width)",
        "10% cut overlap waste",
      ],
      [
        "Joint Treatment Base Mortar",
        "0.30 to 0.40 kg per linear metre",
        "25 kg dry powder sack",
        "5% container residue",
      ],
      [
        "Cementitious Base Coat Mortar",
        "4.0 to 5.0 kg per m2 net face",
        "25 kg dry powder sack",
        "6% trowel drop and residue",
      ],
      [
        "Alkali-Resistant Mesh (160g)",
        "1.0 m2 per m2 surface area",
        "50 m2 roll (1.0 m x 50 m)",
        "10% to 12% lap allowance",
      ],
      [
        "Tinted Exterior Acrylic Primer",
        "0.18 to 0.22 L per m2",
        "20 L plastic pail",
        "5% pail clingage loss",
      ],
      [
        "Synthetic Acrylic Finish (1.5mm)",
        "2.2 to 2.6 kg per m2",
        "25 kg ready-mixed pail",
        "5% trowel residue loss",
      ],
      [
        "PVC Casing Bead and Edge Trim",
        "1.0 m per linear edge",
        "3.0 m standard length",
        "8% cutting and mitre waste",
      ],
      [
        "PVC M-Type Expansion Joint",
        "1.0 m per linear joint",
        "3.0 m standard length",
        "8% alignment cut waste",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between DEFS and EIFS?",
      answer:
        "EIFS incorporates continuous rigid foam insulation boards (EPS, XPS, or mineral wool) between the wall substrate and the base coat lamina to deliver high thermal insulation. DEFS applies the base coat and reinforcing mesh directly over the sheathing or masonry substrate without foam boards. While DEFS provides a seamless, crack-resistant synthetic plaster finish, it does not provide continuous thermal insulation or continuous R-value improvements.",
    },
    {
      question:
        "Where is DEFS typically installed on modern commercial and residential buildings?",
      answer:
        "DEFS is widely specified for uninsulated building zones that require a modern textured architectural finish matching an adjacent EIFS facade. Common applications include covered entry canopies, exterior soffits, roof parapet wall copings, high-impact ground-level columns, and balcony slab returns where rigid insulation boards cannot be accommodated or are unnecessary.",
    },
    {
      question:
        "Why must substrate board joints be taped and treated before base coat application?",
      answer:
        "Cement boards and glass-mat sheathing panels experience thermal and hygric expansion and contraction at panel junctions. If the base coat and finish are applied without treating these seams, substrate joint movement telegraphs directly through the finish as unsightly linear cracks. Applying heavy alkali-resistant polymer tape embedded in base coat mortar isolates panel movement and prevents surface fissures.",
    },
    {
      question:
        "How frequently must expansion control joints be installed in DEFS walls?",
      answer:
        "Continuous DEFS areas must include PVC expansion joints at intervals not exceeding 6.0 metres (20 feet) in any direction, across any existing building structural expansion joint, and wherever substrate materials transition (such as from concrete masonry to steel stud framing). Limiting undivided field panel size prevents stress cracking from thermal building movement.",
    },
    {
      question:
        "Can DEFS be applied directly over concrete block or masonry?",
      answer:
        "No. DEFS is an exterior grade system and must never be installed over interior paper-faced gypsum board. Substrates must be certified exterior-grade sheathing, including glass-mat gypsum panels compliant with ASTM C1177, cement backer boards compliant with ASTM C1325, or sound cast-in-place concrete and concrete masonry units.",
    },
  ],
  limits:
    "This calculator provides preliminary material schedules for DEFS installations. It does not replace project-specific building envelope flashing details, substrate structural deflection engineering, or manufacturer warranty system specifications.",
};
