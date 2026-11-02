import type { LongFormArticle } from "@/config/faq-longform";

export const PROJECT2_LONGFORM: Record<string, LongFormArticle> = {
  "cash-flow-timeline": {
    description: `A job is paid for over its life, and its costs are paid out over the same life at a different rhythm. Materials are bought before they are fixed, labour is paid weekly, and the client pays in stages that may lag both. The cash flow view exists to show that mismatch before it becomes an overdraft.

It is built from the payment stages you define, applied to the contract value, mapped onto the programme's dates. What it does not do is track money received, because that is a ledger rather than a forecast. It shows what should be due when, and with a retention applied, what will actually be released and when.`,
    functions: [
      "Builds payment stages from the percentages you enter against milestones or dates in the programme.",
      "Checks that the stages total a hundred percent and reports any remainder rather than allowing a silent gap.",
      "Applies retention as a percentage held per stage and released at the point you specify.",
      "Maps the stages onto the programme dates, so each payment has a period rather than a position in a list.",
      "Shows the cumulative value due against the cumulative cost, which is the line that reveals a funding gap.",
      "Reports a stage with no date as unplaced rather than assuming it falls at the end.",
      "Keeps currencies separate where a job spans more than one.",
    ],
    worked:
      "A contract of a hundred and twenty thousand in four stages: twenty percent on start, thirty on roof level, forty on practical completion and ten on the defects period ending. Retention at five percent held from each stage leaves six thousand withheld through the job and released after the defects period. Costs run at roughly nine thousand a month for six months, so the second month is where the gap appears: costs of eighteen thousand against receipts of twenty four thousand that clear thirty days later. That gap is what the view exists to show, and it is the reason a profitable job can still stop.",
    advantages: [
      "Payment stages and their dates sit on one page, so the mismatch is visible.",
      "A stage schedule that does not total a hundred percent is reported, not absorbed.",
      "Retention is modelled with its release point, which is money deferred rather than lost.",
      "Cumulative value against cumulative cost shows the funding requirement.",
      "Currencies stay separate, which keeps a cross border job honest.",
    ],
    limits: [
      "It does not track actual receipts, invoices or bank balances.",
      "It does not calculate interest or financing cost.",
      "It does not account for the lag between invoice and payment unless you build it into the dates.",
      "It does not include variations, which change the value they are added to.",
      "It does not forecast the cost side from quantities, only from the figures you enter.",
    ],
    answers: [
      `From the percentages you set against milestones or dates in the programme, applied to the contract value. Each stage becomes a payment due in a period, and its value follows from the percentage. Where a stage is tied to an event, such as roof level, its date comes from the programme rather than from a guess, which is why the two tools belong together.`,
      `It reports the remainder. A schedule of twenty, thirty and forty leaves ten percent unallocated, and the tool shows that as a gap rather than quietly scaling the others up. On a hundred and twenty thousand contract that gap is twelve thousand, which is the kind of money that turns into a dispute at the end of a job, so it is worth seeing while the contract is still being drafted.`,
      `Yes, as a percentage held from each payment and released at the point you specify. It shows the cumulative amount held through the job and the amount released at the end, which matters because retention is money earned, invoiced and unavailable for months. A job that looks profitable on the margin line can still fail on the cash it has tied up in retention.`,
      `No. Actual payments are a ledger, and this is a forecast. What it shows is what should be due when, based on the stages you have agreed. Reconciling that with what has actually arrived is bookkeeping, and a forecast that pretends to be a ledger is worse than either on its own.`,
      `Because a single payment at the end means the contractor funds the whole job. Staging moves money closer to the work, which reduces the funding requirement and spreads the risk. The tool shows what each staging arrangement does to that requirement, so a negotiation about payment terms can be had with numbers rather than with instinct.`,
    ],
  },
  "boq-generator": {
    description: `A bill of quantities is a list of measured work with descriptions, units and rates, and its value is that every line can be traced. This generator builds those lines from the quantities the calculators produce, so a bill is a presentation of measured work rather than a document typed out beside it.

The consequence is that a line can be defended. When a client asks why the blockwork is a particular figure, the answer is a wall, a set of openings and a block size, and the bill can show it. Where an estimate changes, the bill changes with it, because the lines are generated rather than transcribed. What the generator does not do is measure the job, price the risk or sign off the total as a quantity surveyor would.`,
    functions: [
      "Builds bill lines from measured quantities, with the unit following the trade: square metres of wall, cubic metres of concrete, metres of pipe.",
      "Carries the description from the measurement, so a line names what it measures rather than a generic trade heading.",
      "Applies the rate you set per line, and shows the line total and the bill total from those.",
      "Keeps contingency as an explicit line you add, not a percentage hidden in the rates.",
      "Reports tax only where a configured rule applies, and as undetermined where none does.",
      "Regenerates the affected lines when a measured quantity changes, leaving the rates you set intact.",
      "Reports a line without a rate as unpriced rather than carrying it at zero.",
    ],
    worked:
      "A bill of eleven lines for a small extension: excavation, concrete, blockwork, roof structure, covering, plaster, screed, doors, windows, electrical and plumbing. Blockwork of fifty nine square metres at a rate you set, concrete of fifteen cubic metres at yours, and each other line following its own measurement. Add five percent contingency as a line, leave tax undetermined where no rule applies, and the total is the sum of eleven traceable lines. Change the wall height and the blockwork line and everything downstream of it move, because it was generated rather than typed.",
    advantages: [
      "Lines are generated from measurements, so each one can be traced back.",
      "Units follow the trade rather than one unit applied across the bill.",
      "Contingency is an explicit line, so its size is visible to the client.",
      "A measured change flows into the bill instead of being remembered.",
      "An unpriced line is visible rather than silent.",
    ],
    limits: [
      "It does not measure anything itself, and it does not check the measurements.",
      "It does not price risk, preliminaries or programme related costs.",
      "It does not determine tax, and it will not apply a rate.",
      "It does not replace a quantity surveyor's professional judgement or a contract.",
      "It does not include rates negotiated after the bill is issued.",
    ],
    answers: [
      `From the calculators. Each line records what was measured, in the unit that trade is measured in, at the quantity the calculation produced. The descriptions come from the measurement rather than from a template, which is what makes a line defensible when a client queries it. Nothing appears in the bill that was not measured somewhere in the system.`,
      `Contingency is a line you add, and tax is reported as undetermined unless a rule applies to your market. Neither is applied silently, because a bill is a document a client prices against and a client is entitled to see what is in it. A contingency folded into rates is invisible, and an assumed tax rate is wrong in most jurisdictions it is applied to.`,
      `Yes, and that is the point of generating rather than typing. The line carries the quantity, the unit and the description that produced it, so a query about the blockwork can be answered with a wall length, a height, an opening schedule and a block size. A bill that cannot be defended line by line is a negotiation rather than an estimate.`,
      `No. A quantity surveyor measures, prices risk, structures contracts and takes responsibility for the figures. The generator presents measured work as a bill, which removes the transcription step and the errors that come with it. It does not replace the judgement about what to measure, how to price the risk or how to structure the contract.`,
      `The lines regenerate. A changed measurement produces a changed line, and the rates you set stay where they are, so the bill reflects the new quantity at the price you had agreed with yourself. Where a change was agreed with the client, that is a variation rather than a regeneration, and it needs its own record so the original bill remains visible.`,
    ],
  },
  "project-timeline": {
    description: `A programme is a set of operations with durations and relationships, and the useful part is not the bar chart but the relationships between them. This timeline builds from the operations, their durations and their dependencies, and identifies the chain that decides the completion date.

Durations come from quantities and productivity, which is why the labour estimator feeds it. Weather and access are yours to enter as allowances, because they are site facts rather than constants. What the tool does not do is track progress: a programme that is not updated against what actually happened is a drawing of an intention, and updating it is a separate discipline.`,
    functions: [
      "Builds a sequence of operations with durations, from the quantities and productivity rates you supply or enter directly.",
      "Applies dependencies between operations, so an order that cannot be broken is respected.",
      "Identifies the critical path, which is the chain of operations whose delay moves completion.",
      "Shows float on the operations that are not critical, which is where recovery time lives.",
      "Applies calendar allowances for weather and non working days as explicit inputs.",
      "Reports an operation with no duration as unplaced rather than dropping it from the programme.",
      "Shows the crew size implied by a duration against a quantity, so an impossible programme is visible before it is published to a client.",
    ],
    worked:
      "A small building with twelve operations: excavation at four days, footings at five, blockwork at eighteen, roof structure at six, covering at four, and the rest following. Blockwork at eighteen days sits on the critical path, so a week lost there moves completion by a week, while the four days of covering has two days of float. Weather allowances of one day in five on the external operations extend the completion date instead of being absorbed into a hopeful assumption, and the crew implied by eighteen days of blockwork is three masons, which is the number that has to be available on the day.",
    advantages: [
      "Durations come from quantities, so the programme and the estimate agree.",
      "The critical path is identified, which is where attention belongs.",
      "Float is visible, which shows which delays can be absorbed.",
      "Weather allowances are explicit rather than absorbed into optimism.",
      "An operation without a duration is reported, not silently dropped.",
    ],
    limits: [
      "It does not track progress, record actuals or forecast completion from them.",
      "It does not level resources across overlapping operations.",
      "It does not account for access constraints, permits or inspections in detail.",
      "It does not calculate costs per period, although its dates are what a cash flow forecast is built against.",
      "It does not resolve conflicts between trades beyond the dependencies you enter, and it does not allocate shared access or lifting plant.",
      "It does not model the effect of a change order on the remaining programme, which is a re plan rather than an edit.",
    ],
    answers: [
      `Operations, their durations and their dependencies. Durations come from quantities divided by productivity, or from figures you enter where you know better. Dependencies encode what must follow what, which is the part that turns a list into a programme. The output is a sequence with a critical path and float on the operations that have any.`,
      `From the quantities and the productivity rates, so a programme is built on measurement rather than optimism. Where you supply a duration directly, it is used and the derivation is not needed. Where neither exists, the operation is reported as unplaced, because a bar on a chart with no basis is why programmes slip on the first week and are quietly abandoned by the fourth.`,
      `Yes, on the operations that carry no float. The critical path is the chain whose duration equals the project duration, so a delay anywhere on it moves completion. The tool identifies that chain and shows the float on everything else, which is the information needed to decide whether a delay matters or can be absorbed.`,
      `No. Tracking progress means recording what has actually been done, against when, and recalculating from there, and that is a different exercise from building a programme. The timeline is a plan: it says what should happen in what order and how long it should take. Comparing that with reality is how a project is managed, and the tool does not pretend to do it.`,
      `They are allowances you enter. Weather, access restrictions and non working days vary by site, season and locality, and a default would be wrong somewhere. The tool applies the allowances you set to the operations affected, so a rainy season extension is visible in the completion date instead of emerging as a surprise in month three.`,
    ],
  },
  "construction-sequence": {
    description: `A sequence is the order in which work has to happen, and most of it is not negotiable. Foundations before walls, walls before roofs, roofs before ceilings. Where the sequence is negotiable is in the overlaps, and getting those wrong is how a site ends up with three trades in one room.

The tool sets out the sequence for the work you describe, with the dependencies that make it valid and the overlaps that are possible. It is a reference rather than a programme: it tells you what must follow what and what can run alongside, and the dates come from the timeline. Where an operation has no place in the sequence, that is usually a sign that a stage is missing rather than that the operation is optional.`,
    functions: [
      "Orders operations by their structural and service dependencies, from groundworks to finishes.",
      "Marks which operations can overlap and which cannot, with the reason stated.",
      "Flags a sequence where an operation appears before its prerequisite.",
      "Groups the sequence by stage, so site work, structure, envelope and finishes are distinct.",
      "Links each operation to the calculators that measure it, so a stage can be priced from the sequence.",
      "Reports an operation that fits no stage as a gap in the plan.",
      "Keeps inspections and hold points in the order, since work that is covered cannot be inspected later.",
    ],
    worked:
      "Groundworks, then footings, then blockwork to eaves, then roof structure and covering. Services first fix runs inside the walls while the roof is being covered, because the building is dry enough and the walls are open. Plaster follows first fix, then screed, then second fix and finishes. Held inspections sit at the points where work gets covered: the footing before concrete, the services before plaster. Move plastering ahead of first fix and the sequence is wrong in a way that costs a wall and a rewire, because the cables are now behind a finished surface that has to come off before anything can be connected.",
    advantages: [
      "Dependencies are stated rather than assumed, so a plan can be checked.",
      "Overlaps are identified, which is where a programme gains time safely.",
      "Hold points are in the order, which prevents work being covered before inspection.",
      "Stages are grouped, which is how a site is actually run and paid for.",
      "An operation with no place in the sequence shows as a gap.",
    ],
    limits: [
      "It does not produce dates, durations or a programme.",
      "It does not account for a specific site's access, phasing or occupied areas.",
      "It does not replace a method statement or a safe system of work.",
      "It does not include temporary works design or lifting plans.",
      "It does not cover commissioning, handover, defects work, the sequence of a phased occupation or the order in which snags are cleared.",
    ],
    answers: [
      `It sets out the order work has to happen in and which operations can overlap. A sequence is what a programme is built on: without it, a bar chart is a wish. It also makes hold points explicit, which matters because concrete poured over an uninspected footing cannot be checked afterwards. The value is in the dependencies being stated rather than remembered by whoever has been on site longest.`,
      `The structural dependencies are fixed: you cannot build a wall before its footing, or a ceiling before the roof is covered. The overlaps are not fixed, and they depend on the building, the access and how many crews you have. The tool marks which is which, so a decision to overlap is a decision rather than a drift.`,
      `The sequence is the logic and the timeline is the calendar. The sequence says what must follow what; the timeline turns that into durations and dates, and identifies the critical path. Building a programme from a sequence is straightforward, while building one without a sequence produces dates that cannot be delivered because the order is wrong.`,
      `Inspections and hold points are in the sequence at the points where work gets covered: footings before concrete, first fix before plaster, drainage before backfill. They are not an afterthought, because an inspection that cannot be done is a defect that cannot be seen. What the tool does not do is decide which inspections your authority requires, which is a local question.`,
      `Site managers, foremen and anyone pricing work from a programme. A subcontractor can see where their operation sits and what has to be finished before they can start, which is the conversation that otherwise happens on the morning they arrive. A client can see what stage their money is buying, which is why sequence and payment stages are usually read together.`,
    ],
  },
  "maintenance-planner": {
    description: `A building starts to need work the day it is finished, and the cost of that work is predictable in aggregate even when it is unpredictable in detail. This planner turns service lives and intervals into a schedule of tasks and costs, so the money a building will need over ten or twenty years can be seen while it is still being designed.

The service lives are published figures attached to components, not guesses, and each carries the interval it implies. What the planner does not do is a condition survey: it assumes components are installed as specified and maintained as scheduled, and it reports the years in which cost falls rather than forecasting a failure. Where an interval is uncertain, that is an input to change rather than a fact to trust.`,
    functions: [
      "Builds a schedule of maintenance tasks from the components you list and their service lives.",
      "Places each task in the year it falls due, so cost is distributed rather than averaged.",
      "Calculates the annual cost per year across the horizon you set, showing the peaks.",
      "Accepts an interval you change, since a harsh environment shortens one and a sheltered one lengthens it.",
      "Reports a component without a service life as unscheduled rather than omitting it.",
      "Keeps planned replacement separate from inspection and servicing, since the two cost differently.",
      "Shows the effect of deferring a task, which is a cost moved rather than removed.",
    ],
    worked:
      "A roof covering with a twenty year life, external paint at seven years, internal paint at ten, and a boiler service annually. Over a twenty year horizon the roof falls once at year twenty, the external paint at years seven and fourteen, the internal paint at year ten, and the service every year. The annual average is small and the peaks are not, which is the reason a sinking fund is calculated from the peaks rather than from the average. Bring the external paint to five years in a coastal location and the plan gains a third and fourth repaint inside the same horizon.",
    advantages: [
      "Costs fall in the years they occur rather than being averaged into invisibility.",
      "Service lives are attached to components, so an interval can be traced and changed.",
      "Intervals are editable, since exposure changes them.",
      "An unscheduled component is reported instead of quietly dropped.",
      "Deferral is shown as a moved cost, which is what it is.",
    ],
    limits: [
      "It is not a condition survey and does not assess the current state of anything.",
      "It does not forecast failures or their consequences.",
      "It does not include reactive repairs or damage.",
      "It does not price the work beyond the figures you supply.",
      "It does not account for warranties or their effect on who pays.",
    ],
    answers: [
      `From published service lives attached to the components you list, and each is editable because exposure changes it. A roof covering has a nominal life, a paint system has a shorter one, a serviceable plant item has an interval rather than a life. The figures are starting points with a source, not predictions about a particular building.`,
      `A schedule of tasks by year, with their costs, the annual total across the horizon, and the peaks where work coincides. It is what a sinking fund is calculated from and what a building owner needs to know before a lease is signed. The output is a plan, so the work can be budgeted and procured rather than discovered.`,
      `Yes, and often you should. A coastal location shortens the life of external coatings, a harsh sun shortens the life of sealants, and a sheltered interior lengthens both. The interval you enter is the one the plan uses, and the effect of a change is immediate, which makes the assumption behind a maintenance budget visible instead of buried.`,
      `No. A condition survey inspects what is actually there and grades its state, which is how a real maintenance plan is built for an existing building. This planner works from specification and service life, which suits a new building or a budget. The two are complementary: the survey tells you where you are, and the planner tells you what the next twenty years look like from there.`,
      `Because maintenance is a cost that arrives whether or not it was planned for, and an unplanned one is paid for at the worst moment. Distributing it across years, and knowing which years are heavy, allows a fund to be built rather than a crisis to be met. It also changes design decisions: a component with a short life and difficult access can be replaced before construction by one that is cheaper over twenty years.`,
    ],
  },
};
