import type { LongFormArticle } from "@/config/faq-longform";

export const SERVICES_LONGFORM: Record<string, LongFormArticle> = {
  electrical: {
    description: `An electrical estimate is a count and a length. The count is points, the length is the route from the board to each point, and everything else on the page is those two numbers multiplied by the materials a circuit needs. Cable, conduit, boxes, switches and boards all follow from them, which is why the estimate is only as good as the layout it is built from.

What the tool will not do is design the installation. Cable size follows current, protection and volt drop, circuits follow the load and the regulations in force where you are building, and both are an electrician's decisions. Once those are made and the points are marked, the material quantity is arithmetic, and that is the part the estimator owns. Where a run has not been measured, it is reported as missing instead of estimated.`,
    functions: [
      "Counts points from the schedule you enter: sockets, switches, light positions and fixed appliance outlets, each with its own run.",
      "Multiplies the points by the measured route length, including the drop from ceiling level to each accessory.",
      "Selects cable by the circuit type and size you assign, then sums the length by size for the cable order.",
      "Counts back boxes, mounting boxes, plates and accessories from the points, and boards from the circuits you specify.",
      "Applies the waste allowance you set to the cable and the accessories, as separate visible lines.",
      "Reports an unmeasured run as missing, so an incomplete layout cannot total as a finished one.",
    ],
    worked:
      "A three bedroom house with forty two points, an average run of eleven metres including the drop, gives four hundred and sixty two metres of route. Allow ten percent for dressing and terminations and the cable order is about five hundred and ten metres, split by the sizes you assigned: sockets on two point five square millimetre, lighting on one point five. Add forty two back boxes, the plates for the same count, one distribution board with the ways you specified, and the outlets. The estimate is a count and a length throughout, and the only figure a sparky is likely to change is the route, which is why measurement is the input that matters.",
    advantages: [
      "Points and routes stay separate, so a change in layout does not disturb the cable arithmetic.",
      "Cable is summarised by size, which is how it is bought.",
      "Accessories are counted from the points, so back boxes and plates are not forgotten.",
      "An unmeasured run shows as a gap instead of a guessed length.",
      "The estimate states that design and certification sit with the electrician.",
    ],
    limits: [
      "It does not size cable, select protective devices or check volt drop.",
      "It does not design circuits, earthing or the consumer unit's configuration.",
      "It does not include testing, certification or the labour to install.",
      "It does not include specialist systems such as fire alarm, data or CCTV unless you count them as points.",
      "It does not know your local wiring regulations, which is a design input you supply.",
    ],
    answers: [
      `Count the points and measure the routes. The estimate takes your schedule of sockets, switches, light positions and outlets, multiplies each by the run you measured, and returns cable by size, conduit, boxes, plates and the board. Two inputs drive everything: the number of points, which sets the accessories, and the average or measured route, which sets the cable. A layout that is not yet marked up cannot produce a cable figure, and the tool says so.`,
      `No, and the page says so. Cable size follows current, protection and volt drop; circuits follow the load and the wiring regulations where you are building; testing and certification follow the installation. The estimate measures materials for a design someone else has made. What it gives you is an order you can price before work starts, which is a different document from a certificate.`,
      `Usually because the route differs. An electrician measuring on site follows the actual path through joists, around obstructions and down the wall, and often adds a margin by habit. The estimate uses the length you enter, so if your average run is a straight line between board and point, it will be short. Enter the length you would actually pull, including the drop at each end, and the two numbers converge.`,
      `Count what you are installing, not what a schedule of rates assumes for a room. Each socket, switch, light position and fixed outlet is a point with its own run, and the count converts into cable, conduit, boxes and plates. Two rooms with the same floor area can differ by ten points, which is the difference the estimate is built to carry. Counting from the drawing also makes the estimate checkable against the second fix.`,
      `Yes, when you enter a measured route. The distance is from the distribution board to the point along the path the cable takes, which includes the climb from the board and the drop from ceiling level to a socket. A route measured along the wall at socket height understates the cable by the drop, which on a two storey building is a meaningful number of metres across the whole job.`,
    ],
  },
  "conduit-wiring-estimator": {
    description: `Conduit is the one electrical material that is bought almost entirely by length, and its length is decided by the route rather than by the number of rooms. The estimator takes the runs you describe, adds the boxes and couplings those runs need, and returns an order in the units a supplier sells.

Cable inside the conduit is measured on the same run, because it is pulled through the same path. That single decision, measuring conduit and cable from one route, is what keeps the two orders consistent. Where a run carries three circuits the conduit is larger, and the estimator lets you say so per run instead of applying one size across the building.`,
    functions: [
      "Calculates conduit length from the runs you enter, with the number of bends and the drop at each end included.",
      "Sizes each run from the cable count you assign, so a busy run is not priced as a single circuit.",
      "Counts boxes, couplings and saddles from the run length and the points along it.",
      "Measures the cable on the same route, with the cores and size you specify per circuit.",
      "Reports a run with no measured length as missing rather than assuming a per point average.",
      "Keeps surface, concealed and buried conduit on separate lines, since they take different products.",
    ],
    worked:
      "A flat with twenty two light and socket points on a measured route averaging nine metres gives a hundred and ninety eight metres of conduit, and the same length of cable per single circuit run. Allow ten percent for terminations and the order is about two hundred and eighteen metres of conduit with the same in cable, plus twenty two boxes, the couplings for the joints and saddles at the spacing you set. Add one run of four circuits on a longer path and that run is sized up, with its cable counted three times over, which is what the per run inputs are for.",
    advantages: [
      "Conduit and cable are measured from one route, so the two orders agree.",
      "Runs are sized individually, which matches how a busy corridor differs from a bedroom.",
      "Bends and drops are counted, which is where a length-only estimate falls short.",
      "Boxes and couplings follow the run, not a rate per point.",
      "A run without a measurement is reported as a gap.",
    ],
    limits: [
      "It does not size conduit or cable, and it does not check fill or derating.",
      "It does not design circuits, protection or earthing.",
      "It does not include trunking, tray or ladder unless you measure it as a run.",
      "It does not include testing, certification or labour.",
      "It does not cover fire alarm or data containment, which have their own requirements.",
    ],
    answers: [
      `Measure the runs. Conduit is bought by length, so the only figure that matters is the path each run takes from the board through the building to its last point, plus the drops at each end. An average of nine metres over twenty odd points is a typical flat; a larger house with long corridors and two floors is nearer twelve. The estimator multiplies your measured runs by their count and adds the boxes and couplings the joints need.`,
      `From the circuit design, not from the estimate. Cable size follows the current the circuit carries, the protective device, the grouping and the volt drop, and every one of those is a design decision made against the wiring regulations where you are building. The estimator asks you what size you are pulling and adds the lengths by size, so the cable order matches the design. Using the tool to choose a size would be using a measuring tape as a rule book.`,
      `Yes, both are counted. Boxes follow the points, with a box at every accessory and at every joint, and switch plates follow the switches. Couplings follow the joints in the run, which is a function of the length and the stock lengths you buy. That is why the accessory count is not a rate per square metre: a room with four switches and no sockets needs four boxes and four plates, whatever its floor area.`,
      `Surface, concealed and buried, each on its own line, because they are different products with different costs and different installation work. A surface run in a garage and a buried run to a gate light do not belong in one total. The estimator keeps them apart and applies your measured length to each, so a change of method shows in the order instead of disappearing into an average.`,
      `The cable runs inside the conduit on the same path, so its length follows the conduit's length with the number of cores you specify for the circuit. Where a run carries three circuits, the cable is counted three times and the conduit sized for the group. A draw wire or spare capacity is a separate item you add deliberately, not an allowance folded into the cable, because a spare capacity that nobody records tends to be forgotten at second fix.`,
    ],
  },
  plumbing: {
    description: `A plumbing estimate follows the pipe. Runs are measured, fittings are counted where the runs turn and branch, and fixtures are counted where they are installed. The three are bought differently, so they are calculated separately and then presented as one order.

What the estimator refuses to do is guess the route. A plumbing layout in a building that is not yet built is a drawing rather than a measurement, and a measured route and a straight line between two fixtures differ by a surprising amount once risers, bends and falls are counted. Where a run has not been measured, the page reports it, which is the difference between an estimate that can be checked and one that merely looks complete.`,
    functions: [
      "Calculates pipe length from the measured runs you enter, by diameter and by service.",
      "Counts fittings at the terminations and branches you describe: elbows, tees, reducers and couplers.",
      "Counts fixtures from your schedule, with the valves and traps each one needs.",
      "Separates supply, waste and drainage runs, since they take different materials and different falls.",
      "Applies the waste allowance you set to pipe and fittings as separate visible lines.",
      "Reports a run without a measurement as missing rather than assuming a length per fixture.",
    ],
    worked:
      "A bathroom refit with four fixtures, a measured supply run of twenty two metres in fifteen millimetre pipe and a waste run of nine metres in forty millimetre, gives thirty one metres of pipe, twenty eight fittings at the terminations and branches, and the fixtures with their valves and traps. Add a water heater and its isolation valves and the schedule grows by the fittings that connection needs. Nothing in the order came from the fixture count alone, which is the reason the runs are the input that matters.",
    advantages: [
      "Pipe, fittings and fixtures are counted separately, which matches how they are bought.",
      "Supply, waste and drainage runs stay apart, so materials are not mixed.",
      "Fittings follow the route, which is where a per fixture rate runs short.",
      "A missing measurement is reported, keeping an incomplete layout visible.",
      "Valves and traps are counted with the fixtures that need them, and not left to second fix.",
    ],
    limits: [
      "It does not size pipe or design the system, and it does not check pressure or flow.",
      "It does not include water storage, pumping or treatment beyond what you count.",
      "It does not include sanitary ware outside your schedule.",
      "It does not include excavation, trenching or making good.",
      "It does not include labour, testing, chlorination or certification, which the installer carries.",
    ],
    answers: [
      `Measure the runs and count the fixtures. Supply, waste and drainage are measured separately because they take different pipe and different falls, and fittings are counted where those runs turn or branch. The estimate then returns pipe by diameter, fittings by type and the fixtures with their valves and traps. A plumbing estimate that starts from a fixture count and a rate per bathroom will be short on pipe and fittings every time.`,
      `No, it does not. A septic tank, soakaway or treatment plant is a separate design, sized from the occupancy and the ground, and it has its own material and excavation quantities. The estimator covers the pipe, fittings and fixtures inside the building. Where a drainage run leaves the building, measure it as a drainage run and price the tank or soakaway separately, so the two numbers stay checkable.`,
      `From the design and the fixture demand, not from a table in a quantity tool. Supply sizes follow the flow and pressure available, waste sizes follow the fixtures discharging into them and the fall, and drainage follows both plus the local regulations. The estimator asks which size you are running and adds the length by size, so the order matches a design that has already been made.`,
      `Pipe measured by length, fittings counted, and the fixtures you schedule with the valves, traps and connections each one needs. Supply, waste and drainage stay on their own lines. Insulation, supports and fixings are counted where you specify them. It is a material estimate for the plumbing installation, and it deliberately stops at the fixtures rather than wandering into the rooms around them.`,
      `Falls add length on drainage runs, since a pipe running at a gradient covers more distance than its horizontal projection, and bends add fittings at every change of direction. Measure the route along its actual line and count the bends the route needs. The estimator uses your measured route, and a route you have not measured is reported as missing instead of being closed with an assumption.`,
    ],
  },
  "doors-windows": {
    description: `Doors and windows are counted, not measured, which makes this the simplest estimate in the catalogue and the one most often got wrong. The reason is that the count is decided by a schedule, and a schedule that is a room list rather than a door and window list will always be short.

The estimator works from the counts you enter, by type and size, and returns the units, frames and ironmongery each one needs. It does not add a waste percentage to a door, because a door is not cut from a longer door. It does not invent a count when you leave the schedule blank, because a blank schedule is a design that has not been finished rather than a house with no doors.`,
    functions: [
      "Counts doors and windows by type and size from the schedule you enter.",
      "Adds frames, architraves and linings per opening according to the specification you choose.",
      "Counts ironmongery from the unit types: hinges by leaf count, locksets, handles, stays and closers.",
      "Calculates glazing and sill items where the unit type calls for them.",
      "Reports a blank schedule as missing rather than defaulting a count per room.",
      "Separates external and internal units, since they are different products with different performance requirements.",
    ],
    worked:
      "A three bedroom house with nine internal doors and eleven windows: the doors bring nine units, nine frames, nine linings and eighteen hinges if two hinges per leaf are specified, plus nine locksets and nine sets of handles. The windows bring eleven units with their frames and sills, and the opening restrictors or stays the specification calls for. Nothing is multiplied by a waste factor, because the order is whole units. Change a window to a door and the schedule moves by one in each direction, which is exactly what a schedule is for.",
    advantages: [
      "Units are counted rather than measured, which is how they are bought.",
      "Ironmongery follows the unit types, so hinges and locks are not forgotten.",
      "External and internal units stay apart, which keeps performance specifications clear.",
      "A blank schedule is reported instead of filled with a per room assumption.",
      "No waste allowance is applied to items that cannot be cut from stock.",
    ],
    limits: [
      "It does not design the openings, and it does not check structural lintels or restraints.",
      "It does not specify performance, security or fire ratings.",
      "It does not include installation, sealants or expanding foam.",
      "It does not include decoration or making good around the openings.",
      "It does not check the schedule against the drawing, which is a takeoff job.",
    ],
    answers: [
      `Count them from the door and window schedule, by type and size, then let the estimator add the frames, linings and ironmongery each unit needs. Two counts drive everything: how many units of each type, and what specification each type carries. A room list is not a schedule, because a bedroom door and a bathroom door are different products with different ironmongery, and a count that mixes them produces an order that has to be corrected on site.`,
      `Frames and architraves are added where your specification calls for them, and ironmongery is counted from the unit types: hinges by leaf, locksets and handles per door, stays and restrictors per window. What is not included is the installation side, which covers sealant, foam, packers, fixings and the labour to hang and adjust. Those are priced by the fitter, and folding them into a unit price hides the difference between a straightforward opening and an awkward one.`,
      `No. A waste allowance exists because a material is cut from a longer length or a larger sheet, and a door is not cut from anything. Waste on doors and windows is really damage, mis measurement or a change of mind, and the way to handle that is a stated contingency rather than a percentage applied to every unit. The estimator returns whole units, which is what arrives on the lorry.`,
      `It reports the schedule as missing and leaves the line empty. A blank door count means the schedule has not been made yet, not that the building has no doors, and filling the gap with a count per room would produce an order that looks complete and is wrong. The page is designed so an unfinished design shows as unfinished, which is more useful than a number that has to be unpicked later.`,
      `Hinges are counted per leaf, so a pair of doors carries twice the hinges of a single leaf, and the specification decides whether that is two or three per leaf. Locksets, handles and closers are counted per door, with the type following the schedule, since a bathroom lock and a front door lock are different products. The estimator links all of this to the unit type, so changing a door's specification changes its ironmongery without a second pass.`,
    ],
  },
};
