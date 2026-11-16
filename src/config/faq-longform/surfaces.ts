import type { LongFormArticle } from "@/config/faq-longform";

/**
 * Long form copy for the console takeoff, the overhead tank staging and the
 * diaspora budget tracker.
 *
 * The three sit at different ends of the catalogue: a furniture schedule, a
 * load path and a currency projection. What they share is a refusal to invent
 * a number. Sheet sizes, rates, bearing and inflation all come from the reader,
 * so the same page is true in Lagos, Nairobi, Manchester and Houston.
 */
export const SURFACES_LONGFORM: Record<string, LongFormArticle> = {
  "tv-console-calculator": {
    description:
      "A media unit is a pile of rectangular panels before it is a piece of furniture, and the cost sits in the panel count and the board it is cut from. Most console quotes start from a photograph and a guess at how much board a unit that size takes. The guess is usually low, because a console is mostly back panel, shelves and dividers, and those are the parts nobody counts when they price from the picture.\n\nThis calculator asks for the concept and the carcass instead. You set the length, the height, the depth and how many shelves, dividers, backs and doors the unit carries, and it expands that into a panel schedule. The panels are packed into the sheet size you buy, the workshop allowance is added, and the board, the edge banding and the hardware are priced from your own rates, so the quote that comes out is tied to a schedule a joiner can check line by line.",
    functions: [
      "Expands the chosen concept into sides, top, bottom, shelves, dividers, back and doors at the dimensions you enter.",
      "Applies the stated assembly rule, so the sides span the full height and the top, bottom and shelves fit between them at the carcass depth.",
      "Packs the listed panels into sheets of your size and reports the packed count as the starting order.",
      "Applies the workshop allowance to the packed count and rounds up, which is how a workshop buys spares against cutting error.",
      "Measures edge banding on the exposed edges of the schedule and counts hinges per door from the door height.",
      "Prices board, banding, hardware and labour from your rates and rolls the lines into one total.",
    ],
    worked:
      "Take a media unit 1,800 millimetres long, 500 millimetres high and 400 millimetres deep, with two shelves, one divider, an applied back and no doors. Laid out by the stated rule, the panels add up to about 4.35 square metres of board, which is the figure the schedule prints. A standard sheet of 2,440 by 1,220 millimetres is 2.9768 square metres, so 4.35 divided by 2.9768 is 1.46, and the packed order is 2 sheets because a part-sheet is not sold. The workshop allowance of 10 percent is then applied to the packed count: 2 multiplied by 1.1 is 2.2, which rounds up to 3 sheets. That third sheet is not waste in the abstract, it is the spare a workshop holds against a chipped edge or a miscut, and the allowance line is where the customer sees it. Edge banding is measured on the exposed edges only, and hinges are counted from the door height, so a taller door carries more hinges than a short one.",
    advantages: [
      "The schedule is printed in panels, so a joiner can check the arithmetic against the concept before any board is cut.",
      "The sheet count names its packing method, which keeps the figure honest about the nesting it does not simulate.",
      "Hardware follows the concept, so drawers, doors and open shelving are costed as the different jobs they are.",
      "Rates are yours, which keeps the total current in a market where board prices move faster than any published index.",
    ],
    limits: [
      "It is a planning estimate. Grain direction, book matching, saw kerf and offcut reuse inside a lane are not simulated, so a nested cutting list will differ.",
      "It is not a fixing or safety design. Wall anchors, stud finding and the load the wall can carry are outside the calculator.",
      "It is not a cut list, and the panel sizes assume the assembly rule stated on the page.",
      "Board prices and labour rates are entered by you, so the total is only as current as the rates you type.",
    ],
    answers: [
      "The calculator builds a panel schedule from the concept and the carcass dimensions: two sides, a top, a bottom, the shelves and dividers you asked for, the back and any doors. Those panels are packed into the sheet size you entered, and the workshop allowance is added to the packed count. The sheet figure is what a workshop would order for that schedule, not a guess at board consumption from the picture.",
      "Because the packing is done in strips and the page says so. Grain direction, book matching, saw kerf and the reuse of offcuts inside a strip are not modelled, and any of them can push a real cutting plan above the printed figure. Read the number as the order the schedule justifies, and let the workshop that cuts it confirm the final sheets.",
      "The allowance buys spares against cutting error and defects. It is applied to the packed board count and the result is rounded up, so two packed sheets at ten percent becomes three, since a workshop cannot buy a fifth of a sheet to hold a spare panel. Setting the allowance to zero is allowed, and it will produce an order with no spare at all.",
      "Edge banding is measured on the exposed edges in the schedule, and hinges are counted per door from the door height. Slides, handles and other fittings follow the concept. The cost lines are built from the rates you enter for your supplier, so the total can be shown to a client without a national average standing behind it.",
      "No. The schedule is a planning estimate, and the panel sizes follow the assembly rule the page states, including the drawer clearances it lists. A cutting list that accounts for grain, kerf and the sheet goods you actually buy has to come from the workshop, and the schedule is the input to that conversation.",
    ],
  },
  "water-tower-staging-estimator": {
    description:
      "An overhead tank is a short load path with one load that pushes sideways. The water sits at the top of the tower, and the tower has to carry it down to a footing small enough to build. Everything about that path follows from two numbers: how much the tank weighs when it is full, and how high the tower lifts it. A staging priced without both of those is a guess at steel tonnage.\n\nThe calculator works the path in order. Capacity becomes mass, mass becomes a load at the leg, the height turns that load into an overturning moment under wind, and the moment sets what the spread and the footing have to do. The leg sections and the pad are sized from those figures, and the material bill is reported for the tower material you chose, steel or concrete, with the build sequence the staging goes up in.",
    functions: [
      "Converts tank capacity at one kilogram per litre into water mass, adds the tank and the frame above the legs, and reports the total in kilonewtons.",
      "Divides the load across the legs at the spread you enter, so a wider base reduces the load each leg carries.",
      "Reports a wind overturning factor from the pressure at the tank level and the restoring moment of the weight on the spread.",
      "Sizes the pad footing from the leg load and the bearing you assume for the ground.",
      "Reports the leg section utilisation and the steel or concrete quantities for the selected tower material.",
      "Shows the build sequence from the pads through the legs and bracing to the tank itself.",
    ],
    worked:
      "A 2,000 litre tank holds 2,000 kilograms of water, which at 9.81 metres per second squared is 19.62 kilonewtons of water. Add 6 kilonewtons for the tank shell and the frame above the legs and the tower carries 25.62 kilonewtons when full. Spread over four legs that is 6.405 kilonewtons at each leg. On ground assumed to bear 100 kilopascals, the pad area needed is 6.405 divided by 100, which is 0.064 square metres, so a pad of 0.26 metres square at 0.0676 square metres gives 6.405 divided by 0.0676, or 94.7 kilopascals, comfortably inside the assumption. Now the wind: a horizontal force of 3 kilonewtons acting at 4 metres produces 12 kilonewton metres of overturning moment. With the legs 1.5 metres apart, the restoring moment is the full 25.62 kilonewtons acting at 0.75 metres from the tipping line, which is 19.2 kilonewton metres. The factor is 19.2 over 12, or 1.6. The empty tank drops the restoring side to 4.5 kilonewton metres against the same 12, which is why an empty tower is not a safe tower.",
    advantages: [
      "Load, stability, footing and quantities are worked from one set of geometry, so a taller tower moves every figure together instead of one at a time.",
      "The empty tank case is exposed, because water is not ballast that can be relied on in a storm.",
      "Footing and member figures carry their assumptions in print, so an engineer can check the inputs and not only the totals.",
      "The build sequence is shown, so the pads, the legs and the bracing go up in the order the structure needs them.",
    ],
    limits: [
      "The bearing value is an assumption about the soil, taken from what you enter, and no test is implied by it.",
      "Member design to a code, weld and bolt details, and the dishing or stiffening of the support ring are not carried out.",
      "The tank manufacturer's loading requirements, its own base ring and its tie-down method take precedence over any figure here.",
      "The output is a planning estimate for enquiry and budgeting, not a stamped structural design.",
    ],
    answers: [
      "From the capacity and the structure you describe. Water is counted at one kilogram per litre, the tank and the frame above the legs are added, and the total is reported in kilonewtons so it can be compared with what a leg section can carry. The load is printed with the assumption behind it, and that is the figure lets it be checked against a tank data sheet.",
      "The calculator reports a wind overturning factor from the pressure, the height and the leg spread you enter, with the cross bracing that resists it. The factor is a ratio: below one the weight holds the tower down, above one the tower wants to go over. Because water cannot be counted as ballast, the empty tank is the case that matters, and the check prints the height and the spread it used.",
      "The leg load and the bearing you assume for the ground, applied to the spread you set. A wider spread lowers the load each leg carries and changes the pad as a direct consequence. The bearing figure is a judgement about the soil, so it belongs in a soil report before a footing is cast, and the calculator states that instead of hiding it.",
      "Yes, the material bill is reported for the tower material you selected, steel sections or concrete columns, with the pad footings. The leg section utilisation is stated alongside, so a section that is carrying more than it should is visible instead of buried in a tonnage figure.",
      "No. It is a load, stability and quantity estimate from the figures you enter. Foundation bearing, member design to a code, connection details and the tank manufacturer's loading requirements need a chartered engineer working from a soil report and the tank data sheet.",
    ],
  },
  "diaspora-budget-tracker": {
    description:
      "A build funded from abroad is exposed twice, and the two exposures arrive together. The sponsor sends foreign currency, so the money loses or gains against the local currency on the way in. The build then runs for a year or two, so the local money buys less by the time each milestone is paid. A budget that ignores either one looks healthy in the month it was written and fails in the month the roof is due.\n\nThe tracker takes the two apart. You enter the sponsor budget, the official and parallel rates you can observe, the annual inflation you expect and the timeline of milestones. It reports the spread between the rates, compounds the inflation across the timeline, projects a target budget at each milestone and states the variance against what is available, so a shortfall is visible months before it stops a site.",
    functions: [
      "Reports the spread between the official and parallel rates you enter in local currency terms.",
      "Compounds the annual inflation across the timeline and prints the multiplier it applied.",
      "Projects a forward target budget milestone by milestone, using the rate and the inflation accumulated to that date.",
      "Compares the projected cost with the funds available and reports variance health.",
      "Keeps every rate dated, so a figure can be traced to the day it was observed.",
    ],
    worked:
      "A sponsor commits 20,000 dollars to a two year build. At an official rate of 1,500 local units to the dollar that is 30,000,000. At a parallel rate of 1,700 the same remittance buys 34,000,000, so the spread is 4,000,000, which is 13.3 percent of the official conversion. Two years at 20 percent inflation compounds to 1.2 multiplied by 1.2, or 1.44, so the cost of the same scope becomes 30,000,000 times 1.44, which is 43,200,000. Against the 34,000,000 the parallel rate actually delivers, the gap is 9,200,000. Neither effect alone explains that gap: the currency spread contributes 4,000,000 and the inflation contributes the rest. A sponsor who plans on a single years inflation, or on the official rate, sees a shortfall of 9,200,000 arrive without warning.",
    advantages: [
      "The two exposures are reported separately, so it is clear whether the rate gap or the inflation is doing the damage.",
      "Inflation compounds across the timeline instead of being multiplied once by the number of years.",
      "The projection is milestone by milestone, which matches the order the money is actually spent in.",
      "Rates are dated, so a figure cannot be read as current when the observation behind it is months old.",
    ],
    limits: [
      "No live rate is quoted and no forecast is published. The rates and the inflation figure are the ones you record.",
      "It is a planning model and not financial or investment advice, and it does not recommend a remittance route.",
      "A delay, a currency move or a milestone repriced after the projection will change the answer.",
      "Tax, transfer fees and the cost of holding accounts are not included unless you build them into the figures you enter.",
    ],
    answers: [
      "It is the difference between the official and the parallel rate you enter, expressed as a spread, and it matters because it is often the largest single swing in a diaspora budget. A remittance of the same size delivers different local money at each rate, and the gap can exceed a change of finish or a change of block.",
      "It compounds. Each year multiplies the budget by the annual rate, so a three year build at a given rate costs more than that rate taken once. The multiplier is printed, which is the figure to put in front of a sponsor who has compared a simple multiplication.",
      "Because two effects are working at once: the difference between the rate money was sent at and the rate on the day a milestone is paid, and the inflation accumulated between the plan and that milestone. The projection makes the shortfall visible before a site stops work.",
      "From you. The tracker does not quote a rate and does not publish a forecast, so the official rate, the parallel rate and the inflation figure must be the ones you can observe in your own market. Each one carries the date it was observed, because an undated rate says nothing about when it was true.",
      "It compares the funds available with the projected cost at the timeline you set and reports how far apart they are. It is a planning signal: a currency move, a delay that adds a year of inflation, or a repriced milestone will all move it, and none of them are predictions the tracker makes.",
    ],
  },
};
