import type { LongFormArticle } from "@/config/faq-longform";

export const QUOTES_LONGFORM: Record<string, LongFormArticle> = {
  quotes: {
    description: `A quote is not a number, it is a state. It is sent, it is viewed, it is accepted or it lapses, and the difference between those states is the difference between work you will do and work you have lost track of. The pipeline exists because most contractors can price a job and far fewer can say, on a Monday morning, which of last month's quotes are still alive.

Everything on the page is derived from the quote records themselves. Value is reported per currency because a client in one country and a supplier in another do not share a unit, acceptance rate is calculated from resolved quotes rather than from a wish, and expiry follows the date the quote carries. Nothing is estimated, and nothing is filled in when a field is missing.`,
    functions: [
      "Groups quotes by state: open, viewed, accepted, declined and expired, so the list reflects where each one actually stands.",
      "Totals value per currency, keeping each currency its own sum so no exchange rate is invented.",
      "Calculates acceptance rate from quotes that reached a decision, and reports the rate as undetermined until there is one.",
      "Flags quotes as needing chasing when they are past the point you set and still open.",
      "Reports expiry from the validity date on the quote, so a lapsed quote leaves the open list without being deleted.",
      "Shows the age of each open quote, which is the number that decides what to chase first.",
    ],
    worked:
      "Twelve quotes were sent last month: eight are still open, three accepted and one declined. Acceptance rate is three from the four that reached a decision, so seventy five percent, and the eight open quotes are not in the calculation because they have not resolved. Two of the open ones are past fourteen days, so they appear as needing chasing, and their combined value is the number worth a phone call this week. If one of the eight expires on Friday without an answer, it moves to expired and the open value falls, which is a real change in the pipeline rather than a tidy up of a list.",
    advantages: [
      "States are explicit, so a quote cannot be mistaken for work in hand.",
      "Value is kept per currency, which keeps a parallel market honest.",
      "Acceptance rate uses decided quotes only, so it means something.",
      "Chasing follows age rather than memory.",
      "Expiry is a state change, not a deletion, so the history survives.",
    ],
    limits: [
      "It does not send quotes or chase clients for you.",
      "It does not convert currencies, and it will not invent a rate.",
      "It does not decide what to price, which remains a commercial judgement.",
      "It does not record payments or invoices against accepted quotes.",
      "It does not infer acceptance from a conversation or a verbal yes.",
    ],
    answers: [
      `Open means sent and awaiting a decision. Viewed means the client has opened the link, which is a useful signal but not agreement. Accepted and declined are decisions, recorded by you or by the client. Expired means the validity date passed without an answer. Each state is recorded, so a quote that has been read is not treated the same as one that has not, and the totals on the page only claim what the records support.`,
      `On the validity date the quote carries, which you set when it is issued. A quote is an offer with a shelf life, and material prices move, so the date is part of the offer rather than an administrative detail. When it passes, the quote leaves the open list and appears as expired, and it can be revised and reissued at current prices. Reissuing creates a new quote, which is why the old one is left visible rather than deleted.`,
      `Because a quote in one currency cannot be added to a quote in another without an exchange rate, and inventing a rate would make the total a fiction. Each currency is summed on its own, so the pipeline shows what is owed in each. That matters in a market where a client pays in local currency and a supplier quotes in another, because the two totals answer different questions and a blended figure answers neither.`,
      `From the quotes that reached a decision. Accepted divided by accepted plus declined, with open and expired quotes left out because they have not resolved either way. That is why the rate moves when a decision lands rather than when a quote is sent. Where no quote has resolved yet, the rate is reported as undetermined instead of as zero, because zero would read as failure when the truth is that there is no evidence yet.`,
      `The oldest open quotes first, and among those the ones that have been viewed without an answer. Age is the honest signal, because a quote that has been sitting for three weeks is closer to expiry than one sent on Monday. The pipeline orders them by age and marks the ones that have passed your chasing threshold. Which one to call first is a judgement about the client and the job, and the page gives you the facts to make it rather than the decision itself.`,
    ],
  },
  "client-estimate": {
    description: `A client estimate is where a calculation becomes an offer. The engine has already produced the quantities; this is the layer that turns them into lines with prices, a total, a validity date and a document a client can accept. It is deliberately the least clever part of the system, because an offer has to be stable.

That stability is why an approved quote stops changing. Once a client has agreed a number, editing it in place would mean the document they accepted and the document in the system no longer match. The engine recalculates when the job changes, the quote records what was agreed, and a revision becomes a new document with its own date rather than an edit to a settled one.`,
    functions: [
      "Builds the total from the priced lines, applying the quantity and the rate each line carries, with no hidden loading.",
      "Recalculates a draft quote when the underlying job changes, so a quantity correction flows through before it is sent.",
      "Locks an approved quote against editing, preserving the total the client agreed to.",
      "Applies transport and tax only where they are configured, and states where they are not.",
      "Renders a shareable document that carries the same lines and total the system holds.",
      "Keeps the record of what was sent, so a later query can be checked against the offer rather than a memory of it.",
    ],
    worked:
      "A job of four lines, masonry, concrete, roofing and labour, totals from the quantities the engines produced and the rates you set. Add transport as a single line if you charge it, and leave tax out where no rule applies, so the total is the sum it appears to be. Send it, and the client sees those lines in that order with that total. If they ask for a cheaper roof covering, the job is re measured, a new draft is produced, and the approved original stays as it was, which is what makes a comparison possible and an argument shorter.",
    advantages: [
      "The total is the sum of the lines, so a client can check it without trusting a percentage.",
      "A draft recalculates when the job changes, which prevents stale quantities being quoted.",
      "An approved quote is stable, which protects both parties.",
      "Transport and tax appear only where they are configured, with the gap stated.",
      "The shared document and the record cannot drift apart.",
    ],
    limits: [
      "It does not decide the rate for labour or plant.",
      "It does not determine tax, and it will not apply an assumed percentage.",
      "It does not include work the underlying calculation did not measure.",
      "It does not send reminders or chase acceptance.",
      "It does not price variations outside the measured job.",
    ],
    answers: [
      `From the priced lines. Each line carries a quantity from a calculator and a rate you set, and the total is their sum, not a rate applied to a floor area. Transport and tax appear as their own lines when they are configured, so the arithmetic is visible at every step. That structure is deliberate: a client who queries a total can be shown which line produced it, which is not possible with a single figure carrying an undisclosed loading.`,
      `A draft does, because a quote should follow the job. Change a dimension and the quantity changes, so the draft recalculates and the total reflects what is now being offered. An approved quote does not, because it is a record of an agreement rather than a working document. That split is the whole reason the system distinguishes the two states, and it is what allows a revision to be compared against the original.`,
      `Because the client agreed to a specific document. Editing an approved quote in place would leave the copy they hold and the copy you hold describing different jobs, which is where disputes start. If the scope changes, the job is re measured and a new quote is issued with its own validity date, so the history shows what was offered, what was accepted and what changed. The approved original stays visible, which is the point of keeping it.`,
      `The same lines and the same total, in the order they appear, with the validity date the quote carries. There is no separate client view that rounds or hides a line, and no price that appears only on one side. If transport or tax was not included, the document shows the total without it, which is more honest than an inclusive figure that nobody can decompose when a client asks why the number moved.`,
      `Only where they are configured. Transport is a line you add when you charge it. Tax is not determined by the engine: where a rule applies to your market it appears with its basis stated, and where none applies the quote shows a total without tax and says so. That refusal is deliberate, because an invented percentage produces a number that looks final, is wrong for the jurisdiction, and is very hard to correct once a client has accepted it.`,
    ],
  },
  "using-frelux": {
    description: `FRELUX is a set of construction calculators that measure materials, a quote layer that turns those measurements into an offer, and a property intelligence layer that reads documents and plans. The thing that ties them together is a rule: the AI reads, the engine calculates. Nothing on the site guesses a quantity from a description when it can measure it from a dimension.

That rule explains most of the behaviour a new user notices. Prices come from the market you select or from a figure you enter. Tax is reported as undetermined rather than applied as a default. A blank input produces a gap rather than a typical value. Every one of those is the same decision seen from a different angle: a number you can check is worth more than a number you cannot.`,
    functions: [
      "Measures quantities from dimensions you enter, across the calculator catalogue, with each result showing its own arithmetic.",
      "Uses prices from the selected market's price book, and asks for a figure where no verified price exists.",
      "Refuses to determine tax, reporting it as undetermined unless a configured rule applies to your market.",
      "Reports missing inputs as gaps rather than filling them with typical values.",
      "Carries measured quantities into a client estimate with the rates you set.",
      "Reads documents and plans to extract dimensions, and hands those to the deterministic engine rather than calculating from them directly.",
    ],
    worked:
      "Take a wall of twenty metres by two point four, with four openings, priced in a market with a verified block price and no configured tax rule. The estimate returns the blocks, the mortar, the cement in the bag size that market sells, and a total that says tax is not determined. Change the market to one without a verified block price and the tool asks you for the block price instead of substituting another country's figure. Two behaviours, one rule: nothing is assumed on your behalf that you would not want assumed in a tender.",
    advantages: [
      "Every quantity on the page can be traced to an input and a rule.",
      "Prices are either from a verified book or from you, never invented.",
      "A tax gap is stated rather than filled with a default percentage.",
      "Missing inputs show as missing, which keeps an unfinished estimate visible.",
      "The same measured quantities feed the calculators, the documents and the quote.",
    ],
    limits: [
      "It does not design structures, circuits, drainage or anything else that requires an engineer.",
      "It does not verify that the dimensions you enter match the building.",
      "It does not determine tax, duties or levies.",
      "It does not include labour, plant or preliminaries unless you price them yourself.",
      "It does not replace a code, a specification or a professional's judgement.",
    ],
    answers: [
      `The calculators are free to use, and no account is needed to measure a quantity or read an answer page. An account is what carries the work: saved estimates, quotes with their states, and the client side of a quote. Measuring is free because a quantity should never be behind a paywall; keeping a pipeline of quotes and their history is the part that costs money to run.`,
      `No. You can open any calculator, enter dimensions and read the result without one. An account is needed when you want to keep the estimate, send it as a quote, or come back to it later. The distinction is deliberate: a visitor checking how many blocks a wall needs should not have to register to find out, and a contractor running a pipeline needs the records an account provides.`,
      `The quantity is as accurate as the dimensions you enter, and the arithmetic on top of them is exact. Where the answer is less certain, the page says why: a coverage rate is a property of a product you select, a price comes from a market book or from you, and a tax line is left undetermined rather than assumed. So the honest answer is that the measurement is reliable, the inputs are yours, and the places where an assumption would otherwise sit are visible.`,
      `Either from the price book of the market you select, or from a figure you enter. Where a market has a verified book, the tool uses it and the line can be traced to it. Where it does not, the tool asks for the price rather than falling back to another country's number, because a labour or material rate imported from a different market is a fiction with a decimal point. The same rule applies to steel, where no default exists at all.`,
      `Because applying a percentage that is not the rate for your jurisdiction would produce a confident wrong number, and a wrong number is worse than a stated gap. Where a tax rule is configured for your market, it appears as a line with its basis shown. Where none is configured, the estimate says tax is not determined. You can then add the rate that applies to you, and the total carries it as your figure rather than as the tool's assumption.`,
    ],
  },
  "demolition-calculator": {
    description: `Demolition is priced by what leaves the site. The structure comes down easily enough on paper; the debris is what fills skips, needs lorries and costs money by the tonne or the cubic metre. This takeoff converts the elements you are removing into a loose volume, and the loose volume is the number the disposal is priced on.

That conversion is the whole trick. A wall measured in cubic metres in place becomes a larger volume once it is broken, because broken masonry and concrete do not stack the way they stood. The bulking factor carries that change, and it is the difference between ordering four skips and needing seven. Where the factor is uncertain, the page says so rather than presenting a tidy number as fact.`,
    functions: [
      "Measures each element being removed from its own dimensions: walls by length, height and thickness, slabs by area and depth, roofs by area and construction.",
      "Applies a bulking factor per material to convert solid volume into loose volume.",
      "Converts loose volume into skips or loads at the capacity you specify, rounded up.",
      "Counts elements by type, so a mixed demolition shows which material produces most of the debris.",
      "Adds the weight estimate where a density applies, for disposal priced by the tonne.",
      "Reports an element entered without dimensions as incomplete.",
    ],
    worked:
      "A brick wall eighteen metres long, two point four high and two hundred and fifteen thick is about nine point three cubic metres in place. Broken, at a bulking factor of about one and a third, that becomes twelve and a half cubic metres loose, which is two skips of eight cubic yards with room to spare, or three if the skip is the smaller size. A concrete slab of forty square metres at a hundred and fifty millimetres adds six cubic metres, and seven and a half loose, so the job needs a third skip. Both figures came from the same rule, which is why mixing materials in one estimate still produces a usable total.",
    advantages: [
      "Debris is calculated from the elements removed rather than from a rate per room.",
      "Bulking is applied per material, so masonry and timber are not treated alike.",
      "Skips are counted at the capacity you specify, so the order matches what you can hire.",
      "A mixed demolition shows which element produces the bulk of the debris.",
      "Weight is available where disposal is priced by the tonne.",
    ],
    limits: [
      "It does not assess structural stability, sequencing or temporary works.",
      "It does not identify asbestos, and it does not cover hazardous waste handling.",
      "It does not include permits, notifications or disposal charges, which vary by site and jurisdiction.",
      "It does not include plant, labour or protection of retained structures.",
      "It does not verify the construction of what is being removed.",
    ],
    answers: [
      `Measure each element in place, convert it to a solid volume, then apply a bulking factor to get the loose volume that goes in the skip. A wall of eighteen metres by two point four by two hundred and fifteen millimetres is nine point three cubic metres in place and about twelve and a half loose. The takeoff does that per element and per material, because the factor differs between brick, concrete and timber, and it rounds the result to skips at the capacity you hire.`,
      `Bulking is the change in volume when a material is broken up. A cubic metre of wall in place occupies more than a cubic metre of space once it is rubble, because the pieces do not fit together the way the wall did. Factors vary by material and by how finely it is broken, so the page applies one per material and shows it. Ignoring bulking is the most common way a demolition estimate comes out a skip short and the site stops waiting for a lorry.`,
      `From the loose volume and the capacity of the skip you hire. Eight cubic yards is a common size, smaller ones are available, and the takeoff rounds up to whole skips because half a skip is not a thing you can order. Loose volume divided by capacity gives the count, and where the total lands just over a whole number, the usual choice is the larger skip rather than a second visit, since a return trip costs more than the difference in capacity.`,
      `Yes, and they stay on separate lines. A job that removes a roof, a wall and a slab produces three different volumes with three different factors, and the total is their sum. Keeping them separate is what lets you see that the roof is most of the debris, or that the slab is what pushes the job from two skips to three. A single blended factor would give a total that is roughly right and cannot be checked against any single element.`,
      `No. Permits, notifications, asbestos surveys and disposal charges are outside the takeoff, and the last two matter more than they look. Asbestos cannot be identified from dimensions, and its presence changes both the method and the cost by an order of magnitude. Disposal charges vary by site, by material and by jurisdiction. The takeoff gives you the volume that those charges are applied to, which is the part it can honestly calculate.`,
    ],
  },
  "drainage-calculator": {
    description: `A drainage takeoff counts pipe, chambers and bedding, and it does all three from a route rather than from a property. The route is the layout you have drawn: pipes running between chambers, chambers at the changes of direction, and bedding under the whole of it.

The result is a materials list, not a hydraulic design. Pipe sizes, gradients and chamber positions come from the drainage design, which follows from the flows, the levels and the regulations where you are building. What the takeoff does is convert that design into pipe, fittings, chambers and bedding, in the quantities a merchant and a groundworks gang both work from.`,
    functions: [
      "Calculates pipe length from the runs you enter, along the gradient you specify rather than the straight line between ends.",
      "Counts inspection chambers and gullies from the layout: at changes of direction, at junctions and at the head of each run.",
      "Calculates bedding and surround from the trench length and the dimensions you give.",
      "Counts fittings and connections at each junction, with the type following the pipe material you select.",
      "Adds excavation volume where you enter the trench width and depth, so spoil is not forgotten.",
      "Reports a run without a measured length as missing rather than assuming a distance per chamber.",
    ],
    worked:
      "A run of thirty metres between two chambers, falling one in eighty, is thirty metres of pipe along its line, and its ends differ in level by three hundred and seventy five millimetres. Bedding at a hundred and fifty millimetres deep and three hundred wide is thirteen and a half cubic metres of granular material for that run. Add four more chambers at the junctions and the gullies at the low points, and the order is pipe, chambers, gullies, bedding and the excavation those dimensions imply. Nothing in it was derived from the number of bathrooms, which is the figure a rule of thumb would use.",
    advantages: [
      "Pipe follows the route and the fall, not the straight line between two points.",
      "Chambers are counted from the layout, which is where a length-only takeoff falls short.",
      "Bedding and surround are calculated from the trench, so the granular order is real.",
      "Excavation volume is available, so spoil is not a surprise.",
      "A missing measurement is reported instead of assumed.",
    ],
    limits: [
      "It does not design gradients, pipe sizes or chamber levels.",
      "It does not calculate flows or check hydraulic capacity.",
      "It does not verify compliance with drainage regulations or codes.",
      "It does not include soakaways, treatment plants or connection charges.",
      "It does not include labour, plant or reinstatement.",
    ],
    answers: [
      `No. Gradients come from the drainage design, because they follow from the levels available and the self cleansing velocity the pipe needs. The takeoff asks for the fall you have designed and uses it to calculate the pipe length along the run and the level difference between its ends. Choosing a gradient is a design decision with a code behind it, and a materials calculator that picked one would be making a decision it cannot defend.`,
      `By length, along the run and at the gradient, with the fittings counted at every junction and change of direction. The takeoff takes each run you describe, multiplies by nothing except its measured length, and sums the pipe by diameter and material. Where a run has not been measured, it is reported as missing, because a per chamber assumption produces a pipe order that is short on long runs and long on short ones.`,
      `From the layout. A chamber goes where the pipe changes direction, where two runs meet, where the run changes diameter and at the head of a run. The takeoff counts them from the route you enter, with their covers and their benching, rather than applying a chamber per house. That is why a courtyard with four connections needs more chambers than a straight run of the same pipe length.`,
      `Bedding and surround are calculated from the trench you describe, at the depth and width you enter, so the granular material is a quantity rather than an allowance. Where a specification calls for a surround rather than a bed, say so by entering the dimensions that apply, and the volume follows. It is the item most often omitted from a drainage estimate and the one that stops a gang on the first morning.`,
      `No. It is a materials takeoff, so it counts what a designed system needs. Whether the gradients are adequate, whether the pipe sizes carry the flow and whether the layout complies with the drainage regulations where you are building are design questions with a code behind them. The takeoff assumes those answers exist and converts them into pipe, chambers, bedding and excavation, which is the part that can be counted.`,
    ],
  },
};
