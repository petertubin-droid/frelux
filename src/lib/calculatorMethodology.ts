/**
 * Method notes for the calculators that had no "how this estimate is
 * calculated" panel.
 *
 * Each entry explains, in the order the engine works, what is measured, what
 * is deducted, how quantities are converted into what you actually buy, and
 * which allowances are applied. Copy is written for the visitor, not for us:
 * plain sentences, no dashes, and no numbers that the page does not already
 * show.
 */
export type MethodologyKey =
  | "blueprint-takeoff"
  | "standalone-takeoff"
  | "ai-photo-estimate"
  | "borehole"
  | "build-to-roof"
  | "configurable-finish"
  | "doors-windows"
  | "electrical"
  | "fence-block"
  | "flooring"
  | "foundation"
  | "foundation-estimator"
  | "generator"
  | "site-safety"
  | "labour"
  | "painting"
  | "plumbing"
  | "pop-ceiling"
  | "reinforcement"
  | "roof-framing"
  | "screeding"
  | "solar-pv"
  | "structural"
  | "tall-building"
  | "tile-cost"
  | "wall-finish"
  | "water-tower"
  | "waterproofing"
  | "window-blinds";

const METHODOLOGY: Record<MethodologyKey, string> = {
  "blueprint-takeoff": `You calibrate the drawing once per sheet, by marking a known dimension and telling the page its real length. Every later mark is converted with that scale, so the measurement is only as good as the line you calibrated against.

Areas come from the polygon you trace, taken as the shoelace sum of its points. A rectangle drawn with four marks is checked for being near square before it is treated as one.

Takeoffs stay as measured areas and lengths. No material quantities are inferred from the drawing itself, so a traced floor area is reported as area, and you carry it into the estimator that prices the trade.`,

  "standalone-takeoff": `The page starts from a building description, either entered here or carried in from the design tools, and works the trades in a fixed order: substructure, frame and walls, then roof, finishes and services.

Each trade reads only the dimensions that matter to it. Wall area is perimeter times height less openings, floor and ceiling areas come from the plan, and the roof is derived from the span, pitch and overhang.

Quantities are then turned into buying units with the wastage allowance for that material, and priced from the market price book, so the same description gives the same total on any visit.`,

  "ai-photo-estimate": `The photo is read for the building's measurable features: storeys, roof form, approximate plan proportions and visible openings. That reading is a starting point, not a survey.

Those readings populate the same build-to-roof engine used elsewhere on the site. Nothing is priced from the image directly, so every figure traces back to a dimension you can inspect and change before you accept it.

Fields the model was unsure about are flagged for you to confirm. Changing one reruns the whole estimate, which is why the total moves when a single reading is corrected.`,

  borehole: `Drawdown is the working water level: static level plus the pumping drawdown for your yield band. Pump setting depth is placed below that, with a margin above the screen so the pump does not run dry.

Casing and screen lengths follow from the drilled depth and the aquifer type. A fractured basement well screens only the water strikes, so screen length is a share of depth, not the whole hole.

The rising main is sized from the total head, which is drawdown plus tower or tank height plus friction loss. Storage is sized from occupants and the consumption tier, and treatment stages are added only for the water quality readings you enter.`,

  "build-to-roof": `The building is divided into stages, and each stage is measured from the same set of dimensions so a change to the length or width moves every trade that depends on it.

Foundation and hardcore come from the footprint and the type and depth you choose. Walling comes from the perimeter and internal wall runs at the stated height, less the openings, converted to blocks at the block size you picked.

Concrete and mortar are read from the mix ratios you set, cement on the bag basis and sand and granite by volume. Roof members come from span, pitch and overhang, and everything is priced from the market price book with per material wastage and your contingency on top.`,

  "configurable-finish": `Area is what you measure: the wall or ceiling area for the finish, in the unit your market uses. The page does not guess it from room counts.

Coverage comes from the product and profile you select, which sets the film build and the spreading rate. Coats multiply the required material, and the pack sizes available in your market decide how many packs you actually buy.

Accessories such as primer, mesh or sealer are added only where the selected profile requires them, and the price book for your market supplies every rate.`,

  "doors-windows": `Openings are counted by type and size, then each one is costed as frame, leaf or sash, glazing and ironmongery. A door and a window of the same opening size carry different unit costs.

Areas are taken as the structural opening, not the visible glass, because that is what the wall has to be built around and what the frame is fixed into.

Quantities roll up by size so repeated openings are priced once and multiplied, and wastage applies to the frame and board items rather than to the finished units.`,

  electrical: `Circuits are built from the points you list. Lighting and socket circuits are kept separate so the protective device and cable size for each can be chosen on its own load.

Cable size is selected from the design current, the run length and the permitted voltage drop, using the tabulated current carrying capacity for the installation method. Longer runs therefore move up a size before the breaker does.

Containment, boxes and accessories are counted per point and per run, and the board ways are taken from the number of circuits rather than the number of rooms.`,

  "fence-block": `The fence line is measured in runs. Each run has a length and a height, and the number of posts follows from the post spacing you set, with a post at each end.

Blocks are counted per square metre of face at the block size chosen, and then per course and per run, which is why a change in height moves the block count faster than a change in length.

Mortar, sand and cement follow from the joint thickness and the block size, and rendering or capping are added only where you ask for them.`,

  flooring: `Floor area is the room's length times its width, with any cut outs deducted. For boards and strips the direction matters, so the page works in whole rows and adds the cut waste at the end of each row.

Tile and slab counts come from the tile size and the joint width, rounded up per room so a room never buys a part tile it cannot use.

Underlay, adhesive and trims are taken from the area and the perimeter respectively, and the wastage allowance for the material you chose is applied on top of the measured quantity.`,

  foundation: `Bearing pressure is the check that sizes the footing. The load carried by each footing, from the wall or column above, is divided by the allowable bearing pressure of the soil you select, which gives the area of footing required.

The footing is then proportioned to that area at the depth and thickness you enter. Depth is checked against the minimum for the soil type, and the concrete and reinforcement follow from the resulting volume.

Soil types carry typical allowable pressures, and the custom option lets you enter a tested value instead. The page reports the governing check so you can see which one set the size.`,

  "foundation-estimator": `Footings are counted from the building plan: strip footings along the load bearing walls and pad footings under the columns, each with its own length or count.

Concrete volume per footing is the plan area times the thickness, with the blinding and hardcore layers measured separately because they use different mixes.

Reinforcement is taken as a mesh or bar schedule per footing type, including laps and cover, then converted to bar lengths and weights for purchase.`,

  generator: `The load list is the whole basis of the sizing. Every appliance you enter contributes its running load, and motor driven loads are started at their starting multiple rather than their running current.

The generator is sized on the largest starting load plus the running load of everything else, with a diversity factor applied to the total so the set is not bought for a load it will never see at once.

Cable and changeover sizing follow from the design current, and fuel use is estimated from the load factor over the run hours you state.`,

  "site-safety": `Quantities come from the site, not from a template. Perimeter sets the hoarding, edge protection and the number of warning signs at the spacing you choose.

Crew size drives personal protective equipment, including the reserve you keep for visitors and replacements, and the first aid kit count follows the workers per kit rule you set.

Hazards you switch on add their own measures: work at height adds harnesses and barriers for the number of workers at height, excavation adds barriers, signage and a means of access, and hot work adds fire fighting provision and permits.`,

  labour: `Labour is measured in the same units as the work: square metres for finishes, cubic metres for concrete, and numbers for fittings. Output rates are the productivity figure for a trade, expressed as the quantity one worker completes in a day.

Duration is the measured quantity divided by the output rate and the crew size, so adding workers shortens the programme but not the cost.

Cost is duration multiplied by the crew's daily rate for the trade, plus the allowances you set for supervision and for non productive time.`,

  painting: `The estimate starts from rooms, not from an area you have to work out. For each room the page takes the wall length as the perimeter of the room's dimensions, times the height you give, and deducts the door and window openings.

Ceilings are added at the room's plan area when you ask for them. The result is the paintable surface for that room, and the rooms are added together.

Coverage comes from the paint and quality you select, and two coats are the standard application. The figure is divided into 20 litre buckets to give both the theoretical requirement and the buckets you actually buy, with primer and sealer added where the surface condition calls for them.`,

  plumbing: `Fixture units are the basis. Each appliance carries a loading in fixture units, and the total on a branch decides the pipe size for that branch rather than the number of fittings.

Runs are measured along their route, including risers, and the pipe size is checked against the flow and the run length so pressure at the furthest outlet still meets the minimum.

Fittings, valves and supports are counted per run and per change of direction, and tanks or cylinders are sized from the demand and the storage period you set.`,

  "pop-ceiling": `Ceiling area is the room plan area, and the perimeter is what the wall angle and cornice run on. Both come from the room dimensions you enter.

Suspension is counted on a grid: main runners at their spacing, cross tees at theirs, and hangers per square metre. The grid is laid out to the room so the counts are whole members, not an average rate.

Boards are counted from the board size with the wastage for cuts, and jointing compound and tape follow from the board joints and the number of coats you select.`,

  reinforcement: `Bar weights come from the nominal mass per metre of the bar diameter, so the total is a length multiplied by a published weight rather than an estimate per element.

Lengths include the hooks, bends and laps for the bar size and the concrete grade, and laps are added where a bar has to be joined rather than assumed across the whole schedule.

The schedule is grouped by diameter so the page reports the tonnage you order per size, which is how reinforcement is actually bought.`,

  "roof-framing": `The roof is set by the span, the pitch and the overhang. Rafter length is the half span plus the overhang, divided by the cosine of the pitch, so pitch changes the member length before it changes the count.

Rafter spacing sets the number of members across the roof, and purlin spacing sets the number of lines up the slope, which is why members are counted in both directions.

The ridge, hips and valleys are measured as lengths along their own run, and bracing and binders are added from the span and the roof form you select.`,

  screeding: `Screed volume is the area times the thickness you set, and the area comes from the room dimensions with any openings deducted.

The dry mix is converted from the wet volume using the mix ratio and the bulking of sand, so the cement bag count reflects the mix rather than a rule of thumb per square metre.

Additives, mesh and the surface finish are added only where you select them, and the wastage allowance covers the edges and the levels that are lost on site.`,

  "solar-pv": `Load comes first. Daily energy is each appliance's watts times its hours, added across the list, and the array is sized to replace that energy after the system losses you select.

Battery capacity is sized on the autonomy you ask for, that is the number of days or the share of night load the bank has to carry, divided by the usable depth of discharge.

The inverter is sized on the simultaneous load and the array's output, and cable and protection follow from the string current and the run length.`,

  structural: `Section sizes are checked, not assumed. For a beam the page works out the bending moment and shear from the span and the loads you enter, then checks the chosen section's capacity against them.

Deflection is checked separately because a beam can be strong enough and still sag too far for the finishes above it.

For a slab or a column the same order holds: load, then the governing effect, then the capacity of the section, and the page reports the ratio so you can see how close the check is.`,

  "tall-building": `The building's height and use set the wind and gravity loads, and those loads are carried down storey by storey to the foundation.

Column and core sizes grow with the accumulated load, and the page checks the resulting stress against the concrete or steel grade you selected rather than against a single storey.

Storey drift is estimated from the lateral load and the stiffness of the frame you configure, and the foundation is sized from the total load and the bearing pressure at the base.`,

  "tile-cost": `Tile count is the area divided by the tile size including the joint, rounded up to whole tiles, with the cutting waste for the laying pattern you choose. A diagonal layout wastes more than a straight one.

Adhesive is taken from the area and the notch size of the trowel, grout from the joint width and the tile dimensions, and both are converted into the bags the product is sold in.

Spacers, trims and movement joints follow from the tile size and the perimeter, and the price book for your market supplies the rate for each item.`,

  "wall-finish": `Net wall area is each wall's length times its height, less the doors and windows you enter. The figure is per face, so a wall finished both sides is counted twice.

Coats and the material's coverage set the quantity. Texture and thickness change the spreading rate, which is why the coarse finishes buy more material per square metre than a fine skim.

Beads, mesh and primer are added from the openings, the corners and the surface condition you describe, and the wastage allowance covers the mixing losses.`,

  "water-tower": `Tank capacity is sized from the occupants or the daily demand you enter, plus the reserve you want in hand.

The tower height comes from the pressure needed at the highest outlet, converted to head, and the stand legs and bracing are sized from that height and the tank's loaded weight.

The base is checked against the total load, which is the water mass plus the tank and the structure, divided by the bearing pressure of the ground you select.`,

  waterproofing: `Area is measured per surface, with the upstands and overlaps added as lengths rather than assumed as a percentage.

The number of coats and the membrane's coverage set the material quantity, and the reinforcement fabric is counted on the area and the details, which are the corners, joints and outlets.

Protection screed, primer and drainage details are added only where the system you select calls for them, and the price book supplies the rate per item.`,

  "window-blinds": `Blinds are priced per window, and each window is measured for the recess or the face fix you choose. The width and drop decide the fabric area and the hardware.

Fabric is bought by the roll or the metre, so the page works in drops per window and allows for the pattern repeat where the fabric has one.

Controls, brackets and the headrail follow from the blind type and the size of the window, and the total keeps the fixing method visible because it changes both the fabric and the hardware.`,
};

/**
 * Text for one calculator. Unknown keys return an empty string, and the
 * section then renders nothing rather than an empty panel.
 */
export function methodologyText(key: MethodologyKey): string {
  return METHODOLOGY[key] ?? "";
}
