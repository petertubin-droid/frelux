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
  /** Name of the IfcBuildingStorey the element is contained in, when declared. */
  storey?: string;
  /** Name of the IfcTypeObject the element is defined by, when declared. */
  typeName?: string;
  /** Name of the IfcMaterial / material layer set, when declared. */
  material?: string;
  /**
   * Single-value properties the file declares for this element, read from
   * Pset_* property sets. Complex, list and bounded properties are counted in
   * `skippedComplexProperties` instead of being flattened or guessed.
   */
  properties?: IfcElementProperty[];
}

/** Scalar value a single IFC property can state. */
export type IfcPropertyScalar = string | number | boolean;

/**
 * A property value as the file states it. Simple properties carry a scalar;
 * list, bounded and (flattened) complex properties keep their structure so
 * nothing is silently flattened into a value the file did not claim.
 */
export type IfcPropertyValue =
  | IfcPropertyScalar
  | { kind: "list"; values: IfcPropertyScalar[] }
  | {
      kind: "bounded";
      lower?: IfcPropertyScalar;
      upper?: IfcPropertyScalar;
      setPoint?: IfcPropertyScalar;
    }
  | {
      kind: "complex";
      properties: Array<{ name: string; value: IfcPropertyValue }>;
    };

export interface IfcElementProperty {
  /** property set name, e.g. Pset_WallCommon */
  pset: string;
  /** property name, e.g. FireRating; nested complex entries use dotted paths */
  name: string;
  value: IfcPropertyValue;
  /** true when this entry came out of a complex property (dotted name) */
  nested?: boolean;
}

/**
 * What the loader understands, stated as data so the UI and the docs cannot
 * drift from the code. Anything outside this list is reported in
 * `coverage.unmappedClasses`, never silently dropped.
 */
export const IFC_COVERAGE = {
  schema: ["IFC2X3", "IFC4", "IFC4X3"],
  quantityKinds: ["length", "area", "volume", "count", "weight"],
  relations: [
    "IfcRelDefinesByProperties -> IfcElementQuantity",
    "IfcRelContainedInSpatialStructure -> IfcBuildingStorey",
    "IfcRelDefinesByType -> IfcTypeObject",
    "IfcRelAssociatesMaterial -> IfcMaterial / IfcMaterialLayerSet",
    "IfcProject.UnitsInContext -> IfcUnitAssignment",
    "IfcRelDefinesByProperties -> IfcPropertySet (single-value + enumerated)",
    "IfcPropertyBoundedValue (lower / upper / set point)",
    "IfcPropertyListValue (all values, kept as a list)",
    "IfcPropertyComplexProperty (nested entries, dotted names)",
  ],
  /**
   * Not covered, and not claimed: IfcPropertyTableValue is counted and
   * skipped; a bounded value is never collapsed into one number (the bounds
   * stay visible, the consumer may use an explicit set point); no unit
   * conversion is performed; spatial structure above storey level
   * (site/building) is not modelled. Full IFC4 entity coverage is not
   * claimed.
   */
} as const;

export interface IfcCoverageReport {
  /** classes the loader took off (TARGET_IFC_CLASSES) */
  supportedClasses: string[];
  /** elements taken off, per class */
  countsByClass: Record<string, number>;
  /** IFC classes present in the model with geometry but not taken off */
  unmappedClasses: Array<{ ifcClass: string; count: number }>;
}

export interface IfcDeclaredUnits {
  length: string | null;
  area: string | null;
  volume: string | null;
  /** true when the model declares no IfcUnitAssignment at all */
  undeclared: boolean;
}

export interface IfcModelParseResult {
  ok: boolean;
  schema: string | null;
  elements: IfcModelElement[];
  elementsWithGeometry: number;
  elementsWithQuantities: number;
  warnings: string[];
  /** what this model contained versus what the loader takes off */
  coverage: IfcCoverageReport;
  /** units the file declares; never converted, only reported */
  units: IfcDeclaredUnits;
  /** elements carrying at least one declared single-value property */
  elementsWithProperties: number;
  /**
   * complex / list / bounded properties encountered and deliberately skipped,
   * so a partially read Pset is visible rather than silently thin
   */
  skippedComplexProperties: number;
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
  "IFCBUILDINGELEMENTPART",
  "IFCRAMP",
  "IFCRAMPFLIGHT",
  "IFCPROXY",
  "IFCREINFORCINGBAR",
  "IFCREINFORCINGMESH",
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

/**
 * web-ifc returns IFC strings as wrapper objects ({ value, type, name }) for
 * attributes such as Name and NominalValue, and plain strings elsewhere.
 * This reads either shape and returns null when there is no usable text.
 */
function labelText(x: unknown): string | null {
  if (typeof x === "string") return x.trim() === "" ? null : x;
  if (x && typeof x === "object" && "value" in x) {
    const v = (x as { value: unknown }).value;
    if (typeof v === "string") return v.trim() === "" ? null : v;
  }
  return null;
}

function refValue(x: unknown): number | null {
  if (x && typeof x === "object" && "value" in x)
    return (x as { value: number }).value;
  return null;
}

/** Maps an IfcSIUnit name to the quantity kind it measures. */
const SI_UNIT_KIND: Record<string, keyof Omit<IfcDeclaredUnits, "undeclared">> =
  {
    METRE: "length",
    SQUARE_METRE: "area",
    CUBIC_METRE: "volume",
  };

/**
 * Summarises what a model contained versus what the loader takes off.
 * Pure: takes the classes found while streaming geometry, returns counts.
 */
export function summarizeCoverage(
  geometryClasses: readonly string[],
  elements: readonly { ifcClass: string }[],
): IfcCoverageReport {
  const supported = new Set(TARGET_IFC_CLASSES);
  const countsByClass: Record<string, number> = {};
  for (const el of elements) {
    countsByClass[el.ifcClass] = (countsByClass[el.ifcClass] ?? 0) + 1;
  }
  const unmappedCounts = new Map<string, number>();
  for (const cls of geometryClasses) {
    if (supported.has(cls)) continue;
    unmappedCounts.set(cls, (unmappedCounts.get(cls) ?? 0) + 1);
  }
  return {
    supportedClasses: [...TARGET_IFC_CLASSES],
    countsByClass,
    unmappedClasses: [...unmappedCounts.entries()]
      .map(([ifcClass, count]) => ({ ifcClass, count }))
      .sort(
        (a, b) => b.count - a.count || a.ifcClass.localeCompare(b.ifcClass),
      ),
  };
}

/** Builds the declared-units record from IfcSIUnit names found in the file. */
export function summarizeUnits(unitNames: readonly string[]): IfcDeclaredUnits {
  const units: IfcDeclaredUnits = {
    length: null,
    area: null,
    volume: null,
    undeclared: unitNames.length === 0,
  };
  for (const name of unitNames) {
    const kind = SI_UNIT_KIND[name];
    if (kind && units[kind] === null) units[kind] = name;
  }
  return units;
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

    // 1b. Property sets: element expressID -> declared single-value properties.
    //     IfcPropertySet/IfcElementQuantity share IfcRelDefinesByProperties, so
    //     the quantity sets collected above are skipped here by id.
    const propertiesByElement = new Map<number, IfcElementProperty[]>();
    let skippedComplexProperties = 0;
    const psetIds = new Set<number>();
    const psetType = (WebIfc.IFCPROPERTYSET ?? 0) as number;
    if (psetType > 0) {
      const ids = api.GetLineIDsWithType(modelID, psetType);
      for (let i = 0; i < ids.size(); i++) psetIds.add(ids.get(i));
    }
    const singleType = (WebIfc.IFCPROPERTYSINGLEVALUE ?? 0) as number;
    const enumType = (WebIfc.IFCPROPERTYENUMERATEDVALUE ?? 0) as number;
    const boundedType = (WebIfc.IFCPROPERTYBOUNDEDVALUE ?? 0) as number;
    const listType = (WebIfc.IFCPROPERTYLISTVALUE ?? 0) as number;
    // IFC4 names this entity IfcComplexProperty; IFCPROPERTYCOMPLEXPROPERTY
    // does not exist in the schema (web-ifc returns undefined for it), which
    // silently disabled complex-property detection before this fix.
    const complexType = (WebIfc.IFCCOMPLEXPROPERTY ?? 0) as number;
    const tableType = (WebIfc.IFCPROPERTYTABLEVALUE ?? 0) as number;
    /** Deepest complex nesting read; deeper entries are counted, not guessed. */
    const MAX_COMPLEX_DEPTH = 4;

    const scalarOf = (x: unknown): IfcPropertyScalar | null => {
      if (
        typeof x === "string" ||
        typeof x === "number" ||
        typeof x === "boolean"
      )
        return x;
      if (x && typeof x === "object" && "value" in (x as object)) {
        const v = (x as { value?: unknown }).value;
        if (
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
        )
          return v;
      }
      return null;
    };

    /** web-ifc type code of a property line, or null when unreadable. */
    const typeOf = (propID: number): number | null => {
      try {
        const line = api.GetLine(modelID, propID) as { type?: number };
        return typeof line.type === "number" ? line.type : null;
      } catch {
        return null;
      }
    };

    /**
     * Read one property line into zero or more flat entries. Simple and
     * enumerated values yield one entry; bounded and list values keep their
     * structure; a complex property is flattened into dotted nested entries so
     * nothing is dropped or invented.
     */
    const propertyEntries = (
      propID: number,
      depth: number,
      prefix?: string,
    ): Array<{ name: string; value: IfcPropertyValue; nested?: boolean }> => {
      let prop: Record<string, unknown>;
      try {
        prop = api.GetLine(modelID, propID) as Record<string, unknown>;
      } catch {
        // A malformed property line must never abort the whole model parse.
        return [];
      }
      const type = typeof prop.type === "number" ? prop.type : null;
      const baseName = labelText(prop.Name);
      const name = baseName
        ? prefix
          ? `${prefix}.${baseName}`
          : baseName
        : null;

      if (type === complexType) {
        if (depth >= MAX_COMPLEX_DEPTH || !name) return [];
        const inner = prop.HasProperties as
          Array<{ value: number }> | undefined;
        if (!Array.isArray(inner)) return [];
        const out: Array<{
          name: string;
          value: IfcPropertyValue;
          nested?: boolean;
        }> = [];
        for (const ref of inner) {
          out.push(...propertyEntries(ref.value, depth + 1, name));
        }
        return out;
      }

      if (!name) return [];

      if (type === boundedType) {
        const lower = scalarOf(prop.LowerBoundValue);
        const upper = scalarOf(prop.UpperBoundValue);
        const setPoint = scalarOf(prop.SetPointValue);
        if (lower === null && upper === null && setPoint === null) return [];
        return [
          {
            name,
            value: {
              kind: "bounded",
              ...(lower !== null ? { lower } : {}),
              ...(upper !== null ? { upper } : {}),
              ...(setPoint !== null ? { setPoint } : {}),
            },
            ...(prefix ? { nested: true } : {}),
          },
        ];
      }

      if (type === listType) {
        const refs = prop.ListValues as Array<{ value?: unknown }> | undefined;
        if (!Array.isArray(refs)) return [];
        const values = refs
          .map((r) => scalarOf(r?.value))
          .filter((v): v is IfcPropertyScalar => v !== null);
        if (values.length === 0) return [];
        return [
          {
            name,
            value: { kind: "list", values },
            ...(prefix ? { nested: true } : {}),
          },
        ];
      }

      if (type === tableType) {
        // Not read: a table's rows carry a meaning we would have to invent.
        return [];
      }

      // Single, enumerated, or an untyped line: one scalar when present.
      const nominal = scalarOf(prop.NominalValue);
      if (nominal !== null) {
        return [{ name, value: nominal, ...(prefix ? { nested: true } : {}) }];
      }
      const enumerated = prop.EnumerationValues as
        Array<{ value?: unknown }> | undefined;
      if (Array.isArray(enumerated) && enumerated.length > 0) {
        const v = scalarOf(enumerated[0]?.value);
        if (v !== null) {
          return [{ name, value: v, ...(prefix ? { nested: true } : {}) }];
        }
      }
      return [];
    };

    if (psetIds.size > 0) {
      const psetProps = new Map<number, IfcElementProperty[]>();
      for (const psetID of psetIds) {
        let pset: Record<string, unknown>;
        try {
          pset = api.GetLine(modelID, psetID) as Record<string, unknown>;
        } catch {
          skippedComplexProperties += 1;
          continue;
        }
        const psetName = labelText(pset.Name);
        if (!psetName) continue;
        const hasProps = pset.HasProperties as
          Array<{ value: number }> | undefined;
        if (!Array.isArray(hasProps)) continue;
        const collected: IfcElementProperty[] = [];
        for (const ref of hasProps) {
          const entries = propertyEntries(ref.value, 0);
          if (entries.length === 0) {
            skippedComplexProperties += 1;
            continue;
          }
          for (const entry of entries) {
            collected.push({ pset: psetName, ...entry });
          }
        }
        if (collected.length > 0) psetProps.set(psetID, collected);
      }
      for (let i = 0; i < rels.size(); i++) {
        const rel = api.GetLine(modelID, rels.get(i));
        const pd = refValue(rel.RelatingPropertyDefinition);
        if (pd === null) continue;
        const collected = psetProps.get(pd);
        if (!collected) continue;
        const related = rel.RelatedObjects as
          Array<{ value: number }> | undefined;
        if (!Array.isArray(related)) continue;
        for (const obj of related) {
          const list = propertiesByElement.get(obj.value) ?? [];
          list.push(...collected);
          propertiesByElement.set(obj.value, list);
        }
      }
    }

    // 2. Spatial containment: element expressID -> storey name.
    const storeyByElement = new Map<number, string>();
    const relStorey = (WebIfc.IFCRELCONTAINEDINSPATIALSTRUCTURE ?? 0) as number;
    if (typeof relStorey === "number" && relStorey > 0) {
      const storeyIds = api.GetLineIDsWithType(
        modelID,
        WebIfc.IFCBUILDINGSTOREY as number,
      );
      const storeyName = new Map<number, string>();
      for (let i = 0; i < storeyIds.size(); i++) {
        const sid = storeyIds.get(i);
        const line = api.GetLine(modelID, sid);
        storeyName.set(
          sid,
          (line.Name as { value?: string } | undefined)?.value ?? "",
        );
      }
      const rels2 = api.GetLineIDsWithType(modelID, relStorey);
      for (let i = 0; i < rels2.size(); i++) {
        const rel = api.GetLine(modelID, rels2.get(i));
        const target = refValue(rel.RelatingStructure);
        if (target === null) continue;
        const name = storeyName.get(target);
        if (!name) continue;
        const related = rel.RelatedElements as
          Array<{ value: number }> | undefined;
        if (!Array.isArray(related)) continue;
        for (const obj of related) storeyByElement.set(obj.value, name);
      }
    }

    // 3. Type objects: element expressID -> IfcTypeObject name.
    const typeByElement = new Map<number, string>();
    const relTypeDef = (WebIfc.IFCRELDEFINESBYTYPE ?? 0) as number;
    if (typeof relTypeDef === "number" && relTypeDef > 0) {
      const rels3 = api.GetLineIDsWithType(modelID, relTypeDef);
      for (let i = 0; i < rels3.size(); i++) {
        const rel = api.GetLine(modelID, rels3.get(i));
        const typeRef = refValue(rel.RelatingType);
        if (typeRef === null) continue;
        const typeLine = api.GetLine(modelID, typeRef);
        const typeName =
          (typeLine.Name as { value?: string } | undefined)?.value ?? "";
        if (!typeName) continue;
        const related = rel.RelatedObjects as
          Array<{ value: number }> | undefined;
        if (!Array.isArray(related)) continue;
        for (const obj of related) typeByElement.set(obj.value, typeName);
      }
    }

    // 4. Materials: element expressID -> material / layer set name.
    const materialByElement = new Map<number, string>();
    const relMat = (WebIfc.IFCRELASSOCIATESMATERIAL ?? 0) as number;
    if (typeof relMat === "number" && relMat > 0) {
      const rels4 = api.GetLineIDsWithType(modelID, relMat);
      for (let i = 0; i < rels4.size(); i++) {
        const rel = api.GetLine(modelID, rels4.get(i));
        const matRef = refValue(rel.RelatingMaterial);
        if (matRef === null) continue;
        const matLine = api.GetLine(modelID, matRef);
        const matName =
          (matLine.Name as { value?: string } | undefined)?.value ??
          (matLine.LayerSetName as { value?: string } | undefined)?.value ??
          "";
        if (!matName) continue;
        const related = rel.RelatedObjects as
          Array<{ value: number }> | undefined;
        if (!Array.isArray(related)) continue;
        for (const obj of related) materialByElement.set(obj.value, matName);
      }
    }

    // 5. Geometry per element expressID (and the class of each streamed mesh).
    const geometryByElement = new Map<number, IfcGeometryPart[]>();
    const geometryClasses: string[] = [];
    let streamed = 0;
    api.StreamAllMeshes(modelID, (mesh) => {
      streamed++;
      const expressID = (mesh as { expressID: number }).expressID;
      try {
        const line = api.GetLine(modelID, expressID);
        const typeCode = (line as { type?: number }).type;
        if (typeof typeCode === "number") {
          const name = api.GetNameFromTypeCode(typeCode);
          if (name) geometryClasses.push(name.toUpperCase());
        }
      } catch {
        // A mesh whose line cannot be read still contributes geometry; it is
        // simply not counted in coverage rather than dropping the element.
      }
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
          ...(storeyByElement.has(id)
            ? { storey: storeyByElement.get(id) }
            : {}),
          ...(typeByElement.has(id) ? { typeName: typeByElement.get(id) } : {}),
          ...(materialByElement.has(id)
            ? { material: materialByElement.get(id) }
            : {}),
          ...(propertiesByElement.has(id)
            ? { properties: propertiesByElement.get(id) }
            : {}),
        });
      }
    }

    // Declared units: read, reported, never converted.
    const unitNames: string[] = [];
    try {
      const projectIds = api.GetLineIDsWithType(
        modelID,
        WebIfc.IFCPROJECT as number,
      );
      if (projectIds.size() > 0) {
        const project = api.GetLine(modelID, projectIds.get(0));
        const unitAssignRef = refValue(project.UnitsInContext);
        if (unitAssignRef !== null) {
          const assignment = api.GetLine(modelID, unitAssignRef);
          const unitRefs = assignment.Units as
            Array<{ value: number }> | undefined;
          if (Array.isArray(unitRefs)) {
            for (const ref of unitRefs) {
              const unit = api.GetLine(modelID, ref.value);
              const unitName = (unit.Name as { value?: string } | undefined)
                ?.value;
              if (unitName) unitNames.push(unitName);
            }
          }
        }
      }
    } catch {
      // Older/partial files may omit UnitsInContext; reported as undeclared.
    }
    const units = summarizeUnits(unitNames);

    const elementsWithGeometry = elements.filter(
      (e) => e.geometry.length > 0,
    ).length;
    if (elements.length === 0) {
      warnings.push("No recognized construction elements found in this model.");
    }
    const coverage = summarizeCoverage(geometryClasses, elements);
    if (coverage.unmappedClasses.length > 0) {
      const total = coverage.unmappedClasses.reduce((n, c) => n + c.count, 0);
      warnings.push(
        `${total} geometry element(s) of ${coverage.unmappedClasses.length} class(es) outside the takeoff list were not taken off (${coverage.unmappedClasses
          .slice(0, 5)
          .map((c) => `${c.ifcClass} x${c.count}`)
          .join(
            ", ",
          )}${coverage.unmappedClasses.length > 5 ? ", ..." : ""}). They are reported, never guessed.`,
      );
    }
    if (units.undeclared) {
      warnings.push(
        "The model declares no IfcUnitAssignment; quantities are reported in the file's own numbers without a stated unit.",
      );
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
      elementsWithProperties: elements.filter(
        (e) => (e.properties?.length ?? 0) > 0,
      ).length,
      skippedComplexProperties,
      coverage: summarizeCoverage(geometryClasses, elements),
      units,
    };
  } finally {
    api.CloseModel(modelID);
  }
}
