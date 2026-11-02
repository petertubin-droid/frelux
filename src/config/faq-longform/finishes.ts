import type { LongFormArticle } from "@/config/faq-longform";

export const FINISHES_LONGFORM: Record<string, LongFormArticle> = {
  "paint-calculator": {
    description: `A paint estimate answers one question with a number: how many tins do I buy? Everything else on the page exists to make that answer trustworthy. Wall and ceiling areas are measured separately because they take different products, openings are deducted because nobody paints a window, and the number of coats is yours to set because a refresh and a colour change are not the same job.

The arithmetic is deliberately plain. Area to be painted, divided by the coverage the product states, multiplied by the number of coats, rounded up to the tin sizes your market sells. What makes the result usable is not the division but the discipline around it: coverage comes from the product record instead of an assumed spread rate, primer is priced as its own product with its own consumption, and waste is a stated percentage rather than a silent margin added to the litres.`,
    functions: [
      "Adds up the wall areas you enter, room by room, and keeps ceilings on their own line because they usually take a different product.",
      "Deducts every door, window and opening you list, by width and height, so the measured area matches what a brush actually covers.",
      "Divides the area by the coverage stated for the product you select, then multiplies by the coats you choose, showing the litres for each coat separately.",
      "Adds primer and undercoat as their own products with their own coverage, so a bare plaster job and a repaint are priced differently.",
      "Rounds the litres up to the tin sizes sold in the market you select, because paint is bought by the container and a part tin is a purchase.",
      "Carries the waste percentage you set as a visible line, so the allowance for cutting in, roller loss and touch ups is stated rather than hidden.",
    ],
    worked:
      "Take a room four metres by three, with a ceiling height of two and a half metres, one door two metres wide by one high and one window one and a half metres wide by one high. The wall perimeter is fourteen metres, so the gross wall area is thirty five square metres. The door takes two square metres and the window one and a half, leaving thirty one and a half square metres of wall. The ceiling adds twelve square metres, and it is priced as its own surface. Painting the walls only, in two coats, with a product specifying twelve square metres per litre, needs two and seven tenths litres per coat, so five and four tenths litres in total, which rounds to two five litre tins. Change the product to one specifying ten square metres per litre and the same room needs six and a third litres, which is still two tins of five, but three if your market sells four litre tins. That is the whole point of the tool: the same room, a different product, a different order.",
    advantages: [
      "The litres per coat are visible, so a one coat refresh is not quoted at the price of a full repaint.",
      "Coverage comes from the product data, which means a cheaper tin with thin coverage cannot look like a saving.",
      "Openings are deducted rather than estimated around, which is where a hand calculation usually over orders.",
      "Tin sizes follow the market, so the answer is an order a merchant can fill.",
      "Primer stays on its own line, which prevents the common habit of pricing a bare wall as a painted one.",
    ],
    limits: [
      "It measures materials, not labour, masking, sanding or filling.",
      "It does not judge whether the substrate needs sealing, stabilising or a specialist primer.",
      "It does not assess colour coverage, which is a product property rather than a quantity.",
      "Exterior surfaces, metal and masonry take different products and different coverage, which you supply per job.",
      "It does not include scaffolding, access equipment or protection.",
    ],
    answers: [
      `Two coats is the normal interior finish, and three when the colour changes sharply or the wall is patching bare plaster. The calculator applies the coats you choose and shows the litres for each one separately, so a single coat refresh is priced as a refresh. On a wall that has been skimmed, a mist coat first is usual practice, and it is priced as its own line because it consumes material without being part of the finish.`,
      `Measure the walls you are painting, deduct the openings you are not painting, then divide by the coverage the product states. The calculator does the measuring arithmetic and the division, then rounds up to the tin sizes sold where you are working. Two things decide the answer more than the area does: the product's coverage, which differs widely between a premium emulsion and a contractor grade one, and whether you are changing colour, which costs an extra coat.`,
      `Yes, and on their own lines, with their own coverage and their own quantities. A primer or undercoat is a different product from a topcoat, consumed at a different rate, and pricing it as extra topcoat litres produces an order that is short on one and long on the other. If you are painting over a sound, previously painted wall, leave them out of the estimate and the total drops accordingly.`,
      `Labour, masking, sanding, filling, caulking and any surface repair are outside this estimate, as are scaffolding and protection of floors and furniture. The estimate covers paint and primer quantities and their cost from the product records, which is the part you need before you go to the paint shop. It also leaves out any specialist product a substrate demands, because that is a specification decision rather than a quantity calculation.`,
      `Switch the unit and the area, coverage and tin sizes all convert together, so a building measured in feet and a specification written in litres still produce one order. The conversion happens on the factors rather than on the final figure, so a square metre never becomes a scaled length. Enter coverage in the unit you are working in and the division stays in one system, which is what prevents the doubling errors that come from converting twice.`,
    ],
  },
  "tile-calculator": {
    description: `A tiling estimate has three quantities that fail independently: tiles, adhesive and grout. Tiles fail when the waste allowance is too thin for the pattern, adhesive fails when the bed thickness is assumed rather than chosen, and grout fails when the joint width and tile size are not both known. The calculator holds all three together so a job is not ordered in three separate trips to the merchant.

The mechanics are simple and unforgiving. Floor or wall area divided by the area of one tile gives the count, the layout pattern decides how much of that count is lost to cuts, and the tile size with the joint width decides how many square metres a bag of adhesive and a kilogramme of grout will serve. Because those relationships change with the pattern and the format, both stay as inputs you set, and the tool shows the square metres each bag covers rather than assuming one.`,
    functions: [
      "Calculates tile count from the surface area and the tile dimensions you enter, in millimetres or inches.",
      "Applies the waste percentage you set, which covers edge cuts, breakages in transit and a spare box for later repair.",
      "Reports boxes to buy from the coverage per box sold in your market, because tiles are ordered by the box.",
      "Calculates adhesive from the bed thickness and the coverage stated for the product, with the notched trowel size reflected in the coverage you supply.",
      "Calculates grout from the joint width, tile size and joint depth, which is the relationship that makes small tiles consume far more grout than large ones.",
      "Keeps floor and wall areas separate, since the two take different adhesives and often different tiles.",
    ],
    worked:
      "A bathroom floor is two and a half metres by two metres, so five square metres. With tiles of three hundred by three hundred millimetres, each tile covers nine hundredths of a square metre, which gives fifty six tiles before waste. Ten percent waste takes that to sixty two, and if the boxes hold eleven tiles you buy six boxes. The walls add eighteen square metres, and at three hundred by six hundred millimetres each tile covers eighteen hundredths of a square metre, so a hundred tiles, a hundred and ten with waste. Adhesive at four kilogrammes per square metre for a ten millimetre bed needs twenty kilogrammes for the floor and seventy two for the walls, so a twenty kilogramme bag and four more, not the single bag that a room count would suggest. Grout for a three millimetre joint on the floor needs roughly half a kilogramme per square metre, so two and a half kilogrammes, and the smaller wall tiles need more per square metre because the joints are denser.",
    advantages: [
      "Tiles, adhesive and grout come out of one calculation, which matches how they are bought.",
      "Waste is a stated percentage, so a diagonal layout can be given the allowance it needs.",
      "Box coverage follows the market, so the order is a number you can place.",
      "Grout follows the joint width and tile size, which is where hand estimates fall furthest short on small formats.",
      "Floor and wall surfaces stay apart, which prevents a wall adhesive being counted at floor rates.",
    ],
    limits: [
      "It does not assess the substrate, which decides whether a backer board or a levelling compound is needed.",
      "It does not include trims, spacers, waterproofing or movement joints.",
      "It does not account for pattern specific cutting beyond the waste allowance you set.",
      "It does not price labour, removal of existing coverings or waste disposal.",
      "It does not guarantee a shade match between boxes, which is a supplier question.",
    ],
    answers: [
      `Measure the floor or wall, then divide by the area of one tile, allowing for the joint if you want a close figure. The calculator does the division from the tile dimensions in millimetres or inches, so the count is in whole tiles and then converted to boxes. For a wall, measure each elevation separately and deduct the openings, because a room perimeter multiplied by height includes the door and window areas you are not tiling.`,
      `Because a tiled surface is not a rectangle. Edges need cuts, and cuts produce offcuts that cannot be used elsewhere. Tiles break in transit and on site, and a spare box left in the garage is what saves a matching problem when one cracks two years later. A straight lay in a large format needs around ten percent, a diagonal or herringbone layout needs fifteen or more, and the allowance is a percentage you set so it is visible in the total.`,
      `Adhesive follows the bed thickness and the coverage the product states, and grout follows the joint width, tile size and depth. The calculator asks for the coverage you are working to and multiplies it across the area, then converts to the bag size sold in your market. Grout is the one people underestimate: a small format tile with wide joints can consume several times the grout of a large format in the same area, so the calculator uses the geometry instead of a rate per square metre.`,
      `No. Buy the boxes the calculator shows, and keep the spare box. Tile production runs change shade, and a repair two years later needs a match that a new batch may not give. The boxes figure already includes the waste you set, so buying the raw area and hoping the cuts work out is how a job ends up one box short on a Friday afternoon.`,
      `Cuts at edges, breakages in transit and a spare for future repair are all waste, and waste is a percentage you control. Ten percent suits a straight lay, fifteen or more for a diagonal or herringbone, and more again for a room with many corners. It appears as its own line, so when a client asks why the order is larger than the floor area, the answer is a number on the page.`,
    ],
  },
  "pop-ceiling-calculator": {
    description: `A POP ceiling is priced by three things that are easy to confuse: the board area that covers the room, the framing that holds it, and the compound that joints and finishes it. A room count gets none of them right, and an area alone misses the framing entirely, which is where a ceiling budget usually goes wrong. The calculator takes each room's length and width, builds the area and the perimeter from them, and carries both into the quantities.

Ceilings are not floors. The area decides board and compound, the perimeter decides screed, channel and trim, and the height of the room decides nothing at all except the scaffold you will need. Because a long narrow room and a square room can share an area and differ by several metres of perimeter, the tool keeps the two measurements apart and prices each against its own rule.`,
    functions: [
      "Builds ceiling area from each room's length and width, room by room, so an irregular plan is measured as the rooms it contains.",
      "Calculates the perimeter of each room, which drives screed, channel and edge trim, and is what an area figure cannot give you.",
      "Converts area into boards at the board size and coverage you specify, rounded up to whole boards.",
      "Calculates jointing compound and tape from the board area and the joint density implied by the board size.",
      "Keeps framing members separate from the suspended grid, since a direct fixed ceiling and a suspended one use different quantities.",
      "Applies your waste percentage as a stated line rather than a hidden loading on the board price.",
    ],
    worked:
      "A living room six metres by four and a half gives twenty seven square metres and a perimeter of twenty one metres. A second room three metres by nine gives the same twenty seven square metres but a perimeter of twenty four metres. Board quantities are identical, and the framing differs by three metres of screed and trim, which is the difference the room count would have hidden. At a board size of one and a half by one and a bit metres covering close to two square metres per board, the first room needs fourteen boards before waste. Compound follows the joints those boards create, and trim follows the twenty one metres, not the area.",
    advantages: [
      "Perimeter is calculated, so framing and trim are not priced off an area figure that cannot produce them.",
      "Each room is measured on its own dimensions, which handles an irregular plan without a separate drawing exercise.",
      "Boards are rounded to whole units, so the order matches what a supplier delivers.",
      "Compound and tape follow the board size, because a smaller board means more joints and more compound.",
      "Waste is visible, so a design with many curves or recesses can be given the allowance it needs.",
    ],
    limits: [
      "It does not design the ceiling, so a curved or stepped design needs the quantities measured from your layout.",
      "It does not cover lighting coves, cornices or decorative features beyond the trim you allow.",
      "It does not include scaffold, access equipment or fixing to the structure above.",
      "It does not assess the substrate, joist spacing or the fixings required for the board weight.",
      "It does not include painting of the finished ceiling, which is measured separately.",
    ],
    answers: [
      `Multiply each room's length by its width for the area, then add the perimeter for the framing, and it is the second figure that a quick estimate usually forgets. The calculator takes the dimensions room by room, converts the total area into boards at the size you specify, and converts the total perimeter into screed, channel and trim. Compound then follows the joints the chosen board size creates, so a smaller board raises both the board count and the compound.`,
      `It uses the dimensions of the design you are building, so a simple flat ceiling is priced accurately and a design with steps, coves or curves needs those features measured as extra runs. Measurement is yours to take, and the arithmetic on top of it is the calculator's. That division matters on a decorated ceiling, because the design detail is geometry rather than something a rate per square metre can carry.`,
      `They are not included. The estimate covers board, framing, compound, tape and trim, which is what you need to order before the work starts. Labour follows the design and the access, and scaffold depends on the ceiling height and what is underneath. Both are priced separately, and putting them into a material estimate produces a number that is accurate for neither.`,
      `Not reliably. Two rooms of the same count can differ by several square metres and by more in perimeter, which is what drives the framing. Entering each room's length and width takes a minute and gives an area and a perimeter the estimate can actually use. A room count is a budgeting shorthand, and the calculator is designed to replace it with the measurement the order depends on.`,
      `Screed, channel and trim follow the perimeter of each room, so a long narrow room needs more of all three than a square room of the same area. The calculator takes the perimeter from the dimensions you enter and prices the framing against it. This is why an estimate built from area alone under orders on circulation spaces, corridors and long living rooms, and why the perimeter appears as its own line.`,
    ],
  },
};
