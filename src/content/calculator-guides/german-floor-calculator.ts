import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const germanFloorCalculatorGuide: CalculatorGuide = {
  slug: "german-floor-calculator",
  heading: "German floor and oversite concrete slab calculation guide",
  howItWorks: [
    "A German floor is the common trade name across West Africa for an oversite concrete ground-bearing slab or slab-on-grade. It forms the solid structural foundation floor of a building before superstructure blockwork begins.",
    "The standard build-up consists of several distinct layers: compacted earth fill, a 150 mm to 300 mm layer of compacted stone hardcore, a blinding sand layer of 25 mm to 50 mm, a heavy-duty damp-proof membrane (DPM polythene sheeting), and a 100 mm to 150 mm thick cast-in-place concrete slab.",
    "Concrete calculation begins with nominal wet volume: floor length multiplied by floor width multiplied by the specified slab thickness. Because wet concrete shrinks as air voids escape during compaction, loose dry ingredients must be multiplied by a dry bulking factor of 1.52 to 1.54.",
    "For standard residential ground slabs, engineers specify a 1:2:4 concrete mix ratio (Grade 20 concrete). This means one part Portland cement, two parts clean sharp river sand, and four parts crushed granite gravel or coarse aggregate by volume.",
    "Portland cement density is standard at 1,440 kg per cubic metre, which translates to roughly 28.8 bags of 50 kg cement per cubic metre of pure cement volume. A 5 percent to 10 percent wastage allowance is included to cover site spillage, uneven sub-base depressions, and formwork deflection.",
  ],
  workedExample: {
    intro:
      "Standard residential 120 m² ground floor slab: calculating materials for a 12 m by 10 m building footprint (120 m² floor area) with a 150 mm (0.15 m) thick German floor slab using a 1:2:4 mix ratio and 5 percent site wastage allowance.",
    steps: [
      {
        label: "Wet concrete volume (12 m × 10 m × 0.15 m)",
        value: "18.00 m³ net wet concrete",
      },
      {
        label: "Wet volume with 5% waste allowance",
        value: "18.90 m³ wet concrete",
      },
      {
        label: "Dry materials conversion (1.54 bulking)",
        value: "29.11 m³ loose dry materials",
      },
      {
        label: "Portland cement required (1:2:4 mix)",
        value: "120 bags (50 kg Portland cement)",
      },
      {
        label: "Sharp sand required (2 of 7 parts)",
        value: "8.32 m³ (approx 1.5 ten-tonne tippers)",
      },
      {
        label: "Crushed granite aggregate (4 of 7 parts)",
        value: "16.63 m³ (approx 2.7 ten-tonne tippers)",
      },
      {
        label: "Damp-proof membrane (DPM with 15% lap)",
        value: "138 m² heavy-duty 1,000-gauge polythene",
      },
      {
        label: "Hardcore foundation fill (150 mm depth)",
        value: "21.60 m³ compacted hardcore stones",
      },
    ],
    result:
      "Total purchase list: 120 bags of cement, 8.3 m³ sharp sand, 16.6 m³ granite gravel, 21.6 m³ hardcore, and 138 m² damp-proof membrane.",
  },
  ratioTable: {
    caption:
      "Concrete mix ratios, compressive strengths, and cement consumption rates",
    columns: [
      "Mix ratio (cement : sand : aggregate)",
      "Compressive strength & application",
      "Cement bags per m³ of finished wet concrete",
    ],
    rows: [
      [
        "1:3:6 (Grade 10/15 concrete)",
        "Blinding layer, sub-base leveling, non-structural mass fill",
        "4.4 to 4.8 bags per m³",
      ],
      [
        "1:2:4 (Grade 20/25 concrete)",
        "Standard residential German floor, footpaths, ground slabs",
        "6.2 to 6.6 bags per m³",
      ],
      [
        "1:1.5:3 (Grade 25/30 concrete)",
        "Heavy-load commercial ground slabs, workshop floors",
        "7.8 to 8.4 bags per m³",
      ],
      [
        "1:1:2 (Grade 30/35 concrete)",
        "Water-retaining basement slabs, heavy machinery bases",
        "9.8 to 10.6 bags per m³",
      ],
    ],
  },
  faqs: [
    {
      question: "What is a German floor and why is it called that?",
      answer:
        "A German floor is the West African construction term for an oversite concrete slab cast on compacted hardcore and sand blinding. The colloquial name stems from colonial-era German public works and railway engineering practices in the region, but structurally it is identical to a ground-bearing slab or slab-on-grade.",
    },
    {
      question: "How many bags of cement for a German floor of 1 plot?",
      answer:
        "A standard plot measuring 100 ft by 50 ft (approx 30.5 m by 15.2 m) has an area of roughly 465 square metres. For a 100 mm thick slab with a 1:2:4 mix, you need approximately 300 to 315 bags of 50 kg cement. If the slab is cast at 150 mm thickness for greater load capacity, cement requirements rise to roughly 450 to 475 bags.",
    },
    {
      question: "How thick should a German floor slab be?",
      answer:
        "For standard residential dwellings on stable subsoil, a slab thickness of 100 mm to 150 mm (4 to 6 inches) is standard. Domestic buildings with light traffic perform well at 100 mm, while structures supporting heavy partition walls, vehicular traffic, or variable ground support should always use at least 150 mm thickness reinforced with steel wire mesh.",
    },
    {
      question: "Why is a damp-proof membrane essential under a German floor?",
      answer:
        "A damp-proof membrane (DPM) made of heavy-duty polyethylene (at least 1,000 gauge or 250 microns) prevents ground moisture from migrating upwards into the concrete slab via capillary action. Without an intact DPM, ground moisture will cause rising damp, leading to bubbling floor paint, debonded tiles, rotten timber skirting, and mould.",
    },
    {
      question: "Does the hardcore depth change the concrete quantity?",
      answer:
        "No. Hardcore and blinding sit under the slab and are counted in their own volumes, so deepening the fill adds trips of hardcore stone and blinding sand but leaves the slab concrete unchanged. What the fill must achieve is a level, well compacted surface, because the slab spans the ground rather than bridging soft spots.",
    },
    {
      question: "How many trips of granite aggregate does a German floor need?",
      answer:
        "Granite coarse aggregate is calculated from the mix ratio. A standard 1:2:4 mix requires twice as much granite volume as sharp sand. Aggregate can be ordered by the cubic metre or by tipper lorry trip count depending on local quarry merchant sizes.",
    },
    {
      question:
        "What is the function of the sand blinding layer under the slab?",
      answer:
        "Compacted stone hardcore consists of sharp angular stones that easily puncture thin plastic sheeting. A 25 mm to 50 mm layer of quarry dust or fine sand is spread over the stones and rolled flat to create a smooth protective bed for the damp-proof membrane before pouring wet concrete.",
    },
  ],
  limits:
    "This tool calculates material volumes for level ground-bearing slabs. It does not replace structural soil bearing assessments, raft foundation engineering for marshy soils, or site-specific reinforcement schedule designs.",
};
