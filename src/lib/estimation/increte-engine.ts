/**
 * Deterministic Increte/decorative concrete estimator.
 * Geometry is universal. Product coverage, package size, waste, labour and
 * price must be supplied from a verified record or by the user; this module
 * never applies a US specification or price to another market.
 */
import { areaToM2 } from "./units";

export type IncreteSystem =
  | "stamped-concrete"
  | "colour-hardener"
  | "release-agent"
  | "stain"
  | "decorative-overlay"
  | "textured-finish"
  | "sealer";
export type DataOrigin = "user_supplied" | "verified_source";

export interface IncreteProductInput {
  id: string;
  name: string;
  system: IncreteSystem;
  /** Surface coverage for one package, in m²/package, as documented. */
  coverageM2PerPackage: number | null;
  packageSize: number | null;
  packageUnit: string;
  coats: number;
  wastePercent: number;
  unitPrice: number | null;
  priceOrigin: DataOrigin;
  specOrigin: DataOrigin;
  sourceUrl?: string | null;
  /** Set when source facts have been explicitly reviewed and approved. */
  approved?: boolean;
}

export interface IncreteInput {
  marketCode: string;
  length: number;
  width: number;
  areaUnit: "m2" | "ft2";
  thickness: number | null;
  thicknessUnit: "mm" | "in";
  labourRatePerM2: number | null;
  products: IncreteProductInput[];
  currencyCode: string;
}

export interface IncreteLineResult {
  id: string;
  name: string;
  quantity: number | null;
  packageUnit: string;
  packages: number | null;
  unitPrice: number | null;
  total: number | null;
  dataOrigin: DataOrigin | "incomplete";
}
export interface IncreteResult {
  areaM2: number;
  concreteVolumeM3: number | null;
  lines: IncreteLineResult[];
  materialTotal: number | null;
  labourTotal: number | null;
  grandTotal: number | null;
  warnings: string[];
  method: string[];
  complete: boolean;
}

const validPositive = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

export function calculateIncrete(input: IncreteInput): IncreteResult {
  const warnings: string[] = [];
  const areaM2 = areaToM2(input.length * input.width, input.areaUnit);
  if (!areaM2 || !validPositive(areaM2)) {
    return {
      areaM2: 0, concreteVolumeM3: null, lines: [], materialTotal: null,
      labourTotal: null, grandTotal: null, warnings: ["Enter positive floor dimensions."],
      method: [], complete: false,
    };
  }
  if (!input.marketCode) warnings.push("Select a market.");
  const thicknessM = input.thickness == null ? null : input.thicknessUnit === "mm" ? input.thickness / 1000 : input.thickness * 0.0254;
  const concreteVolumeM3 = validPositive(thicknessM) ? areaM2 * thicknessM : null;
  const lines = input.products.map((product): IncreteLineResult => {
    const specOkay = validPositive(product.coverageM2PerPackage) && Number.isInteger(product.coats) && product.coats > 0 && Number.isFinite(product.wastePercent) && product.wastePercent >= 0 && product.wastePercent <= 100;
    const areaWithWaste = areaM2 * (1 + product.wastePercent / 100);
    const quantity = specOkay ? areaWithWaste * product.coats : null;
    // Coverage is explicitly expressed per purchasable package. Package size
    // is descriptive only and must not be multiplied into coverage again.
    const packages = quantity !== null
      ? Math.ceil(quantity / product.coverageM2PerPackage! - 1e-12)
      : null;
    const priceOkay = product.unitPrice !== null && Number.isFinite(product.unitPrice) && product.unitPrice >= 0;
    if (!specOkay) warnings.push(`${product.name}: verified coverage and a valid coat/waste value are required; quantity not calculated.`);
    if (product.specOrigin === "verified_source" && (!product.approved || !product.sourceUrl)) warnings.push(`${product.name}: source data is not approved; treated as incomplete.`);
    const allowedSpec = specOkay && (product.specOrigin === "user_supplied" || (!!product.approved && !!product.sourceUrl));
    const allowedPrice = priceOkay && (product.priceOrigin === "user_supplied" || (!!product.approved && !!product.sourceUrl));
    const finalQuantity = allowedSpec ? quantity : null;
    const finalPackages = allowedSpec ? packages : null;
    const total = finalPackages !== null && allowedPrice ? finalPackages * product.unitPrice! : null;
    if (!allowedPrice) warnings.push(`${product.name}: enter a local price or add an approved market-specific source.`);
    return {
      id: product.id, name: product.name, quantity: finalQuantity,
      packageUnit: product.packageUnit || "package", packages: finalPackages,
      unitPrice: allowedPrice ? product.unitPrice : null, total,
      dataOrigin: !allowedSpec || !allowedPrice ? "incomplete" : product.specOrigin,
    };
  });
  if (input.thickness !== null && !validPositive(thicknessM)) warnings.push("Concrete volume omitted: thickness must be a positive value.");
  if (input.products.length === 0) warnings.push("Add a product specification to calculate quantities.");
  const materialTotal = lines.length > 0 && lines.every((line) => line.total !== null)
    ? lines.reduce((sum, line) => sum + line.total!, 0) : null;
  const labourTotal = input.labourRatePerM2 !== null && Number.isFinite(input.labourRatePerM2) && input.labourRatePerM2 >= 0
    ? areaM2 * input.labourRatePerM2 : null;
  if (input.labourRatePerM2 === null) warnings.push("Labour excluded; enter a local labour rate to include it.");
  const grandTotal = materialTotal !== null && labourTotal !== null ? materialTotal + labourTotal : null;
  return {
    areaM2, concreteVolumeM3, lines, materialTotal, labourTotal, grandTotal,
    warnings: [...new Set(warnings)],
    method: ["Area = length × width, normalized to m².", "Required material = area × coats × (1 + waste allowance).", "Packages = ceiling(required material ÷ documented coverage per package).", "Concrete volume = area × slab thickness when thickness is provided."],
    complete: materialTotal !== null && labourTotal !== null && warnings.length === 0,
  };
}
