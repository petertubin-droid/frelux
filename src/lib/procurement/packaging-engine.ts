/**
 * Deterministic package rounding for project requisitions.
 * Package sizes and MOQs must come from the user or a verified supplier feed;
 * this module deliberately has no market defaults.
 */
export interface PackagingRule {
  packageSize: number;
  minimumOrderQuantity?: number;
}

export interface PackagingResult {
  requiredQuantity: number;
  packageSize: number | null;
  minimumOrderQuantity: number;
  packageCount: number | null;
  orderQuantity: number | null;
  surplusQuantity: number | null;
  status: "rounded" | "package_size_required";
}

export function calculatePackagedQuantity(
  requiredQuantity: number,
  rule?: PackagingRule | null,
): PackagingResult {
  if (!Number.isFinite(requiredQuantity) || requiredQuantity < 0) {
    throw new RangeError("Required quantity must be a finite, non-negative number.");
  }

  if (!rule) {
    return {
      requiredQuantity,
      packageSize: null,
      minimumOrderQuantity: 0,
      packageCount: null,
      orderQuantity: null,
      surplusQuantity: null,
      status: "package_size_required",
    };
  }

  const { packageSize, minimumOrderQuantity = 0 } = rule;
  if (!Number.isFinite(packageSize) || packageSize <= 0) {
    throw new RangeError("Package size must be a finite number greater than zero.");
  }
  if (!Number.isFinite(minimumOrderQuantity) || minimumOrderQuantity < 0) {
    throw new RangeError("Minimum order quantity must be finite and non-negative.");
  }

  const packageCount = requiredQuantity === 0
    ? 0
    : Math.ceil(Math.max(requiredQuantity, minimumOrderQuantity) / packageSize);
  const orderQuantity = packageCount * packageSize;
  return {
    requiredQuantity,
    packageSize,
    minimumOrderQuantity,
    packageCount,
    orderQuantity,
    surplusQuantity: Math.max(0, orderQuantity - requiredQuantity),
    status: "rounded",
  };
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
