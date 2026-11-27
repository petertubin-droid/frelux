import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const tallBuildingCalculatorGuide: CalculatorGuide = {
  slug: "tall-building-calculator",
  heading: "Skyscraper Lateral Systems and Tall Building Structural Takeoff Guide",
  howItWorks: [
    "Assess building geometry and aspect ratio: determine total tower height H, floor plan dimensions B and L, and slenderness aspect ratio H/B to classify structural lateral system eligibility.",
    "Accumulate gravity dead and live loads: calculate cumulative floor slab weights, core shear walls, perimeter columns, facade curtain wall envelope, and reduced live loads per ASCE 7-22.",
    "Integrate height-dependent wind pressure: calculate velocity pressure profiles following ASCE 7-22 Chapter 26 across terrain exposure categories B, C, or D, including gust effect factors.",
    "Compute seismic base shear: apply equivalent lateral force procedures using building natural period Ta, spectral response accelerations (Ss and S1), and response modification coefficient R.",
    "Evaluate storey drift and stability: calculate lateral deflection under factored wind and seismic combinations, checking against international drift thresholds (H/400 to H/500).",
    "Size deep foundations and piled rafts: determine thick reinforced concrete raft footing dimensions, bored pile diameters, pile group efficiency, and foundation settlement limits.",
  ],
  workedExample: {
    intro:
      "Consider a 30-storey commercial office tower rising 105.0 metres above ground level with a rectangular footprint of 36.0 metres by 30.0 metres (floor plan area 1,080 square metres). The structural system features a reinforced concrete central service core with perimeter moment frames, founded on a deep piled raft foundation over stiff clay.",
    steps: [
      {
        label: "Number of storeys and total architectural height",
        value: "30 storeys at 3.5 m typical storey height = 105.0 m total height",
      },
      {
        label: "Building footprint and narrow aspect ratio (H / B)",
        value: "36.0 m x 30.0 m footprint; aspect ratio 105.0 / 30.0 = 3.50",
      },
      {
        label: "Total gross suspended floor area (30 storeys x 1,080 m2)",
        value: "32,400 m2",
      },
      {
        label: "Cumulative unfactored dead load (average 11.0 kN/m2 across 30 floors)",
        value: "356,400 kN",
      },
      {
        label: "Cumulative reduced live load (average 2.5 kN/m2 across 30 floors)",
        value: "81,000 kN",
      },
      {
        label: "Total gravity service load delivered to foundation raft",
        value: "437,400 kN",
      },
      {
        label: "Design basic wind speed (ASCE 7-22 Exposure Category B)",
        value: "48 m/s (173 km/h)",
      },
      {
        label: "Total integrated lateral wind base shear force",
        value: "8,450 kN",
      },
      {
        label: "Total base overturning moment from lateral wind actions",
        value: "485,000 kN.m",
      },
      {
        label: "Reinforced concrete raft foundation thickness",
        value: "2.50 m solid reinforced concrete mat",
      },
      {
        label: "Required 1,000 mm diameter bored piles (5,500 kN working capacity each)",
        value: "96 bored piles arranged in concentrated core grid",
      },
      {
        label: "Estimated roof lateral drift under design 50-year wind load",
        value: "218 mm (H / 481, satisfying H / 450 serviceability limit)",
      },
    ],
    result:
      "The 30-storey tower produces approximately 437,400 kN of service gravity load and 8,450 kN of base wind shear, requiring a 2.50 m thick reinforced raft resting on 96 bored piles of 1,000 mm diameter.",
    note: "Slender towers with aspect ratios exceeding 5.0 require boundary-layer wind tunnel physical testing to verify crosswind vortex shedding and occupant acceleration comfort levels.",
  },
  ratioTable: {
    caption:
      "Tall building structural lateral systems, typical economic height ranges, and international drift serviceability limits.",
    columns: [
      "Structural System",
      "Economic Storey Range",
      "Typical Aspect Ratio (H/B)",
      "Wind Drift Limit",
      "Governing Design Code",
    ],
    rows: [
      [
        "Rigid Moment Frame",
        "10 to 25 storeys",
        "1.5 to 3.5",
        "H / 400 to H / 500",
        "ASCE 7-22 / ACI 318-19",
      ],
      [
        "Shear Wall and Core System",
        "20 to 45 storeys",
        "3.0 to 5.0",
        "H / 450 to H / 550",
        "EN 1992-1-1 / Eurocode 8",
      ],
      [
        "Core with Outrigger Trusses",
        "40 to 70 storeys",
        "4.5 to 7.0",
        "H / 500",
        "CTBUH Technical Guidelines",
      ],
      [
        "Perimeter Framed Tube",
        "50 to 80 storeys",
        "5.0 to 8.0",
        "H / 500 to H / 600",
        "ASCE 7-22 / AISC 360",
      ],
      [
        "Mega-Column Diagrid",
        "60 to 100+ storeys",
        "6.0 to 9.5",
        "H / 550 to H / 650",
        "International Building Code (IBC)",
      ],
    ],
  },
  faqs: [
    {
      question: "What is the difference between strength design and drift serviceability in high-rise buildings?",
      answer:
        "Strength design ensures that structural members (columns, core walls, transfer beams) do not collapse or yield under factored extreme load combinations. Drift serviceability controls lateral sway under everyday service winds to prevent partition cracking, facade glass breakage, elevator cable entanglement, and motion sickness among upper-floor occupants.",
    },
    {
      question: "Why do wind loads often govern tall building lateral design more than earthquake forces?",
      answer:
        "As building height increases, natural vibration period lengthens significantly (often 3 to 7 seconds). Seismic accelerations decrease for long-period structures, while wind velocity and exposure increase continuously with elevation. Consequently, overturning moments from dynamic wind pressure usually dominate lateral design in buildings above 30 to 40 storeys.",
    },
    {
      question: "How does the concrete core and outrigger truss system reduce lateral deflection?",
      answer:
        "Outrigger trusses connect the central shear core to perimeter mega-columns. When lateral wind loads push the core to bend like a cantilever, the outriggers engage the perimeter columns in push-pull axial tension and compression, creating an opposing couple that stiffens the building and reduces roof drift by 25 to 40 per cent.",
    },
    {
      question: "How are deep foundation pile groups sized for overturning moments in skyscrapers?",
      answer:
        "Overturning moments from wind create an eccentric stress distribution across the foundation mat. Windward piles experience reduced compression or uplift tension, while leeward piles experience concentrated peak loads. Pile spacing and depth are engineered to keep peak compressive loads within safe structural and geotechnical working capacities.",
    },
    {
      question: "What is the engineering significance of the building aspect ratio?",
      answer:
        "Aspect ratio (height divided by least base width) measures structural slenderness. When aspect ratio exceeds 5.0, vortex shedding across building corners can generate violent crosswind oscillations perpendicular to wind direction, requiring aerodynamic corner softening, tuned mass dampers, or perforated facade reveals.",
    },
  ],
  limits:
    "This tall building calculator provides preliminary conceptual screening, structural system classification, and approximate foundation pile counts only. It does not replace 3D finite element structural analysis, geotechnical site investigation boreholes, wind tunnel boundary layer testing, or certified engineering submissions.",
};
