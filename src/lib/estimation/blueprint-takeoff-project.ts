/**
 * Blueprint & PDF Plan Takeoff Project Schema, Serialization & Worksheet Bridge.
 *
 * Implements Phase 2 (takeoff persistence/export format) and Phase 4 (takeoff-to-worksheet bridge)
 * with strict provenance and auditability.
 */

export type TakeoffCategory =
  | "masonry"
  | "plastering"
  | "drywall"
  | "paving"
  | "drainage"
  | "temporary-works"
  | "insulation"
  | "demolition"
  | "general";

export interface TakeoffCategoryInfo {
  name: string;
  defaultUnit: "m" | "m²" | "items";
  description: string;
}

export const TAKEOFF_CATEGORIES: Record<TakeoffCategory, TakeoffCategoryInfo> =
  {
    masonry: {
      name: "Masonry / Brickwork",
      defaultUnit: "m",
      description: "Wall runs, partitioning, foundation blockwork",
    },
    plastering: {
      name: "Plaster / Render",
      defaultUnit: "m²",
      description: "Internal wall/ceiling plaster or external render",
    },
    drywall: {
      name: "Drywall & Partitions",
      defaultUnit: "m",
      description: "Stud wall runs, partition framing",
    },
    paving: {
      name: "Paving / Hardscape",
      defaultUnit: "m²",
      description: "Driveways, walkways, exterior slabs",
    },
    drainage: {
      name: "Drainage / Sewer",
      defaultUnit: "m",
      description: "Gravity pipe runs, trench lines",
    },
    "temporary-works": {
      name: "Temporary Works",
      defaultUnit: "m",
      description: "Site hoarding, edge protection, scaffolding",
    },
    insulation: {
      name: "Insulation",
      defaultUnit: "m²",
      description: "Roof/attic, wall cavity or floor insulation",
    },
    demolition: {
      name: "Demolition",
      defaultUnit: "m²",
      description: "Floor stripping, wall removal, site clearing",
    },
    general: {
      name: "General Takeoff",
      defaultUnit: "m",
      description: "Uncategorized measurements and markings",
    },
  };

export interface TakeoffMark {
  id: string;
  page: number;
  type: "linear" | "area" | "count";
  category: TakeoffCategory;
  label: string;
  points: { x: number; y: number }[];
  quantity: number;
  unit: "m" | "m²" | "items";
  color: string;
  notes?: string;
}

export interface TakeoffProjectExport {
  format: "frelux-blueprint-takeoff";
  version: 1;
  exportedAt: string;
  sourceFileName: string;
  sourceFileIncluded: false;
  marketCode: string;
  pageCount: number;
  scalesByPage: Record<number, number>;
  rotationsByPage?: Record<number, number>;
  marks: TakeoffMark[];
  summary: {
    totalLinearM: number;
    totalAreaM2: number;
    totalCount: number;
    byCategory: Record<
      TakeoffCategory,
      { count: number; totalQuantity: number; unit: string }
    >;
  };
  limitations: string[];
}

export const TAKEOFF_DISCLAIMERS = [
  "Takeoff measurements are preliminary quantities derived from browser-calibrated scale.",
  "Drawing scale, scan distortion, PDF vector coordinate fidelity, and manual click precision affect takeoff numbers.",
  "This tool performs preliminary geometric measurement, not structural engineering, code-compliance checks, or permit approvals.",
  "Always cross-check marked quantities against physical site conditions and the responsible engineer's stamped drawings.",
  "The original drawing/PDF is not embedded in this JSON project export; retain the source file alongside this record.",
];

export function createTakeoffProjectExport(params: {
  sourceFileName: string;
  marketCode: string;
  pageCount: number;
  scalesByPage: Record<number, number>;
  rotationsByPage?: Record<number, number>;
  marks: TakeoffMark[];
  exportedAt?: string;
}): TakeoffProjectExport {
  const {
    sourceFileName,
    marketCode,
    pageCount,
    scalesByPage,
    rotationsByPage,
    marks,
    exportedAt,
  } = params;

  let totalLinearM = 0;
  let totalAreaM2 = 0;
  let totalCount = 0;

  const categories = Object.keys(TAKEOFF_CATEGORIES) as TakeoffCategory[];
  const byCategory = Object.fromEntries(
    categories.map((cat) => [
      cat,
      {
        count: 0,
        totalQuantity: 0,
        unit: TAKEOFF_CATEGORIES[cat].defaultUnit,
      },
    ]),
  ) as Record<
    TakeoffCategory,
    { count: number; totalQuantity: number; unit: string }
  >;

  for (const cat of categories) {
    byCategory[cat] = {
      count: 0,
      totalQuantity: 0,
      unit: TAKEOFF_CATEGORIES[cat].defaultUnit,
    };
  }

  for (const mark of marks) {
    if (mark.type === "linear") {
      totalLinearM += mark.quantity;
    } else if (mark.type === "area") {
      totalAreaM2 += mark.quantity;
    } else if (mark.type === "count") {
      totalCount += mark.quantity;
    }

    if (byCategory[mark.category]) {
      byCategory[mark.category].count += 1;
      byCategory[mark.category].totalQuantity += mark.quantity;
    }
  }

  return {
    format: "frelux-blueprint-takeoff",
    version: 1,
    exportedAt: exportedAt || new Date().toISOString(),
    sourceFileName: sourceFileName || "untitled-plan",
    sourceFileIncluded: false,
    marketCode: marketCode || "NG",
    pageCount: Math.max(1, pageCount || 1),
    scalesByPage: scalesByPage || {},
    rotationsByPage: rotationsByPage,
    marks,
    summary: {
      totalLinearM: Number(totalLinearM.toFixed(3)),
      totalAreaM2: Number(totalAreaM2.toFixed(3)),
      totalCount: Math.round(totalCount),
      byCategory,
    },
    limitations: TAKEOFF_DISCLAIMERS,
  };
}

export function serializeTakeoffProject(
  exportData: TakeoffProjectExport,
): string {
  return JSON.stringify(exportData, null, 2);
}

export function parseTakeoffProjectExport(rawJson: string): {
  ok: boolean;
  project?: TakeoffProjectExport;
  error?: string;
} {
  try {
    const data = JSON.parse(rawJson);
    if (!data || typeof data !== "object") {
      return { ok: false, error: "JSON does not represent a valid object." };
    }
    if (data.format !== "frelux-blueprint-takeoff") {
      return {
        ok: false,
        error:
          'Unrecognized takeoff format. Expected "frelux-blueprint-takeoff".',
      };
    }
    if (data.version !== 1) {
      return {
        ok: false,
        error: `Unsupported format version ${data.version}. Expected version 1.`,
      };
    }
    if (!Array.isArray(data.marks)) {
      return { ok: false, error: 'Missing or invalid "marks" array.' };
    }

    const validatedMarks: TakeoffMark[] = [];
    for (let i = 0; i < data.marks.length; i++) {
      const m = data.marks[i];
      if (!m || typeof m !== "object") {
        return { ok: false, error: `Mark at index ${i} is not an object.` };
      }
      if (!["linear", "area", "count"].includes(m.type)) {
        return {
          ok: false,
          error: `Mark at index ${i} has unsupported type "${m.type}".`,
        };
      }
      if (
        !Array.isArray(m.points) ||
        m.points.some(
          (p: { x?: unknown; y?: unknown }) =>
            !Number.isFinite(Number(p?.x)) || !Number.isFinite(Number(p?.y)),
        )
      ) {
        return { ok: false, error: `Mark at index ${i} has invalid points.` };
      }
      if (!Number.isFinite(Number(m.quantity)) || Number(m.quantity) < 0) {
        return {
          ok: false,
          error: `Mark at index ${i} has an invalid quantity.`,
        };
      }
      if (
        !Number.isInteger(Number(m.page)) ||
        Number(m.page) < 1 ||
        Number(m.page) > (Number(data.pageCount) || 1)
      ) {
        return {
          ok: false,
          error: `Mark at index ${i} has an invalid page number.`,
        };
      }
      const category: TakeoffCategory =
        m.category in TAKEOFF_CATEGORIES ? m.category : "general";

      validatedMarks.push({
        id: typeof m.id === "string" ? m.id : `mark-${i + 1}`,
        page: Number(m.page),
        type: m.type,
        category,
        label: typeof m.label === "string" ? m.label : `Mark ${i + 1}`,
        points: m.points.map((p: { x?: unknown; y?: unknown }) => ({
          x: Number(p.x),
          y: Number(p.y),
        })),
        quantity: Number(m.quantity),
        unit: m.unit === "m²" || m.unit === "items" ? m.unit : "m",
        color: typeof m.color === "string" ? m.color : "#2563eb",
        notes: typeof m.notes === "string" ? m.notes : undefined,
      });
    }

    const project = createTakeoffProjectExport({
      sourceFileName:
        typeof data.sourceFileName === "string"
          ? data.sourceFileName
          : "untitled-plan",
      marketCode: typeof data.marketCode === "string" ? data.marketCode : "NG",
      pageCount: Number(data.pageCount) || 1,
      scalesByPage:
        data.scalesByPage && typeof data.scalesByPage === "object"
          ? data.scalesByPage
          : {},
      rotationsByPage:
        data.rotationsByPage && typeof data.rotationsByPage === "object"
          ? data.rotationsByPage
          : undefined,
      marks: validatedMarks,
      exportedAt:
        typeof data.exportedAt === "string" ? data.exportedAt : undefined,
    });

    return { ok: true, project };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to parse JSON project.",
    };
  }
}

export interface WorksheetBridgeResult {
  engine: string;
  path: string;
  targetParam: string;
  targetValue: number;
  url: string;
  categoryLabel: string;
}

/**
 * Builds the URL and parameters to bridge a measured takeoff mark into
 * the matching standalone calculation worksheet.
 */
export function buildWorksheetBridgeUrl(params: {
  mark: TakeoffMark;
  sourceFileName: string;
  marketCode: string;
}): WorksheetBridgeResult | null {
  const { mark, sourceFileName, marketCode } = params;
  let engine: string;
  let path: string;
  let targetParam: string;
  const targetValue = mark.quantity;

  // Only bridge quantity types the destination worksheet actually accepts.
  // Unsupported combinations remain takeoff-only instead of silently misfilling another input.
  if (mark.type === "linear") {
    if (mark.category === "drainage") {
      engine = "drainage";
      path = "/drainage-calculator";
      targetParam = "runLength";
    } else if (mark.category === "temporary-works") {
      engine = "temporary-works";
      path = "/temporary-works-calculator";
      targetParam = "elementLength";
    } else if (mark.category === "drywall") {
      engine = "drywall";
      path = "/drywall-calculator";
      targetParam = "length";
    } else if (mark.category === "masonry") {
      engine = "masonry";
      path = "/masonry-calculator";
      targetParam = "length";
    } else {
      return null;
    }
  } else if (mark.type === "area") {
    if (mark.category === "paving") {
      engine = "paving";
      path = "/paving-calculator";
      targetParam = "area";
    } else if (mark.category === "insulation") {
      engine = "insulation";
      path = "/insulation-calculator";
      targetParam = "area";
    } else if (mark.category === "plastering") {
      engine = "plastering";
      path = "/plastering-calculator";
      targetParam = "area";
    } else {
      return null;
    }
  } else {
    return null;
  }

  const query = new URLSearchParams({
    source: "blueprint-takeoff",
    plan: sourceFileName || "untitled-plan",
    page: String(mark.page),
    markId: mark.id,
    label: mark.label,
    market: marketCode,
    category: mark.category,
    unit: mark.unit,
    [targetParam]: String(targetValue),
  });

  return {
    engine,
    path,
    targetParam,
    targetValue,
    url: `${path}?${query.toString()}`,
    categoryLabel: TAKEOFF_CATEGORIES[mark.category]?.name ?? "Measurement",
  };
}
