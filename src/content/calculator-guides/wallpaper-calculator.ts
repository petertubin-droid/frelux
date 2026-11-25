import { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

export const wallpaperCalculatorGuide: CalculatorGuide = {
  slug: "wallpaper-calculator",
  heading: "Wallpaper rolls, pattern matching and adhesive calculation guide",
  howItWorks: [
    "Wallpaper is installed in vertical lengths known as drops. Estimating wallpaper accurately requires calculating the exact number of drops needed to wrap around the room, then determining how many usable drops can be cut from each roll based on wall height and pattern repeat.",
    "Standard international wallpaper (Euro rolls) measures 0.53 metres wide by 10.05 metres long, yielding a nominal area of 5.33 square metres. However, usable coverage is always lower due to trimming allowances and pattern alignment waste.",
    "Pattern match style dramatically affects roll yield. Random match papers (textures, plains) produce zero pattern waste, yielding three or four full drops per roll. Straight match and half-drop patterns require aligning adjacent strips at fixed vertical repeat intervals (typically 32 cm to 64 cm), which can consume up to 25 percent of a roll in cut offcuts.",
    "Door and window openings under 1.2 metres in width are typically ignored during initial drop counting. The drops continue across openings, and offcuts above and below windows are salvaged for short sections, providing a built-in safety cushion against installation errors.",
    "Wallpaper adhesive (paste) is mixed from starch or methylcellulose flakes and spread on the paper backing (for traditional papers) or directly onto the wall (for modern paste-the-wall non-woven wallpapers). Coverage averages 5 to 7 standard rolls per 250 g packet of adhesive.",
  ],
  workedExample: {
    intro:
      "Dining room four-wall wallpaper installation: estimating wallpaper for a dining room measuring 4.5 m by 3.5 m (16 m perimeter) with a wall height of 2.60 m, using standard 0.53 m × 10.05 m rolls with a 32 cm straight pattern repeat.",
    steps: [
      {
        label: "Total room perimeter (2 × (4.5 m + 3.5 m))",
        value: "16.00 linear metres perimeter",
      },
      {
        label: "Number of vertical drops (16 m ÷ 0.53 m)",
        value: "31 full vertical drops",
      },
      {
        label: "Cut length per drop (2.6 m + trim + repeat)",
        value: "3.02 metres cut length per drop",
      },
      {
        label: "Usable drops per 10.05 m roll (10.05 ÷ 3.02)",
        value: "3 usable drops per roll",
      },
      {
        label: "Total wallpaper rolls required (31 ÷ 3 drops)",
        value: "11 full rolls (0.53 m × 10.05 m)",
      },
      {
        label: "Wallpaper adhesive paste packs needed",
        value: "2 packs of 250 g paste powder",
      },
    ],
    result:
      "Total purchase list: 11 standard rolls (0.53 m × 10.05 m) and 2 packs of 250 g wallpaper adhesive.",
  },
  ratioTable: {
    caption:
      "Wallpaper roll formats, dimensions, and realistic coverage yields",
    columns: [
      "Roll format & wallpaper type",
      "Dimensions & nominal roll area",
      "Realistic usable wall coverage per roll",
    ],
    rows: [
      [
        "Standard Euro roll (plain / random match)",
        "0.53 m width × 10.05 m length (5.33 m²)",
        "4.5 m² to 4.8 m² (3 to 4 drops)",
      ],
      [
        "Standard Euro roll (pattern repeat 30-64 cm)",
        "0.53 m width × 10.05 m length (5.33 m²)",
        "3.8 m² to 4.2 m² (typically 3 drops)",
      ],
      [
        "Wide-format commercial vinyl roll",
        "1.06 m width × 15.60 m length (16.53 m²)",
        "13.5 m² to 14.8 m² per roll",
      ],
      [
        "Peel and stick self-adhesive roll",
        "0.45 m width × 5.00 m length (2.25 m²)",
        "1.8 m² to 2.0 m² per roll",
      ],
      [
        "Wallpaper primer / sizing sealer",
        "5 litre container liquid size",
        "35 m² to 45 m² wall pre-treatment",
      ],
    ],
  },
  faqs: [
    {
      question: "How do I calculate how many rolls of wallpaper I need?",
      answer:
        "Divide your total room perimeter by the roll width (0.53 m) to find the number of vertical drops. Then add your wall height plus 10 cm for trimming plus the pattern repeat distance to find the drop cut length. Divide roll length (10.05 m) by cut length to get usable drops per roll, and divide total drops by drops per roll, rounding up to the next full roll.",
    },
    {
      question: "What is a pattern repeat and how does it affect the estimate?",
      answer:
        "A pattern repeat is the vertical distance between identical design motifs on the wallpaper. When aligning designs across adjacent strips, each new drop must be shifted up or down until the pattern lines up, producing discarded offcuts at the top of each roll. Large repeats of 50 cm or more can reduce roll yield from 4 drops to 2 or 3.",
    },
    {
      question: "Should I subtract windows and doors from the calculation?",
      answer:
        "For general residential estimation, it is best not to deduct small or medium windows and doors. The extra paper accounted for covers cutting mistakes, awkward corner wraps, and difficult switch plate reveals. Only deduct large feature openings such as double garage doors or wide sliding patio doors exceeding 2 metres in width.",
    },
    {
      question:
        "What is the difference between paste-the-paper and paste-the-wall wallpaper?",
      answer:
        "Traditional paper wallpapers expand when wet and must be coated with paste, booked (folded), and allowed to soak for several minutes before hanging. Modern non-woven wallpapers do not expand when wet, allowing you to roll adhesive directly onto the wall and hang dry strips straight from the roll, which is significantly faster and cleaner.",
    },
    {
      question:
        "Why is wall primer or size necessary before hanging wallpaper?",
      answer:
        "Wall primer or sizing coats porous new plaster or painted drywall with a moisture barrier. This prevents dry walls from prematurely absorbing moisture from wallpaper paste, giving the installer open working time to slide and position seams perfectly, while preventing the paper from blistering and peeling later.",
    },
  ],
  limits:
    "This calculator estimates roll and adhesive quantities based on entered wall dimensions. It does not inspect wall moisture levels, evaluate substrate porosity, or replace preliminary surface sizing and wall prep.",
};
