import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const roofFramingEstimatorGuide: CalculatorGuide = {
  slug: "roof-framing-estimator",
  heading: "Roof framing, timber truss, and roofing sheet calculation guide",
  howItWorks: [
    "Roof framing translates architectural building footprints into a durable structural timber framework capable of supporting roofing sheets, resisting wind uplift, and shedding rainwater. The framework comprises three coordinated assemblies: the supporting tie beams and wall plates, the structural roof trusses or rafters, and the purlins or battens that receive the roof covering.",
    "Geometric slope calculation starts with the flat plan footprint and eaves overhang. A building with a 150 m² floor footprint and a 600 mm (0.6 m) eaves overhang generates an enlarged horizontal roof envelope. Because the roof pitches upward, this horizontal envelope is multiplied by the secant of the pitch angle (for example, 1.155 for a 30 degree pitch or 1.221 for a 35 degree pitch) to determine actual sloping surface area.",
    "Timber truss members are calculated by linear run and structural section size. Wall plates (typically 50 mm by 100 mm or 75 mm by 100 mm) anchor into the perimeter concrete ring beam. Bottom chord tie beams (typically 50 mm by 150 mm) resist horizontal outward thrust. Top chord rafters (50 mm by 100 mm or 50 mm by 150 mm) support the purlins, while internal struts and king posts brace against bending moments.",
    "Purlins and battens run perpendicular across the rafters to anchor the roofing sheets. Spacing depends strictly on the roof covering specification: light corrugated metal sheets allow 900 mm purlin spacing; premium long-span 0.55 mm aluminium sheets require 600 mm spacing; and stone-coated metal or ceramic tiles require 50 mm by 50 mm timber battens spaced at 320 mm to 370 mm gauge.",
    "Fasteners, bracing, and facial boards complete the takeoff. Truss nodes require heavy wire nails (typically 100 mm and 125 mm) or steel gusset gang-nail plates. Long-span aluminium sheets require self-tapping hex-head drive screws with neoprene washers (typically 6 to 8 fasteners per square metre), while perimeter eaves require 25 mm by 300 mm hardwood or treated composite facial boards.",
  ],
  workedExample: {
    intro:
      "Standard 150 m² residential bungalow hip roof: calculating timber members and aluminium roofing sheets for a 15 m by 10 m building plan, 30 degree hip roof pitch, 600 mm eaves overhang, and 1.20 m truss centre spacing.",
    steps: [
      {
        label: "Plan roof footprint with 0.6 m eaves (16.2 m × 11.2 m)",
        value: "181.44 m² horizontal envelope area",
      },
      {
        label: "Sloping roof surface area (30° pitch factor 1.155)",
        value: "209.56 m² actual roof surface area",
      },
      {
        label: "Perimeter wall plate timber (75 mm × 100 mm)",
        value: "54.80 linear metres (approx 15 boards of 3.6 m)",
      },
      {
        label: "Truss assemblies required (16.2 m length ÷ 1.2 m space)",
        value: "14 truss assemblies plus hip rafters",
      },
      {
        label: "Structural truss timber (50 mm × 150 mm tie beams)",
        value: "172.00 linear metres (approx 48 boards of 3.6 m)",
      },
      {
        label: "Rafter and strut timber (50 mm × 100 mm members)",
        value: "385.00 linear metres (approx 107 boards of 3.6 m)",
      },
      {
        label: "Roof purlins at 600 mm spacing (50 mm × 75 mm)",
        value: "350.00 linear metres (approx 98 boards of 3.6 m)",
      },
      {
        label: "Long-span 0.55 mm aluminium sheets (with 10% waste)",
        value: "230.50 m² net ordered sheet coverage",
      },
      {
        label: "Ridge caps and valley gutter flashing",
        value: "36.00 linear metres profiled capping",
      },
      {
        label: "Hex-head roofing screws with neoprene washers",
        value: "1,400 self-tapping screws (7 screws per m²)",
      },
    ],
    result:
      "Total purchase list: 15 boards of 75 mm × 100 mm wall plates, 48 boards of 50 mm × 150 mm tie beams, 107 boards of 50 mm × 100 mm rafters, 98 boards of 50 mm × 75 mm purlins, 231 m² aluminium roofing sheets, 36 m ridge capping, and 1,400 neoprene screws.",
  },
  ratioTable: {
    caption:
      "Roof framing timber sections, spacing intervals, and structural functions",
    columns: [
      "Roof framing member",
      "Nominal timber section size",
      "Standard spacing and structural function",
    ],
    rows: [
      [
        "Wall plate bedding timber",
        "75 mm × 100 mm (3 in × 4 in)",
        "Anchored along concrete ring beam perimeter with hoop iron",
      ],
      [
        "Bottom chord tie beam",
        "50 mm × 150 mm (2 in × 6 in)",
        "Spans external walls; resists outward thrust and carries ceiling",
      ],
      [
        "Principal rafter / top chord",
        "50 mm × 100 mm or 50 mm × 150 mm",
        "Carries purlins and roof loads; pitched at 25 to 45 degrees",
      ],
      [
        "Internal struts and king posts",
        "50 mm × 100 mm (2 in × 4 in)",
        "Transfers apex loads down to bottom chord; prevents rafter sag",
      ],
      [
        "Sheet purlins (corrugated / long-span)",
        "50 mm × 75 mm (2 in × 3 in)",
        "Spaced at 600 mm to 900 mm centres perpendicular to rafters",
      ],
      [
        "Tile battens (stone-coated / ceramic)",
        "50 mm × 50 mm (2 in × 2 in)",
        "Spaced at 320 mm to 370 mm centres strictly matching tile gauge",
      ],
      [
        "Perimeter fascia board",
        "25 mm × 300 mm (1 in × 12 in)",
        "Fixed to rafter feet along eaves; supports gutter brackets",
      ],
    ],
  },
  faqs: [
    {
      question: "How does roof pitch angle affect roofing sheet quantities?",
      answer:
        "Higher roof pitches create larger sloping surface areas from the same ground footprint. A low-pitch roof of 15 degrees adds only 3.5 percent more surface area than the flat footprint, whereas a 30 degree pitch adds 15.5 percent, and a steep 45 degree pitch adds 41.4 percent. Always multiply horizontal plan dimensions by the pitch slope factor before ordering sheets.",
    },
    {
      question: "What is the recommended purlin spacing for long-span aluminium?",
      answer:
        "For 0.45 mm to 0.55 mm long-span aluminium sheets, purlins should be spaced at maximum 600 mm (2 feet) centres. While lighter corrugated sheets sometimes use 900 mm spacing, wider spans allow long-span sheets to sag between rafters under foot traffic during installation or heavy tropical storm downpours.",
    },
    {
      question: "Why should roof timber be treated before installation?",
      answer:
        "Roof spaces experience extreme heat and humidity cycles that encourage wood-boring beetle infestations, dry rot, and termite attacks. Impregnating or spray-treating timber with copper-based preservatives or anti-termite chemicals before hoisting onto the roof prevents structural failure of inaccessible trusses.",
    },
    {
      question: "What is the difference between a gable roof and a hip roof?",
      answer:
        "A gable roof has two sloping planes that meet at a central ridge with triangular vertical masonry walls at each end. A hip roof has slopes on all four sides meeting at an upper ridge and diagonal hip rafters. Hip roofs require roughly 10 percent more timber and flashing for hips and valleys but provide superior aerodynamic stability against high winds.",
    },
    {
      question: "How are roof trusses anchored against hurricane wind uplift?",
      answer:
        "Trusses must be cast into the reinforced concrete ring beam using galvanized mild steel hoop iron straps (typically 25 mm wide by 1.5 mm thick) or heavy-duty seismic hurricane ties. Simply toe-nailing rafters into wall plates provides insufficient uplift resistance during severe wind storms.",
    },
  ],
  limits:
    "This tool provides preliminary material quantity takeoff based on entered geometry. It does not replace structural timber truss engineering, local wind uplift calculations, or certified building authority approvals.",
};
