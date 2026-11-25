import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const waterproofingEstimatorGuide: CalculatorGuide = {
  slug: "waterproofing-estimator",
  heading: "Waterproofing, DPC, DPM and membrane calculation guide",
  howItWorks: [
    "Effective moisture control in buildings prevents dampness, concrete carbonation, mould growth, and structural deterioration. A complete waterproofing strategy incorporates three foundational barriers: Damp Proof Courses (DPC), Damp Proof Membranes (DPM), and seamless liquid or sheet surface coatings.",
    "Damp Proof Course (DPC) is a continuous horizontal barrier placed at plinth level (minimum 150 mm above external finished ground level) to prevent capillary rising damp from ascending through porous masonry blockwork into living spaces.",
    "Damp Proof Membrane (DPM) is a heavy-duty virgin polyethylene sheet (typically 1,000 to 1,200 gauge or 250 to 300 microns thick) laid beneath ground floor concrete slabs to stop ground water and water vapor from saturating the slab.",
    "Liquid-applied and elastomeric membrane waterproofing protects wet areas (bathrooms, laundry rooms, kitchen sinks), balconies, and concrete flat roofs. Two continuous perpendicular coats are applied to create a seamless waterproof tanking system that bridges hairline substrate cracks.",
    "Laps and overlaps are critical to prevent capillary failure. DPC rolls require 150 mm end overlaps at joints, while DPM sheeting requires 200 mm to 300 mm laps sealed with double-sided waterproof butyl tape. Liquid coatings require reinforcement corner joint tape along all floor-to-wall junctions.",
  ],
  workedExample: {
    intro:
      "Plinth DPC, ground slab DPM, and two bathroom wet rooms: estimating waterproofing barriers for a residential bungalow: 85 metres of 225 mm blockwork plinth for DPC, 110 m² ground slab for DPM, and two bathroom wet areas totalling 34 m² of floor and shower wall tanking with flexible cementitious slurry.",
    steps: [
      {
        label: "DPC plinth wall length (with 10% lap and corner waste)",
        value: "93.50 linear metres (225 mm wide)",
      },
      {
        label: "DPC roll count required (93.5 m ÷ 30 m roll)",
        value: "4 rolls of 225 mm × 30 m DPC",
      },
      {
        label: "DPM ground slab membrane (with 15% lap and upturns)",
        value: "126.50 m² heavy-duty polythene",
      },
      {
        label: "DPM commercial roll packaging (4 m × 25 m rolls)",
        value: "2 rolls of 4 m × 25 m DPM",
      },
      {
        label: "Bathroom liquid tanking slurry (2 perpendicular coats)",
        value: "61.20 kg cementitious slurry",
      },
      {
        label: "Liquid waterproofing kit packaging (20 kg pre-batch)",
        value: "4 kits (80 kg total product)",
      },
      {
        label: "Waterproof corner joint sealing tape (internal junctions)",
        value: "24.00 linear metres flexible tape",
      },
    ],
    result:
      "Total purchase list: 4 rolls of 225 mm × 30 m DPC, 2 rolls of 4 m × 25 m DPM, 4 kits (80 kg) liquid tanking slurry, and 24 m corner joint tape.",
  },
  ratioTable: {
    caption:
      "Waterproofing systems, thicknesses, and material consumption rates",
    columns: [
      "Waterproofing barrier system",
      "Standard thickness / gauge specification",
      "Coverage or consumption per packaging unit",
    ],
    rows: [
      [
        "Embossed bitumen / polythene DPC",
        "0.5 mm to 1.0 mm thickness roll",
        "1.0 linear metre per metre of wall (plus 150 mm lap)",
      ],
      [
        "Heavy-duty slab DPM sheeting",
        "1,000 to 1,200 gauge (250-300 µm)",
        "1.0 m² per m² slab area (plus 15% lap and edge turn-up)",
      ],
      [
        "Flexible cementitious tanking (2 coats)",
        "1.2 mm to 1.5 mm dry film thickness",
        "1.6 kg to 2.0 kg powder/slurry per m² total",
      ],
      [
        "Elastomeric polyurethane liquid membrane",
        "1.0 mm to 1.2 mm dry film thickness",
        "1.2 kg to 1.5 kg liquid coating per m²",
      ],
      [
        "Torch-on modified bitumen sheet",
        "3 mm to 4 mm mineral membrane roll",
        "8.5 m² to 9.0 m² net coverage per 10 m roll (100 mm side lap)",
      ],
    ],
  },
  faqs: [
    {
      question: "What is the difference between DPC and DPM?",
      answer:
        "A Damp Proof Course (DPC) is a narrow strip of impervious material installed horizontally within masonry walls to block rising damp from ascending above the plinth. A Damp Proof Membrane (DPM) is a wide sheet of polyethylene membrane installed across the entire ground footprint beneath the concrete slab to block moisture vapor from penetrating the floor.",
    },
    {
      question: "How high above ground level should DPC be installed?",
      answer:
        "Building standards require DPC to be installed at least 150 mm (6 inches) above finished external ground level. This height prevents heavy rainwater splashing up off surrounding pavement and bypassing the damp barrier into unprotected blockwork above.",
    },
    {
      question: "How thick should a damp-proof membrane be under concrete?",
      answer:
        "Building codes require a minimum thickness of 1,000 gauge (250 microns or 0.25 mm), though 1,200 gauge (300 microns) is strongly recommended for rocky or uneven hardcore beds. Low-cost recycled thin plastic tears easily under worker boots and aggregate weight, defeating the moisture barrier.",
    },
    {
      question:
        "How many coats of liquid waterproofing are required in bathrooms?",
      answer:
        "Liquid waterproofing membranes must always be applied in at least two separate coats. The second coat should be applied perpendicular (at 90 degrees) to the first coat after the first has cured sufficiently. Applying two thin perpendicular coats eliminates pinholes and ensures consistent dry film thickness.",
    },
    {
      question: "Why is corner joint tape necessary in wet rooms?",
      answer:
        "The junction between a floor slab and a vertical wall undergoes slight differential structural and thermal movement. Liquid waterproofing alone can split along this seam. Embedding flexible waterproof joint tape into the basecoat across all internal corners and pipe penetrations bridges dynamic movement and prevents leaks.",
    },
  ],
  limits:
    "This tool calculates material coverage for barrier layers and surface membranes. It does not design hydrostatic pressure drainage systems for sub-surface basements or guarantee installation craftsmanship.",
};
