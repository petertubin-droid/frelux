import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const increteFlooringEstimatorGuide: CalculatorGuide = {
  slug: "increte-flooring-estimator",
  heading:
    "Increte stamped concrete flooring, hardener, release agent, and sealer guide",
  howItWorks: [
    "Increte stamped decorative concrete transforms freshly poured structural concrete into architectural paving that replicates natural slate, granite cobblestone, English ashlar, weathered flagstone, or timber planks. The decorative concrete process integrates four chemical and structural phases: reinforced concrete slab casting, mineral dry-shake color hardener broadcasting, antique release agent application with texture imprinting, and protective solvent-based acrylic sealing.",
    "Structural concrete slab proportioning requires careful quality control to ensure successful stamping without premature crusting or surface tearing. Recommended specifications demand a minimum compressive strength of 25 MPa to 30 MPa (approx 3,600 psi to 4,350 psi), a maximum slump of 75 mm to 100 mm (3 to 4 inches), and a 100 mm to 150 mm slab thickness reinforced with A142 or B503 welded steel wire mesh. Over-watering, calcium chloride set accelerators, and air entrainment exceeding 3% must be avoided because they cause surface blistering and delamination under stamping mats.",
    "Dry-shake mineral color hardener creates an ultra-dense, wear-resistant, and streak-free decorative surface layer. The factory-blended quartz, iron oxide pigment, and Portland cement compound is broadcast manually across the fresh concrete in two sequential passes: approximately 60% of total product on the first pass followed by wood or magnesium bull floating, and the remaining 40% on the second pass to ensure solid uniform opacity. Standard coverage rates range from 2.5 kg to 3.5 kg per square metre for dark earth and charcoal tones, increasing to 4.0 kg to 5.0 kg per square metre for bright white or light pastel shades.",
    "Antique release agents prevent flexible polyurethane stamping mats from sticking to wet concrete while imparting a subtle secondary accent color into the recesses and grout joints. Powder release is broadcast at 0.15 kg to 0.20 kg per square metre just prior to placing mats. Alternately, clear liquid release (bubble-gum solvent) is sprayed for clean, mess-free stamping. Stamping begins as soon as the concrete supports an operative's weight without leaving deep indentations (typically 1.5 to 3 hours post-pour depending on ambient heat and wind).",
    "Washing, contraction joint cutting, and protective acrylic sealing seal the floor against oil, fuel, and freeze-thaw weathering. Within 24 to 48 hours of stamping, excess release powder is scrubbed and pressure-washed off using a mild neutralizing detergent, leaving antique accents in the low texture valleys. Contraction joints are saw-cut to a depth of one-quarter slab thickness at 24 to 30 times slab depth spacing (typically 3.0 m to 4.0 m intervals). Once the slab has cured and dried, two coats of UV-stable solvent acrylic sealer (25% to 30% solids content) are rolled or sprayed at 5.0 m² to 7.0 m² per litre per coat.",
  ],
  workedExample: {
    intro:
      "Outdoor residential driveway and patio increte flooring: calculating concrete volume, steel mesh, color hardener, release powder, joint saw-cutting, and acrylic sealer for a 150.0 m² area with a 125 mm (0.125 m) thick slab in an Ashlar Slate pattern with Deep Charcoal base and Antique Pewter accent.",
    steps: [
      {
        label: "Net in-situ concrete volume (150.0 m² × 0.125 m thickness)",
        value:
          "18.75 m³ ready-mix concrete (plus 5% excavation tolerance = 19.69 m³)",
      },
      {
        label:
          "Welded steel mesh reinforcement sheets (A142 mesh, 4.8 m × 2.4 m)",
        value:
          "150 m² ÷ 10 m² net sheet coverage (with laps) = 15 steel mesh sheets",
      },
      {
        label: "Dry-shake color hardener consumption at 3.0 kg per m²",
        value: "150.0 m² × 3.0 kg/m² = 450 kg (18 commercial bags of 25 kg)",
      },
      {
        label: "Powder antique release agent at 0.16 kg per m²",
        value: "150.0 m² × 0.16 kg/m² = 24 kg (2 pails of 15 kg release agent)",
      },
      {
        label: "Flexible polyurethane stamping mats and touch-up skins",
        value:
          "1 set of 6 rigid Ashlar mats, 1 flexible floppy mat, and 1 touch-up roller",
      },
      {
        label:
          "Control joint saw-cutting length (3.0 m × 3.0 m grid over 150 m²)",
        value: "Approx 90 linear metres of diamond-blade crack control cuts",
      },
      {
        label:
          "Solvent-based clear acrylic gloss sealer (first primer coat at 6 m²/L)",
        value:
          "150.0 m² ÷ 6.0 m²/L = 25.0 litres (1 drum of 20 L plus 1 pail of 5 L)",
      },
      {
        label: "Solvent acrylic sealer (second finish coat at 7 m²/L)",
        value:
          "150.0 m² ÷ 7.0 m²/L = 21.43 litres (1 drum of 20 L plus 1 pail of 5 L)",
      },
      {
        label: "Total acrylic sealer required for two protective coats",
        value:
          "25.0 L + 21.43 L = 46.43 litres (bought as 2 drums of 25 litres)",
      },
    ],
    result:
      "Complete Increte purchase schedule: 19.7 m³ of C25 ready-mix concrete (75 mm slump), 15 sheets of A142 steel wire mesh, 18 bags (25 kg) color hardener, 2 pails (15 kg) antique release powder, 2 drums (25 L) UV-resistant solvent acrylic sealer, and 100 diamond-blade cut metres.",
  },
  ratioTable: {
    caption:
      "Increte decorative concrete system materials, packaging sizes, application rates, and curing intervals",
    columns: [
      "Increte system product and material",
      "Standard commercial packaging size",
      "Application rate and technical application rule",
    ],
    rows: [
      [
        "Structural concrete base slab (C25/30)",
        "Delivered via ready-mix truck (m³)",
        "100 mm to 150 mm thickness (minimum 25 MPa compressive strength)",
      ],
      [
        "Dry-shake mineral surface color hardener",
        "25 kg moisture-resistant multi-wall bag",
        "2.5 kg to 3.5 kg per m² (two broadcast passes floated into wet surface)",
      ],
      [
        "Hydrophobic powdered release agent",
        "15 kg sealed plastic pail",
        "0.15 kg to 0.20 kg per m² (dusted over hardener before placing mats)",
      ],
      [
        "Clear liquid stamping release (odorless)",
        "20 litre solvent-resistant drum",
        "1.0 litre per 7 m² to 9 m² (sprayed for clean interior stamping)",
      ],
      [
        "Solvent-based pure acrylic clear sealer",
        "20 litre or 25 litre metal steel drum",
        "5.0 m² to 7.0 m² per litre per coat (two coats applied after washing)",
      ],
      [
        "Polypropylene anti-crack microfibers",
        "0.90 kg water-soluble pre-dosed bag",
        "0.90 kg per cubic metre of concrete batch (secondary crack mitigation)",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between integral color concrete and color hardener?",
      answer:
        "Integral color concrete mixes liquid or powdered pigment throughout the entire truckload of concrete, resulting in consistent color throughout the slab cross-section. However, integral color can be muted, requires more water, and does not harden the surface. Color hardener is a dry-shake blend of high-grade quartz silica, Portland cement, and concentrated pigments worked directly into the top 3 mm to 5 mm of the wet slab, producing a surface twice as hard as regular concrete with much brighter color saturation.",
    },
    {
      question:
        "Why does stamped concrete need to be washed before applying sealer?",
      answer:
        "Powdered antique release agents contain hydrophobic fatty acids and dry powdered pigments designed to break bond between wet concrete and polyurethane mats. If sealer is rolled over unwashed release powder, the sealer bonds only to the loose dust rather than the hard concrete substrate. Within months, rain and sun cause the sealer to peel in large white sheets. The slab must be pressure-washed at 2,000 to 2,500 psi with a neutral detergent to remove 70% to 80% of the powder, leaving accent pigment solely in deep crevices.",
    },
    {
      question: "How soon after pouring must contraction joints be saw-cut?",
      answer:
        "Contraction joints must be cut as soon as the concrete surface can support the weight of an early-entry concrete saw without raveling or chipping the edges of the cut, typically between 6 to 18 hours after finishing (and no later than 24 hours). Waiting too long allows internal tensile shrinkage stresses to form random uncontrolled shrinkage cracks across the decorative patterns.",
    },
    {
      question: "How often should Increte stamped concrete be resealed?",
      answer:
        "External stamped concrete should be resealed every 2 to 3 years in high-traffic sunny driveway locations, and every 3 to 5 years on sheltered pedestrian patios. Signs that resealing is required include a dull, chalky appearance or water soaking into the surface rather than beading into droplets. Before resealing, the surface must be scrubbed clean of all dirt, engine oil, and grease, and allowed to dry completely for at least 24 hours.",
    },
    {
      question:
        "Why do white cloudy patches sometimes appear under the acrylic sealer?",
      answer:
        "White clouding (also known as blushing) occurs when solvent-based acrylic sealer is applied over a damp slab or when moisture rises from underneath an unsealed base slab without a vapor barrier. Moisture becomes trapped beneath the acrylic film, causing the resin to partially emulsify and refract light as white milky spots. It can be rectified by applying a solvent restorative wash (such as xylene or aromatic solvent) to re-dissolve and re-fuse the acrylic film.",
    },
  ],
  limits:
    "Preliminary decorative concrete material takeoff and schedule only. Material consumption rates vary with texture stamp profile depth, concrete slump, and installer experience. Does not replace geotechnical subgrade compaction testing, structural slab design, or local climatic curing controls.",
};
