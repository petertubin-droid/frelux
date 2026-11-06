/**
 * The German floor: the ground bearing slab Nigerian sites build first.
 *
 * It is a layered build up, and each layer is a separate purchase: hardcore
 * filling compacted in layers, a sand blinding to protect the membrane, a
 * damp proof membrane, then a reinforced concrete slab. Getting the layers
 * right matters more than the slab mix, because hardcore and granite are
 * bought by the trip and under ordering leaves a site standing still.
 *
 * The engine is pure geometry and published mix proportions. No prices, no tax
 * and no AI: every figure here can be checked with a tape and a mix table, and
 * the assumptions are returned with the result so the page states them.
 */

import {
  PLOT_PRESETS,
  cementBagKg,
  type PlotPresetKey,
} from "@/config/masonry-units";
import { CEMENT_DENSITY_KG_M3 } from "@/config/masonry-units";
import {
  measureInSiteUnits,
  sandUnitOptions,
  unitsToBuy,
} from "@/config/aggregate-units";

export type ConcreteMixKey = "1:1.5:3" | "1:2:4" | "1:3:6";

export interface ConcreteMix {
  key: ConcreteMixKey;
  cement: number;
  sand: number;
  aggregate: number;
  /** What the mix is conventionally used for. */
  use: string;
}

export const CONCRETE_MIXES: Record<ConcreteMixKey, ConcreteMix> = {
  "1:1.5:3": {
    key: "1:1.5:3",
    cement: 1,
    sand: 1.5,
    aggregate: 3,
    use: "Higher strength slab, around C25. Used where the floor carries heavy loads.",
  },
  "1:2:4": {
    key: "1:2:4",
    cement: 1,
    sand: 2,
    aggregate: 4,
    use: "The usual German floor mix, around C20.",
  },
  "1:3:6": {
    key: "1:3:6",
    cement: 1,
    sand: 3,
    aggregate: 6,
    use: "Lean blinding concrete, around C10, where strength is not the driver.",
  },
};

/** Dry concrete needs about half again the volume of the wet slab. */
export const CONCRETE_DRY_FACTOR = 1.54;

/**
 * Hardcore is bought loose and compacted in place, so the volume to order is
 * larger than the compacted layer: 150 mm compacted needs about 188 mm loose.
 * The old model reported the compacted volume as the purchase volume, which
 * under-ordered the fill by a quarter.
 */
export const HARDCORE_LOOSE_BULKING = 1.25;

/** Membrane rolls are laid with 150 mm laps, so the area to buy exceeds the floor. */
export const MEMBRANE_LAP_PERCENT = 10;

/** Ordinary Portland cement bulking and shrinkage allowance on site. */
export const SLAB_LAYER_DEFAULTS = {
  hardcoreMm: 150,
  blindingMm: 50,
  slabMm: 100,
  wastagePercent: 5,
};

export interface GermanFloorInput {
  market: string;
  plotPreset?: PlotPresetKey | null;
  lengthM?: number;
  widthM?: number;
  hardcoreMm?: number;
  blindingMm?: number;
  slabMm?: number;
  mixKey?: ConcreteMixKey;
  /** Share added for spillage and level variation, 0.05 means 5 percent. */
  wastage?: number;
}

export interface LayerVolume {
  thicknessMm: number;
  /** Compacted, in place volume of the layer. */
  cubicMetres: number;
  /** Volume to order, including bulking and the site loss allowance. */
  purchaseCubicMetres: number;
}

export interface GermanFloorResult {
  areaM2: number;
  site: { lengthM: number; widthM: number; plotLabel: string | null };
  layers: {
    hardcore: LayerVolume;
    blinding: LayerVolume;
    slab: LayerVolume;
  };
  mix: {
    key: ConcreteMixKey;
    parts: { cement: number; sand: number; aggregate: number };
    dryM3: number;
    cementM3: number;
    sandM3: number;
    aggregateM3: number;
  };
  cement: { bagKg: number; bags: number };
  sand: {
    cubicMetres: number;
    trips: Array<{ label: string; count: number; cubicMetres: number }>;
    wheelbarrows: number;
    headPans: number;
    defaultUnitLabel: string;
    defaultUnitCount: number;
  };
  aggregate: {
    cubicMetres: number;
    trips: Array<{ label: string; count: number; cubicMetres: number }>;
  };
  /** Net floor area covered by the membrane. */
  membraneM2: number;
  membrane: { netM2: number; orderM2: number; lapPercent: number };
  assumptions: string[];
}

export interface GermanFloorOutcome {
  result: GermanFloorResult | null;
  errors: string[];
}

function tripsFor(volumeM3: number, market: string) {
  return sandUnitOptions(market)
    .filter((unit) => unit.key === "trip")
    .map((unit) => ({
      label: unit.label,
      count: unitsToBuy(volumeM3, unit),
      cubicMetres: unit.cubicMetres,
    }));
}

export function calculateGermanFloor(
  input: GermanFloorInput,
): GermanFloorOutcome {
  const errors: string[] = [];
  const preset = input.plotPreset ? PLOT_PRESETS[input.plotPreset] : null;
  const lengthM = preset ? preset.lengthM : Number(input.lengthM);
  const widthM = preset ? preset.widthM : Number(input.widthM);

  if (!Number.isFinite(lengthM) || lengthM <= 0) {
    errors.push(
      "Enter the length of the floor in metres, or pick a standard plot.",
    );
  }
  if (!Number.isFinite(widthM) || widthM <= 0) {
    errors.push(
      "Enter the width of the floor in metres, or pick a standard plot.",
    );
  }

  const hardcoreMm = Number(input.hardcoreMm ?? SLAB_LAYER_DEFAULTS.hardcoreMm);
  const blindingMm = Number(input.blindingMm ?? SLAB_LAYER_DEFAULTS.blindingMm);
  const slabMm = Number(input.slabMm ?? SLAB_LAYER_DEFAULTS.slabMm);
  if (!Number.isFinite(slabMm) || slabMm <= 0) {
    errors.push("Enter the slab thickness in millimetres.");
  }
  if (!Number.isFinite(hardcoreMm) || hardcoreMm < 0) {
    errors.push(
      "Enter the hardcore depth in millimetres, or 0 if there is none.",
    );
  }
  if (!Number.isFinite(blindingMm) || blindingMm < 0) {
    errors.push(
      "Enter the blinding depth in millimetres, or 0 if there is none.",
    );
  }
  if (errors.length > 0) return { result: null, errors };

  const wastage =
    typeof input.wastage === "number" && input.wastage >= 0 && input.wastage < 1
      ? input.wastage
      : SLAB_LAYER_DEFAULTS.wastagePercent / 100;
  const mix = CONCRETE_MIXES[input.mixKey ?? "1:2:4"];
  const areaM2 = lengthM * widthM;

  const layer = (mm: number, bulking = 1): LayerVolume => {
    const cubicMetres = areaM2 * (mm / 1000);
    return {
      thicknessMm: mm,
      cubicMetres: Number(cubicMetres.toFixed(3)),
      purchaseCubicMetres: Number(
        (cubicMetres * bulking * (1 + wastage)).toFixed(3),
      ),
    };
  };

  const hardcore = layer(hardcoreMm, HARDCORE_LOOSE_BULKING);
  const blinding = layer(blindingMm);
  const slab = layer(slabMm);

  // Concrete is ordered on the wet volume plus a stated allowance, then the
  // dry volume and the mix parts turn it into bags and loose materials.
  const wetM3 = slab.cubicMetres * (1 + wastage);
  const dryM3 = wetM3 * CONCRETE_DRY_FACTOR;
  const parts = mix.cement + mix.sand + mix.aggregate;
  const cementM3 = dryM3 / parts;
  const sandM3 = (dryM3 * mix.sand) / parts;
  const aggregateM3 = (dryM3 * mix.aggregate) / parts;

  const bagKg = cementBagKg(input.market);
  const bagM3 = bagKg / CEMENT_DENSITY_KG_M3;
  const bags = bagM3 > 0 ? Math.ceil(cementM3 / bagM3) : 0;

  // Blinding sand is bought with the concrete sand: same material, one order.
  const sandTotalM3 = Number((sandM3 + blinding.cubicMetres).toFixed(3));
  const siteUnits = measureInSiteUnits(sandTotalM3, input.market);
  const preferredSandUnit = sandUnitOptions(input.market)[0];

  const assumptions = [
    `Floor area is ${areaM2.toFixed(2)} m², measured as length times width.`,
    `Layers: hardcore ${hardcoreMm} mm, blinding ${blindingMm} mm, slab ${slabMm} mm.`,
    `Concrete is a ${mix.key} mix, ${mix.use.replace(/\.$/, "").toLowerCase()}.`,
    `${(wastage * 100).toFixed(0)} percent is added to every layer for spillage and level variation.`,
    `Hardcore is ordered loose at ${HARDCORE_LOOSE_BULKING} times its compacted volume, because fill only reaches ${hardcoreMm} mm dense after compaction.`,
    `The membrane is ordered at ${MEMBRANE_LAP_PERCENT} percent over the floor area for the laps between rolls.`,
    `Dry concrete is taken as ${CONCRETE_DRY_FACTOR} times the wet volume.`,
    `Cement is counted in ${bagKg} kg bags for this market and blinding sand is added to the concrete sand.`,
    "Quantities only. Prices, tax and labour come from the price book and your own figures, never from this page.",
  ];

  return {
    errors: [],
    result: {
      areaM2: Number(areaM2.toFixed(2)),
      site: {
        lengthM: Number(lengthM.toFixed(2)),
        widthM: Number(widthM.toFixed(2)),
        plotLabel: preset ? preset.label : null,
      },
      layers: { hardcore, blinding, slab },
      mix: {
        key: mix.key,
        parts: { cement: mix.cement, sand: mix.sand, aggregate: mix.aggregate },
        dryM3: Number(dryM3.toFixed(3)),
        cementM3: Number(cementM3.toFixed(3)),
        sandM3: Number(sandM3.toFixed(3)),
        aggregateM3: Number(aggregateM3.toFixed(3)),
      },
      cement: { bagKg, bags },
      sand: {
        cubicMetres: sandTotalM3,
        trips: tripsFor(sandTotalM3, input.market),
        wheelbarrows: siteUnits.wheelbarrows,
        headPans: siteUnits.headPans,
        defaultUnitLabel: preferredSandUnit.plural,
        defaultUnitCount: unitsToBuy(sandTotalM3, preferredSandUnit),
      },
      aggregate: {
        cubicMetres: Number(aggregateM3.toFixed(3)),
        trips: tripsFor(aggregateM3, input.market),
      },
      membraneM2: Number(areaM2.toFixed(2)),
      membrane: {
        netM2: Number(areaM2.toFixed(2)),
        orderM2: Number((areaM2 * (1 + MEMBRANE_LAP_PERCENT / 100)).toFixed(2)),
        lapPercent: MEMBRANE_LAP_PERCENT,
      },
      assumptions,
    },
  };
}
