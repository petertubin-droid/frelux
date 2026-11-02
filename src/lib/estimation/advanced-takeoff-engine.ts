/** Deterministic quantity takeoffs from explicit surveyed dimensions/schedules.
 * These are estimating methods, not structural design or geotechnical advice.
 */

export interface EngineResult<T> {
  ok: boolean;
  errors: string[];
  data: T | null;
}

const fail = <T>(...errors: string[]): EngineResult<T> => ({
  ok: false,
  errors,
  data: null,
});
const ok = <T>(data: T): EngineResult<T> => ({ ok: true, errors: [], data });

export interface RebarBarGroup {
  label: string;
  diameterMm: number;
  count: number;
  lengthM: number;
}

export type ConcreteElementType = "slab" | "beam" | "column" | "footing";

export interface ConcreteTakeoffInput {
  elementType: ConcreteElementType;
  lengthM: number;
  widthM: number;
  depthM: number;
  cementParts: number;
  sandParts: number;
  aggregateParts: number;
  wastePercent: number;
  cementBagMassKg: number;
  rebarGroups?: RebarBarGroup[];
}

export interface ConcreteTakeoffResult {
  elementType: ConcreteElementType;
  concreteVolumeM3: number;
  volumeWithWasteM3: number;
  cementBagsRaw: number;
  cementBagsToBuy: number;
  sandM3: number;
  aggregateM3: number;
  mixParts: [number, number, number];
  rebarGroups: Array<
    RebarBarGroup & { totalLengthM: number; weightKg: number }
  >;
  rebarWeightKg: number | null;
  assumptions: string[];
}

/** 1.54 dry-volume multiplier and 0.0347 m³/50 kg bag are the same
 * explicitly disclosed estimating conventions used by the existing estimator.
 */
export function calculateConcreteTakeoff(
  input: ConcreteTakeoffInput,
): EngineResult<ConcreteTakeoffResult> {
  const errors: string[] = [];
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  if (!positive(input.lengthM))
    errors.push("Slab length must be greater than zero.");
  if (!positive(input.widthM))
    errors.push("Slab width must be greater than zero.");
  if (!positive(input.depthM))
    errors.push("Slab depth must be greater than zero.");
  if (
    ![input.cementParts, input.sandParts, input.aggregateParts].every(positive)
  ) {
    errors.push(
      "Enter a positive cement, sand, and coarse-aggregate part for the specified mix ratio.",
    );
  }
  if (
    !Number.isFinite(input.cementBagMassKg) ||
    input.cementBagMassKg <= 0 ||
    input.cementBagMassKg > 500
  )
    errors.push(
      "Cement bag size must be greater than 0 kg and no more than 500 kg.",
    );
  if (
    !Number.isFinite(input.wastePercent) ||
    input.wastePercent < 0 ||
    input.wastePercent > 100
  ) {
    errors.push("Concrete allowance must be between 0% and 100%.");
  }
  for (const [index, bar] of (input.rebarGroups ?? []).entries()) {
    if (!bar.label.trim()) errors.push(`Rebar row ${index + 1} needs a label.`);
    if (!positive(bar.diameterMm))
      errors.push(`Rebar row ${index + 1}: diameter must be positive.`);
    if (!Number.isInteger(bar.count) || bar.count < 0)
      errors.push(
        `Rebar row ${index + 1}: bar count must be a whole number, zero or greater.`,
      );
    if (bar.count > 0 && !positive(bar.lengthM))
      errors.push(
        `Rebar row ${index + 1}: enter the scheduled length for each bar.`,
      );
  }
  if (errors.length) return fail(...errors);

  if (!["slab", "beam", "column", "footing"].includes(input.elementType))
    errors.push("Select a supported rectangular concrete element type.");
  if (errors.length) return fail(...errors);

  const concreteVolumeM3 = input.lengthM * input.widthM * input.depthM;
  const volumeWithWasteM3 = concreteVolumeM3 * (1 + input.wastePercent / 100);
  const dryVolume = volumeWithWasteM3 * 1.54;
  const totalParts = input.cementParts + input.sandParts + input.aggregateParts;
  const cementBagsRaw =
    (dryVolume * input.cementParts) /
    totalParts /
    ((0.0347 * input.cementBagMassKg) / 50);
  const rebarGroups = (input.rebarGroups ?? [])
    .filter((group) => group.count > 0)
    .map((group) => {
      const totalLengthM = group.count * group.lengthM;
      return {
        ...group,
        totalLengthM,
        weightKg: (totalLengthM * group.diameterMm ** 2) / 162,
      };
    });
  if (
    ![
      concreteVolumeM3,
      volumeWithWasteM3,
      dryVolume,
      totalParts,
      cementBagsRaw,
      (dryVolume * input.sandParts) / totalParts,
      (dryVolume * input.aggregateParts) / totalParts,
      ...rebarGroups.flatMap((group) => [group.totalLengthM, group.weightKg]),
    ].every(Number.isFinite)
  ) {
    return fail(
      "The entered slab dimensions or bar schedule are too large to calculate safely.",
    );
  }

  return ok({
    elementType: input.elementType,
    concreteVolumeM3,
    volumeWithWasteM3,
    cementBagsRaw,
    cementBagsToBuy: Math.ceil(cementBagsRaw),
    sandM3: (dryVolume * input.sandParts) / totalParts,
    aggregateM3: (dryVolume * input.aggregateParts) / totalParts,
    mixParts: [input.cementParts, input.sandParts, input.aggregateParts],
    rebarGroups,
    rebarWeightKg: rebarGroups.length
      ? rebarGroups.reduce((sum, group) => sum + group.weightKg, 0)
      : null,
    assumptions: [
      `Rectangular ${input.elementType} volume = measured length × width × depth; openings, haunches, and irregular geometry are not deducted or added.`,
      `Concrete dry-volume allowance: 1.54 × wet volume; user-entered additional allowance: ${input.wastePercent}%.`,
      `Cement bag-volume convention: 0.0347 m³ per 50 kg bag, scaled to the entered ${input.cementBagMassKg} kg bag size; procurement count rounds up to whole bags.`,
      "Rebar weight uses the entered bar schedule and d²/162 kg/m; it is not a reinforcement design or cutting schedule.",
    ],
  });
}

export interface EarthworkStation {
  chainageM: number;
  cutAreaM2: number;
  fillAreaM2: number;
}
export interface EarthworkInput {
  stations: EarthworkStation[];
  bulkingPercent: number;
  shrinkagePercent: number;
  cutSuitableForFill: boolean;
}
export interface EarthworkResult {
  cutBankM3: number;
  fillCompactedM3: number;
  cutLooseM3: number;
  fillBankEquivalentM3: number;
  netBankSurplusM3: number | null;
  importBankM3: number | null;
  intervals: Array<{
    fromM: number;
    toM: number;
    cutM3: number;
    fillM3: number;
  }>;
  assumptions: string[];
}

/** Average-end-area method. Cut and fill areas are supplied from surveyed/design
 * cross sections; percentages are project geotechnical inputs, never soil defaults.
 */
export function calculateEarthwork(
  input: EarthworkInput,
): EngineResult<EarthworkResult> {
  const errors: string[] = [];
  const stations = Array.isArray(input.stations) ? input.stations : [];
  if (stations.length < 2)
    errors.push("Enter at least two surveyed/design cross-section stations.");
  if (
    !Number.isFinite(input.bulkingPercent) ||
    input.bulkingPercent < 0 ||
    input.bulkingPercent > 300
  )
    errors.push("Bulking percentage must be between 0% and 300%.");
  if (
    !Number.isFinite(input.shrinkagePercent) ||
    input.shrinkagePercent < 0 ||
    input.shrinkagePercent >= 100
  )
    errors.push("Shrinkage percentage must be at least 0% and less than 100%.");
  if (stations.length >= 2) {
    stations.forEach((station, index) => {
      if (!Number.isFinite(station.chainageM) || station.chainageM < 0)
        errors.push(`Station ${index + 1}: chainage must be zero or greater.`);
      if (!Number.isFinite(station.cutAreaM2) || station.cutAreaM2 < 0)
        errors.push(`Station ${index + 1}: cut area must be zero or greater.`);
      if (!Number.isFinite(station.fillAreaM2) || station.fillAreaM2 < 0)
        errors.push(`Station ${index + 1}: fill area must be zero or greater.`);
      if (index > 0 && station.chainageM <= stations[index - 1].chainageM)
        errors.push(
          "Station chainages must be strictly increasing with no duplicates.",
        );
    });
  }
  if (errors.length) return fail(...errors);

  const intervals: EarthworkResult["intervals"] = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i],
      b = stations[i + 1];
    const intervalM = b.chainageM - a.chainageM;
    intervals.push({
      fromM: a.chainageM,
      toM: b.chainageM,
      cutM3: ((a.cutAreaM2 + b.cutAreaM2) / 2) * intervalM,
      fillM3: ((a.fillAreaM2 + b.fillAreaM2) / 2) * intervalM,
    });
  }
  const cutBankM3 = intervals.reduce(
    (sum, interval) => sum + interval.cutM3,
    0,
  );
  const fillCompactedM3 = intervals.reduce(
    (sum, interval) => sum + interval.fillM3,
    0,
  );
  const cutLooseM3 = cutBankM3 * (1 + input.bulkingPercent / 100);
  const fillBankEquivalentM3 =
    fillCompactedM3 / (1 - input.shrinkagePercent / 100);
  const net = input.cutSuitableForFill
    ? cutBankM3 - fillBankEquivalentM3
    : null;
  if (
    ![
      cutBankM3,
      fillCompactedM3,
      cutLooseM3,
      fillBankEquivalentM3,
      ...intervals.flatMap((interval) => [interval.cutM3, interval.fillM3]),
      ...(net === null ? [] : [net]),
    ].every(Number.isFinite)
  ) {
    return fail(
      "The entered station data or soil factors are too large to calculate safely.",
    );
  }
  return ok({
    cutBankM3,
    fillCompactedM3,
    cutLooseM3,
    fillBankEquivalentM3,
    netBankSurplusM3: net === null ? null : Math.max(0, net),
    importBankM3: net === null ? null : Math.max(0, -net),
    intervals,
    assumptions: [
      "Average end-area method between the entered cross sections; intermediate terrain changes are not inferred.",
      `Bulking ${input.bulkingPercent}% converts bank cut to loose haul volume only.`,
      `Shrinkage ${input.shrinkagePercent}% converts required compacted fill to bank-equivalent source volume only.`,
      input.cutSuitableForFill
        ? "User confirmed cut is suitable for the specified fill; balance is an indicative bank-volume balance."
        : "No cut/fill reuse balance is claimed because material suitability was not confirmed.",
    ],
  });
}

export interface RoofMemberSection {
  widthIn: number;
  depthIn: number;
}
export interface RoofAdditionalMember {
  label: string;
  count: number;
  lengthM: number;
  widthIn: number;
  depthIn: number;
}
export interface RoofFramingInput {
  lengthM: number;
  widthM: number;
  pitchRisePer12: number;
  overhangM: number;
  spacingM: number;
  roofType: "gable" | "hip";
  sections: {
    common: RoofMemberSection;
    jack: RoofMemberSection;
    hip: RoofMemberSection;
    ridge: RoofMemberSection;
  };
  additionalMembers?: RoofAdditionalMember[];
}
export interface RoofFramingGroup {
  label: string;
  count: number;
  lengthM: number;
  totalLengthM: number;
  widthIn: number;
  depthIn: number;
  boardFeet: number;
  layout: string;
}
export interface RoofFramingResult {
  ridgeLengthM: number;
  roofRiseM: number;
  groups: RoofFramingGroup[];
  totalLinearM: number;
  totalBoardFeet: number;
  valleyStatus: string;
  assumptions: string[];
}

const boardFeet = (
  lengthM: number,
  count: number,
  widthIn: number,
  depthIn: number,
) => (lengthM * count * 3.280839895 * widthIn * depthIn) / 12;
const sectionValid = (section: RoofMemberSection) =>
  Number.isFinite(section.widthIn) &&
  section.widthIn > 0 &&
  Number.isFinite(section.depthIn) &&
  section.depthIn > 0;

/** Regular rectangular gable or equal-pitch hip roof. It deliberately refuses
 * intersecting/valley geometry: those need explicit plan geometry or a verified schedule.
 */
export function calculateRoofFraming(
  input: RoofFramingInput,
): EngineResult<RoofFramingResult> {
  const errors: string[] = [];
  for (const [label, value] of [
    ["Building length", input.lengthM],
    ["Building width", input.widthM],
    ["Rafter spacing", input.spacingM],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0)
      errors.push(`${label} must be greater than zero.`);
  }
  if (
    !Number.isFinite(input.pitchRisePer12) ||
    input.pitchRisePer12 <= 0 ||
    (Math.atan(input.pitchRisePer12 / 12) * 180) / Math.PI >= 70
  )
    errors.push(
      "Roof pitch rise per 12 horizontal units must be positive and less than the model limit of 70°.",
    );
  if (!Number.isFinite(input.overhangM) || input.overhangM < 0)
    errors.push("Overhang must be zero or greater.");
  if (input.roofType !== "gable" && input.roofType !== "hip")
    errors.push("Select a supported gable or hip roof type.");
  for (const [name, section] of Object.entries(input.sections))
    if (!sectionValid(section))
      errors.push(
        `${name} member section width and depth must both be greater than zero.`,
      );
  for (const [i, member] of (input.additionalMembers ?? []).entries()) {
    if (
      !member.label.trim() ||
      !Number.isInteger(member.count) ||
      member.count < 1 ||
      !Number.isFinite(member.lengthM) ||
      member.lengthM <= 0 ||
      !sectionValid({ widthIn: member.widthIn, depthIn: member.depthIn })
    ) {
      errors.push(
        `Additional member row ${i + 1} needs a label, positive whole count, length, and section dimensions.`,
      );
    }
  }
  if (errors.length) return fail(...errors);

  const eaveLongM = Math.max(input.lengthM, input.widthM) + 2 * input.overhangM;
  const eaveShortM =
    Math.min(input.lengthM, input.widthM) + 2 * input.overhangM;
  const pitch = Math.atan(input.pitchRisePer12 / 12);
  const halfSpanM = eaveShortM / 2;
  const commonLengthM = halfSpanM / Math.cos(pitch);
  const ridgeLengthM =
    input.roofType === "gable"
      ? eaveLongM
      : Math.max(0, eaveLongM - eaveShortM);
  const roofRiseM = halfSpanM * Math.tan(pitch);
  const groups: RoofFramingGroup[] = [];
  const push = (
    label: string,
    count: number,
    lengthM: number,
    section: RoofMemberSection,
    layout: string,
  ) => {
    if (count <= 0 || lengthM <= 0) return;
    groups.push({
      label,
      count,
      lengthM,
      totalLengthM: count * lengthM,
      widthIn: section.widthIn,
      depthIn: section.depthIn,
      boardFeet: boardFeet(lengthM, count, section.widthIn, section.depthIn),
      layout,
    });
  };

  if (input.roofType === "gable") {
    const intervals = Math.ceil(eaveLongM / input.spacingM);
    const countPerSlope = intervals + 1;
    const actualSpacingM = intervals ? eaveLongM / intervals : eaveLongM;
    push(
      "Common rafters",
      countPerSlope * 2,
      commonLengthM,
      input.sections.common,
      `${countPerSlope} evenly distributed positions per slope at ≤ ${input.spacingM} m requested spacing; ${actualSpacingM.toFixed(3)} m actual.`,
    );
    push(
      "Ridge member",
      1,
      ridgeLengthM,
      input.sections.ridge,
      "One ridge line along the extended building length.",
    );
  } else {
    if (ridgeLengthM > 0)
      push(
        "Ridge member",
        1,
        ridgeLengthM,
        input.sections.ridge,
        "Centered ridge between the hip ends.",
      );

    const squareHip = Math.abs(eaveLongM - eaveShortM) < 1e-9;
    const jackGroups = new Map<
      string,
      {
        role: "Common rafters" | "Jack rafters";
        count: number;
        lengthM: number;
        layout: string;
      }
    >();
    const addHipRafterPosition = (
      role: "Common rafters" | "Jack rafters",
      planRun: number,
      count: number,
      layout: string,
    ) => {
      if (planRun <= 1e-9) return;
      const lengthM = planRun / Math.cos(pitch);
      const key = `${role}:${lengthM.toFixed(9)}`;
      const existing = jackGroups.get(key);
      if (existing) existing.count += count;
      else jackGroups.set(key, { role, count, lengthM, layout });
    };

    // Lay out each eave independently at equal spacing no greater than requested.
    // A rafter on a long eave reaches the ridge once it is inside the ridge footprint;
    // outside that footprint it terminates on the hip. End-eave members are jacks.
    const longIntervals = Math.ceil(eaveLongM / input.spacingM);
    const longSpacing = eaveLongM / longIntervals;
    for (let i = 1; i < longIntervals; i++) {
      const offset = i * longSpacing;
      const run = Math.min(offset, halfSpanM, eaveLongM - offset);
      const role =
        !squareHip && run >= halfSpanM - 1e-9
          ? "Common rafters"
          : "Jack rafters";
      addHipRafterPosition(
        role,
        run,
        squareHip ? 4 : 2,
        `${squareHip ? "Four equivalent eaves" : "Two long eaves"}; ${offset.toFixed(3)} m position, ${longSpacing.toFixed(3)} m actual eave spacing, ${run.toFixed(3)} m plan run.`,
      );
    }
    if (!squareHip) {
      const shortIntervals = Math.ceil(eaveShortM / input.spacingM);
      const shortSpacing = eaveShortM / shortIntervals;
      for (let i = 1; i < shortIntervals; i++) {
        const offset = i * shortSpacing;
        const run = Math.min(offset, halfSpanM, eaveShortM - offset);
        addHipRafterPosition(
          "Jack rafters",
          run,
          2,
          `Two short end eaves; ${offset.toFixed(3)} m position, ${shortSpacing.toFixed(3)} m actual eave spacing, ${run.toFixed(3)} m plan run.`,
        );
      }
    }
    for (const [key, group] of jackGroups) {
      const section =
        group.role === "Common rafters"
          ? input.sections.common
          : input.sections.jack;
      push(
        `${group.role} (${group.lengthM.toFixed(3)} m each)`,
        group.count,
        group.lengthM,
        section,
        group.layout,
      );
    }

    const hipLength = halfSpanM * Math.sqrt(2 + Math.tan(pitch) ** 2);
    push(
      "Hip rafters",
      4,
      hipLength,
      input.sections.hip,
      `Four equal-pitch hips; plan run ${halfSpanM.toFixed(3)} m in each orthogonal direction, rise ${roofRiseM.toFixed(3)} m.`,
    );
  }
  for (const [i, member] of (input.additionalMembers ?? []).entries()) {
    push(
      member.label.trim(),
      member.count,
      member.lengthM,
      { widthIn: member.widthIn, depthIn: member.depthIn },
      `User-entered schedule row ${i + 1}: ${member.count} × ${member.lengthM} m.`,
    );
  }

  if (
    ![
      eaveLongM,
      eaveShortM,
      commonLengthM,
      ridgeLengthM,
      roofRiseM,
      ...groups.flatMap((group) => [
        group.lengthM,
        group.totalLengthM,
        group.boardFeet,
      ]),
    ].every(Number.isFinite)
  ) {
    return fail(
      "The entered roof dimensions, spacing, or member schedule are too large to calculate safely.",
    );
  }
  return ok({
    ridgeLengthM,
    roofRiseM,
    groups,
    totalLinearM: groups.reduce((sum, group) => sum + group.totalLengthM, 0),
    totalBoardFeet: groups.reduce((sum, group) => sum + group.boardFeet, 0),
    valleyStatus:
      "Valleys are not auto-calculated. This model is limited to a regular rectangular gable or equal-pitch hip roof; add valley members only from a verified drawing/engineer schedule in Additional members.",
    assumptions: [
      "Rectangular footprint, level eaves, equal pitch, symmetric overhang, and no intersecting roof planes or dormers.",
      "Member counts/layout are geometric quantity estimates, not a structural design; no load, connection, bracing, deflection, or code capacity checks are performed.",
      "Board feet = length (ft) × width (in) × depth (in) ÷ 12, using each entered member section. Add purlins, trimmers, ties, and any verified valley schedule explicitly under Additional measured members.",
      `Pitch: ${input.pitchRisePer12}:12 rise/run; requested rafter spacing: ${input.spacingM} m; roof rise to ridge: ${roofRiseM.toFixed(3)} m.`,
    ],
  });
}

export interface ProjectCostInputs {
  materials: number;
  otherDirectCosts: number;
  laborHours: number;
  laborRatePerHour: number;
  weeklyOverhead: number;
  durationWeeks: number;
}
export interface ProjectCostResult {
  materials: number;
  otherDirectCosts: number;
  laborCost: number;
  overheadCost: number;
  directAndOverheadCost: number;
}
/** Totals only user-entered costs; no margin, duration, tax, or currency is inferred. */
export function calculateProjectCost(
  input: ProjectCostInputs,
): EngineResult<ProjectCostResult> {
  const fields: Array<[string, number]> = [
    ["Materials and subcontracted direct costs", input.materials],
    ["Other direct costs", input.otherDirectCosts],
    ["Labor hours", input.laborHours],
    ["Labor rate per hour", input.laborRatePerHour],
    ["Weekly overhead", input.weeklyOverhead],
    ["Project duration in weeks", input.durationWeeks],
  ];
  const errors = fields
    .filter(([, value]) => !Number.isFinite(value) || value < 0)
    .map(([label]) => `${label} must be zero or greater.`);
  if (
    !Number.isFinite(input.laborHours * input.laborRatePerHour) ||
    !Number.isFinite(input.weeklyOverhead * input.durationWeeks)
  )
    errors.push(
      "The entered labor or overhead total is too large to calculate safely.",
    );
  if (errors.length) return fail(...errors);
  const laborCost = input.laborHours * input.laborRatePerHour;
  const overheadCost = input.weeklyOverhead * input.durationWeeks;
  const directAndOverheadCost =
    input.materials + input.otherDirectCosts + laborCost + overheadCost;
  if (!Number.isFinite(directAndOverheadCost))
    return fail("The combined project cost is too large to calculate safely.");
  return ok({
    materials: input.materials,
    otherDirectCosts: input.otherDirectCosts,
    laborCost,
    overheadCost,
    directAndOverheadCost,
  });
}
