import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const tvConsoleCalculatorGuide: CalculatorGuide = {
  slug: "tv-console-calculator",
  heading: "TV console, custom media unit, and cabinetry joinery calculation guide",
  howItWorks: [
    "A custom TV console and media cabinetry takeoff converts overall furniture dimensions and compartment schedules into an exact cutting list of rectangular sheet panels, hardware fittings, and finishing materials. The estimation engine coordinates carcass carcass panels, internal divider partitions, functional drawers or doors, and heavy-duty wall-mounting support assemblies.",
    "Sheet material yields are calculated against standard 2,440 mm by 1,220 mm (8 feet by 4 feet) commercial board sizes. Standard carcass construction specifies 18 mm high-density fibreboard (HDF), moisture-resistant MDF, or calibrated marine plywood. To translate net panel surface area into full ordered boards, 2D rectangular bin-packing algorithms account for saw blade kerf deductions (typically 3 mm to 4 mm per rip cut) and grain direction orientation.",
    "Edge-banding tape covers exposed porous board cores. High-traffic exterior edges receive 1 mm to 2 mm impact-resistant ABS or PVC edge tape applied with high-temperature hot-melt adhesive, while concealed internal shelf edges receive 0.4 mm to 0.8 mm melamine tape. The total linear metres of edging tape are calculated by summing the finished perimeter of each cut panel.",
    "Hardware scheduling determines the mechanical components that govern cabinetry longevity. Soft-close undermount or side-mount ball-bearing drawer slides are sized to carcass internal depth (typically 350 mm, 400 mm, or 450 mm). Concealed European cup hinges (35 mm drilling diameter with integrated hydraulic dampers) are calculated at 2 hinges per cabinet door up to 900 mm height.",
    "Wall-mounting assemblies for floating consoles require substantial structural support. A floating media unit must carry its own dead weight plus heavy television receivers and audiovisual electronics. Anchoring relies on a continuous 45 degree interlocking French cleat timber rail or heavy-duty concealed steel hanging brackets bolted into wall masonry anchors at 400 mm to 600 mm intervals.",
  ],
  workedExample: {
    intro:
      "Modern 2,400 mm floating TV media unit takeoff: calculating 18 mm melamine boards, 6 mm backing board, edge-banding, and hardware for a 2,400 mm wide by 500 mm high by 400 mm deep console featuring 3 equal bays, 2 soft-close drawers, and 1 drop-down door.",
    steps: [
      {
        label: "Top and bottom structural panels (2,400 mm × 400 mm × 18 mm)",
        value: "2 panels (1.92 m² total board area)",
      },
      {
        label: "End gables and internal bay dividers (464 mm × 400 mm × 18 mm)",
        value: "4 panels (0.74 m² total board area)",
      },
      {
        label: "Drawer fronts, boxes, and drop-down door fascia",
        value: "2 drawer assemblies and 1 drop-down door panel (1.15 m²)",
      },
      {
        label: "Net 18 mm board area before blade kerf and packing",
        value: "3.81 m² net panel area",
      },
      {
        label: "Full 18 mm melamine boards required (8 ft × 4 ft sheets)",
        value: "2 full sheets (2,440 mm × 1,220 mm at 82% sheet yield)",
      },
      {
        label: "Thin 6 mm recessed backing board (2,380 mm × 480 mm)",
        value: "1 sheet of 6 mm MDF / hardboard",
      },
      {
        label: "PVC 1 mm edge-banding tape (sum of finished panel edges)",
        value: "28 linear metres of matching edge tape",
      },
      {
        label: "Soft-close ball-bearing drawer slide pairs (350 mm depth)",
        value: "2 pairs of 350 mm 45 kg rated drawer runners",
      },
      {
        label: "Hydraulic soft-close hinges or flap stays (drop-down door)",
        value: "2 concealed hinges plus 1 soft-drop pneumatic stay",
      },
      {
        label: "Heavy-duty 45° interlocking French cleat wall anchor",
        value: "2.2 linear metres hardwood or aluminium cleat rail",
      },
    ],
    result:
      "Total purchase list: 2 full sheets of 18 mm melamine board, 1 sheet 6 mm backing board, 28 m PVC edge tape, 2 pairs of 350 mm soft-close drawer slides, 2 concealed hinges, 1 drop-down pneumatic stay, and 2.2 m French cleat mounting rail.",
  },
  ratioTable: {
    caption:
      "Custom cabinetry panel thicknesses, hardware specifications, and design clearances",
    columns: [
      "Cabinetry structural component",
      "Standard material & thickness specification",
      "Hardware requirements and functional clearances",
    ],
    rows: [
      [
        "Carcass top, bottom, and end gables",
        "18 mm HDF / moisture-resistant MDF",
        "Cam-and-dowel or 50 mm confirmat screw assembly",
      ],
      [
        "Internal vertical bay dividers",
        "18 mm matching board thickness",
        "Deducted from carcass internal height; supports shelves",
      ],
      [
        "Recessed cabinet backing board",
        "3 mm to 6 mm hardboard / MDF",
        "Housed in 6 mm deep rebate 12 mm from carcass rear edge",
      ],
      [
        "Drawer box sides, front, and back",
        "12 mm to 15 mm birch ply or MDF",
        "Requires 12.7 mm clearance per side for ball-bearing runners",
      ],
      [
        "External face doors and drawer fronts",
        "18 mm fluted, veneered, or painted board",
        "2 mm expansion reveal gap between all adjacent fronts",
      ],
      [
        "Floating console wall cleat",
        "18 mm to 25 mm solid hardwood / aluminium",
        "45° bevel cut; lag-bolted into masonry at 400 mm centres",
      ],
      [
        "Cable pass-through grommet holes",
        "60 mm or 80 mm circular desk grommet",
        "Installed in top panel and dividers for AV cable routing",
      ],
    ],
  },
  faqs: [
    {
      question: "How does a French cleat support a heavy floating TV console?",
      answer:
        "A French cleat consists of two matching timber or aluminium rails cut at opposing 45 degree angles. One rail is securely anchored level against the structural wall masonry with heavy lag bolts, while the companion rail is integrated into the rear of the cabinetry. When the cabinet is lifted onto the wall, the two bevels interlock under gravity, providing immense downward load-bearing capacity without visible brackets.",
    },
    {
      question: "Why is 18 mm board preferred over 15 mm for media consoles?",
      answer:
        "Standard audiovisual components, gaming consoles, and amplifiers exert concentrated loads over spans up to 800 mm. An 18 mm board provides significantly higher modulus of elasticity, preventing unsightly shelf deflection (sagging) over time. Additionally, 18 mm thickness allows 35 mm European cup hinges to be bored 11.5 mm deep without risking panel punch-through.",
    },
    {
      question: "What side clearance is required for soft-close drawer slides?",
      answer:
        "Standard telescopic ball-bearing and soft-close undermount drawer slides require exactly 12.7 mm (1/2 inch) clearance on each side of the drawer box (25.4 mm total width reduction from the internal cabinet opening). Building drawer boxes wider or narrower causes slide binding, jerky movement, or failure of the automatic latching mechanism.",
    },
    {
      question: "Why must exposed particleboard or MDF edges be edge-banded?",
      answer:
        "Raw composite board cores are porous and absorb ambient room moisture readily, leading to swelling, edge fuzzing, and core degradation. High-pressure PVC or ABS edge-banding seals the core hermetically against liquid spills and humidity while protecting users from sharp cut edges.",
    },
    {
      question: "How does the bin-packing algorithm reduce expensive sheet waste?",
      answer:
        "Instead of simply dividing total part square metres by sheet area, rectangular 2D bin-packing nests pieces along rip lanes matching board dimensions. It factors in the width of the circular saw blade kerf and grain direction, preventing unusable offcuts and ensuring maximum board utilization above 80 percent.",
    },
  ],
  limits:
    "This tool estimates sheet yields, cutting lists, edge-banding, and hardware for cabinetry joinery. It does not verify wall substrate anchor pull-out capacity or replace detailed architectural shop drawings.",
};
