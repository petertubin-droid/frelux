import type { LongFormArticle } from "@/config/faq-longform";

export const SERVICES2_LONGFORM: Record<string, LongFormArticle> = {
  "solar-pv-estimator": {
    description: `A solar estimate is a list of components at the quantities a design calls for. Panels, an inverter, mounting, cable, isolators and a battery if one is specified, each with its own count, and each with a price that comes from a price book or from you. The tool does not decide the array, because the array follows from the load and the roof.

What it refuses to do is invent the sunny hours. Yield depends on the location, the tilt, the shading and the losses, and those are site facts rather than constants. Where a figure is not supplied, the page asks, so a yield number in the estimate can be traced to an assumption someone made deliberately rather than one the tool made quietly.`,
    functions: [
      "Counts panels from the array size and the panel rating you specify, then rounds to whole panels.",
      "Counts inverters, isolators, meters and protection from the array and the configuration you describe.",
      "Calculates mounting from the panel count and the rail system's coverage per panel.",
      "Calculates cable from the measured runs and the sizes you assign, including the DC and AC sides separately.",
      "Prices each component from the market price book, or asks for a figure where none exists.",
      "Reports a component with no price as a gap rather than carrying it at zero.",
    ],
    worked:
      "A five kilowatt array in four hundred and fifty watt panels is twelve panels, not eleven and a bit, therefore twelve. Mounting at two rails of two and a half metres per panel gives sixty metres of rail with the clamps the system needs. A five kilowatt inverter with a DC isolator, an AC isolator and a generation meter completes the component list. Cable from the measured DC run of eighteen metres and the AC run of nine metres, and prices from the book or from your supplier. The yield figure, if you enter one, is yours, and it is the only number on the page that depends on the weather.",
    advantages: [
      "Components are counted rather than quoted as a package, so a quote can be checked line by line.",
      "Panels round to whole units, which is what ships.",
      "Cable follows measured runs, which is where packaged quotes are usually light.",
      "Missing prices appear as gaps instead of zeros.",
      "Yield is an explicit input rather than a hidden assumption.",
    ],
    limits: [
      "It does not design the array, the string configuration or the protection.",
      "It does not calculate yield, shading or payback.",
      "It does not assess the roof structure or its waterproofing.",
      "It does not include installation, scaffolding or commissioning.",
      "It does not cover grid connection, metering arrangements or permits.",
    ],
    answers: [
      `As a component takeoff. You describe the array size and the equipment, and it returns panels, inverters, isolators, mounting, cable and protection at the quantities that configuration needs, priced from the market book or from figures you supply. It does not decide the size of the system, because that follows from the load and the roof, and it does not forecast production, because that follows from the site.`,
      `Panel and inverter counts follow from the array size and the equipment you specify, mounting follows the panel count and the rail system, and cable follows the measured runs. Every one of those is arithmetic once the design is fixed. Where a component's coverage is a property of the product, such as how many clamps a rail system needs per panel, that comes from the product record rather than from a guess.`,
      `It is reported as a gap. A component carried at zero would make the quote look complete and would produce a total that cannot be delivered, and on a solar job the unpriced item is often the battery or the mounting system, which is not a rounding error. The page shows the gap so it can be closed with a real figure before the quote goes out.`,
      `No. Array size, string length, inverter matching, protection and earthing are design decisions that follow from the load profile, the roof and the regulations where you are building. What the tool does is take a decided design and return the components and their quantities, which is the part that can be counted and priced before anything is ordered.`,
      `No. Sun hours, tilt, azimuth, shading and system losses are all site specific, and a default figure would produce a yield estimate that looks precise and is wrong for most locations. Where you supply a figure, the page uses it and the assumption is visible. Where you do not, the estimate covers materials and leaves production to a proper yield calculation.`,
    ],
  },
  generator: {
    description: `A backup power takeoff covers the equipment and the connections, not the sizing. Generator size follows from the load, the starting currents and whether the set has to run the whole building or a protected subset, and that is an electrical design question rather than a quantity.

What the tool does is count the components a decided installation needs: the set itself, the changeover, the protection, the cable and the earthing, at the capacities you specify. Where a cable run has not been measured, it says so, because the run to a generator is often the longest cable on the site and the one most often priced from a guess.`,
    functions: [
      "Counts the generator, changeover switch and protection at the capacities you specify.",
      "Calculates cable from the measured runs, by size, on the generator side and the distribution side.",
      "Counts earthing materials from the electrode arrangement you describe.",
      "Calculates fuel storage from the tank capacity and the number of tanks you need, with the bund and the pipework those tanks require.",
      "Counts containment, tray or conduit for the runs you describe, since a generator feed is rarely a cable in free air.",
      "Reports an unmeasured run as missing rather than applying a per metre allowance.",
    ],
    worked:
      "A sixty kilovolt ampere set with a changeover rated for the same current, a distribution board for the protected circuits, and a cable run of twenty two metres from the set to the changeover. Two earth electrodes at the set and one at the building, with the conductor between them. A thousand litre tank, or two of five hundred if that is what the site can take, each on a bund with a fill point and a vent. The set and the changeover were specified before the tool was opened, which is the only order that produces a defensible installation.",
    advantages: [
      "Equipment and connections are counted separately, so a quote can be compared item by item.",
      "Cable follows the measured run, which is where packaged quotes fall short.",
      "Earthing is counted, which is the item most often left out of a backup power quote.",
      "Fuel storage follows the capacity you specify.",
      "An unmeasured run is reported rather than assumed.",
    ],
    limits: [
      "It does not size the generator for a load.",
      "It does not design the changeover, protection or earthing arrangement.",
      "It does not include fuel consumption, running cost or servicing.",
      "It does not include enclosures, acoustic treatment, exhaust routing or the slab and bund the set stands on.",
      "It does not include installation labour, commissioning, load testing or the fuel to run the set during commissioning.",
      "It does not include a service contract, spares holding or the maintenance schedule the set will need.",
    ],
    answers: [
      `No. Generator sizing follows from the connected load, the starting current of the largest motor, the diversity you expect and whether the set takes the whole building or a protected subset, and it is calculated by an electrical engineer rather than by a quantity tool. The tool takes a size you have decided and returns the equipment and connections that size requires, which is the part a supplier and an installer both need.`,
      `The set, the changeover, the protection, the cable by size, the earthing materials, the fuel storage and any containment for the runs. Each is counted from your specification and your measured routes rather than from a rule per kilowatt. That matters because two installations of the same capacity can differ by a hundred metres of cable depending on where the set sits and where it connects.`,
      `Because a generator is often the furthest thing from the board that it feeds, so its cable run is the longest on the site and the easiest to underestimate. A per metre allowance would be wrong in both directions, and the error lands on the most expensive cable in the building. Measuring the route and entering it keeps the order tied to the actual layout.`,
      `Fuel is not included as a cost. The tool counts storage capacity, which is a capital item, but consumption depends on the load profile and the set's specific consumption, and running cost depends on the fuel price where you are. Those are operating figures that belong in a different calculation from an installation takeoff.`,
      `No. Protection coordination, earthing design, changeover arrangements and the enclosure are all installation design, and the local wiring regulations govern them. The takeoff counts what the design calls for, so the installation can be priced and the materials ordered. Certification of the completed installation is a separate act by a competent person, and no quantity tool can stand in for it.`,
    ],
  },
  "heat-comfort": {
    description: `Two roofs of identical construction can behave differently in the sun, and the difference is usually the surface. This tool compares surfaces: their reflectance, their emittance and the effect those properties have on how much heat a building absorbs, so a specification choice has a number attached to it rather than an adjective.

It is a comparison tool, not a simulation. It does not predict an indoor temperature, because that depends on the whole building, the ventilation and the occupancy. What it does is put two surface specifications side by side with their published properties, so the case for a lighter roof or a different coating can be made on evidence rather than on a habit.`,
    functions: [
      "Compares two surfaces on their solar reflectance and thermal emittance, using published product values.",
      "Reports the difference in absorbed heat implied by those properties, on the area you enter.",
      "Keeps the comparison on like terms, so a roof is compared with a roof and a wall with a wall.",
      "Shows the source of each property, so a figure can be traced to the product it describes.",
      "Reports an unspecified property as missing rather than assuming a value.",
      "Keeps the comparison separate from the quantity, since the two surfaces are usually the same area.",
      "Reports the absorbed load difference in watts over the area you enter, so the effect is physical rather than descriptive.",
      "Keeps the surface properties and the quantity on separate pages of reasoning, so a specification change can be assessed before it is priced.",
    ],
    worked:
      "A dark roof at a reflectance of zero point one absorbs nine tenths of the sun falling on it, and a white coating at zero point eight absorbs a fifth. On a hundred square metres at a peak irradiance of a thousand watts per square metre, the difference in absorbed load is about seven hundred watts per degree of exposure, which is a real number in a hot climate even before the building's own thermal mass is considered. The tool puts those two figures side by side; it does not tell you what the indoor temperature will be, because that needs the rest of the building.",
    advantages: [
      "Surfaces are compared on published properties rather than on description.",
      "The difference in absorbed heat is quantified on your area.",
      "Each property is traceable to the product it came from.",
      "The comparison is kept separate from the quantity, which rarely changes.",
      "A missing property is reported, not assumed.",
    ],
    limits: [
      "It does not predict indoor temperature, energy use or comfort.",
      "It does not run a thermal simulation or model ventilation.",
      "It does not qualify a building for any certification or rating.",
      "It does not account for dirt, ageing, weathering or the maintenance a reflective surface needs to keep its properties.",
      "It does not assess the structure, waterproofing or detailing.",
    ],
    answers: [
      `Two surface specifications. Each is described by its solar reflectance, its emittance and the product it came from, and the tool reports what those properties mean for the heat absorbed over the area you enter. It is a like for like comparison, so the value is in showing a client or a specifier the measured difference between a dark finish and a reflective one on the same building.`,
      `From the product data, and the page shows where each figure came from so it can be checked. Reflectance and emittance are measured properties with standard test methods, and manufacturers publish them. Where a product has no published value, the tool reports the gap rather than assigning a typical figure, because a comparison built on an assumed property proves nothing.`,
      `No. Indoor temperature depends on the whole building: the walls, the glazing, the shading, the ventilation, the thermal mass and how people use it. A surface comparison isolates one variable, which is what makes it useful and what makes it insufficient on its own. If you need a temperature prediction, that is a building simulation with the whole envelope in it.`,
      `Because a single surface tells you nothing. The point of the tool is the difference between two options on the same building, which is the decision actually being made when a roof colour or a coating is chosen. Comparing one surface with nothing would produce a number without a reference point, and the specification decision would still be made on impression.`,
      `No. Certification and rating schemes assess the whole building against a published standard, with modelling, verification and a assessor involved. A property comparison supports a specification choice, and it may be one input into a submission, but it does not qualify anything by itself. Claiming otherwise would be claiming a credential the tool cannot produce.`,
    ],
  },
};
