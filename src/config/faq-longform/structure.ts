import type { LongFormArticle } from "@/config/faq-longform";

export const STRUCTURE_LONGFORM: Record<string, LongFormArticle> = {
  "foundation-calculator": {
    description: `A foundation estimate comes down to three quantities and one warning. The concrete in the footing, the blocks in the wall above it, and the mortar that holds them, plus a clear statement that none of it is a design. Everything the tool does follows from the dimensions you supply, and nothing is inferred from a building type, a plot size or a habit.

The warning matters as much as the arithmetic. Footing width, depth and reinforcement follow from the load and the ground, which are engineering questions answered by a soil report and a structural design. Once those dimensions exist, the material quantity is simple multiplication, and that is the part this tool owns. When the dimensions do not exist yet, the honest output is a request for them.`,
    functions: [
      "Calculates footing concrete from the length, width and depth of each footing run you enter, with a waste allowance as its own line.",
      "Calculates blockwork from the wall length, height and block size, deducting the openings you list.",
      "Calculates mortar volume from the joint thickness, block size and the wall area the blocks fill.",
      "Expresses cement in the bag size sold in the market you select, with sand by volume, from the mix you specify.",
      "Keeps the strip footing, the column bases and the blockwork on separate lines, so each can be checked against the drawing independently.",
      "Reports a dimension left blank as missing instead of substituting a typical value.",
    ],
    worked:
      "A strip footing one hundred and twenty metres in total run, six hundred millimetres wide and two hundred deep, needs fourteen and four tenths cubic metres of concrete. Add five percent waste and that becomes fifteen cubic metres, which in a one to two to four mix is roughly four and a third cubic metres of cement, eight and two thirds of sand and seventeen and a third of coarse aggregate, expressed in the bag size your market sells. A block wall of one hundred and twenty metres at nine hundred millimetres high is a hundred and eight square metres, and with a block of four hundred and fifty by two hundred and twenty five millimetres each covers just over a tenth of a square metre, so about a thousand and seventy blocks before openings and waste. The two numbers are separate purchases and separate deliveries, which is why they are separate lines.",
    advantages: [
      "Footing concrete and blockwork are measured independently, so each can be checked against its own drawing detail.",
      "Cement follows the bag size sold where you are building, which keeps the order usable across markets.",
      "Openings are deducted with their dimensions, which is where a wall estimate usually over orders.",
      "A blank dimension is reported as missing, so an incomplete drawing is visible before material is ordered.",
      "The tool states plainly that it does not design, which keeps the engineering question with the engineer.",
    ],
    limits: [
      "It does not size footings, columns or reinforcement, and it will not infer them from a building description.",
      "It does not assess ground conditions, bearing capacity or water.",
      "It does not include formwork, hardcore, blinding, damp proofing or excavation.",
      "It does not include the setting out or the labour to place the concrete.",
      "Tax is not determined here, and it appears only where a configured rule applies to your market.",
    ],
    answers: [
      `Multiply each footing run's length, width and depth, add the runs, then add the waste allowance you work to. The calculator does that from the dimensions you enter and shows the total before waste as well as after, so a checking engineer can see both. Cement, sand and coarse aggregate then follow from the mix you specify, expressed in the bag size and the units your market sells, so the order is something a supplier can price.`,
      `Take the wall length, multiply by the height, divide by the face area of the block you are using, then deduct the openings and add waste. The calculator works from the block size you specify, which matters because a four hundred and fifty by two hundred and twenty five millimetre block and a four hundred and forty by two hundred and fifteen millimetre block do not cover the same area. Mortar follows the joint thickness and the wall area, so a thinner joint reduces both the mortar and the cement in it.`,
      `No, and it says so on the page. Footing width, depth and reinforcement are structural design decisions that follow from the load and the ground, and a quantity tool cannot make them. When those dimensions come from your engineer, this tool converts them into a material order. When they do not exist yet, the useful next step is a soil report and a design, not a guessed footing width.`,
      `No. Formwork, hardcore, blinding, damp proofing and excavation are separate items with their own quantities, and they are usually priced by a different trade. The estimate covers the concrete and the blockwork, which are the two materials you need to order before the first pour. Adding formwork to a concrete quantity produces a figure that reads as complete while leaving several real costs out of it.`,
      `No. Tax is not determined in this estimate. Where a configured tax rule applies to your market, it appears as its own line with the basis stated; where no rule applies, the total is shown without tax rather than with an assumed percentage. That matters when you are comparing quotes from different regions, because a figure with an invented tax rate cannot be compared with one without it.`,
    ],
  },
  "structural-calculator": {
    description: `A structural takeoff is a schedule, not a design. Slabs, beams, columns, footings and walls are each measured from their own dimensions, and the totals roll up by material so the steel order and the concrete order are separate documents. The tool holds that shape because a concrete frame is bought as materials, not as elements.

What it will not do is decide the size of anything. A beam is measured at the depth it was designed to, a slab at its designed thickness, and the reinforcement counted in the diameters and lengths on the bar schedule. Those are the inputs. The output is the concrete volume, the formwork area where you ask for it, and the reinforcement weight by diameter, which is what a supplier and a fixer both work from.`,
    functions: [
      "Measures each element type from its own dimensions: length, breadth and depth for a slab, section and length for a beam or column.",
      "Rolls the totals up by material, so all the concrete is one figure and all the reinforcement is another, while each element keeps its own line.",
      "Calculates reinforcement weight from bar diameter, length and count, using the unit mass of the bar size.",
      "Converts concrete volume into cement, sand and coarse aggregate from the mix you specify.",
      "Expresses cement in the bag size sold in your market, and keeps sand and aggregate by volume or by tonne as you prefer.",
      "Reports an element with a missing dimension as incomplete, instead of closing it with a typical value.",
    ],
    worked:
      "A slab ten metres by eight at a hundred and fifty millimetres is twelve cubic metres. Two beams six metres long at three hundred by six hundred add two and two tenths cubic metres. Six columns three metres high at three hundred by three hundred add one and six tenths. The total is close to sixteen cubic metres of concrete, and at a one to one and a half to three mix that is roughly five cubic metres of cement, seven and a half of sand and fifteen of aggregate, in bags and tonnes for your market. Reinforcement comes separately: twenty five bars of sixteen millimetre at seven metres, plus thirty of twelve millimetre at five metres, converted to kilogrammes by bar mass and summed by diameter, so the steel order is a schedule a fabricator can cut from.",
    advantages: [
      "Elements stay separate and materials roll up, which is the shape both a checking engineer and a supplier need.",
      "Reinforcement is summarised by diameter, so the bar order matches how steel is sold.",
      "Concrete splits into ingredients from the mix you set, instead of a single volume nobody can order.",
      "Missing dimensions are reported rather than filled, which prevents an incomplete drawing becoming an incomplete pour.",
      "Cement follows the market's bag size, so the same schedule works in different countries.",
    ],
    limits: [
      "It does not size members, calculate loads or check deflection.",
      "It does not design reinforcement, laps or anchorage, and it measures the bars you specify.",
      "It does not include formwork unless you ask for it, and it does not design the falsework.",
      "It does not replace a bar bending schedule from the designer.",
      "It does not include labour, pumping, testing or curing.",
    ],
    answers: [
      `It measures concrete and reinforcement for the elements you describe. Each slab, beam, column, footing or wall is entered with its own dimensions, and the quantities roll up by material. Reinforcement is counted by bar diameter, length and number, then converted to mass using the unit weight of that bar size, which is how a steel order is placed. What it does not do is decide the dimensions: those come from the structural design, and the schedule assumes they are already fixed.`,
      `From you, and from the drawing you are reading. The length, breadth and depth of each element are entered as they appear on the design, and the bar schedule supplies the diameters and lengths for reinforcement. The tool does not scale a drawing or infer a section from a span, because a takeoff built on inference is a takeoff that cannot be checked. Where a dimension is missing, it is reported as missing so the gap is closed on the drawing before anything is ordered.`,
      `No. It is a material schedule, which is a different document from a design. Sizing members, calculating loads, checking deflection and detailing reinforcement are engineering work, and the tool assumes that work is done. The value it adds is turning a finished design into quantities and an order that can be placed, checked and audited, which is where most of the arithmetic and nearly all of the clerical error live.`,
      `From the mix you specify, in proportions by volume, converted to the bag size sold in your market. A one to one and a half to three mix and a one to two to four mix give noticeably different cement content for the same concrete volume, so the mix is an input rather than a default. Sand and aggregate are then expressed by volume or by tonne, and cement by bag, because that is how each is bought at a merchant in most markets.`,
      `Yes, and they should be, because a frame is placed and poured in sequence rather than in one operation. Each element keeps its own line with its own dimensions and quantity, and the materials roll up across the whole set. That way a slab can be ordered for one pour and columns for another, while the totals still tell you what the whole frame needs. Mixing everything into a single volume loses the sequence and makes a partial pour impossible to price.`,
    ],
  },
  "screeding-calculator": {
    description: `A screed estimate is a volume calculation wearing an area costume. The floor area is what you measure, but the order is sand and cement, and those follow the depth. That is why thickness is the first input the tool asks for and why a change from forty to seventy millimetres changes the material by three quarters on the same floor.

The other half of the job is where the screed sits. A floor screed is ordered by volume, a wall render by area at a stated thickness, and a wearing surface over a sound base is thinner than a levelling screed over an uneven one. Keeping those cases apart is what stops a floor being priced at a render rate and a wall being ordered by the cubic metre.`,
    functions: [
      "Calculates screed volume from the floor area and the thickness you enter.",
      "Converts volume into sand and cement from the mix ratio you specify, with cement in the bag size sold in your market.",
      "Measures wall render separately, by area at the thickness you state, so the two do not share a rate.",
      "Applies your waste percentage as a stated line rather than a loading on the sand price.",
      "Keeps the floor finish, such as tile or paint, out of the screed quantity, since it is a separate product and a separate order.",
      "Reports a blank thickness as missing, because the volume cannot be calculated without it.",
    ],
    worked:
      "A floor of sixty square metres at fifty millimetres needs three cubic metres of screed. At a one to four mix by volume, that is six tenths of a cubic metre of cement and two and four tenths of sand, which in bags of fifty kilogrammes is roughly nine hundred kilogrammes of cement, or eighteen bags, and about four tonnes of sand once its density is applied. Take the same floor to seventy five millimetres and the volume rises to four and a half cubic metres, the cement to twenty seven bags, and the sand to six tonnes. Same floor, same mix, no change in the drawing's intent, and a third more material, which is why thickness cannot sit inside a trade rate.",
    advantages: [
      "Thickness is an input, so a deeper screed shows up as the material it consumes.",
      "Sand and cement are ordered in the units they are sold in, bags and tonnes, not as a bare volume.",
      "Floor screed and wall render stay separate, which keeps their rates from being blended.",
      "Waste is visible, so a rough base can be given the allowance it needs.",
      "The floor finish is excluded, so the screed quantity is not inflated by the tile that sits on it.",
    ],
    limits: [
      "It does not assess the substrate, which decides whether a levelling screed is needed and how deep.",
      "It does not design the mix, and it does not specify admixtures or reinforcement mesh.",
      "It does not include curing compounds, edge insulation or movement joints.",
      "It does not price labour, pumping, preparation or removal of the old floor.",
      "It does not include the finished floor covering.",
    ],
    answers: [
      `Multiply the floor area by the thickness to get a volume, then split that volume by the mix ratio into sand and cement. The calculator does both steps and expresses cement in the bag size sold in your market, with sand by volume or by tonne. Two things move the answer more than the area does: the thickness, which multiplies everything, and the mix, because a one to three screed uses noticeably more cement than a one to five for the same volume.`,
      `Between forty and seventy five millimetres is common for a levelling screed over a prepared base, with thinner sections used for a wearing surface over a sound floor. Below about forty millimetres the risk of curling and debonding rises, and above seventy five the material cost climbs quickly. Those are specification judgements, so the calculator asks for your thickness and shows what it consumes rather than choosing one for you.`,
      `No. Tile, stone, screed paint and any levelling compound above the screed are separate products with their own quantities and their own trades. The estimate covers the screed itself, which is what you order before the floor finish is even selected. Keeping them apart matters on a quotation, because a client changing the tile should not change the screed quantity, and mixing them makes that comparison impossible.`,
      `Enter the depth the specification calls for, in millimetres. If the base is uneven, the average depth is what governs the order, so measure the high and low points and use a figure that reflects the average rather than the minimum. The calculator shows the volume implied, which is the quickest way to sanity check whether the depth on a drawing meets the floor level you are trying to achieve.`,
      `Both, as separate surfaces, because they are measured and bought differently. A floor screed is a volume of sand and cement placed to a depth; a wall render is an area at a stated thickness, often with a different mix and a different finish. The calculator keeps the two apart so a wall is not ordered by the cubic metre and a floor is not priced from a render rate per square metre.`,
    ],
  },
};
