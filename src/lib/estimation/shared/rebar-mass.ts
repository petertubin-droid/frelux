/**
 * Nominal mass of reinforcement, kg per metre.
 *
 * BS 4449 / EN 10080 nominal mass is 0.006165 d² for a bar of diameter d in mm,
 * which is the same 7850 kg/m³ steel density written in closed form: it gives
 * 12 mm 0.888 kg/m, 16 mm 1.578, 20 mm 2.466 and 25 mm 3.853 kg/m, the published
 * table values.
 *
 * Three engines carried d²/162 instead, which is 0.0061728: 0.13 per cent heavy,
 * about 13 kg on every tonne of steel ordered. One helper, so the weight of a
 * bar cannot depend on which calculator is open.
 */
export function rebarMassPerM(diameterMm: number): number {
  return 0.006165 * diameterMm * diameterMm;
}

export function rebarMassKg(totalLengthM: number, diameterMm: number): number {
  return totalLengthM * rebarMassPerM(diameterMm);
}
