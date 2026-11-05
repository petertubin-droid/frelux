// =========================================================
// FRELUX ARCHITECTURAL MATHEMATICS FOR TALL BUILDINGS
//
// The structural engine answers whether the frame can carry the building. This
// module answers the architectural questions that decide the plan before the
// frame is drawn: how much of the floor plate is lettable, how deep daylight
// reaches, whether the core has room for the vertical transport the population
// needs, and whether the stairs are wide enough.
//
// Every relationship is a published planning one:
// - Lettable efficiency from core and structure area against gross area.
// - Facade to floor ratio from perimeter and storey height.
// - Daylight band from a 7 m depth measured in from the facade.
// - Lift round trip time from the CIBSE and Davenport form: travel, probable
//   stops S = N (1 - (1 - 1/N)^P), stop time, and passenger transfer.
// - Egress width from the International Building Code 1005.3.2, 5 mm per
//   occupant on stairs, with the 1,120 mm minimum clear width.
//
// These are planning figures. They are not a fire engineered egress analysis and
// they are not a lift traffic study.
// =========================================================

export type TallOccupancy = "office" | "residential" | "hotel" | "education";

export interface OccupancyProfile {
  label: string;
  /** Usable floor area per person, m². */
  areaPerPerson: number;
  /** Peak arrival rate as a fraction of the population in five minutes. */
  arrivalRate: number;
  /** Target lift interval, seconds. */
  targetInterval: number;
  /** Minimum finished floor to ceiling height, m. */
  minimumClearHeight: number;
}

export const OCCUPANCY_PROFILES: Record<TallOccupancy, OccupancyProfile> = {
  office: {
    label: "Office",
    areaPerPerson: 10,
    arrivalRate: 0.12,
    targetInterval: 30,
    minimumClearHeight: 2.7,
  },
  residential: {
    label: "Residential",
    areaPerPerson: 22,
    arrivalRate: 0.06,
    targetInterval: 50,
    minimumClearHeight: 2.5,
  },
  hotel: {
    label: "Hotel",
    areaPerPerson: 18,
    arrivalRate: 0.08,
    targetInterval: 40,
    minimumClearHeight: 2.6,
  },
  education: {
    label: "Education",
    areaPerPerson: 6,
    arrivalRate: 0.2,
    targetInterval: 35,
    minimumClearHeight: 2.8,
  },
};

export interface ArchitecturalInput {
  floors: number;
  floorHeight: number;
  /** Height above ground, including any taller ground floor, m. */
  heightM: number;
  planLength: number;
  planWidth: number;
  coreArea: number;
  coreLength: number;
  coreWidth: number;
  slabThickness: number;
  columnCount: number;
  columnSizeMm: number;
  occupancy: TallOccupancy;
  /** Depth in from the facade that counts as daylit, m. */
  daylightDepthM: number;
  /** Ceiling void for services, m. */
  servicesZoneM: number;
  /** Lift car capacity in persons. */
  liftCarCapacity: number;
  /** Car speed in m/s. If omitted, derived from the height. */
  liftSpeedMs?: number;
}

export interface LiftAnalysis {
  population: number;
  carsRequired: number;
  roundTripTimeS: number;
  intervalS: number;
  handlingCapacityPct: number;
  probableStops: number;
  carSpeedMs: number;
  /** Shaft and lobby area the cars need, m². */
  coreAreaNeededM2: number;
  fitsInCore: boolean;
  intervalOk: boolean;
}

export interface ArchitecturalResult {
  grossFloorAreaM2: number;
  netLettableAreaM2: number;
  efficiencyPct: number;
  coreToPlateRatioPct: number;
  facadeAreaM2: number;
  facadeToFloorRatio: number;
  daylitAreaM2: number;
  daylitPct: number;
  clearHeightM: number;
  clearHeightOk: boolean;
  occupantsPerFloor: number;
  totalOccupants: number;
  egressWidthRequiredMm: number;
  egressWidthProvidedMm: number;
  egressOk: boolean;
  exitsRequired: number;
  lifts: LiftAnalysis;
  proof: string[];
}

const round = (value: number, places = 2) => {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
};

/**
 * Lift round trip time for a single bank serving every floor.
 *
 *   S = N (1 - (1 - 1/N)^P)        probable stops for P passengers over N floors
 *   RTT = 2H/v + (S + 1) t_s + 2P t_p
 *
 * with t_s the stop time (door cycle plus levelling) and t_p the transfer time
 * per passenger. Handling capacity is 300 C / RTT persons per five minutes, and
 * the number of cars follows from the arrival rate the occupancy needs.
 */
export function calculateLiftTraffic(params: {
  floors: number;
  heightM: number;
  population: number;
  carCapacity: number;
  arrivalRate: number;
  targetInterval: number;
  carSpeedMs?: number;
  /** Core plan area available for shafts and lobby, m². */
  coreAreaM2: number;
}): LiftAnalysis {
  const servedFloors = Math.max(2, params.floors);
  const carSpeed =
    params.carSpeedMs ?? Math.min(10, Math.max(1.6, 1.6 + params.heightM / 90));
  const stopTimeS = 7; // door cycle and levelling
  const transferTimeS = 1.2; // per passenger
  const probableStops =
    servedFloors * (1 - Math.pow(1 - 1 / servedFloors, params.carCapacity));
  const roundTripTimeS =
    (2 * params.heightM) / carSpeed +
    (probableStops + 1) * stopTimeS +
    2 * params.carCapacity * transferTimeS;
  const handlingPerCar =
    (300 * params.carCapacity) / Math.max(roundTripTimeS, 1);
  const demand = params.population * params.arrivalRate;
  const carsRequired = Math.max(
    1,
    Math.ceil(demand / Math.max(handlingPerCar, 0.1)),
  );
  const intervalS = roundTripTimeS / carsRequired;
  const handlingCapacityPct =
    (carsRequired * handlingPerCar * 100) / Math.max(params.population, 1);
  // A car needs about 5.5 m² of shaft and each needs lobby space; 1.35 is the
  // planning allowance for walls and the lift lobby.
  const coreAreaNeededM2 = carsRequired * 5.5 * 1.35;

  return {
    population: Math.round(params.population),
    carsRequired,
    roundTripTimeS: round(roundTripTimeS, 1),
    intervalS: round(intervalS, 1),
    handlingCapacityPct: round(handlingCapacityPct, 1),
    probableStops: round(probableStops, 1),
    carSpeedMs: round(carSpeed, 2),
    coreAreaNeededM2: round(coreAreaNeededM2, 0),
    fitsInCore: coreAreaNeededM2 <= params.coreAreaM2,
    intervalOk: intervalS <= params.targetInterval,
  };
}

export function calculateArchitecturalMath(
  input: ArchitecturalInput,
): ArchitecturalResult {
  const profile = OCCUPANCY_PROFILES[input.occupancy];
  const plate = input.planLength * input.planWidth;
  const height =
    input.heightM > 0 ? input.heightM : input.floors * input.floorHeight;
  const grossFloorArea = plate * input.floors;

  const columnArea = input.columnCount * Math.pow(input.columnSizeMm / 1000, 2);
  const netLettableArea = (plate - input.coreArea - columnArea) * input.floors;
  const efficiencyPct = (netLettableArea / grossFloorArea) * 100;

  const perimeter = 2 * (input.planLength + input.planWidth);
  const facadeArea = perimeter * height;
  const facadeToFloorRatio = facadeArea / grossFloorArea;

  // Daylight band: the plate minus the inner rectangle left when every edge is
  // set back by the daylight depth.
  const innerLength = Math.max(0, input.planLength - 2 * input.daylightDepthM);
  const innerWidth = Math.max(0, input.planWidth - 2 * input.daylightDepthM);
  const daylitArea = plate - innerLength * innerWidth;
  const daylitPct = (daylitArea / plate) * 100;

  const clearHeightM =
    input.floorHeight - input.slabThickness - input.servicesZoneM;

  const occupantsPerFloor =
    netLettableArea / input.floors / profile.areaPerPerson;
  const totalOccupants = occupantsPerFloor * input.floors;

  // IBC 1005.3.2: 5 mm of stair width per occupant, and 1006.3.1 requires two
  // exits once the occupant load passes 49.
  const egressWidthRequiredMm = Math.max(
    1120,
    Math.ceil(occupantsPerFloor * 5),
  );
  const egressWidthProvidedMm = 2400; // two 1,200 mm stairs, the usual core
  const exitsRequired = occupantsPerFloor > 49 ? 2 : 1;

  const lifts = calculateLiftTraffic({
    floors: input.floors,
    heightM: height,
    population: totalOccupants,
    carCapacity: input.liftCarCapacity,
    arrivalRate: profile.arrivalRate,
    targetInterval: profile.targetInterval,
    carSpeedMs: input.liftSpeedMs,
    coreAreaM2: input.coreArea,
  });
  const finalLifts: LiftAnalysis = lifts;

  return {
    grossFloorAreaM2: round(grossFloorArea, 0),
    netLettableAreaM2: round(netLettableArea, 0),
    efficiencyPct: round(efficiencyPct, 1),
    coreToPlateRatioPct: round((input.coreArea / plate) * 100, 1),
    facadeAreaM2: round(facadeArea, 0),
    facadeToFloorRatio: round(facadeToFloorRatio, 3),
    daylitAreaM2: round(daylitArea, 0),
    daylitPct: round(daylitPct, 1),
    clearHeightM: round(clearHeightM, 2),
    clearHeightOk: clearHeightM >= profile.minimumClearHeight,
    occupantsPerFloor: round(occupantsPerFloor, 1),
    totalOccupants: round(totalOccupants, 0),
    egressWidthRequiredMm,
    egressWidthProvidedMm,
    egressOk: egressWidthProvidedMm >= egressWidthRequiredMm,
    exitsRequired,
    lifts: finalLifts,
    proof: [
      `Lettable area = (${round(plate, 0)} m² plate - ${round(input.coreArea, 0)} m² core - ${round(columnArea, 1)} m² structure) x ${input.floors} = ${round(netLettableArea, 0)} m², ${round(efficiencyPct, 1)} percent of gross`,
      `Facade area = perimeter ${round(perimeter, 0)} m x ${round(height, 0)} m = ${round(facadeArea, 0)} m², a facade to floor ratio of ${round(facadeToFloorRatio, 3)}`,
      `Daylight: plate minus the inner rectangle set back ${input.daylightDepthM} m from every edge = ${round(daylitArea, 0)} m², ${round(daylitPct, 1)} percent of the plate`,
      `Clear height = ${input.floorHeight} - ${input.slabThickness} slab - ${input.servicesZoneM} services = ${round(clearHeightM, 2)} m against a ${profile.minimumClearHeight} m minimum for ${profile.label.toLowerCase()}`,
      `Occupancy: ${round(occupantsPerFloor, 1)} people per floor at ${profile.areaPerPerson} m² per person, ${round(totalOccupants, 0)} in the building`,
      `Egress: ${round(occupantsPerFloor, 1)} occupants x 5 mm = ${egressWidthRequiredMm} mm of stair width required, 2,400 mm provided by two stairs, ${exitsRequired} exits required`,
      `Lifts: ${finalLifts.carsRequired} cars at ${finalLifts.carSpeedMs} m/s, ${finalLifts.probableStops} probable stops, round trip ${finalLifts.roundTripTimeS} s, interval ${finalLifts.intervalS} s against a ${profile.targetInterval} s target, handling ${finalLifts.handlingCapacityPct} percent`,
      `Lift core: ${finalLifts.carsRequired} cars need about ${finalLifts.coreAreaNeededM2} m² including the lobby, against ${round(input.coreArea, 0)} m² of core`,
    ],
  };
}

export const ARCHITECTURAL_ENGINE_VERSION = "1.0.0";
