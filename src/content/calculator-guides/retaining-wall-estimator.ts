import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const retainingWallEstimatorGuide: CalculatorGuide = {
  slug: "retaining-wall-estimator",
  heading:
    "Retaining wall concrete, blockwork, footing, and drainage calculation guide",
  howItWorks: [
    "Retaining wall takeoff calculates the structural masonry, concrete, steel reinforcement, and granular backfill drainage required to hold back soil and resist lateral active earth pressure. Retaining structures are classified into gravity walls (relying on self-weight), reinforced concrete cantilever walls (using an L-shaped or inverted T-shaped footing), and reinforced masonry block stem walls with concrete core fill.",
    "Footing dimensioning is dictated by the height of retained ground. As a structural rule of thumb for preliminary takeoff, the footing base width spans between 0.50 to 0.70 times the total retained wall height (H). The footing thickness generally equals 0.10 to 0.15 times the wall height, but never less than 250 mm to 300 mm. The footing toe projects outward by approximately one-third of the total base width, counteracting the overturning moment exerted by the soil wedge behind the wall.",
    "Wall stem volume depends on whether the design specifies poured cast-in-place concrete or reinforced hollow concrete blocks. For poured concrete cantilever walls, stem thickness is sized at 0.10 times the wall height (typically 200 mm to 300 mm minimum). For masonry block retaining walls, 230 mm (9-inch) hollow sandcrete or concrete blocks are laid with high-strength mortar, and vertical rebar starter bars from the footing pass through the block cores, which are subsequently filled solid with C25/30 concrete grout.",
    "Hydrostatic pressure relief is the single most critical longevity requirement for any retaining wall. Trapped groundwater behind a wall dramatically increases lateral thrust, routinely multiplying lateral forces by two to three times compared to dry drained soil. Sizing includes a 300 mm wide vertical drainage chimney of clean, washed 20 mm to 40 mm gravel placed directly behind the rear face of the wall stem.",
    "Geotextile filter fabric and weep holes complete the drainage system. Non-woven geotextile membrane lines the excavation boundary to prevent fine clay and silt particles from washing into and clogging the gravel drainage chimney. Weep hole discharge pipes (75 mm to 100 mm diameter PVC sleeves) are cast into the stem at 1.5 m to 2.0 m centres just above the front finished ground level, or a continuous perforated drain pipe is installed at the footing heel discharging to a safe drainage outlet.",
  ],
  workedExample: {
    intro:
      "Reinforced concrete cantilever retaining wall: calculating concrete, rebar, gravel drainage filter, and geotextile fabric for a 20.0-metre long wall supporting 2.0 metres of retained ground (overall wall height 2.30 m from base of footing), with a 1.20 m wide footing slab at 0.30 m thickness, and a 0.25 m thick concrete stem.",
    steps: [
      {
        label:
          "Reinforced concrete footing slab volume (20.0 m × 1.20 m × 0.30 m)",
        value: "20.0 m × 1.20 m × 0.30 m = 7.20 m³ poured concrete",
      },
      {
        label: "Reinforced concrete stem volume (20.0 m × 0.25 m × 2.0 m)",
        value: "20.0 m × 0.25 m × 2.0 m = 10.00 m³ poured concrete",
      },
      {
        label: "Total poured structural concrete (C25/30 ready-mix)",
        value:
          "7.20 m³ footing + 10.0 m³ stem = 17.20 m³ (plus 5% waste = 18.06 m³)",
      },
      {
        label:
          "Steel rebar reinforcement (estimated at 90 kg per m³ of concrete)",
        value:
          "17.20 m³ × 90 kg/m³ = 1,548 kg (approx 1.55 metric tonnes of rebar)",
      },
      {
        label:
          "Rear vertical gravel drainage filter (20 m length × 0.30 m width × 1.8 m height)",
        value: "20.0 m × 0.30 m × 1.80 m = 10.80 m³ clean 20 mm crushed gravel",
      },
      {
        label: "Mass of drainage gravel (bulk density 1.60 tonnes per m³)",
        value:
          "10.80 m³ × 1.60 t/m³ = 17.28 metric tonnes clean drainage gravel",
      },
      {
        label: "Geotextile filter fabric wrapping (rear gravel envelope)",
        value:
          "20 m length × (1.8 m height + 0.3 m top cap + laps) = 48.0 m² fabric",
      },
      {
        label: "Weep hole discharge pipes (100 mm PVC pipe at 2.0 m centres)",
        value:
          "20 m ÷ 2.0 m centres + 1 = 11 weep holes (0.35 m cut length each)",
      },
    ],
    result:
      "Retaining wall purchase takeoff: 18.1 m³ of C25/30 structural ready-mix concrete, 1.55 metric tonnes of deformed rebar (Y12 and Y16), 17.3 tonnes of 20 mm clean washed drainage gravel, 50 m² of non-woven geotextile membrane, and 4.0 metres of 100 mm PVC drainage pipe for weep sleeves.",
  },
  ratioTable: {
    caption:
      "Cantilever retaining wall component proportioning, material grades, and drainage specifications",
    columns: [
      "Retaining wall component",
      "Nominal proportioning benchmark",
      "Material grade and engineering function",
    ],
    rows: [
      [
        "Base footing slab width",
        "0.50H to 0.70H (50% to 70% of retained height)",
        "Spreads soil bearing pressure and prevents overturning and sliding",
      ],
      [
        "Footing slab thickness",
        "0.10H to 0.15H (minimum 250 mm to 300 mm)",
        "Resists shear forces and accommodates vertical rebar bend anchorages",
      ],
      [
        "Wall stem thickness",
        "0.10H (typically 200 mm to 300 mm minimum)",
        "Poured C25/30 concrete or 230 mm concrete blocks with core-fill grout",
      ],
      [
        "Backfill drainage chimney",
        "300 mm continuous width behind stem",
        "Clean 20 mm to 40 mm gravel to relieve hydrostatic water pressure",
      ],
      [
        "Weep hole discharge pipes",
        "75 mm to 100 mm diameter at 1.5 m to 2.0 m centres",
        "Discharges accumulated groundwater to daylight in front of the wall",
      ],
      [
        "Geotextile filter envelope",
        "Non-woven needle-punched polypropylene",
        "Prevents fine silt intrusion while permitting free water drainage",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why do so many residential retaining walls lean or collapse over time?",
      answer:
        "The overwhelming majority of retaining wall failures are caused by water accumulation, not soil weight alone. When rainwater saturates the backfill without an effective gravel drainage layer and weep holes, hydrostatic water pressure builds up behind the wall. Water pressure acts as an immense lateral hydraulic ram. In saturated clay, lateral loads can easily exceed three times the dry earth pressure, leading to shear failure at the footing joint, forward rotation, or total collapse.",
    },
    {
      question:
        "Can hollow concrete blocks be used safely for retaining walls?",
      answer:
        "Yes, but only under strict engineering constraints. Standard hollow blocks cannot act as a retaining wall if laid with mortar alone. For walls up to approximately 1.8 metres in height, hollow blocks must be reinforced with vertical deformed rebar (Y12 or Y16) anchored securely into the reinforced concrete foundation footing. Every hollow core containing rebar must be completely filled with high-slump C25 structural concrete grout to form a composite reinforced masonry stem.",
    },
    {
      question:
        "What is the purpose of the footing toe in a cantilever retaining wall?",
      answer:
        "The footing toe is the forward projection of the base slab that extends into the lower front ground. As lateral soil pressure pushes against the vertical stem, the wall attempts to rotate forward around its front edge. The extended toe moves the pivot point further forward, engaging the weight of the wall stem and the downward weight of backfill resting on the rear footing heel to counteract the overturning moment.",
    },
    {
      question:
        "Why must clean crushed gravel be used behind the wall instead of excavated soil?",
      answer:
        "Excavated subsoil (especially clay or silt) retains moisture, shrinks and swells with seasons, and possesses poor hydraulic conductivity. In contrast, clean washed 20 mm to 40 mm crushed gravel contains open inter-particle voids that allow water to drop instantly by gravity to the level of the weep holes, preventing water pressure from building up against the vertical structural face.",
    },
    {
      question:
        "How do surcharge loads from driveways affect retaining wall calculations?",
      answer:
        "A surcharge load is any additional external weight resting on the ground surface above the wall, such as a vehicle driveway, parking lot, or adjacent building foundation. Surcharge loads exert additional uniform horizontal pressure along the entire height of the wall stem. When driveways or car parking are positioned within a distance equal to the wall height, the base footing must be widened and vertical rebar increased.",
    },
  ],
  limits:
    "Preliminary material takeoff and quantity estimation only. Does not perform site-specific geotechnical engineering, slope stability checks, sliding safety factor verification, or soil bearing capacity testing. Retaining walls retaining more than 1.2 metres (4 feet) of soil must be designed and stamped by a licensed civil or structural engineer.",
};
