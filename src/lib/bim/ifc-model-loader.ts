/**
 * Pillar 3: Native client-side IFC model loader (web-ifc).
 *
 * Parses .ifc models (IFC2x3 and IFC4) entirely in the browser: zero server
 * roundtrip. The wasm binary is vendored at /vendor/web-ifc.wasm and loaded
 * from the page origin; nothing is uploaded.
 *
 * Verified against web-ifc 0.0.78 in the unit tests using a real IFC4 file
 * (cube-advanced-brep.ifc) and a crafted IFC4 quantities file.
 *
 * Honest scope: quantities are extracted only when the file declares them
 * (IfcQuantityVolume/Area/Length/Count/Weight via IfcRelDefinesByProperties
 * -> IfcElementQuantity). Elements without declared quantities are reported
 * as such, never invented.
 */

export type IfcQuantityKind = "length" | "area" | "volume" | "count" | "weight";

export interface IfcQuantityValue {
  name: string;
  kind: IfcQuantityKind;
  value: number;
}

export interface IfcGeometryPart {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** Column-major 4x4 placement matrix. */
  matrix: number[];
  /** RGBA 0..1. */
  color: [number, number, number, number];
}

export interface IfcModelElement {
  expressID: number;
  /** IFC GlobalId (IfcRoot). Stable identity for model-to-estimate linking. */
  globalId: string;
  /** IFC class name, e.g. IFCCOLUMN. */
  ifcClass: string;
  name: string;
  /** Quantities the file declares for this element. */
  quantities: IfcQuantityValue[];
  geometry: IfcGeometryPart[];
}

export interface IfcModelParseResult {
  ok: boolean;
  schema: string | null;
  elements: IfcModelElement[];
  elementsWithGeometry: number;
  elementsWithQuantities: number;
  warnings: string[];
}

/** IFC classes the QTO takes off (deterministic fixed list). */
const TARGET_IFC_CLASSES = [
  "IFCWALL",
  "IFCWALLSTANDARDCASE",
  "IFCSLAB",
  "IFCROOF",
  "IFCCOLUMN",
  "IFCBEAM",
  "IFCDOOR",
  "IFCWINDOW",
  "IFCSTAIR",
  "IFCSTAIRFLIGHT",
  "IFCCURTAINWALL",
  "IFCPLATE",
  "IFCMEMBER",
  "IFCFOOTING",
  "IFCPILE",
  "IFCRAILING",
  "IFCCOVERING",
  "IFCCHIMNEY",
  "IFCBUILDINGELEMENTPROXY",
];

function detectSchema(bytes: Uint8Array): string | null {
  const head = new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.subarray(0, Math.min(bytes.length, 4096)),
  );
  const m = head.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/i);
  return m ? m[1] : null;
}

interface WebIfcModule {
  IfcAPI: new () => IfcApiLike;
  [constant: string]: unknown;
}

interface IfcApiLike {
  Init(): Promise<void>;
  SetWasmPath(path: string, absolute?: boolean): void;
  OpenModel(data: Uint8Array): number;
  CloseModel(id: number): void;
  GetLineIDsWithType(
    modelID: number,
    type: number,
    SPFFragment?: unknown,
  ): {
    size(): number;
    get(i: number): number;
  };
  GetLine(modelID: number, id: number): Record<string, unknown>;
  GetGeometry(
    modelID: number,
    geometryID: number,
  ): {
    GetVertexData(): number;
    GetVertexDataSize(): number;
    GetIndexData(): number;
    GetIndexDataSize(): number;
  };
  GetVertexArray(ptr: number, size: number): Float32Array;
  GetIndexArray(ptr: number, size: number): Uint32Array;
  StreamAllMeshes(modelID: number, cb: (mesh: unknown) => void): void;
  GetNameFromTypeCode(code: number): string;
}

const QUANTITY_KINDS: Array<{
  attr: string;
  kind: IfcQuantityKind;
  type: string;
}> = [
  { attr: "LengthValue", kind: "length", type: "IFCQUANTITYLENGTH" },
  { attr: "AreaValue", kind: "area", type: "IFCQUANTITYAREA" },
  { attr: "VolumeValue", kind: "volume", type: "IFCQUANTITYVOLUME" },
  { attr: "CountValue", kind: "count", type: "IFCQUANTITYCOUNT" },
  { attr: "WeightValue", kind: "weight", type: "IFCQUANTITYWEIGHT" },
];

function refValue(x: unknown): number | null {
  if (x && typeof x === "object" && "value" in x)
    return (x as { value: number }).value;
  return null;
}

/**
 * Parse an IFC file (IFC2x3 or IFC4) into model elements with declared
 * quantities and placed geometry. Runs fully client-side.
 */
export async function parseIfcModel(
  data: Uint8Array,
): Promise<IfcModelParseResult> {
  const WebIfc = (await import("web-ifc")) as unknown as WebIfcModule;
  const api = new WebIfc.IfcAPI();
  const isNodeRuntime =
    typeof (globalThis as { process?: unknown }).process !== "undefined";
  if (!isNodeRuntime) {
    // Browser: wasm vendored at /vendor/web-ifc.wasm (see public/vendor).
    // Node/vitest resolves the node build's own wasm; SetWasmPath must not
    // override it there.
    api.SetWasmPath("/vendor/", true);
  }
  await api.Init();
  const modelID = api.OpenModel(data);
  const warnings: string[] = [];
  try {
    // 1. Collect the IfcElementQuantity sets and the elements they belong to.
    const quantitySetIds = new Set<number>();
    const qsetType = WebIfc.IFCELEMENTQUANTITY as number;
    const qsets = api.GetLineIDsWithType(modelID, qsetType);
    for (let i = 0; i < qsets.size(); i++) quantitySetIds.add(qsets.get(i));

    // element expressID -> quantity set ids
    const quantitiesByElement = new Map<number, number[]>();
    const relType = WebIfc.IFCRELDEFINESBYPROPERTIES as number;
    const rels = api.GetLineIDsWithType(modelID, relType);
    for (let i = 0; i < rels.size(); i++) {
      const rel = api.GetLine(modelID, rels.get(i));
      const pd = refValue(rel.RelatingPropertyDefinition);
      if (pd === null || !quantitySetIds.has(pd)) continue;
      const related = rel.RelatedObjects as
        Array<{ value: number }> | undefined;
      if (!Array.isArray(related)) continue;
      for (const obj of related) {
        const list = quantitiesByElement.get(obj.value) ?? [];
        list.push(pd);
        quantitiesByElement.set(obj.value, list);
      }
    }

    // 2. Geometry per element expressID.
    const geometryByElement = new Map<number, IfcGeometryPart[]>();
    let streamed = 0;
    api.StreamAllMeshes(modelID, (mesh) => {
      streamed++;
      const expressID = (mesh as { expressID: number }).expressID;
      const geometries = (
        mesh as {
          geometries: {
            size(): number;
            get(i: number): {
              geometryExpressID: number;
              flatTransformation: number[];
              color: { x: number; y: number; z: number; w: number };
            };
          };
        }
      ).geometries;
      const parts: IfcGeometryPart[] = [];
      for (let i = 0; i < geometries.size(); i++) {
        const g = geometries.get(i);
        const geo = api.GetGeometry(modelID, g.geometryExpressID);
        const verts = api.GetVertexArray(
          geo.GetVertexData(),
          geo.GetVertexDataSize(),
        );
        const indices = api.GetIndexArray(
          geo.GetIndexData(),
          geo.GetIndexDataSize(),
        );
        if (verts.length === 0 || indices.length === 0) continue;
        const positions = new Float32Array(verts.length / 2);
        const normals = new Float32Array(verts.length / 2);
        for (let v = 0; v < verts.length; v += 6) {
          positions[v / 2] = verts[v];
          positions[v / 2 + 1] = verts[v + 1];
          positions[v / 2 + 2] = verts[v + 2];
          normals[v / 2] = verts[v + 3];
          normals[v / 2 + 1] = verts[v + 4];
          normals[v / 2 + 2] = verts[v + 5];
        }
        parts.push({
          positions,
          normals,
          indices,
          matrix: g.flatTransformation,
          color: [g.color.x, g.color.y, g.color.z, g.color.w],
        });
      }
      if (parts.length > 0) geometryByElement.set(expressID, parts);
    });

    // 3. Elements: iterate the deterministic class list.
    const elements: IfcModelElement[] = [];
    let withQuantities = 0;
    for (const className of TARGET_IFC_CLASSES) {
      const typeCode = WebIfc[className] as number;
      if (typeof typeCode !== "number") continue;
      const ids = api.GetLineIDsWithType(modelID, typeCode);
      for (let i = 0; i < ids.size(); i++) {
        const id = ids.get(i);
        const line = api.GetLine(modelID, id);
        const globalId =
          (line.GlobalId as { value?: string } | undefined)?.value ?? "";
        const name = (line.Name as { value?: string } | undefined)?.value ?? "";
        const quantities: IfcQuantityValue[] = [];
        for (const qs of quantitiesByElement.get(id) ?? []) {
          const eq = api.GetLine(modelID, qs);
          const quantityRefs = eq.Quantities as
            Array<{ value: number }> | undefined;
          if (!Array.isArray(quantityRefs)) continue;
          for (const ref of quantityRefs) {
            const q = api.GetLine(modelID, ref.value);
            const qName =
              (q.Name as { value?: string } | undefined)?.value ?? "";
            for (const kind of QUANTITY_KINDS) {
              const v = refValue(q[kind.attr]);
              if (typeof v === "number") {
                quantities.push({ name: qName, kind: kind.kind, value: v });
                break;
              }
            }
          }
        }
        if (quantities.length > 0) withQuantities++;
        elements.push({
          expressID: id,
          globalId,
          ifcClass: className,
          name,
          quantities,
          geometry: geometryByElement.get(id) ?? [],
        });
      }
    }

    const elementsWithGeometry = elements.filter(
      (e) => e.geometry.length > 0,
    ).length;
    if (elements.length === 0) {
      warnings.push("No recognized construction elements found in this model.");
    }
    const withoutQuantities = elements.length - withQuantities;
    if (withoutQuantities > 0) {
      warnings.push(
        `${withoutQuantities} of ${elements.length} elements declare no IfcQuantity values; their takeoff lines stay empty rather than guessed.`,
      );
    }
    if (elements.length > 0 && elementsWithGeometry === 0) {
      warnings.push(
        "No 3D geometry could be generated for the recognized elements; the quantity takeoff still reflects the declared IfcQuantity values.",
      );
    }
    return {
      ok: true,
      schema: detectSchema(data),
      elements,
      elementsWithGeometry,
      elementsWithQuantities: withQuantities,
      warnings,
    };
  } finally {
    api.CloseModel(modelID);
  }
}
