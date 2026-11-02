import { SeoContent } from "./SeoSections";
import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";

// ── Paint Calculator ────────────────────────────────────────────────
export function PaintCalculatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Calculate Paint Quantity for Any Room")}
      </h2>
      <p>
        Calculating how much paint you need is the first step in any painting
        project. Whether you're painting a single room or an entire house, the
        FRELUX Project Calculator takes your wall dimensions, number of coats,
        doors, and windows into account to give you the number of paint buckets
        required for your project.
      </p>
      <p>
        {t("FRELUX estimates paint requirements in")} <strong>buckets</strong>,
        a standard purchase unit for paint in many markets. The engine
        calculates your paintable wall area, applies coverage rates specific to
        your selected paint type and quality, accounts for the number of coats,
        and rounds up to whole paint buckets so you know exactly what to buy.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Factors That Affect Paint Quantity")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Wall surface area")}</strong>: larger walls need more
          paint
        </li>
        <li>
          <strong>{t("Number of coats")}</strong>: most projects need 2–3 coats
          for full coverage
        </li>
        <li>
          <strong>{t("Paint type")}</strong>: emulsion, satin, gloss, and
          texture paints have different coverage rates
        </li>
        <li>
          <strong>{t("Surface texture")}</strong>: rough or porous surfaces
          absorb more paint
        </li>
        <li>
          <strong>{t("Doors and windows")}</strong>: deduct these openings from
          the total wall area
        </li>
        <li>
          <strong>{t("Waste factor")}</strong>: always add 5–10% for spillage
          and touch-ups
        </li>
      </ul>
      <p>
        Using a paint calculator saves you money by preventing overbuying. It
        also ensures you have enough paint to finish the job without mid-project
        trips to the paint store, where the next batch might have slight colour
        variations.
      </p>
    </SeoContent>
  );
}

// ── Screeding Calculator ───────────────────────────────────────────
export function ScreedingCalculatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Calculate Wall Screeding Area and Materials")}
      </h2>
      <p>
        Wall screeding is the process of smoothing interior walls with a thin
        layer of cement-sand mix before painting or wallpapering. The FRELUX
        Screeding Calculator helps you estimate the total screeding area and the
        quantities of cement, sand, and bonding agents you'll need.
      </p>
      <p>
        To calculate screeding area, measure the length and height of each wall,
        then multiply. Deduct doors and windows from the total. FRELUX measures
        screeding in square metres (m²) and bases material quantities on the
        system you choose (a putty-based system or a white cement + screeding
        paint system), using coverage rates set in the calculator.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Materials Needed for Wall Screeding")}
      </h2>
      <p className="mb-2">
        FRELUX supports two screeding systems, and the calculator prices the one
        you select:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Putty-based system")}</strong>: premixed putty applied
          straight from the bucket, the fastest, most common modern approach
        </li>
        <li>
          <strong>{t("White cement + screeding paint system")}</strong>: white
          cement as the binder, finished with screeding paint for a smooth,
          paint-ready surface
        </li>
      </ul>
      <p>
        Proper screeding creates a smooth, paint-ready surface that lasts longer
        and looks professional. Underestimating materials can delay your
        project, so always use a screeding calculator to get accurate quantities
        before you start.
      </p>
    </SeoContent>
  );
}

// ── POP Ceiling Calculator ────────────────────────────────────────
export function PopCeilingCalculatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Calculate POP Ceiling Materials")}
      </h2>
      <p>
        Plaster of Paris (POP) ceilings are a popular choice for many homes,
        offering a smooth, elegant finish that can be moulded into decorative
        designs. The FRELUX POP Ceiling Calculator estimates the materials you
        need based on your ceiling area.
      </p>
      <p>
        To use the calculator, enter your room dimensions (length × width) to
        get the ceiling area. The calculator then estimates POP cement quantity,
        fibreglass mesh, and other materials based on standard coverage rates.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("POP Ceiling Material Guide")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("POP cement")}</strong>: the primary material, mixed with
          water to form a paste
        </li>
        <li>
          <strong>{t("Fibreglass mesh")}</strong>: reinforcement to prevent
          cracking
        </li>
        <li>
          <strong>{t("POP powder")}</strong>: for filling joints and creating
          decorative mouldings
        </li>
        <li>
          <strong>{t("Bonding agent")}</strong>: ensures the POP adheres to the
          ceiling slab
        </li>
        <li>
          <strong>{t("Sandpaper")}</strong>: for smoothing the finished surface
        </li>
      </ul>
      <p>
        A well-installed POP ceiling improves insulation, hides wiring and
        plumbing, and adds aesthetic value to your home. Using the calculator
        ensures you order the right quantity of materials and avoid wastage.
      </p>
    </SeoContent>
  );
}

// ── Tile Calculator ───────────────────────────────────────────────
export function TileCalculatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Calculate Tile Quantity for Floors and Walls")}
      </h2>
      <p>
        Whether you're tiling a bathroom, kitchen, or entire floor, knowing how
        many tiles you need prevents costly shortages or wasteful overbuying.
        The FRELUX Tile Calculator takes your surface dimensions, tile size, and
        waste factor to calculate the exact number of tiles, boxes, adhesive,
        and grout.
      </p>
      <p>
        The formula:{" "}
        <strong>
          (surface area × waste factor) ÷ area per tile = number of tiles needed
        </strong>
        . For box calculations, divide the total tiles by the number of tiles
        per box. Always add 10–15% extra for cuts, breakages, and future
        repairs.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Tile Calculation Tips")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Measure carefully")}</strong>: even small measurement
          errors can lead to tile shortages
        </li>
        <li>
          <strong>{t("Account for grout gaps")}</strong>: typically 2–5mm
          between tiles
        </li>
        <li>
          <strong>{t("Buy extra tiles")}</strong>: keep 1–2 boxes for future
          repairs as designs get discontinued
        </li>
        <li>
          <strong>{t("Consider tile layout")}</strong>: diagonal layouts need
          15–20% more tiles than straight layouts
        </li>
        <li>
          <strong>{t("Check tile quality")}</strong>: inspect for chipped or
          warped tiles before installation
        </li>
      </ul>
      <p>
        The calculator also estimates tile adhesive and grout quantities based
        on the tile size and joint width. For large-format tiles, you'll need
        more adhesive per square metre than for smaller tiles.
      </p>
    </SeoContent>
  );
}

// ── Cost Estimator ─────────────────────────────────────────────────
export function CostEstimatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Estimate the Cost of a Painting Project")}
      </h2>
      <p>
        Budgeting for a painting project requires more than just the cost of
        paint. The FRELUX Paint Cost Estimator factors in paint, primer,
        undercoat, putty, sandpaper, brushes, rollers, and other materials to
        give you a comprehensive cost breakdown.
      </p>
      <p>
        The estimator uses admin-configured material prices from popular paint
        brands. Simply enter your paint bucket count (from the Paint
        Calculator), choose your paint type and quality, and the estimator
        calculates the total paint material cost.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("What's Included in a Paint Project Cost")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Paint")}</strong>: the main material cost, varies by brand
          and quality
        </li>
        <li>
          <strong>{t("Primer and undercoat")}</strong>: essential for surface
          preparation
        </li>
        <li>
          <strong>{t("Wall putty and filler")}</strong>: for smoothing and
          repairing walls
        </li>
        <li>
          <strong>{t("Sandpaper and cleaning supplies")}</strong>: surface
          preparation materials
        </li>
        <li>
          <strong>{t("Brushes, rollers, and trays")}</strong>: application tools
        </li>
        <li>
          <strong>{t("Masking tape and drop cloths")}</strong>: for protecting
          surfaces
        </li>
      </ul>
      <p>
        Getting an accurate cost estimate before starting helps you compare
        quotes from painters, avoid price surprises, and plan your budget
        effectively. The estimator's transparent breakdown shows exactly where
        your money goes.
      </p>
    </SeoContent>
  );
}

// ── Screeding Cost Estimator ───────────────────────────────────────
export function ScreedingCostEstimatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Estimate Wall Screeding Cost")}
      </h2>
      <p>
        Wall screeding cost depends on the area to be screeded, the screeding
        system you choose, and current material prices. The FRELUX Screeding
        Cost Estimator calculates the total cost of putty or white cement,
        screeding paint, and bonding agents based on your wall area.
      </p>
      <p>
        To get an accurate estimate, first use the Screeding Calculator to
        determine your total wall area in m², then enter that area into the Cost
        Estimator along with your chosen screeding system and material prices.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Screeding Cost Breakdown")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Cement")}</strong>: typically the largest material cost
        </li>
        <li>
          <strong>{t("Sand")}</strong>: sharp sand for the screeding mix
        </li>
        <li>
          <strong>{t("Bonding agent")}</strong>: for adhesion to the wall
          surface
        </li>
        <li>
          <strong>{t("Fibreglass mesh")}</strong>: for large or crack-prone
          walls
        </li>
        <li>
          <strong>{t("Labour")}</strong>: screeding requires skilled labour for
          a smooth finish
        </li>
      </ul>
      <p>
        Screeding your walls before painting creates a smooth, professional
        surface that improves paint adhesion and finish quality. The cost
        estimator helps you budget accurately and compare contractor quotes.
      </p>
    </SeoContent>
  );
}

// ── POP Ceiling Cost Estimator ────────────────────────────────────
export function PopCeilingCostEstimatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Estimate POP Ceiling Cost")}
      </h2>
      <p>
        The cost of a POP ceiling project depends on the ceiling area, the
        complexity of the design, and current material prices. The FRELUX POP
        Ceiling Cost Estimator gives you a detailed cost breakdown for POP
        cement, mesh, and other materials.
      </p>
      <p>
        For a basic flat POP ceiling, costs are lower. Decorative designs with
        cornices, medallions, or recessed sections require more material and
        skilled labour, increasing the total cost.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Factors Affecting POP Ceiling Cost")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Ceiling area")}</strong>: larger rooms need more materials
        </li>
        <li>
          <strong>{t("Design complexity")}</strong>: simple flat ceilings cost
          less than decorative ones
        </li>
        <li>
          <strong>{t("POP cement quality")}</strong>: premium brands cost more
          but set harder
        </li>
        <li>
          <strong>{t("Room accessibility")}</strong>: high ceilings or tight
          spaces may increase labour cost
        </li>
        <li>
          <strong>{t("Location")}</strong>: material and labour prices vary by
          region
        </li>
      </ul>
      <p>
        A POP ceiling adds elegance and value to your home. Using the cost
        estimator before you start helps you plan your budget and avoid
        unexpected expenses.
      </p>
    </SeoContent>
  );
}

// ── Tile Cost Estimator ────────────────────────────────────────────
export function TileCostEstimatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Estimate Tiling Project Cost")}
      </h2>
      <p>
        Tiling cost includes the tiles themselves, adhesive, grout, and labour.
        The FRELUX Tile Cost Estimator takes your tile area, tile type, and
        installation method to calculate a complete project cost breakdown.
      </p>
      <p>
        Tile prices vary widely, from budget ceramic tiles to premium porcelain
        and natural stone. The estimator lets you enter your tile price per box
        and tiles per box to get an accurate cost based on your specific product
        choice.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Tiling Cost Components")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Tiles")}</strong>: the main cost, depends on material and
          brand
        </li>
        <li>
          <strong>{t("Tile adhesive")}</strong>: for bonding tiles to the
          surface
        </li>
        <li>
          <strong>{t("Grout")}</strong>: for filling joints between tiles
        </li>
        <li>
          <strong>{t("Waterproofing")}</strong>: essential for bathrooms and wet
          areas
        </li>
        <li>
          <strong>{t("Labour")}</strong>: skilled tilers charge per square metre
        </li>
        <li>
          <strong>{t("Tile trims and accessories")}</strong>: for edges and
          corners
        </li>
      </ul>
      <p>
        Getting a tile cost estimate before starting helps you choose tiles
        within your budget and compare quotes from different contractors. Always
        keep a few extra tiles for future repairs.
      </p>
    </SeoContent>
  );
}

// ── Finish Estimator ───────────────────────────────────────────────
export function FinishEstimatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Estimating Wall Finish Materials and Costs")}
      </h2>
      <p>
        Exterior and interior wall finishes go beyond simple painting. The
        FRELUX Finish Estimator handles three popular finish types · painting,
        Tyrolene, and Grafitex · calculating material quantities and costs for
        each.
      </p>
      <p>
        Each finish type has different material requirements, coverage rates,
        and price points. The estimator uses real product package sizes and
        current prices to give you accurate quantities and costs.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Wall Finish Types Compared")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Painting")}</strong>: the most common finish, suitable for
          interior and exterior walls
        </li>
        <li>
          <strong>{t("Tyrolene")}</strong>: a textured exterior finish made from
          cement, sand, and additives, applied with a Tyrolene machine for a
          speckled effect
        </li>
        <li>
          <strong>{t("Grafitex")}</strong>: a modern textured finish that
          creates a smooth or patterned surface, popular for exterior walls
        </li>
      </ul>
      <p>
        Choosing the right finish depends on your budget, the wall surface, and
        whether the wall is interior or exterior. The estimator lets you compare
        all three options side by side to make an informed decision.
      </p>
    </SeoContent>
  );
}

// ── Painting Estimator ─────────────────────────────────────────────
export function PaintingEstimatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Room-Based Painting Estimation with the FRELUX Method")}
      </h2>
      <p>
        The FRELUX Painting Estimator uses a room-by-room approach to calculate
        paint quantity and project cost. Unlike simple area-based calculators,
        it accounts for different room types (bedrooms, living rooms, kitchens,
        bathrooms) with their specific requirements.
      </p>
      <p>
        Each room can have different paint types, number of coats, and surface
        conditions. The estimator uses the FRELUX methodology, a systematic
        approach that combines wall area calculation, paint coverage rates, and
        admin-configured material prices.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Why Room-Based Estimation Is More Accurate")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Different rooms have different requirements")}</strong>:
          bathrooms need moisture-resistant paint, kitchens need washable paint
        </li>
        <li>
          <strong>
            {t("Ceiling and walls can use different paint types")}
          </strong>
          : ceiling paint vs wall paint
        </li>
        <li>
          <strong>{t("Multiple rooms can share bulk purchases")}</strong>:
          buying 20L containers is cheaper than multiple 4L containers
        </li>
        <li>
          <strong>{t("Track per-room costs")}</strong>: helps identify where
          your budget is going
        </li>
      </ul>
      <p>
        The Painting Estimator generates a comprehensive report with paint
        quantities, material costs, and a breakdown by room. This is especially
        useful for contractors pricing jobs and homeowners planning multi-room
        renovations.
      </p>
    </SeoContent>
  );
}

// ── Tyrolene Estimator ─────────────────────────────────────────────
export function TyroleneEstimatorSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How to Estimate Tyrolene Materials for Exterior Walls")}
      </h2>
      <p>
        Tyrolene is a durable exterior wall finish made from cement, sand, and
        chemical additives, applied with a Tyrolene machine to create a
        textured, weather-resistant surface. The FRELUX Tyrolene Estimator
        calculates practical quantities of all materials needed.
      </p>
      <p>
        The estimator uses a partition-based approach, you enter each wall
        section separately to account for different heights, openings, and
        surface conditions. It then calculates cement, sand, acrylic bond, water
        seal, anti-fungal additive, and Tyrolene machine coverage.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Tyrolene Material Components")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Cement")}</strong>: the base binder, typically OPC grade
          42.5 or 52.5
        </li>
        <li>
          <strong>{t("Sand")}</strong>: fine, clean sand for the Tyrolene mix
        </li>
        <li>
          <strong>{t("Acrylic bond")}</strong>: improves adhesion and
          flexibility
        </li>
        <li>
          <strong>{t("Water seal")}</strong>: makes the finish water-repellent
        </li>
        <li>
          <strong>{t("Anti-fungal additive")}</strong>: prevents mould and algae
          growth
        </li>
        <li>
          <strong>{t("Primer coat")}</strong>: applied before the Tyrolene layer
        </li>
      </ul>
      <p>
        Tyrolene is one of the most cost-effective exterior finishes for
        buildings. It hides surface imperfections, resists weather damage, and
        lasts 10–15 years with minimal maintenance. The estimator ensures you
        order the right materials and avoid costly delays.
      </p>
    </SeoContent>
  );
}

// ── AI Color Assistant ─────────────────────────────────────────────
export function AiColorAssistantSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("AI-Powered Paint Color Recommendations")}
      </h2>
      <p>
        Choosing the right paint colour can be overwhelming with thousands of
        shades available. The FRELUX Smart Color Assistant uses AI to recommend
        colours based on your room type, lighting conditions, mood, and existing
        furniture.
      </p>
      <p>
        Simply describe your space · "a small north-facing bedroom with oak
        furniture and warm lighting" · and the assistant suggests complementary
        colour palettes with specific paint codes you can buy.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("How AI Color Selection Works")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Room type")}</strong>: living rooms, bedrooms, and
          kitchens have different colour needs
        </li>
        <li>
          <strong>{t("Lighting")}</strong>: natural light direction affects how
          colours appear
        </li>
        <li>
          <strong>{t("Mood")}</strong>: calming colours for bedrooms, energising
          for workspaces
        </li>
        <li>
          <strong>Existing décor</strong>: the assistant considers your
          furniture and flooring
        </li>
        <li>
          <strong>{t("Colour theory")}</strong>: complementary, analogous, and
          triadic schemes
        </li>
      </ul>
      <p>
        Once you have your colour recommendations, you can compare them side by
        side, see them in the colour library, and use the paint calculator to
        estimate how much paint you'll need.
      </p>
    </SeoContent>
  );
}

// ── Colors Page ───────────────────────────────────────────────────
export function ColorsPageSeo(): ReactNode {
  const { t } = useLanguage();
  return (
    <SeoContent>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Browse Paint Colors for Every Project")}
      </h2>
      <p>
        The FRELUX Color Library contains hundreds of paint colours from popular
        brands, each with its name and colour code. Search by name, filter by
        brand or colour family, and compare colours side by side.
      </p>
      <p>
        Whether you're looking for the perfect white for your ceiling, a warm
        beige for your living room, or a bold accent colour for a feature wall,
        the colour library makes it easy to find and compare options.
      </p>
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Tips for Choosing Paint Colors")}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>{t("Test before you commit")}</strong>: buy a small sample and
          paint a test patch
        </li>
        <li>
          <strong>{t("Consider lighting")}</strong>: colours look different
          under natural and artificial light
        </li>
        <li>
          <strong>{t("Use the 60-30-10 rule")}</strong>: 60% dominant colour,
          30% secondary, 10% accent
        </li>
        <li>
          <strong>{t("Sample in the actual room")}</strong>: colours change
          depending on surrounding surfaces
        </li>
        <li>
          <strong>{t("Check drying time")}</strong>: some colours darken or
          lighten as they dry
        </li>
      </ul>
      <p>
        Once you've found your colour, use the Paint Calculator to determine how
        much paint you need, and the Cost Estimator to budget your project.
      </p>
    </SeoContent>
  );
}
