import type { LongFormArticle } from "@/config/faq-longform";

export const COMMERCIAL2_LONGFORM: Record<string, LongFormArticle> = {
  "measurement-converter": {
    description: `Construction is measured in two systems at once, and the failures happen at the boundaries: a supplier quoting in imperial sections for a building drawn in millimetres, a specification in square feet and a quantity in square metres, a plan in feet and inches with a site working in metres. The converter exists to make those boundaries explicit rather than approximate.

It converts length, area, volume, weight and temperature, and it returns the precision the input deserves rather than a string of digits that implies accuracy nobody has. What it will not do is convert a material quantity into another material, because that is a specification question rather than a unit question. Where a conversion is used in an estimate, the tool keeps the unit visible so the result can be read back.`,
    functions: [
      "Converts length, area, volume, weight and temperature between metric and imperial units.",
      "Converts derived units properly, so a square metre becomes square feet rather than a length scaled twice.",
      "Returns the result at a sensible precision, with the rounding stated rather than hidden in a decimal tail.",
      "Converts material quantities such as bags per cubic metre into bags per cubic yard where the density is known.",
      "Keeps the source unit visible, so a converted figure can be checked against what was entered.",
      "Handles feet and inches as a combined input, which is how dimensions are often actually given.",
      "Reports a conversion that depends on a density as unresolved until the density is supplied.",
    ],
    worked:
      "A room of twelve feet six inches by ten feet eight inches is three point eight one metres by three point two five, and twelve point four square metres. Convert only the lengths and multiply in imperial and the area comes to a hundred and thirty three square feet, which converts to twelve point four square metres as well, which is the check that the conversion was done on the right dimension. Converting the area with the length factor instead gives a figure three quarters of the right answer, which is the classic error.",
    advantages: [
      "Derived units convert correctly, which is where most conversion errors happen.",
      "Feet and inches are accepted together, as they are spoken.",
      "Rounding is stated, so a figure does not pretend to more accuracy than the input.",
      "The source unit stays visible, so a result can be read back.",
      "A density dependent conversion is reported rather than assumed.",
    ],
    limits: [
      "It does not convert between materials or specifications.",
      "It does not know the density of a specific product unless you supply it.",
      "It does not adjust quantities for waste or coverage.",
      "It does not validate that the unit you chose is the right one for the measurement.",
      "It does not replace a measured survey.",
    ],
    answers: [
      `Length, area, volume, weight and temperature, between metric and imperial, with feet and inches accepted as a combined input. Volume conversions cover the cases that actually come up on a site, including cubic metres to cubic yards and litres to gallons. What it does not handle is a conversion from one material to another, which is a specification question rather than a unit one.`,
      `Because area and volume do not scale linearly. A metre is three point two eight feet, but a square metre is ten point seven six square feet and a cubic metre is thirty five point three one cubic feet, because each dimension carries the factor. Converting an area with the length factor gives an answer that looks plausible and is wrong by a factor of three, which is the single most common conversion error in estimating.`,
      `Where the relationship is a physical property rather than a unit definition, yes: a bag count per cubic metre can become a bag count per cubic yard once the density is known, and a tonne can become a cubic metre of a named aggregate. Where the density is not supplied, the conversion stays unresolved rather than using a typical value that may be wrong for the material.`,
      `Yes, at a precision that suits the input. A dimension entered to the nearest centimetre does not become accurate to four decimal places by being converted, so the result is rounded to a sensible figure and the rounding is visible. That matters in an estimate, where a converted quantity is multiplied by a price and an over precise figure suggests a certainty the original measurement never had.`,
      `At the boundary between a drawing and a supplier, which is where units change hands. A plan drawn in metres quoted by a merchant in imperial sections, a specification in square feet priced in square metres, a tank specified in gallons fitted into a space measured in metres. Each of those is a place where a small error becomes a returned order or a short delivery.`,
    ],
  },
  "blueprint-takeoff": {
    description: `Reading a plan for quantities is a human skill that software assists rather than replaces. This tool takes the dimensions you read from a drawing, in the order a takeoff follows, and turns them into the measured quantities the calculators need, with each figure traceable to the dimension it came from.

The reading stays with you on purpose. Automatic measurement of a PDF drawing is possible and unreliable: a wall drawn in two lines, a dimension that was superseded by a revision, a scaled drawing that was printed at the wrong size. Where a dimension is entered by a person who looked at the drawing, the number can be questioned and corrected. Where it is inferred by a model, the error is invisible until it reaches a site.`,
    functions: [
      "Takes dimensions you read from a plan and organises them by element, in takeoff order.",
      "Calculates the quantities each element implies, using the same calculators as the standalone tools.",
      "Keeps the source dimension beside every quantity, so a figure can be traced back to the drawing.",
      "Flags a dimension that is missing for an element, so an incomplete takeoff is visible as incomplete.",
      "Organises by floor or by zone where a drawing covers more than one, so quantities do not run together.",
      "Produces a takeoff sheet that can be checked line by line against the drawing.",
      "Reports a revision change as a new takeoff rather than editing the old one, so the previous figure survives.",
    ],
    worked:
      "A ground floor plan with external walls of fourteen metres by nine, internal partitions totalling thirty one metres, six doors and nine windows. Entered as dimensions rather than as a finished quantity, the takeoff produces blockwork for the external walls less the openings, partitions in their own measurement, and the openings as a schedule with sizes. Each element shows the dimension it came from, so a query about the blockwork is answered by pointing at a wall rather than at a total.",
    advantages: [
      "Every quantity carries the dimension it was derived from.",
      "Dimensions are read by a person, so an error is visible and correctable.",
      "The same calculators run underneath, so a plan takeoff and a tool estimate agree.",
      "Missing dimensions are flagged rather than filled with a guess.",
      "A revision produces a new takeoff, leaving the previous one intact.",
    ],
    limits: [
      "It does not measure a drawing automatically or read dimensions from a PDF.",
      "It does not verify that the drawing is the current revision.",
      "It does not check the scale of a printed drawing.",
      "It does not design anything or check the drawing's compliance.",
      "It does not replace a measured survey of an existing building, where the dimensions have to be measured rather than read.",
    ],
    answers: [
      `You read the dimensions from the drawing and enter them by element; the tool organises them, calculates the quantities they imply and keeps the source dimension beside each result. That is a takeoff in the traditional sense, with the arithmetic done by the same engine as the standalone calculators. The judgement about what the drawing shows stays with the person reading it.`,
      `It can read a drawing as a document, and it will not measure it. Automatic measurement requires interpreting line weights, scales and layers, and the failures are silent: a wall taken from the wrong layer, a door counted twice at a revision cloud, a dimension string that was superseded. A figure entered by someone who looked at the drawing can be argued with, which is worth more than speed on the numbers that decide a price.`,
      `Because a wrong quantity that looks precise is worse than a right one entered slowly. A takeoff is a set of judgements about what a drawing shows, and those judgements are exactly what a person is qualified to make and a model is not. The tool takes the result of that judgement and removes the arithmetic errors, which is where most takeoff mistakes actually come from.`,
      `Quantities by element: wall areas and the units they require, concrete volumes, roof areas, openings as a schedule, and the lengths that trim and services are measured in. Each is calculated from the dimensions entered, and each carries that dimension, so an element can be recomputed by hand if a figure is disputed.`,
      `No. The drawing stays where it is. What the tool stores is the dimensions you read and the quantities they produced, which is the takeoff. That matters for a client's confidentiality and for a practice's own record: a takeoff that can be shown without the drawing beside it is often what a subcontractor is given, and a takeoff that carries the drawing is a document that cannot be sent anywhere.`,
    ],
  },

  "material-price-index": {
    description: `Material prices move, and an estimate that uses last quarter's figure without saying so is an estimate that will be wrong in a way nobody can see. The price index shows what the system holds for each material, when it was recorded, and how it has moved, so a rate in a quote can be traced to a figure and a date.

It is a record rather than a market feed. Prices come from the market price book for the market you select, with their dates, and they are only as good as the recording behind them. What the index adds is visibility: a contractor can see whether cement has moved since the last job, and a client can be shown why a reissued quote differs from the one they held.`,
    functions: [
      "Shows the recorded price for each material, with the date it was recorded and the market it applies to.",
      "Shows the movement since the previous recorded figure, in currency and in percentage.",
      "Groups materials by trade, so a movement in one category can be seen without reading every line.",
      "Reports a material with no recorded price as unpriced rather than showing an old figure as current.",
      "Keeps each market separate, so a price in one country is never presented as a price in another.",
      "Links each figure to the estimates that used it, so a rate in a quote can be traced back to its source.",
      "Shows the age of each figure, which is often more useful than the movement.",
      "Shows which estimates were priced on a figure that has since moved, so a live quote can be reviewed before it is accepted.",
      "Keeps the recording history rather than only the latest value, so a trend can be seen without an external source.",
    ],
    worked:
      "Cement recorded at one figure in March and a higher one in June is a movement of a few percent, which on a job using three hundred bags is a real sum. The index shows both dates, the difference, and which estimates used the March figure. A quote issued in April can therefore be explained without anyone having to remember what happened, and a client querying a reissued price gets a dated answer rather than an impression.",
    advantages: [
      "Every price carries a date, so its age is visible.",
      "Movement is shown in currency and percentage, which answers different questions.",
      "Markets are kept separate, which prevents a cross border figure being reused.",
      "A missing price is reported rather than backfilled with an old one.",
      "Estimates can be traced to the prices they used.",
    ],
    limits: [
      "It does not guarantee a price, and it is not a quotation.",
      "It does not fetch live market data by itself.",
      "It does not cover every material, only those recorded.",
      "It does not account for transport, handling or supplier terms.",
      "It does not convert between currencies, and it does not account for a supplier's own delivery charges.",
    ],
    answers: [
      `The recorded price for each material, the date it was recorded, the market it applies to and the movement since the previous figure. It is a record with dates rather than a live feed, which is why the age of a figure is shown as prominently as its value. A price without a date is a number, and a price with one is evidence. Where a material has never been recorded, the page says so, which is more useful than a figure someone will later assume was recent.`,
      `From the market price book for the selected market, with each figure carrying the date it was recorded. Where a material has no recorded price, the index says so rather than showing an old figure as if it were current. That distinction matters more than it sounds: an old price presented as current is the most common way an estimate becomes quietly wrong.`,
      `With care, and with the date in view. A price from six weeks ago may still be accurate and may be worthless, depending on the material and the market. The index is designed to be used alongside an estimate rather than instead of one: you see the figure, you see its age, and you decide whether to use it or replace it with a supplier quote.`,
      `Because materials are the part of an estimate that moves fastest and is least under the contractor's control. A tender priced on cement from last year is a tender that loses money silently, and a client asking why a reissued quote is higher deserves a dated explanation rather than a shrug. An index turns both of those into a record. It also settles the internal argument, which is usually the harder one: two people pricing the same job from memory will disagree, and both will be confident.`,
      `No. It covers the materials in the price book for the markets the system serves, which is a useful core and not a complete catalogue. Anything outside it is priced by you, and the tool is explicit about that rather than filling the gap with a typical figure that would look authoritative.`,
    ],
  },
  "code-reference": {
    description: `A construction code is a legal document that changes by jurisdiction, and a calculator that assumed one would be wrong almost everywhere. This reference exists to point at the right standard rather than to substitute for it, and to make clear which questions are answered locally.

It covers the areas that come up in estimating: material standards, structural design bases, electrical and plumbing requirements, fire, thermal and drainage. Each entry names the standard and the jurisdiction it applies to, with the caveat that the edition in force is a local matter. What the reference will not do is tell you a wall is compliant, because compliance is a judgement about a specific design against a specific edition.`,
    functions: [
      "Lists the standards relevant to each construction discipline, with the jurisdiction each applies to.",
      "Names the body that publishes each standard, so the current edition can be confirmed at source.",
      "Flags where a design decision depends on a local code rather than on a calculation.",
      "Keeps jurisdiction explicit, so a standard is never presented as universal.",
      "Links each reference to the calculators it affects, so a design input can be traced to its basis.",
      "Reports a discipline with no reference held as a gap rather than an absence of requirements.",
      "States that the edition in force is confirmed locally, since standards are revised and adopted on different dates.",
      "Groups references by the design decision they govern, so the standard behind a specific input can be found quickly.",
      "Keeps a note of where a local requirement replaces a regional one, since that is where imported assumptions fail.",
    ],
    worked:
      "A query about the minimum thickness of a structural slab returns the design standards that govern it and the note that the edition in force depends on where the building is. The reference does not return a thickness, because the thickness comes from a design against that standard. What it does is make sure the designer is looking at the right document rather than at a figure from a calculator that assumed a code the project is not built under. That single check prevents a class of error that no amount of arithmetic care can catch.",
    advantages: [
      "Jurisdiction is explicit for every reference.",
      "The publishing body is named, so the current edition can be checked.",
      "Design inputs are traced to the standard they depend on.",
      "A discipline without a reference is reported rather than implied to have none.",
      "The distinction between a reference and a compliance check is stated.",
    ],
    limits: [
      "It is not the standard itself and does not reproduce its text.",
      "It does not certify compliance or interpret a clause.",
      "It does not track which edition is in force in your area.",
      "It does not cover every discipline or every country, and it does not resolve a conflict between two documents.",
      "It does not replace a professional's obligations under local law or the authority having jurisdiction.",
    ],
    answers: [
      `References to the standards relevant to each discipline, with the jurisdiction they apply to and the body that publishes them. It is a map of where the requirements live rather than a copy of them. It also states where a design decision depends on a local code, which is often the most useful thing it does.`,
      `No, and it does not attempt to. Standards are copyrighted, revised on their own cycles and adopted by jurisdictions at different times, so reproducing one would produce a document that is out of date somewhere and unenforceable everywhere. The reference points you at the source, which is where the current requirements actually are.`,
      `Because a requirement that is mandatory in one country is guidance in another and unknown in a third, and a quantity tool that ignored that would be making a legal claim by accident. Naming the jurisdiction for each reference keeps that visible, so a design decision made in one market is not imported into another along with its assumptions. That is a common and expensive mistake on projects where the designer, the contractor and the building are in three different places.`,
      `No. A calculator checks arithmetic and a code checks a design, and the two are different claims. The reference tells you which standard governs a question. Whether a particular design complies is a judgement that requires the standard's text, the design, and someone qualified to read both. The reference's contribution is to get the right text in front of the right person.`,
      `It is as current as the reference list it holds, and each entry names the body that publishes the standard so the edition in force can be confirmed there. Standards change, and a jurisdiction may adopt an edition years after publication, so the confirmation is a local act rather than something a page can do for you.`,
    ],
  },
  "material-advisor": {
    description: `Choosing a material is a set of trade offs: exposure, maintenance, availability, cost and how it behaves over time. This advisor takes the conditions you describe, such as climate, position, use and maintenance appetite, and returns materials that suit them with the reasoning stated rather than a recommendation without a basis.

It is guidance, not engineering. The advice follows from the conditions entered, and those conditions are incomplete by nature: nobody enters the substrate, the detail and the workmanship, and those decide most failures. What the advisor is good at is narrowing a list before specification, and naming the reason each option is on it. That naming is what makes the guidance useful: a shortlist without reasons is a menu, and a menu is what a specifier already has.`,
    functions: [
      "Takes the conditions you describe: climate, exposure, position, use and maintenance expectation.",
      "Returns materials suited to those conditions, with the reason each one fits stated.",
      "Flags materials that are unsuitable for a condition rather than omitting them silently.",
      "Names the standards or properties that make a material appropriate, so the choice can be checked.",
      "Keeps cost and availability as separate considerations from suitability.",
      "Reports an incomplete condition set as a gap, so the advice is not presented as conclusive on thin input.",
      "Does not price anything, since price comes from the market book or from you.",
      "Keeps the shortlist short, because a list of ten materials is a list nobody specifies from.",
      "Records the conditions the advice was given on, so a recommendation can be reviewed when the brief changes.",
    ],
    worked:
      "A coastal wall exposed to salt and driving rain, with a low maintenance expectation, returns materials for the exposure and the maintenance position, flags timber that would need regular recoating, and names the property that makes each suggestion suitable. What it does not do is design the wall, the fixing or the detail, because those decide whether the material performs, and they are a specification exercise rather than a selection one.",
    advantages: [
      "Recommendations state why, which makes them arguable.",
      "Unsuitable materials are flagged rather than quietly dropped.",
      "Conditions are explicit inputs, so the advice can be tested by changing one.",
      "Suitability is kept separate from price and availability.",
      "Thin input is reported rather than used as a basis for confident advice.",
    ],
    limits: [
      "It is not engineering advice and does not design a detail.",
      "It does not account for substrate, workmanship, fixing or the detail that decides whether a material performs.",
      "It does not verify local availability or lead times.",
      "It does not price materials, and it does not tell you what a merchant holds or how long a delivery takes.",
      "It does not warrant performance or durability, and it cannot see how the material will be installed.",
    ],
    answers: [
      `It takes the conditions you describe and returns materials that suit them, with the reasoning stated for each and the unsuitable ones flagged. It is a narrowing tool: it reduces a specification choice to a shortlist with reasons, which is where a specifier's time is best spent. A shortlist of three with reasons can be argued with, priced and specified; a catalogue of forty cannot. It does not produce a design, a fixing detail or a price.`,
      `On the conditions you enter: climate, exposure, position in the building, use of the space and the maintenance the owner is prepared to accept. Each of those changes the answer, and changing one on the page changes the shortlist, which is the quickest way to see whether a recommendation actually rests on the condition you think it does.`,
      `No. It names materials and their suitability. Pricing comes from the market price book or from figures you enter, and a material that suits a condition may be unavailable or uneconomic locally. Keeping suitability and cost apart is deliberate, because a shortlist that has already been filtered by price hides the options that would have been right. Price it afterwards, when the list is short enough to price properly.`,
      `No. It is guidance on selection. Engineering advice involves loads, movement, fixings, substrate and the specific detail, and it carries responsibility that a selection tool cannot. Use the advisor to narrow a list and an engineer or a specifier to design with it. The two are complements, and the handover between them is much cheaper than a redesign after a failure.`,
      `It flags availability as a separate consideration rather than modelling it, because local stock, lead times and merchant coverage change weekly and by location. Where availability decides a specification, the answer comes from a merchant rather than from a page, and the advisor says so instead of presenting a material that cannot be bought.`,
    ],
  },
  "regional-cost-index": {
    description: `The same building costs different amounts in two cities, and the difference is not the design. Labour rates, material haulage, local levies and the depth of the subcontractor market all move the number, and a national average hides all of it. The regional index applies those differences to a measured estimate.

The index is a set of relative factors per region and per trade, applied to a base estimate rather than replacing it. What it will not do is convert currency, because a currency conversion and a regional cost difference are two different adjustments, and combining them produces a figure that answers neither question. Where a region has no factor, the tool reports it rather than applying the national figure as if it were local.`,
    functions: [
      "Applies a regional factor to a measured estimate, by trade where the factors are available.",
      "Shows the base estimate and the adjusted estimate side by side, so the adjustment is visible.",
      "Keeps labour and material factors separate, since they move for different reasons.",
      "Reports a region with no recorded factor as unadjusted rather than applying a national average.",
      "Accepts a factor you enter where you have local knowledge the index does not hold.",
      "Keeps currencies separate, so a regional adjustment never doubles as a currency conversion.",
      "Records the date of the factors, since a regional differential changes over time.",
      "Shows how much of the adjusted total came from the regional factor, so its effect is not mistaken for a change in quantity.",
      "Keeps an unadjusted copy of the estimate, so a comparison across two regions starts from the same measured base.",
    ],
    worked:
      "An estimate of a hundred thousand at base, moved to a region with a labour factor of one point one five and a material factor of one point zero five, is adjusted trade by trade rather than as a single multiplier. A labour heavy job therefore moves more than a material heavy one, which is the point of keeping the factors apart. If the same job is being priced in another currency, that is a separate conversion applied afterwards, at a rate that is stated.",
    advantages: [
      "The base estimate and the adjusted figure are shown together.",
      "Labour and material factors are separate, so a trade mix is reflected.",
      "Regions without factors are reported rather than averaged.",
      "A local factor can be entered where you know better.",
      "Currency and region are kept as distinct adjustments.",
    ],
    limits: [
      "It does not convert currency.",
      "It does not hold a factor for every region or every trade.",
      "It does not account for site specific conditions such as access or ground.",
      "It does not forecast future movement in a region.",
      "It does not verify the factors against a survey of local prices, and it does not hold a factor for every trade in every region.",
    ],
    answers: [
      `A relative factor, by region and by trade, applied to a measured estimate. Labour and material factors are separate because they move for different reasons, so a labour heavy job adjusts differently from a material heavy one. The base and the adjusted figures stay side by side, which means the adjustment can be seen rather than absorbed.`,
      `From recorded regional differentials, which are relative rather than absolute prices. That matters because a factor survives a change in the base estimate, while a set of local prices would have to be replaced every time a quantity changed. The date of the factors is recorded, since a differential narrows or widens over time.`,
      `No, and deliberately not. A currency conversion and a regional cost difference are different adjustments, and applying both through one factor produces a number that mixes two movements. The regional index adjusts for where the work is, and a currency conversion is applied afterwards at a stated rate, so each change can be seen and questioned on its own.`,
      `Because a national figure is a fiction that is convenient for a spreadsheet. Labour in one region can differ from another by a third, and haulage and local levies add further variation. A contractor pricing a job a long way from home needs to know what the local cost base is, and a client comparing two locations needs the same. The regional index gives both a way to have that conversation with a number in front of them rather than a hunch about the other side of the country.`,
      `Yes, where the estimate is held and the region is known. The factor is applied to the measured quantities rather than to the total, so a change of region produces a re priced estimate rather than a scaled number. That keeps the traceability of the original lines and makes the regional adjustment one more visible step rather than a mystery. Where a client queries the difference between two locations, the answer is a factor and a date rather than an apology.`,
    ],
  },
};
