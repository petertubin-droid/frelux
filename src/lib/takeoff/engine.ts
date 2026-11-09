/**
 * Schedule to bill engine.
 *
 * Takes a measured room and wall schedule and produces bill lines. Nothing here
 * infers geometry: every input is a dimension somebody entered, and every line
 * carries the formula, the values used and whether an input was assumed.
 *
 * Areas are summed per scope before materials are priced, because materials are
 * bought in whole units: ten rooms needing 0.3 bags of cement each is three
 * bags, not ten bags.
 */

import type {
  QuantityUnit,
  RoomInput,
  ScheduleInput,
  TakeoffLine,
  TakeoffResult,
  TakeoffScope,
  WallInput,
} from "./types";
import {
  DEFAULT_OPENING_DEDUCT_ABOVE_M2,
  areaM2,
  measureWall,
  round,
  toMetres,
} from "./measure";
import {
  type BlockworkSpec,
  type SkirtingSpec,
  type PaintSpec,
  type RenderSpec,
  type ScreedSpec,
  type TileSpec,
  blockworkAssembly,
  floorTileAssembly,
  paintAssembly,
  renderAssembly,
  screedAssembly,
  skirtingAssembly,
} from "./assemblies";

export interface TakeoffSpecs {
  blockwork?: BlockworkSpec;
  render?: RenderSpec;
  paint?: PaintSpec;
  tiles?: TileSpec;
  screed?: ScreedSpec;
  skirting?: SkirtingSpec;
  /** Ceiling paint is its own product line, so it has its own spec. */
  ceilingPaint?: PaintSpec;
}

export interface TakeoffOptions {
  scopes?: TakeoffScope[];
  deductAbove?: number;
  specs?: TakeoffSpecs;
}

export const ALL_SCOPES: TakeoffScope[] = [
  "blockwork",
  "render",
  "paint",
  "ceiling",
  "floor_tiles",
  "screed",
  "skirting",
];

interface AreaEntry {
  roomId: string;
  elementId: string;
  area: number;
  assumed: boolean;
  /** Set on wall entries so skirting can be summed in linear metres. */
  skirtingLength?: number;
}

interface ScopeInputs {
  scope: TakeoffScope;
  label: string;
  unit: QuantityUnit;
  area: number;
  entries: AreaEntry[];
  assumed: boolean;
  notes: string[];
}

const wallId = (wall: WallInput, index: number, roomId: string): string =>
  wall.id || `${roomId}-wall-${index + 1}`;

export function runTakeoff(
  schedule: ScheduleInput,
  options: TakeoffOptions = {},
): TakeoffResult {
  const scopes = options.scopes?.length ? options.scopes : ALL_SCOPES;
  const deductAbove =
    options.deductAbove ??
    schedule.defaultOpeningDeductAbove ??
    DEFAULT_OPENING_DEDUCT_ABOVE_M2;
  const warnings: string[] = [];
  const wallAreas: AreaEntry[] = [];
  const floorAreas: AreaEntry[] = [];
  const notesByScope = new Map<TakeoffScope, string[]>();

  const addNote = (scope: TakeoffScope, note: string) => {
    const notes = notesByScope.get(scope) ?? [];
    if (!notes.includes(note)) notes.push(note);
    notesByScope.set(scope, notes);
  };

  if (!schedule.rooms?.length) {
    warnings.push("The schedule has no rooms, so there is nothing to measure.");
  }

  for (const room of schedule.rooms ?? []) {
    const roomId = room.id;
    const roomLabel = room.label ?? roomId;

    for (const [index, wall] of (room.walls ?? []).entries()) {
      const measure = measureWall(wall, deductAbove);
      const id = wallId(wall, index, roomId);
      if (measure.netArea <= 0) {
        warnings.push(`Wall ${id} in ${roomLabel} has no measurable area.`);
        continue;
      }
      if (measure.warning)
        warnings.push(`${id} in ${roomLabel}: ${measure.warning}`);
      if (measure.measuredOpenings.length) {
        addNote(
          "paint",
          `${measure.measuredOpenings.length} opening(s) below ${deductAbove} m2 were measured rather than deducted.`,
        );
      }
      wallAreas.push({
        roomId,
        elementId: id,
        area: measure.netArea,
        assumed: Boolean(wall.assumed),
        skirtingLength: measure.netSkirtingLength,
      });
    }

    if (room.floor) {
      const length = toMetres(room.floor.length, room.floor.unit ?? "m");
      const width = toMetres(room.floor.width, room.floor.unit ?? "m");
      const grossArea = areaM2(length, width);
      const deducted = (room.floor.deductions ?? []).reduce((sum, item) => {
        const factor = item.unit === "ft2" ? 0.092903 : 1;
        return sum + Math.max(0, item.area * factor);
      }, 0);
      if (deducted > grossArea + 1e-9) {
        warnings.push(
          `${roomLabel}: floor deductions exceed the floor area and were capped.`,
        );
      }
      const netArea = round(Math.max(0, grossArea - deducted), 4);
      if (netArea <= 0) {
        warnings.push(`${roomLabel}: floor has no measurable area.`);
      } else {
        floorAreas.push({
          roomId,
          elementId: `${roomId}-floor`,
          area: netArea,
          assumed: Boolean(room.floor.assumed),
        });
      }
    }
  }

  const scopeInput = (scope: TakeoffScope): ScopeInputs => {
    const isFloor =
      scope === "floor_tiles" || scope === "screed" || scope === "ceiling";
    const entries = isFloor ? floorAreas : wallAreas;
    const area = round(
      entries.reduce((sum, entry) => sum + entry.area, 0),
      4,
    );
    return {
      scope,
      label: SCOPE_LABELS[scope],
      unit: "m2",
      area,
      entries,
      assumed: entries.some((entry) => entry.assumed),
      notes: notesByScope.get(scope) ?? [],
    };
  };

  const lines: TakeoffLine[] = [];

  // Skirting is the one scope measured in linear metres, so it is built from
  // wall runs rather than from areas and handled before the area loop.
  if (scopes.includes("skirting")) {
    const runs = wallAreas.filter((entry) => (entry.skirtingLength ?? 0) > 0);
    const runLength = round(
      runs.reduce((sum, entry) => sum + (entry.skirtingLength ?? 0), 0),
      4,
    );
    if (runLength > 0) {
      const sources = unique(runs.map((entry) => entry.elementId));
      const assumed = runs.some((entry) => entry.assumed);
      const steps = runs.map((entry) => ({
        label: entry.elementId,
        value: round(entry.skirtingLength ?? 0, 3),
        unit: "m",
      }));

      for (const material of skirtingAssembly(
        runLength,
        options.specs?.skirting,
      )) {
        lines.push({
          id: `skirting-${slug(material.material)}`,
          scope: SCOPE_LABELS.skirting,
          description: `${material.material} for skirting`,
          quantity: material.quantity,
          unit: material.unit as QuantityUnit,
          netQuantity: material.netQuantity,
          wastePct: material.wastePct,
          purchaseQuantity: material.purchaseQuantity,
          purchaseUnit: material.purchaseUnit,
          sources,
          derivation: {
            formula: `wall runs less doors and full height openings, then ${material.derivation.formula}`,
            inputs: { runLengthM: runLength, ...material.derivation.inputs },
            steps,
          },
          assumed,
        });
      }

      lines.push({
        id: "skirting-measured-run",
        scope: SCOPE_LABELS.skirting,
        description: "Skirting measured run",
        quantity: runLength,
        unit: "m",
        netQuantity: runLength,
        wastePct: 0,
        sources,
        derivation: {
          formula:
            "sum of wall lengths less every door and full height opening",
          inputs: { runLengthM: runLength },
          steps,
        },
        assumed,
      });
    } else {
      warnings.push("Skirting: nothing measured, so no line was produced.");
    }
  }

  for (const scope of scopes) {
    if (scope === "skirting") continue;
    const input = scopeInput(scope);
    if (input.area <= 0) {
      warnings.push(
        `${input.label}: nothing measured, so no line was produced.`,
      );
      continue;
    }

    const sources = unique(input.entries.map((entry) => entry.elementId));
    const derivedFrom = input.entries.map((entry) => ({
      label: entry.elementId,
      value: entry.area,
      unit: "m2",
    }));

    const push = (
      materials: ReturnType<typeof blockworkAssembly>,
      suffix = "",
    ) => {
      for (const material of materials) {
        lines.push({
          id: `${scope}-${slug(material.material)}${suffix}`,
          scope: input.label,
          description: `${material.material} for ${input.label.toLowerCase()}`,
          quantity: material.quantity,
          unit: material.unit as QuantityUnit,
          netQuantity: material.netQuantity,
          wastePct: material.wastePct,
          purchaseQuantity: material.purchaseQuantity,
          purchaseUnit: material.purchaseUnit,
          sources,
          derivation: {
            formula: `measured area, then ${material.derivation.formula}`,
            inputs: {
              measuredAreaM2: input.area,
              ...material.derivation.inputs,
            },
            steps: [...derivedFrom, ...(material.derivation.steps ?? [])],
          },
          assumed: input.assumed,
          notes: input.notes.length ? input.notes : undefined,
        });
      }
    };

    switch (scope) {
      case "blockwork":
        push(blockworkAssembly(input.area, options.specs?.blockwork));
        break;
      case "render":
        push(renderAssembly(input.area, options.specs?.render));
        break;
      case "paint":
        push(paintAssembly(input.area, options.specs?.paint));
        break;
      case "floor_tiles":
        push(floorTileAssembly(input.area, options.specs?.tiles));
        break;
      case "screed":
        push(screedAssembly(input.area, options.specs?.screed));
        break;
      case "ceiling": {
        const ceilingPaint = paintAssembly(
          input.area,
          options.specs?.ceilingPaint ?? options.specs?.paint,
        );
        for (const material of ceilingPaint) {
          lines.push({
            id: `ceiling-${slug(material.material)}`,
            scope: input.label,
            description: `${material.material} for ceiling`,
            quantity: material.quantity,
            unit: material.unit as QuantityUnit,
            netQuantity: material.netQuantity,
            wastePct: material.wastePct,
            purchaseQuantity: material.purchaseQuantity,
            purchaseUnit: material.purchaseUnit,
            sources,
            derivation: {
              formula: `measured ceiling area, then ${material.derivation.formula}`,
              inputs: {
                measuredAreaM2: input.area,
                ...material.derivation.inputs,
              },
              steps: [...derivedFrom, ...(material.derivation.steps ?? [])],
            },
            assumed: input.assumed,
            notes: ["Ceilings are measured on the floor area they cover."],
          });
        }
        break;
      }
      default:
        break;
    }

    // The measured area itself is a billable quantity for labour and pricing,
    // so it is kept as its own line rather than only appearing inside materials.
    lines.push({
      id: `${scope}-measured-area`,
      scope: input.label,
      description: `${input.label} measured area`,
      quantity: input.area,
      unit: "m2",
      netQuantity: input.area,
      wastePct: 0,
      sources,
      derivation: {
        formula:
          scope === "floor_tiles" || scope === "screed" || scope === "ceiling"
            ? "floor length x width - floor deductions"
            : "wall length x height - deducted openings",
        inputs: { measuredAreaM2: input.area },
        steps: derivedFrom,
      },
      assumed: input.assumed,
      notes: input.notes.length ? input.notes : undefined,
    });
  }

  return {
    lines,
    totals: sumLinesByUnit(lines),
    assumedLineCount: lines.filter((line) => line.assumed).length,
    warnings: unique(warnings),
  };
}

export const SCOPE_LABELS: Record<TakeoffScope, string> = {
  blockwork: "Blockwork",
  render: "Render",
  paint: "Paint",
  ceiling: "Ceiling",
  floor_tiles: "Floor tiling",
  screed: "Screed",
  skirting: "Skirting",
};

function sumLinesByUnit(lines: TakeoffLine[]) {
  const totals = new Map<QuantityUnit, number>();
  for (const line of lines) {
    // Every material appears once, with its purchase restatement carried on the
    // same line, so summing quantities cannot double count.
    totals.set(
      line.unit,
      round((totals.get(line.unit) ?? 0) + line.quantity, 4),
    );
  }
  return Array.from(totals.entries())
    .map(([unit, quantity]) => ({ unit, quantity }))
    .sort((a, b) => a.unit.localeCompare(b.unit));
}

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

/** Convenience for a single room, used by the calculators that already model one. */
export const roomTakeoff = (room: RoomInput, options: TakeoffOptions = {}) =>
  runTakeoff({ id: room.id, label: room.label, rooms: [room] }, options);
