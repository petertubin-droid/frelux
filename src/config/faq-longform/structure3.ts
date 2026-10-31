import type { LongFormArticle } from "@/config/faq-longform";

export const STRUCTURE3_LONGFORM: Record<string, LongFormArticle> = {
  "roof-framing-calculator": {
    description: `A roof is measured on its slope, and its slope is longer than its plan. That single fact is why roof quantities differ from floor quantities of the same building, and why the framing takeoff starts from the pitch rather than from the footprint.

The tool returns members by length and by volume. Length is what you order from a timber merchant and what you cut; board feet is what a mill or a merchant prices in some markets, and a schedule that gives one without the other leaves you converting at the counter. Pitch changes both, because a steeper roof has longer rafters, more of them per unit of plan area, and more material in the same footprint.`,
    functions: [
      "Calculates the sloped roof area from the plan area and the pitch you specify.",
      "Counts rafters from the span, the spacing and the pitch, with ridge, hips and valleys as their own runs.",
      "Calculates purlins and battens from the area and the spacing you set.",
      "Returns member lengths in linear metres and volumes in board feet, so both pricing conventions are covered.",
      "Applies the waste percentage you set to cover cutting, which is higher on hips and valleys.",
      "Reports a roof entered without a pitch as incomplete, since the area cannot be derived from the plan alone.",
    ],
    worked:
      "A plan of a hundred square metres at thirty degrees has a sloped area of about a hundred and fifteen square metres, which is the plan divided by the cosine of the pitch. At six hundred millimetre rafter spacing over a nine metre span, with rafters at two point six metres of slope each side, the count is about thirty two. Boards at the sizes you specify then convert to board feet, so the same schedule prices in linear metres for one merchant and in board feet for another. Twenty degrees instead of thirty would shorten the rafters and cut the sloped area to a hundred and six, which is a real reduction in both timber and covering.",
    advantages: [
      "Pitch drives the area, so a steeper roof is priced as larger rather than the same.",
      "Rafters, ridges, hips and valleys are separate runs, which is how they are cut.",
      "Both linear and board feet outputs are given, so either pricing convention works.",
      "Spacing is an input, because it follows from the covering and the span.",
      "A missing pitch is reported rather than assumed at a common value.",
    ],
    limits: [
      "It does not size the members, check span tables or design the structure.",
      "It does not include the roof covering, which is measured by the roofing tool.",
      "It does not include trusses, engineered joists or their design.",
      "It does not include fixings, straps, hangers or bracing beyond what you add.",
      "It does not include access, edge protection or labour.",
    ],
    answers: [
      `Members by length and by volume: rafters, ridge, hips, valleys, purlins and battens, each from the pitch, the span and the spacing you enter. Board feet and linear metres are both returned because merchants price timber differently across markets. What it does not measure is the covering, the fixings or the trusses, since those follow their own rules and their own schedules.`,
      `Through the slope. A roof at thirty degrees has a sloped area of the plan divided by the cosine of the pitch, so a hundred square metres of plan becomes about a hundred and fifteen of roof. Rafters get longer as the pitch rises for the same span, and their count per unit of plan area rises with the slope. Both effects are in the arithmetic, which is why pitch is the first input rather than a detail.`,
      `Because timber is sold and priced both ways. A merchant may quote a length and a rate per linear metre, while a mill or a specification may price by board feet, which is a volume measure of the nominal section. Returning both from one schedule means the order does not have to be converted by hand, and a conversion done at the counter is where the two figures usually drift apart.`,
      `No. Member sizing follows from the span, the load, the spacing and the grade of timber, and it comes from span tables or an engineer's design. The takeoff measures the members a design calls for, at the sections you specify. Where a span exceeds the tables, that is a design question with a real answer, and it is not one a quantity tool should be inventing.`,
      `No. The covering is measured by the roofing tool, which converts the sloped area into sheets or tiles at their cover width and lap. The framing takeoff covers the structure that carries the covering. Keeping them apart matters because a change of covering changes the battens and the spacing but not the rafters, and a single blended estimate would obscure that.`,
    ],
  },
  "temporary-works-calculator": {
    description: `Temporary works are bought by area, not by volume, because formwork and falsework are surfaces and supports rather than substances. A slab soffit needs a contact area of ply, a beam needs its sides and its soffit, and a column needs four faces, and each of those is measured flat while the concrete is measured solid.

The takeoff returns contact area, the ply in sheets, the primary and secondary bearers, the props to a stated height, and the reuse cycles you expect. Reuse is the input that decides the real cost, since ply bought for one pour and ply used six times are different propositions on the same area. Where reuse is not stated, the tool asks.`,
    functions: [
      "Calculates contact area for each element type: slabs by soffit, beams by soffit and sides, columns by four faces.",
      "Converts area into ply sheets at the sheet size you specify, with a cutting allowance.",
      "Counts primary and secondary bearers from the prop grid you enter.",
      "Counts props and fittings from the grid and the height you specify.",
      "Divides the purchased area by the reuse cycles you set, so the cost per pour is visible.",
      "Reports an element without its contact dimensions as incomplete.",
    ],
    worked:
      "A slab of eighty square metres with two beams of nine metres at three hundred wide and four hundred deep: the soffit is eighty, the beams add nine metres by zero point three of soffit and two faces of four hundred deep, so about nineteen square metres of contact area in total, which is a fifth of the slab area again on two modest beams. At sheets of one point two by two point four that is seven sheets before cutting, eight with the allowance. Props at a grid of one point two metres give fifty six for the slab. With six reuse cycles, the ply cost per pour is one sixth of the purchase, and the props are hired by duration rather than consumed.",
    advantages: [
      "Contact area is measured per element, which is how formwork is actually bought.",
      "Reuse cycles make the difference between buying and amortising visible.",
      "Bearer and prop counts follow the grid you set rather than an allowance.",
      "Cutting allowance is stated, since formwork produces offcuts by nature.",
      "An element without contact dimensions is reported.",
    ],
    limits: [
      "It does not design formwork or falsework, and it does not check prop loads.",
      "It does not assess ground conditions under the props.",
      "It does not include striking times, curing or a temporary works register.",
      "It does not include scaffolding, edge protection, access or the temporary works register a site is required to keep.",
      "It does not include labour, hire rates, transport or the design of the falsework it measures.",
    ],
    answers: [
      `Contact area, and then the materials that area implies: ply in sheets, primary and secondary bearers, props and fittings, with a reuse allowance. It measures the surfaces the concrete touches, because that is what formwork is. Where an element has a void, a chamfer or a rebate, those are extra runs you describe, since they add contact area the main dimensions do not capture.`,
      `As a divisor on the purchased material. Ply used for one pour is consumed by that pour; ply used six times spreads its cost across six. The takeoff divides the area by the cycles you enter so the cost per pour is visible, and it leaves the cycles to you because they depend on the care taken striking, the surface finish required and how many identical pours there are.`,
      `Because formwork is a surface and concrete is a volume. The formwork that a beam needs is its soffit and its sides, which are areas, not its cubic metres. Measuring by volume would give the wrong order in both directions: a deep narrow beam and a shallow wide one of the same volume have very different contact areas.`,
      `No. Prop loads, bearer sizes, the grid, the foundation under the props and the striking sequence are design decisions, and falsework failures are among the most serious on site. The takeoff measures the materials for a falsework design that has been made. It does not check whether the design holds, and it does not replace the temporary works coordinator.`,
      `No. Scaffolding, edge protection, ladders and access platforms are separate systems with their own hire and their own design. The takeoff covers formwork and falsework materials, which is the part that is consumed or amortised by the concrete. Access is usually hired by duration and priced separately, and mixing the two produces a figure that answers neither question.`,
    ],
  },
  "foundation-designer": {
    description: `A footing size is the product of a load and a ground condition, and both have to come from somewhere. This tool takes the load you enter, the bearing capacity you supply and the dimensions of the structure, and returns a footing size with the arithmetic shown, so the suggestion can be checked rather than believed.

What it is not is a certified design. Bearing capacity comes from a soil report or a presumptive value for a known soil, and the value of that number is the whole value of the footing. Where it is unknown, the tool asks for it and stops. Where an engineer has specified a size, you enter it and the tool measures materials for that size instead.`,
    functions: [
      "Calculates a suggested footing width from the load and the bearing capacity you enter, and shows the calculation.",
      "Accepts an override, so an engineer's specified width replaces the suggestion and drives the quantities.",
      "Produces the concrete and blockwork for the footing and the wall above it at the resulting dimensions.",
      "Reports the bearing pressure the footing actually imposes, so the assumption can be checked.",
      "Flags a footing that falls below a practical minimum as needing attention rather than returning a thin pad.",
      "Reports missing bearing capacity as a blocker rather than substituting a typical value.",
    ],
    worked:
      "A wall carrying ninety kilonewtons per metre on ground with a bearing capacity of a hundred kilonewtons per square metre needs nine tenths of a square metre of ground of footing for every metre of wall, so a width of nine hundred millimetres. At that width and two hundred and fifty deep, the footing is two point two five cubic metres of concrete over ten metres, before waste. Enter a bearing capacity of fifty instead and the width doubles, and the concrete with it. The same wall, the same load, half the ground capacity, twice the concrete, which is why the number cannot be assumed.",
    advantages: [
      "The calculation is shown, so the suggested width can be checked line by line.",
      "An engineer's specified size overrides the suggestion and drives the quantities.",
      "Bearing pressure is reported, which is the check that matters most.",
      "A missing bearing capacity blocks the calculation rather than being invented.",
      "The output is materials for a decided size, which is what a site needs.",
    ],
    limits: [
      "It is not a certified design, and its output is not a substitute for an engineer's.",
      "It does not perform a soil investigation or derive bearing capacity.",
      "It does not check settlement, sliding, uplift or reinforcement.",
      "It does not include excavation, hardcore, blinding or dewatering.",
      "It does not include labour, plant, testing or the inspection a building authority will ask for.",
    ],
    answers: [
      `A suggested footing width with its calculation, the bearing pressure that width imposes, and the concrete and blockwork for the resulting dimensions. It also accepts a width you specify, in which case it measures rather than suggests. What it does not produce is a design certificate: the output is a material quantity attached to a sizing calculation that an engineer can check or replace.`,
      `From you, ideally from a soil report. Bearing capacity is a property of the ground, and presumptive values exist for known soils at known depths, but the honest source is a investigation. The tool will not invent one, because a footing sized on an assumed capacity is a footing whose safety depends on an assumption nobody has tested. Where the value is unknown, the calculation stops.`,
      `No. What it produces is a sizing calculation with a material quantity attached, which an engineer can check and either accept or replace. Certification involves the ground investigation, the structural design, the reinforcement and the professional's judgement about the specific site. Treat the output as a check on a proposal or a starting point for a conversation, not as a document that satisfies a building authority.`,
      `The foundation calculator measures materials for dimensions you already have. The designer starts one step earlier, from a load and a bearing capacity, and proposes dimensions before measuring them. Both end in concrete and blockwork quantities, and both state that reinforcement, excavation and design sit outside them. Use the designer when the footing size is still open, and the calculator when it is fixed.`,
      `Yes, and it is the intended path for anything serious. Enter the width an engineer has specified and the suggestion steps aside, with the quantities following your figure. That is what makes the tool useful alongside a design rather than in place of one: it takes the decision as an input and returns the material order that decision implies.`,
    ],
  },
  "septic-sizing-calculator": {
    description: `A septic tank is sized by the volume of sewage it receives and the time the sewage needs to settle, and both of those come from occupancy and flow rather than from the size of the house. That is why the tool asks for the flow rate and refuses to infer it, and why the soakaway is sized from the same flow against the ground's capacity to absorb it.

The output is a volume, a soakaway area and the materials for both. What it is not is an environmental approval. Discharge, setbacks, percolation testing and the treatment standard are regulated locally, and the numbers here are the inputs to that process rather than a substitute for it.`,
    functions: [
      "Calculates tank volume from the daily flow and the retention period you specify.",
      "Sizes the soakaway from the flow and the infiltration rate of the ground you enter.",
      "Counts the materials for both: tank or chamber units, pipe, granular fill and geotextile.",
      "Converts between metric and imperial volumes and dimensions where you select them.",
      "Reports a missing flow rate as a blocker instead of deriving one from bedroom count.",
      "Separates the tank from the soakaway, since the two are sized from different rules.",
    ],
    worked:
      "A household of six at a hundred and fifty litres a day each produces nine hundred litres a day. At a retention of two days the tank needs eighteen hundred litres of working volume, plus the sludge and scum space the standard requires, so a tank of around two thousand seven hundred litres for a household of six. A soakaway at an infiltration rate of thirty litres per square metre per day for nine hundred litres a day needs thirty square metres of base area, which at a metre wide trench is thirty metres of trench. Both numbers came from the same flow, and both change together when the occupancy changes.",
    advantages: [
      "Tank and soakaway are sized from the flow, which is the input that actually governs.",
      "A missing flow rate is a blocker rather than a bedroom count guess.",
      "Materials for both are counted, so the order covers the whole system.",
      "Metric and imperial are both handled.",
      "The tool states that approval sits outside it.",
    ],
    limits: [
      "It does not issue a permit or an environmental approval.",
      "It does not perform or interpret a percolation test.",
      "It does not design treatment beyond a septic system.",
      "It does not cover setbacks, discharge consent or groundwater protection.",
      "It does not include excavation, backfill, labour, desludging or the cost of an approval application.",
    ],
    answers: [
      `The daily flow and the retention period, and the sludge and scum storage the standard requires on top of that. Flow follows the occupancy and the fixtures, and it is the number that matters, because a tank sized by bedroom count is sized by a proxy for people who may not be there. Enter the flow, choose the retention, and the working volume follows, with the materials for it.`,
      `Because a flow rate derived from a bedroom count is an assumption about occupancy, and the consequences of getting it wrong are unpleasant and expensive to fix. A house with six occupants and a house of the same size with two produce very different loads, and a guest house is different again. Since you know the intended use and the tool does not, the flow is your input, and the calculation refuses to proceed without it.`,
      `From the daily flow and the infiltration rate of the ground, which comes from a percolation test. The soakaway has to absorb what the tank discharges, so its area follows the flow divided by the rate at which the ground accepts it, and a clay soil needs many times the area of a sandy one for the same house. The materials then follow the area: pipe, granular fill and geotextile for the trench or the pit you describe.`,
      `No. It sizes a system and counts its materials. Permits, discharge consent, setback distances, groundwater protection and the treatment standard are administered locally, and the numbers here are inputs to that process rather than a substitute for it. Where a site is sensitive, the design may need to be different from the standard solution the calculator assumes.`,
      `Yes. Enter volumes in litres or gallons and dimensions in metres or feet, and the calculation stays in the unit you chose rather than converting mid way. That matters for a tank specified in gallons by a supplier and a soakaway area measured in square metres on site, which is a common combination and a common source of mistakes when the conversion happens twice.`,
    ],
  },
  "insulation-calculator": {
    description: `Insulation is bought in packs covering a stated area at a stated thickness, which makes the order simple and the layers the tricky part. A wall with two layers has twice the material of a wall with one, and the second layer is often a different product at a different thickness and a different coverage.

The takeoff measures insulation area by element, converts it into packs at the coverage the product states, and counts the vapour barrier and the fixings the specification calls for. It does not calculate thermal performance: U values belong to a thermal calculation with the full build up, including the studs, the cavity and the surface resistances, and a quantity tool that reported one would be reporting a number it cannot support. What it does report is exactly what the specification asks for in material, so the thermal calculation can be priced without re measuring the building.`,
    functions: [
      "Calculates insulation area by element: roof, wall, floor, and any other surface you describe.",
      "Converts the area into packs at the coverage each product states, at the thickness you select.",
      "Handles multiple layers, counting each layer's material separately.",
      "Counts vapour barriers and membranes from the area, at their own coverage and lap.",
      "Counts fixings and tapes from the area and the spacing you set.",
      "Reports an element without dimensions as incomplete.",
    ],
    worked:
      "A loft of ninety square metres at two hundred millimetres, in rolls covering eight square metres at that thickness, is twelve rolls, and a cross layer of a hundred millimetres on top adds another six. A wall of a hundred and forty square metres in a hundred millimetre boards covering two point eight eight square metres each is forty nine boards. Vapour barrier at the wall and ceiling areas, with laps, comes to about two hundred and sixty square metres of membrane. The second layer doubled the loft material and changed nothing on the wall, which is why layers are counted one at a time.",
    advantages: [
      "Layers are counted separately, which is the part a single area figure hides.",
      "Packs follow the product's stated coverage at the thickness chosen.",
      "Vapour barriers and fixings are counted, not left to site.",
      "Elements are measured by their own dimensions rather than a rate per floor area.",
      "The tool declines to report thermal performance it cannot calculate.",
    ],
    limits: [
      "It does not calculate U values, condensation risk or thermal bridging.",
      "It does not assess the building's compliance with an energy standard.",
      "It does not include airtightness tapes beyond the quantity you specify, nor the sealing of service penetrations that decides the result.",
      "It does not include the structure the insulation sits within.",
      "It does not include labour, access, removal of existing material or disposal of what comes out.",
      "It does not check that the specified thickness fits the depth available in the structure you are insulating.",
    ],
    answers: [
      `Insulation area by element, converted into packs at the product's coverage, plus vapour barriers, membranes and fixings. It handles more than one layer, because a specification often calls for two: one between the studs and one across them. What it does not do is judge the specification, since the thickness and the product follow from a thermal calculation rather than from a quantity takeoff.`,
      `No. Thermal performance comes from the whole build up: the insulation, the structure, the cavity, the surface resistances and the thermal bridges, and it is calculated with those in front of you. The takeoff measures material. Reporting a U value from an insulation area alone would produce a figure that looks authoritative and ignores the timber studs every six hundred millimetres, which is where most of the heat actually goes.`,
      `Each layer is counted as its own material with its own coverage, so a hundred millimetre layer between the studs and a second layer across them are two orders rather than one doubled figure. That matters because the second layer is frequently a different product at a different thickness, and because the fixings and the tapes change when a layer is added.`,
      `Yes. Rolls and packs cover a stated area at a stated thickness, so the takeoff divides and rounds up to whole packs, which is what a merchant sells. Where the coverage differs by thickness, as it does with mineral wool, the coverage for the thickness you selected is used rather than a figure for a different product.`,
      `Vapour barriers, membranes, tapes and fixings are counted where the specification calls for them, each at its own coverage. A vapour barrier is measured over the area it covers with the laps you allow, and fixings follow the spacing you enter. They are small items that decide whether the insulation performs as designed, which is why they are lines rather than an allowance.`,
    ],
  },
};
