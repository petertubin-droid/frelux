/**
 * Long copy for the borehole and water system article.
 *
 * The page answers one figure at a time. This carries the whole job: the well,
 * the pump, the treatment train, the storage and, the part most calculators
 * skip, the stand the tank actually sits on. Standards are named so a reader
 * can check them. No prices, no coverage rates, no invented site conditions:
 * figures come from the market and the inputs.
 */

import type { LongFormArticle } from "@/config/faq-longform";

export const WATER_LONGFORM: Record<string, LongFormArticle> = {
  "borehole-water-system": {
    description:
      "A borehole is a chain of decisions that all have to agree: hole depth, drawdown under pumping, storage against the morning peak, treatment, and what holds the tank up.\n\nThis tool works that chain end to end on the numbers you give it, and it shows every step it took. Nothing is guessed from an address, and nothing is priced from a rate that was never verified for your market.\n\nThe stand is part of the design, not an afterthought: water load, tank shell, platform, piers, footings and wind are all carried through.",
    functions: [
      "Builds a strata profile for the depth and aquifer type you select, then sizes the plain casing, the slotted screen, the gravel pack and the cement bentonite sanitary seal from the annular volume between the drilled hole and the casing.",
      "Estimates drawdown from the safe yield and an aquifer specific capacity, gives you the pumping water level, and sets the pump below it with its riser friction worked out by Hazen Williams not a rule of thumb.",
      "Converts total dynamic head and flow into hydraulic power, then into a motor size at stated pump and motor efficiencies, then into a stocked rating, with a warning when the duty needs more than the largest standard motor.",
      "Sizes storage from the peak morning rush against what the pump delivers, adds an emergency reserve, and rounds to a tank that is actually sold.",
      "Designs the stand under that tank: water load, tank tare, stand and platform self weight, footing pads sized against an allowable bearing, a reinforced ring beam, and a check against the wind with the tank empty.",
      "Selects treatment stages from your lab figures against the usual drinking water limits, and produces a bill of quantities in quantities only, so your own price book sets the money.",
    ],
    advantages: [
      "Every number on the page traces back to an input or a stated assumption, so a quantity can be defended when a client or a bank asks how it was reached.",
      "The pump, the tank and the stand are sized together. A tank that is larger than the pump can fill, or a stand that cannot carry the tank it holds, shows up before the concrete is poured.",
      "Site realities are named out loud: a soil bearing figure with no test behind it, a stand past the slenderness limit for a freestanding pier, wind overturning with the tank empty, a pump set too close to the screen.",
      "The bill of quantities separates material quantities from money, so the same estimate works in Lagos, Nairobi, Manchester or Houston without rewriting a rate.",
    ],
    limits: [
      "Geology is modelled, not logged. Screen depth, gravel pack and drawdown follow from the depth and aquifer type you choose, so a geophysical log or a driller's log should replace them before work starts.",
      "Structural quantities are a bill, not a design. The stand ring beam, the pads and the columns are priced by quantity and checked against simple limits; a licensed engineer still signs the design that carries water.",
      "Wind is a static check at a basic speed. Sheltered sites and exposed rooftops behave differently, and no site specific study is done here.",
      "Water quality is judged against standard limits from the figures you enter. A laboratory assay on a real sample is the only thing that establishes potability, and treatment media are specified, not commissioned.",
    ],
    worked:
      "A household of six at a suburban standard of 150 litres a head uses 900 litres a day. The morning rush at 2.8 times the average hourly rate needs about 105 litres an hour more than a 2.5 cubic metre an hour pump delivers, which is roughly 210 litres of buffer, and a day and a half of reserve adds 1,350 litres, so the tool recommends a 1,500 or 2,000 litre tank depending on the next stocked size. That tank of water weighs about two tonnes. On four blockwork piers at 6 metres, the pier load, the platform and the ring beam all add up, and the pads come out around a metre square on a firm clay presumption of 100 kPa. If the ground turns out to be fill at 50 kPa, the same load needs wider pads, and the page says so instead of quietly pouring less concrete.",
    answers: [
      "The stand is sized from the load, not from a picture of one. A litre of water weighs a kilogram, so a 5,000 litre tank carries five tonnes before the tank shell, the ring beam, the deck and the piers are counted. That load is divided between the piers, and each pier gets a footing pad sized so the pressure on the ground stays inside the allowable bearing value. The tank sits on a reinforced concrete ring beam the full width of its base, because point loading a plastic tank on four block corners is how bases crack. Above 12 times the pier thickness the tool warns that a freestanding pier is getting slender, and past the BS 5628 limit of 27 it tells you to pour columns instead.",
      "Because the tower is the part that fails. A tank full of water six metres up behaves like a sail in wind and like a weight on whatever ground is under it, and those are two different checks. The wind check uses a basic wind speed for the market or your own figure, turns it into pressure, applies it to the tank and the stand, and compares the overturning moment with the resistance of the stand with the tank empty, at a required factor of safety of 1.5. The ground check compares the loaded pad pressure with the allowable bearing figure, which is a presumption unless you enter a test result.",
      "Set it below the pumping water level, not the static level, because the level falls while the pump runs. The tool estimates drawdown from the safe yield and the aquifer, adds it to the static level, and sets the pump about five metres below the result. It also checks the cased depth, because a pump cannot sit in an uncased hole, and it warns if the setting leaves less than two metres of submergence, if the pump lands at or below the top of the screen, or if the cased section is too shallow to place it where it should go. Those warnings change the drilling instruction, which is why they are printed instead of being silently corrected.",
      "Enough to cover the peak and survive an outage. The estimator takes your occupants and consumption tier, works out the daily demand, multiplies the average hourly rate by a peak factor for the morning rush, and measures that against what the pump delivers in the same hour. The shortfall over the rush window is the buffer. On top of it sits an emergency reserve of a day or more, because pumps fail, power goes and tanks run dry at the worst time. The total is then rounded to a tank that is actually sold not a theoretical volume nobody can order.",
      "It leaves out the things that need a person on site. The strata, the specific capacity and the water quality are modelled from what you enter, so a driller's log and a laboratory assay replace them. The stand is priced by quantity and checked against simple limits, not designed and signed: the ring beam reinforcement, the pad mesh and the column cage still need an engineer. Prices, tax and labour come from your price book, and where a market has no verified figure the tool does not invent one.",
    ],
  },
};
