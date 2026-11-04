/** Preliminary gravity drainage material takeoff. Not a hydraulic or code-compliance design. */
export interface DrainageRun {
  lengthM: number;
  pipeDiameterMm: number;
  fallMmPerM: number;
  pipeStockLengthM?: number;
}
export interface DrainageCalculationInput {
  marketCode: string;
  runs?: DrainageRun[];
  inspectionChambers?: number;
  chambersPerConnection?: number;
  beddingDepthM?: number;
  beddingWidthFactor?: number;
  beddingWastePercent?: number;
  trenchWidthM?: number;
  trenchDepthM?: number;
  /** Optional shortcut for excavation volume when no measured runs are supplied. */
  trenchLengthM?: number;
  manholeCount?: number;
  /**
   * Depth from finished ground level to the crown of the pipe. Only used to
   * derive a trench depth when the user has not measured one. 0.75 m is a
   * working default for a domestic drain under a garden; under a driveway or a
   * road the cover has to be deeper and the user should say so.
   */
  coverDepthM?: number;
}
export interface DrainageCalculationResult {
  marketCode: string;
  totalPipeLengthM: number;
  pipeStockPieces: number;
  runs: Array<{
    lengthM: number;
    diameterMm: number;
    fallMmPerM: number;
    fallTotalMm: number;
    pipePieces: number;
  }>;
  inspectionChambers: number;
  manholes: number;
  beddingVolumeM3: number;
  excavationVolumeM3: number;
  cautions: string[];
}
export function calculateDrainageTakeoff(
  input: DrainageCalculationInput,
): DrainageCalculationResult {
  const marketCode = (input.marketCode || "UNSPECIFIED").toUpperCase();
  const runs = (input.runs ?? []).map((r) => {
    const length = Math.max(0, Number(r.lengthM) || 0);
    const stock = Math.max(0.1, Number(r.pipeStockLengthM) || 6);
    return {
      lengthM: Number(length.toFixed(2)),
      diameterMm: Math.max(0, Number(r.pipeDiameterMm) || 0),
      fallMmPerM: Math.max(0, Number(r.fallMmPerM) || 0),
      fallTotalMm: Number(
        (length * Math.max(0, Number(r.fallMmPerM) || 0)).toFixed(0),
      ),
      pipePieces: Math.ceil(length / stock),
    };
  });
  const totalPipeLengthM = runs.reduce((sum, r) => sum + r.lengthM, 0);
  const pipeStockPieces = runs.reduce((sum, r) => sum + r.pipePieces, 0);
  const chambers =
    Math.max(0, input.inspectionChambers ?? 0) +
    (runs.length > 0
      ? runs.reduce(
          (sum, r) =>
            sum +
            Math.ceil(
              r.lengthM / Math.max(1, input.chambersPerConnection ?? 30),
            ),
          0,
        )
      : Math.ceil(
          Math.max(0, Number(input.trenchLengthM) || 0) /
            Math.max(1, input.chambersPerConnection ?? 30),
        ));

  const trenchLength =
    runs.length > 0
      ? totalPipeLengthM
      : Math.max(0, Number(input.trenchLengthM) || 0);
  const beddingDepth = Math.max(0, Number(input.beddingDepthM) || 0.1);
  const waste = 1 + Math.max(0, input.beddingWastePercent ?? 10) / 100;
  const coverDepth = Math.max(0, Number(input.coverDepthM) || 0.75);
  // Working space either side of the pipe for a person to joint and compact.
  const WORKING_SPACE_M = 0.3;
  /** Granular bedding either side of the pipe barrel. */
  const BEDDING_SIDE_M = 0.15;

  /**
   * Bedding and excavation are computed per run, not once for the whole
   * network. Using the largest diameter for every metre overstated bedding and
   * trench width wherever a 110 mm branch ran beside a 160 mm main, and left
   * the trench depth independent of the pipe it had to contain.
   */
  let beddingVolume = 0;
  let excavationVolume = 0;
  const gradientCautions: string[] = [];

  /** Minimum self-cleansing gradient, mm of fall per metre, by pipe size. */
  const MIN_FALL_MM_PER_M: ReadonlyArray<readonly [number, number]> = [
    [75, 16.7],
    [110, 12.5],
    [160, 6.7],
  ];
  const minFallFor = (diameterMm: number): number | null => {
    const hit = MIN_FALL_MM_PER_M.find(([d]) => diameterMm <= d);
    return hit ? hit[1] : null;
  };

  for (const run of runs) {
    const diameterM = run.diameterMm / 1000;
    // Bedding surrounds the pipe with 150 mm each side; the trench adds the
    // working space a person needs on top of that, not another full allowance.
    const beddingWidth = Math.max(
      diameterM + 2 * BEDDING_SIDE_M,
      Math.max(0, input.beddingWidthFactor ?? 2) * diameterM,
    );
    beddingVolume += run.lengthM * beddingWidth * beddingDepth * waste;

    // A width or depth the user measured wins: it describes their ground, and
    // the derived figure is only a default for when nothing was entered.
    const statedWidth =
      Number(input.trenchWidthM) > 0 ? Number(input.trenchWidthM) : null;
    const statedDepth =
      Number(input.trenchDepthM) > 0 ? Number(input.trenchDepthM) : null;
    const derivedWidth = diameterM + 2 * WORKING_SPACE_M;
    const derivedDepth = coverDepth + diameterM + beddingDepth;
    const width = statedWidth ?? derivedWidth;
    const depth = statedDepth ?? derivedDepth;
    if (statedDepth !== null && statedDepth < derivedDepth) {
      gradientCautions.push(
        `The entered ${statedDepth} m trench depth leaves less than the ${coverDepth} m cover plus pipe and bedding for a ${run.diameterMm} mm pipe (${Number(derivedDepth.toFixed(2))} m needed).`,
      );
    }
    excavationVolume += run.lengthM * width * depth;

    const minFall = minFallFor(run.diameterMm);
    if (
      run.diameterMm > 0 &&
      minFall !== null &&
      run.fallMmPerM > 0 &&
      run.fallMmPerM < minFall
    ) {
      gradientCautions.push(
        `${run.diameterMm} mm run falls ${run.fallMmPerM} mm/m, below the ${minFall} mm/m usually needed to keep solids moving; confirm the gradient before ordering pipe.`,
      );
    }
    if (run.diameterMm > 0 && run.fallMmPerM === 0) {
      gradientCautions.push(
        `${run.diameterMm} mm run was entered with no fall; a level drain will silt up.`,
      );
    }
  }

  if (runs.length === 0) {
    // No measured runs: fall back to a single trench of the entered size.
    // A shortcut trench the user measured is taken at face value, the same way
    // a measured run is; the derived size is only the default.
    const width =
      Number(input.trenchWidthM) > 0 ? Number(input.trenchWidthM) : 0.45;
    const depth =
      Number(input.trenchDepthM) > 0 ? Number(input.trenchDepthM) : 0.75;
    excavationVolume = trenchLength * width * depth;
    beddingVolume = trenchLength * width * beddingDepth * waste;
  }

  return {
    marketCode,
    totalPipeLengthM: Number(totalPipeLengthM.toFixed(2)),
    pipeStockPieces,
    runs,
    inspectionChambers: chambers,
    manholes: Math.max(0, input.manholeCount ?? 0),
    beddingVolumeM3: Number(beddingVolume.toFixed(3)),
    excavationVolumeM3: Number(excavationVolume.toFixed(2)),
    cautions: [
      "Pipe diameter, gradient, capacity, material, connection and chamber spacing require project-specific hydraulic and local-code design.",
      `Trench width allows ${WORKING_SPACE_M * 1000} mm of working space each side of the pipe and depth is cover plus pipe and bedding, measured per run; it excludes battering, groundwater, shoring and swell.`,
      ...gradientCautions,
    ],
  };
}
