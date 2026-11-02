/**
 * Borehole & Overhead Water Tank Staging Estimator Engine
 *
 * Structural Physics & Bill of Materials (BOM) for elevated water storage towers.
 *
 * Physics & Loads:
 * - Dead Load (L_dead): (Tank Volume Liters * 1 kg) + Empty Tank Weight (approx 150 kg)
 * - Lateral / Wind Safety Factor: 1.3 multiplier over Dead Load
 * - Design Load (kN): (L_dead * 1.3 * 9.81) / 1000
 * - Support Typologies:
 *   1. Structural Steel (4x H-Beams + Angle Iron Cross-Bracing + 2x6 Timber Platform Base)
 *   2. Reinforced Concrete (4x 230x230mm Columns, 1:2:4 mix, 4x Y16 bars per pillar)
 */

export interface TowerSpecs {
  tankVolumeLiters: number;
  towerHeightMeters: number;
  constructionMaterial: "steel" | "concrete";
  baseSizeMeters?: number; // default based on tank volume (e.g. 1.8m to 2.4m)
}

export interface WaterTowerStagingResult {
  specs: TowerSpecs;
  waterWeightKg: number;
  emptyTankWeightKg: number;
  deadLoadTotalKg: number;
  designLoadKn: number;
  lateralSafetyFactor: number;
  material: "steel" | "concrete";
  structuralBOM: {
    // Steel Frame
    structuralHBeamsMeters?: number;
    angleIronBracingMeters?: number;
    timberPlatform2x6Pieces?: number;
    // Concrete Frame
    concreteVolumeM3?: number;
    cementBags50kg?: number;
    sandCubicMeters?: number;
    gravelCubicMeters?: number;
    verticalRebarY16Lengths?: number; // standard 12m commercial rebar lengths
    stirrupsRebarY8Lengths?: number;
    timberPlatform2x6PiecesConcrete?: number;
  };
  summaryDescription: string;
}

export const TANK_SIZE_PRESETS = [
  { label: "1,000 Liters (1 Ton)", value: 1000 },
  { label: "2,000 Liters (2 Tons)", value: 2000 },
  { label: "3,000 Liters (3 Tons)", value: 3000 },
  { label: "5,000 Liters (5 Tons)", value: 5000 },
  { label: "10,000 Liters (10 Tons)", value: 10000 },
];

/**
 * Calculates structural staging, loads, and material takeoff for water tank towers.
 */
export function calculateWaterTowerStaging(specs: TowerSpecs): WaterTowerStagingResult {
  const { tankVolumeLiters, towerHeightMeters, constructionMaterial } = specs;

  if (!Number.isFinite(tankVolumeLiters) || tankVolumeLiters <= 0) {
    throw new RangeError(`Tank volume must be a positive number (received ${tankVolumeLiters}).`);
  }
  if (!Number.isFinite(towerHeightMeters) || towerHeightMeters <= 0) {
    throw new RangeError(`Tower height must be a positive number (received ${towerHeightMeters}).`);
  }

  const waterWeightKg = tankVolumeLiters;
  const emptyTankWeightKg = 150; // standard commercial polyethylene dry weight
  const deadLoadTotalKg = waterWeightKg + emptyTankWeightKg;
  const lateralSafetyFactor = 1.3;
  const designLoadKn = parseFloat(((deadLoadTotalKg * lateralSafetyFactor * 9.81) / 1000).toFixed(2));

  // Platform width for tank footprint: 1.8m for <=2kL, 2.2m for 3k-5kL, 2.8m for 10kL
  const platformWidthM = tankVolumeLiters <= 2000 ? 1.8 : tankVolumeLiters <= 5000 ? 2.2 : 2.8;
  // 2x6 timber (0.15m wide) boards spaced tight across platform
  const timberPlankPieces = Math.ceil(platformWidthM / 0.15);

  if (constructionMaterial === "concrete") {
    // 4 pillars of 230mm x 230mm (0.23m x 0.23m)
    const pillarSectionArea = 0.23 * 0.23;
    const requiredConcreteVolume = Math.round(pillarSectionArea * towerHeightMeters * 4 * 100) / 100;

    // 1:2:4 Mix (C15/M15 standard structural grade) -> Dry factor 1.54, 7 parts total, cement density 1440 kg/m3
    const dryVol = requiredConcreteVolume * 1.54;
    const cementKg = (dryVol / 7) * 1440;
    const cementBags50kg = Math.ceil(cementKg / 50);
    const sandCubicMeters = Math.round(((dryVol * 2) / 7) * 100) / 100;
    const gravelCubicMeters = Math.round(((dryVol * 4) / 7) * 100) / 100;

    // 4 vertical Y16 bars per pillar = 16 bars total * height / 12m stock length
    const verticalRebarY16Lengths = Math.ceil((towerHeightMeters * 4 * 4) / 12);
    // Y8 stirrups every 200mm (0.2m) along height: per column perimeter = 4 * 0.23m = 0.92m + hooks = 1.1m
    const stirrupCountPerColumn = Math.ceil(towerHeightMeters / 0.2);
    const totalStirrupLengthM = stirrupCountPerColumn * 4 * 1.1;
    const stirrupsRebarY8Lengths = Math.ceil(totalStirrupLengthM / 12);

    return {
      specs,
      waterWeightKg,
      emptyTankWeightKg,
      deadLoadTotalKg,
      designLoadKn,
      lateralSafetyFactor,
      material: "concrete",
      structuralBOM: {
        concreteVolumeM3: requiredConcreteVolume,
        cementBags50kg,
        sandCubicMeters,
        gravelCubicMeters,
        verticalRebarY16Lengths,
        stirrupsRebarY8Lengths,
        timberPlatform2x6PiecesConcrete: timberPlankPieces,
      },
      summaryDescription: `Reinforced concrete staging (${towerHeightMeters}m high) supporting a ${tankVolumeLiters.toLocaleString()}L tank (${(deadLoadTotalKg / 1000).toFixed(1)} tons dead load, ${designLoadKn} kN design capacity). Requires 4x 230x230mm columns with Y16 rebar and 1:2:4 grade concrete.`,
    };
  }

  // Steel Staging Frame:
  // 4 vertical structural H-Beams / square hollow section posts
  const structuralHBeamsMeters = towerHeightMeters * 4;

  // Diagonal cross-bracing (X-bracing) on all 4 faces:
  // Assuming bracing in 3m tiers: number of vertical tiers = Math.max(1, Math.round(towerHeightMeters / 3))
  const tiers = Math.max(1, Math.round(towerHeightMeters / 3));
  const tierHeight = towerHeightMeters / tiers;
  // Diagonal across one bay = sqrt(tierHeight^2 + platformWidthM^2)
  const diagonalBayLength = Math.sqrt(tierHeight * tierHeight + platformWidthM * platformWidthM);
  // 2 diagonals per face (X-brace) * 4 faces * tiers + horizontal perimeter ties
  const totalDiagonalLength = diagonalBayLength * 2 * 4 * tiers;
  const horizontalTiesLength = platformWidthM * 4 * (tiers + 1);
  const angleIronBracingMeters = Math.ceil(totalDiagonalLength + horizontalTiesLength);

  return {
    specs,
    waterWeightKg,
    emptyTankWeightKg,
    deadLoadTotalKg,
    designLoadKn,
    lateralSafetyFactor,
    material: "steel",
    structuralBOM: {
      structuralHBeamsMeters,
      angleIronBracingMeters,
      timberPlatform2x6Pieces: timberPlankPieces,
    },
    summaryDescription: `Structural steel staging (${towerHeightMeters}m high) supporting a ${tankVolumeLiters.toLocaleString()}L tank (${(deadLoadTotalKg / 1000).toFixed(1)} tons dead load, ${designLoadKn} kN design capacity). Includes 4x vertical H-beams, ${tiers}-tier X-braced angle iron, and ${timberPlankPieces}x 2x6 timber platform joists.`,
  };
}
