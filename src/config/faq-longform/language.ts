import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Long form copy for the four language and colour surfaces: the smart
 * calculator, the conversational estimator, the colour assistant and the
 * colour preview.
 *
 * The first two are deterministic parsers dressed in conversational clothes,
 * which is exactly why the copy says so. The last two are the only surfaces in
 * this group that call a model, and their copy spends its words on what a
 * suggestion and a render cannot tell you.
 */
export const LANGUAGE_LONGFORM: Record<string, LongFormArticle> = {
  "smart-calculator": {
    description:
      "People hold a building project as a sentence, not as a form. Three bedroom bungalow, 12 by 15 metres, tiling and painting, is how the job lives in somebody's head, and every field of every form is a chance to lose it. The smart calculator exists to carry that sentence into a calculator without changing what it said.\n\nThe reading is deterministic on purpose. The work type is matched from the words used, the dimensions are read as rectangles or as a stated area, feet are converted to metres and both figures are shown, and room, door and window counts are taken where they are stated. Anything absent is reported as missing instead of assumed, and each item the tool understood is shown with the words that produced it. The engine for that trade then produces the quantities. A model is asked only afterwards to explain the cost in the visitor's own terms.",
    functions: [
      "Matches the work type from the words used and names the calculator the project belongs in.",
      "Reads rectangles and stated floor areas, converts feet to metres, and shows both figures.",
      "Takes room, door and window counts when the description states them.",
      "Shows each understood item with the words that produced it, before anything is priced.",
      "Reports a measurement with no unit as having no unit instead of assuming metres.",
      "Hands the confirmed figures to the engine that owns the trade, and asks a model only to explain the returned cost.",
    ],
    worked:
      "A visitor writes: a three bedroom bungalow, 40 by 50 feet, tiling and painting, 8 rooms, 6 doors. The reading takes the work type as tiling and painting, which names the calculators those belong to, and reads the rectangle as 40 by 50 feet, converting it to 12.19 by 15.24 metres, which is 185.8 square metres. It notes 8 rooms and 6 doors, and it does not invent a wall height, a ceiling type or a window count, because none was stated. Those absences are the missing list. The floor area then enters the tiling and paint engines, which apply their own coverage rules and the market price book, and the model is asked afterwards to explain the total in the terms the visitor used. Had the sentence been 40 by 50 with no unit, the reading would have said so, since assuming metres would have quietly changed the project by a factor of three.",
    advantages: [
      "The reading is deterministic and inspectable, so the same sentence always produces the same estimate.",
      "Missing values are named instead of defaulted, which keeps the estimate tied to what was described.",
      "The cost comes from the same engines the calculators use, so the explanation cannot contradict the numbers.",
      "Feet are converted and displayed, which stops a plan drawn in feet from entering a metric engine silently.",
    ],
    limits: [
      "A vague description produces a vague estimate, and the tool says which facts it lacked.",
      "It reads text, not drawings. Dimensions on a plan still have to be entered where they belong.",
      "The explanation is prose about the engines' output, not a second opinion on the quantity.",
      "Where the description names several trades at once, the reading routes one of them and the others have to be taken separately.",
    ],
    answers: [
      "No. The reading that decides which calculator to open, and which numbers to put in it, is deterministic and inspectable: the same sentence produces the same reading every time. The engine that owns the trade then does the arithmetic. A model is asked afterwards only to explain the resulting cost, so it cannot alter a quantity on the way through.",
      "It says so. A project without a length and width, or without a floor area, comes back with that listed as missing instead of filled in, and a measurement with no unit is reported as having no unit instead of being assumed to be metres. Only values that appear in your sentence reach the calculator.",
      "The work type is matched from the words you used, the dimensions are read as rectangles or as a stated area and converted to metres, and room, door and window counts are taken when stated. Each of those appears in a line of text you can check before an estimate is generated, which is the difference between a reading you can audit and one you have to trust.",
      "Yes. A rectangle stated in feet is converted to metres and both figures are shown, so a plan written in feet does not enter a calculator that expects metres without anyone noticing. Where the unit is absent the reading says so instead of choosing for you, because a unit guessed wrong changes the area by a factor of three.",
      "Explaining the cost once the engines have produced it, in the words of the project you described. The explanation sits on top of the numbers and cannot replace them. Keeping the reading deterministic and the explanation separate is what lets a person check the figures and still get a plain account of what the money is for.",
    ],
  },
  "conversational-estimator": {
    description:
      "A project is a story before it is a takeoff. The rooms, what is happening in each of them, the size of the place, the state of the walls: people say all of that in a few sentences, and a form makes them say it again in the order the form prefers. The conversational estimator reads the story in the order given.\n\nEach fact it takes is shown with the words that produced it, so the reading can be audited. When something essential is missing it asks instead of estimating around the gap. When there is enough to work with, it decides which trade the project belongs to and routes to that calculator with the figures already entered. For a paint job that means the same quantity chain the paint calculator uses: the measured area, the litres, the container sizes and the coat count, with the market price book applied where one is configured and engine defaults disclosed where it is not.",
    functions: [
      "Parses the thread deterministically, so the same messages always produce the same estimate.",
      "Shows every understood fact with the evidence that produced it.",
      "Asks for missing critical details instead of estimating around them.",
      "Detects the language of the thread and replies in it.",
      "Routes to the matching calculator, and for paint runs the same quantity chain as the paint calculator.",
      "Uses the market price book where one is configured and states when engine defaults were used instead.",
    ],
    worked:
      "A visitor writes that they want to repaint a sitting room of 5 by 4 metres, two coats, and that the walls are painted and in good condition. The reading takes the trade as paint, the room as a 5 by 4 metre rectangle, and the coat count as two, and it shows each of those against the phrase that produced it. Paintable area is 20 square metres of floor with the wall area derived by the paint engine's own rule, and the litres follow from the coverage and the two coats. The container split is then chosen from the sizes available in the market: a 20 litre bucket is not offered in a market that does not sell one, and the smallest combination that covers the requirement is picked, so the answer is a real order instead of a rounded figure. Nothing in the answer came from a language model, which is why the same conversation entered twice gives the same litres.",
    advantages: [
      "Every quantity can be traced back to the words that produced it.",
      "A missing length becomes a question, which keeps the total tied to what is known.",
      "The visitor finishes inside a calculator they can adjust instead of at a dead-end answer.",
      "The paint chain is the calculator's own, so a conversational estimate and a calculator estimate agree.",
    ],
    limits: [
      "It parses, it does not infer, so a size nobody mentioned will never appear.",
      "A description covering several trades is routed one trade at a time.",
      "Quantities inherit the engine's stated assumptions about specification and wastage.",
      "Where a market pack exists it is used, and where it does not, the default is disclosed instead of presented as local.",
    ],
    answers: [
      "It reads the project out of your messages in order and shows each fact it has taken with the words that produced it. When something essential is still missing it asks for that instead of estimating, so the answer is never assembled from assumptions nobody made. With enough detail it routes to the calculator for the trade with the figures entered.",
      "No. The parsing is deterministic, so the same thread read twice produces the same estimate. That matters because quantities have to be defensible: an estimate that changes when the same conversation is reread cannot be checked by the person paying for the material.",
      "It works out which trade the project belongs to and routes to that calculator with the figures entered. For a paint job it runs the same quantity chain as the paint calculator, including litres, container sizes, paintable area and the coat count, so the conversational answer and the calculator answer agree.",
      "Yes. The language of the thread is detected and the replies follow it, and the numbers are extracted from the same message either way. A description given in one language with an answer expected in another is a support question instead of an estimator feature.",
      "It uses the price book configured for your market where one exists and says when it has fallen back to engine defaults. Container sizes and rates taken from defaults are a disclosure, not a quote, and the page states which of the two it used.",
    ],
  },
  "color-assistant": {
    description:
      "Colour is the cheapest thing to change in a room and the hardest to choose well, because the choosing happens in a shop under a different light from the one the walls live in. Two directions help: something narrower than a fan deck, and something that answers to the room instead of to a photograph in a brochure.\n\nThe colour assistant takes a description of the room, its light, its furniture and the mood wanted, and returns suggested colours and combinations with names and codes. The codes matter, because a suggestion is only useful if it can be looked up as a real shade. The page is explicit that the output is inspiration instead of a specification, and it carries no quantities, no coverage and no price, since those belong to the paint calculator that measures the surface.",
    functions: [
      "Returns suggested colours and combinations from a described room, its lighting, furniture and mood.",
      "Gives each suggestion a name and code, so the shade can be looked up in the colour library.",
      "Meters recommendations against a daily free allowance and states when it is exhausted and when it resets.",
      "States that the output is inspiration for a scheme instead of a specification.",
      "Leaves quantities, coverage and pricing to the paint calculator.",
    ],
    worked:
      "A visitor describes a north facing sitting room with a pale wood floor, one large window and dark green furniture, and asks for something calm. The suggestions come back as a set of colours with names and codes: a light warm neutral for the walls, a half tone for a chimney breast, and a deeper shade that picks up the furniture without matching it. The codes are the useful part, because each can be looked up as a real shade and compared against the others. What the answer does not carry is a quantity. A 5 by 4 metre room with 2.6 metre walls and a subtractable opening is about 42 square metres of paint, and the litres for two coats follow from the coverage of the product chosen, so the number is produced by the paint calculator and not by the suggestion. Buying from the suggestion alone is how a room ends up short of the shade it was matched to.",
    advantages: [
      "The description carries what decides a scheme: light direction, floor tone and the furniture already there.",
      "Codes make each suggestion checkable against a real shade instead of a screen approximation.",
      "The allowance is stated plainly, so the limit is a rule instead of a surprise.",
      "Keeping quantity out of the answer stops a colour suggestion from being read as an order.",
    ],
    limits: [
      "A suggestion is not a colour match, and the wall under your own light remains the test.",
      "An incomplete description produces advice built on a guess, since the model only knows what was written.",
      "It carries no quantity, coverage or price, so it cannot be used to order.",
      "A scheme that suits a described room may not suit the same room with different furniture.",
    ],
    answers: [
      "Suggestions in colour names and codes for a room you describe. They are inspiration for a scheme instead of a specification, and the page says so. The codes can be looked up in the colour library to see each shade properly before anything is bought, which is the difference between a suggestion and a colour match.",
      "Yes. Recommendations are metered against a daily free allowance, and the page says when that allowance is used up and that it resets the next day. The limit exists because each recommendation is generated instead of looked up in a table, and a generated answer costs something to produce.",
      "Yes, and the description is where the useful detail lives. Light direction, floor tone and the furniture already in the room change which colours work. A recommendation made without them is a guess with a confident tone, which is the worst kind of design advice.",
      "No. A scheme that reads well in a description can still fail on the wall, because the description is not the room and a screen is not daylight. Buy a sample pot, put it on the actual surface, and look at it in the actual light before committing to a whole room.",
      "No. It suggests colours, and quantities come from the paint calculator, which measures the surface and applies the coverage of the product. A colour recommendation carries no quantity, no coverage and no price, so it cannot become an order without the calculator in between.",
    ],
  },
  "color-preview": {
    description:
      "Paint decisions are usually made from a chip the size of a postage stamp, in a shop, under a light nothing like the room it is going into. A preview closes some of that gap by putting the colours onto the room itself: a photograph if there is one, a description if there is not, and a render that responds to the light, mood and style selected.\n\nThe page is kept out of search deliberately. It is a working surface instead of an answer people look for, and a generated preview of somebody's room has no business appearing in results. What the render cannot do is measure. It carries no area, no quantity and no price, and the paint calculator remains the place where a colour becomes an order.",
    functions: [
      "Renders a preview of the room with the chosen colours applied, from a photograph or a room description.",
      "Validates each colour as a hex value and refuses to generate anything without at least one valid colour.",
      "Takes room type, lighting condition, mood and style as inputs to the render.",
      "Returns a description of the preview alongside the image.",
      "Keeps the page out of search indexing, since it is a working surface and not a public answer.",
    ],
    worked:
      "A visitor uploads a photograph of a sitting room and adds two colours, a warm off white for the walls and a deeper tone for the alcoves. The hex values are validated, the room type is set to sitting room, the lighting is described as a north facing window and the mood as calm, and the render comes back with both colours applied plus a description of the result. What the render does not produce is a quantity. The room is 5 by 4 metres with 2.6 metre walls and a 4 square metre opening, which is about 42 square metres of paint, and at a coverage of 12 square metres a litre over two coats that is 7 litres of wall paint plus the deeper tone for the alcoves bought separately. Those figures come from the paint calculator, because a render shows what the surface would look like and not how much of it there is.",
    advantages: [
      "A scheme can be compared against the room itself instead of a chip.",
      "The lighting, mood and style inputs make the render answer to the space instead of to a generic sample.",
      "Hex validation means a malformed colour is refused before an image is generated.",
      "Being out of the index keeps a private room preview out of search results.",
    ],
    limits: [
      "A render is not a measurement, and it carries no quantity, coverage or price.",
      "It cannot measure how daylight falls, so a colour that looks right in the render can read differently on the wall.",
      "A photograph improves the render without making it a colour match, and a sample pot remains the authority.",
      "The result depends on what was described, and an incomplete description produces a generic room.",
      "Where a photograph is used, the render is built from that photograph, and the preview is not a colour match of the paint you will buy.",
    ],
    answers: [
      "A rendered preview of a room with the colours you chose applied, based on a photograph you upload or a description you give. It is a way to see a scheme before buying paint. It is not a measurement of the room, and it carries no quantity, coverage or price.",
      "Because it is a working surface instead of an answer people search for. The page is marked no-index deliberately, so a generated preview of somebody's room never appears in search results. The same reasoning keeps its copy off the indexed surface of the site.",
      "Only as far as the inputs describe it. The lighting condition, room type and mood steer the render, but a preview cannot measure how daylight falls in your room. A colour that looks right in the render can still read differently on the wall, which is what a sample pot is for.",
      "No. A description of the room is enough to generate a preview, and a photograph gives the render a real surface to work with. Either way at least one valid colour has to be chosen before anything is generated, since there is nothing to preview without one.",
      "Not on its own. The preview shows a scheme and the quantities come from the paint calculator using the measured area. Ordering from a preview is ordering from a picture, which is how a room ends up three litres short of the colour that was matched to it.",
    ],
  },
};
