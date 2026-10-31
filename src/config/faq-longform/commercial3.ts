import type { LongFormArticle } from "@/config/faq-longform";

export const COMMERCIAL3_LONGFORM: Record<string, LongFormArticle> = {
  "defect-diagnosis": {
    description: `A defect is a symptom, and the symptom is rarely where the cause is. Cracking in a wall may be a foundation, a lintel, a thermal movement or a tree; damp at the skirting may be a leak three floors up. This tool takes the symptom you describe and returns the plausible causes, the observations that would distinguish them, and the checks that would settle the question.

It gives several causes on purpose. Single answer diagnosis from a description is how a repair is done on the wrong element, and the cost of that is paid twice. What the tool does not do is diagnose: a photograph and a sentence are not an investigation, and every cause it returns comes with the observation that would confirm or exclude it, so the next step is a site visit rather than a purchase order.`,
    functions: [
      "Takes a described symptom and returns the plausible causes that match it, each with its reasoning.",
      "Names the observations that would distinguish one cause from another, so a site visit has a purpose.",
      "Flags causes that are structurally significant, so the ones that matter are not lost among the cosmetic ones.",
      "Groups causes by element, so a symptom that could be the roof or the wall is not merged.",
      "States the checks that would settle the question, in the order that costs least first.",
      "Reports a description too general to work with as insufficient rather than returning a generic list.",
      "Keeps the diagnosis separate from the repair, which is priced and specified elsewhere.",
    ],
    worked:
      "Damp at the base of a ground floor wall, on the inside, in one corner. The tool returns rising damp, a bridged damp proof course, a leak from above following a cold bridge, and external ground levels above the course, each with the observation that separates them: the height of the tide mark, whether it appears after rain, whether the external ground is above the course, whether there is a downpipe nearby. None of those can be answered from a description, and the tool says so rather than picking rising damp because it is the most familiar.",
    advantages: [
      "Several causes are given, which is honest and prevents a wrong repair.",
      "Each cause carries the observation that would confirm it.",
      "Structurally significant causes are flagged above cosmetic ones.",
      "The checks are ordered from cheapest, which is how an investigation should run.",
      "A vague description is reported rather than answered with a generic list.",
    ],
    limits: [
      "It does not diagnose, and it does not examine the building.",
      "It does not replace a site inspection or a specialist report.",
      "It does not price or specify the repair.",
      "It does not account for the building's history, alterations or previous repairs.",
      "It does not assess structural safety, which is an engineer's judgement.",
    ],
    answers: [
      `It takes a described symptom and returns the causes that could produce it, the observations that would distinguish them and the checks that would settle it. It is a structured starting point for an investigation rather than an answer. The value is in not committing to the first explanation that comes to mind, which is usually the one that was seen most recently on another job.`,
      `No, and it is deliberately built not to. A diagnosis from a description is a guess with confidence attached, and building defects are exactly the area where a wrong guess is expensive: a damp proof course injected where the problem was a leaking downpipe costs money and does not fix anything. What the tool gives you is the shortest list of plausible causes and the tests that separate them.`,
      `Because one symptom usually has several. Damp at a skirting can be rising damp, a bridged course, a leak, condensation or a cold bridge, and each has a different remedy and a different cost. Giving one cause would be a coin toss presented as an answer. Giving four with the observation that separates them turns the problem into something that can be investigated in an afternoon.`,
      `No. It diagnoses the cause, or rather it narrows the causes. Repair pricing needs the extent, the access and the method, which are known after an inspection. A repair price given before the cause is confirmed is a number that will change, and quoting one is how a small job becomes a dispute.`,
      `From the documented causes and failure modes of common construction details, and from the observations that distinguish them. It is a knowledge base rather than a model's opinion, and it is deliberately conservative: where the description does not distinguish between causes, it says what further information would, instead of choosing.`,
    ],
  },
  "bim-ifc-import": {
    description: `An IFC file is a model exchanged between authoring tools, and it carries geometry, properties and a classification. This import reads the elements it recognises, maps them to the categories the calculators use, and hands the quantities to the deterministic engine rather than trusting the model's own totals.

The mapping is where the work is. A wall in one tool is an IfcWall with a thickness and a height; in another it is an extrusion with a material layer set. Elements that cannot be mapped are reported rather than guessed at, and the quantities that come through are the ones the geometry supports: areas, volumes and lengths. A model with no material assignments produces geometry with no specification, and the tool says which of the two it is working from.`,
    functions: [
      "Reads an IFC file and lists the elements it recognises, grouped by the category they map to.",
      "Maps recognised elements to the calculator categories: walls, slabs, roofs, openings and services.",
      "Extracts quantities from geometry, such as wall area, slab volume and run lengths.",
      "Reports elements it cannot map as unmapped, with their type, rather than dropping them silently.",
      "Reports elements with no material or property set, so a geometric quantity is not mistaken for a specified one.",
      "Keeps the model's own quantities beside the extracted ones, so a difference can be seen.",
      "Produces a takeoff by element, traceable to the model it came from.",
      "Reports a file that fails to parse as unreadable rather than producing a partial takeoff.",
    ],
    worked:
      "A model with two hundred walls, forty slabs and ninety openings maps to wall area, slab volume and an opening schedule. Twelve elements come back unmapped because they are modelled as generic extrusions with no classification, and four walls carry no material layer set so their thickness is geometric rather than specified. The takeoff shows two hundred walls with quantities and twelve elements with no category, which is a fixable model rather than a failed import.",
    advantages: [
      "Elements are mapped to the calculator categories rather than dumped as a list.",
      "Unmapped elements are reported with their type, which points at the modelling fix.",
      "Geometric quantities are distinguished from specified ones.",
      "The model's totals and the extracted quantities are shown together.",
      "A parse failure is reported rather than producing a partial takeoff.",
    ],
    limits: [
      "It does not validate the model, its coordination or its clashes.",
      "It does not infer materials or specifications that are not in the file.",
      "It does not design anything or correct modelling errors.",
      "It does not guarantee that a mapped element is modelled correctly.",
      "It does not replace a quantity surveyor's judgement about what to measure, or a modeller's judgement about how to model it.",
    ],
    answers: [
      `It reads the file, recognises the element types it understands, maps them to the categories the calculators use, and extracts the quantities the geometry supports. Elements it cannot map are listed with their type rather than discarded. The output is a takeoff by element that can be traced back to the model, which is the point of importing rather than re measuring. On a coordinated model that saves a week; on an uncoordinated one it tells you what has to be fixed before it can be used at all.`,
      `They are listed as unmapped with their type, so the reason is visible. Usually it is a modelling decision: an element extruded as a generic form, a wall without a classification, a family that has no equivalent. Those are fixable in the authoring tool, and reporting them converts a silent gap in a takeoff into a task for the modeller.`,
      `No. The model's quantities are shown beside the extracted ones so a difference can be seen, but the takeoff is calculated from the geometry by the same engine as the standalone calculators. A model can carry a quantity that was typed rather than derived, and trusting it would import someone else's arithmetic error into an estimate that otherwise has none.`,
      `Wall areas and the thicknesses behind them, slab and footing volumes, roof areas at the modelled pitch, run lengths for pipe and conduit, and openings as a schedule with sizes. Those are the quantities the geometry supports reliably. Anything that depends on a specification, such as a block size or a mix, comes from the properties where they exist and is reported as missing where they do not.`,
      `No. Validation is a separate discipline: coordination, clashes, model completeness and standards compliance are checks against a brief, and a quantity import does none of them. What the import does is tell you which elements it could not use, which is a partial and useful signal about model quality rather than an assessment of it.`,
    ],
  },
  "field-sync": {
    description: `Measurements taken on site and estimates held in the office are the same numbers at different moments, and this is the mechanism that brings them together. A dimension recorded on a phone in a room syncs to the estimate it belongs to, with the direction of the change recorded rather than overwritten silently.

The conflict rule is the part that matters. Where a synced figure disagrees with what is stored, the tool does not pick one. It shows both, with their sources and times, and the person decides. That is slower than automatic merging and it is the only approach that leaves a record of what happened, which is what a client query or a cost dispute eventually depends on.`,
    functions: [
      "Syncs measurements recorded on site to the estimate or takeoff they belong to.",
      "Records each synced value with its source, its time and the person who entered it.",
      "Reports a conflict between a synced figure and a stored one instead of overwriting either.",
      "Shows both values with their provenance, so the resolution is a decision rather than a guess.",
      "Keeps a history of changes to a measured value, so the sequence is recoverable.",
      "Works with a queue when a device has no connection, and sends when it next has one.",
      "Reports a record that failed to sync as pending rather than as sent.",
      "Keeps a synced record scoped to the job it belongs to, so site data does not leak across projects.",
    ],
    worked:
      "A wall measured on site at two point six five metres is entered against an estimate that holds two point seven from the drawing. The sync does not replace either. It shows the drawing value and the site value, with times and sources, and the person chooses the site measurement and the reason is recorded. The blockwork quantity recalculates from the chosen figure, and the estimate's history shows that the change happened, when, and on what basis.",
    advantages: [
      "Conflicts are surfaced with both values rather than resolved silently.",
      "Every figure carries its source and time, which makes a change explainable.",
      "The history of a measurement survives, which is what a dispute turns on.",
      "Offline work queues and sends later instead of being lost.",
      "A failed sync is visible as pending rather than assumed sent.",
    ],
    limits: [
      "It is not a project management tool and does not schedule or assign work.",
      "It does not verify that a measurement is correct, only records it.",
      "It does not resolve a conflict automatically, by design.",
      "It does not work as an unlimited photo or document store, and it does not replace an inspection record.",
      "It does not replace a survey or an inspection record.",
    ],
    answers: [
      `It brings a measurement taken on site into the estimate or takeoff it belongs to, recording where it came from and when. Where the figure differs from what is stored, it reports the conflict rather than choosing. The result is an estimate that reflects site reality and a history that shows how it got there.`,
      `It reports both and asks. The stored figure has a source, usually a drawing or an earlier measurement, and the synced one has a source too. Choosing automatically would discard one of them without a record, and the discarded one is often the evidence someone later needs. The resolution is a person's decision, recorded with its reason.`,
      `It queues the change and sends it when a connection returns, which is how a site actually works: basements and new builds have no signal. A queued record shows as pending rather than as sent, so nobody assumes a figure is in the office when it is still on a phone. That distinction is small and it is the difference between an estimate that is current and one that is quietly stale. A pending record is visible, so somebody can chase it; a silently lost one becomes a phone call from a site that has already ordered the wrong quantity.`,
      `No. It moves measurements between a site and an estimate, which is one specific flow of data. Scheduling, task assignment, progress tracking and document control are a project management system, and this is not one. Use it for the dimensions that decide quantities, and use the right tool for the rest.`,
      `The people on the job it belongs to, and the record keeps its source. A synced measurement is part of an estimate, so it is visible to whoever can see that estimate, which is the scope that makes sense: a site measurement is not public data, and it is not private to a phone either.`,
    ],
  },
  "material-prices": {
    description: `Every estimate eventually rests on a price, and this page is where those prices live. Each material in the book carries a figure, a unit, the market it applies to and the date it was recorded, so a rate in a quote can be traced to a source rather than remembered.

The date is the most important field on the page. Construction material prices move, and a figure without a date is a figure that cannot be judged. Where a market has no verified price for a material, the page shows the gap and the calculators ask rather than substituting a number, which is why an estimate in a market without a price book looks complete in its quantities and honest in its prices.`,
    functions: [
      "Lists materials with their price, unit, market and the date the price was recorded.",
      "Keeps each market separate, so a price is never applied outside the market it belongs to.",
      "Shows the unit a price is quoted in, so a tonne and a bag are not confused.",
      "Reports a material with no recorded price as unpriced rather than showing a figure from another market.",
      "Feeds the calculators, so a rate used in an estimate can be traced to the entry it came from.",
      "Records the movement since the previous entry, which is what a reissued quote is explained with.",
      "Reports the age of each price, so a stale figure is visible before it is used.",
      "Accepts a price you enter for a material that is not in the book, scoped to your own work.",
    ],
    worked:
      "A bag of cement at a recorded figure in a given month, a cubic metre of sand at another, and a block at another, each with its date. An estimate that uses three hundred bags can show where the bag price came from and when. Change the market and the prices change with it, and where the new market has no recorded block price, the calculator asks for one rather than carrying the previous country's figure into a quote.",
    advantages: [
      "Every price carries a date, a unit and a market.",
      "The gap is shown where a market has no price, rather than filled.",
      "Rates in estimates can be traced to the entries they came from.",
      "Movement over time is recorded, which explains a reissued quote.",
      "A price you enter stays yours and does not overwrite the book.",
    ],
    limits: [
      "It is not a quotation and does not guarantee a price.",
      "It does not include delivery, handling or supplier terms.",
      "It does not cover every material in every market.",
      "It does not convert currency.",
      "It does not determine tax, which is reported separately where a rule applies.",
    ],
    answers: [
      `Materials with their price, the unit it is quoted in, the market it applies to and the date it was recorded. That is a record rather than a quote, and the difference is the date: a price with a date can be judged for age, and a price without one cannot be judged at all. The page is deliberately boring about this, because an estimate depends on it.`,
      `No. They are recorded prices, which means they are what was known when they were entered, in the market they belong to. A price can change the day after it is recorded, and a supplier can quote something different for a particular order. The page gives a starting figure with a date so you can decide whether to use it or to get a quote for the job.`,
      `Because material prices move, sometimes sharply, and a figure with no date cannot be assessed. A bag of cement recorded last month may still be right and may be ten percent out, and the only way to know is to see when it was recorded. The age of a price is a better guide to its reliability than the price itself.`,
      `Every entry keeps its source and its date, and an estimate that used it can be traced back to it. That matters when a client asks why a reissued quote differs, or when a job is compared against a similar one from six months earlier. The answer is a figure, a market and a date, rather than a recollection.`,
      `The calculators read from the book for the market selected, and where no price exists for a material in that market, the calculator asks for a figure instead of substituting one. That keeps a price in a quote traceable to either the book or to you, which is the only basis on which a total can be defended line by line.`,
    ],
  },
};
