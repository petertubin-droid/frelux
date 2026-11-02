// =========================================================
// FRELUX Wall Finishing - material compatibility.
//
// Interior-only products are never silently recommended for
// exterior use. Compatibility is data-driven per role; the UI
// warns (and blocks cost silently going wrong) on a mismatch.
// =========================================================

import type { WallSubstrate } from "@/types/wallfinishing";

export interface RoleCompatibility {
  role: string;
  interior: boolean;
  exterior: boolean;
  wetArea: boolean;
  substrates: WallSubstrate[] | "all";
}

/**
 * Compatibility matrix by material role. Roles not listed here
 * are treated as general-purpose (both surfaces) - the matrix
 * exists to catch the dangerous cases, not to be exhaustive.
 */
export const ROLE_COMPATIBILITY: Record<string, RoleCompatibility> = {
  "interior-paint": {
    role: "interior-paint",
    interior: true,
    exterior: false,
    wetArea: true,
    substrates: "all",
  },
  "interior-paint-premium": {
    role: "interior-paint-premium",
    interior: true,
    exterior: false,
    wetArea: true,
    substrates: "all",
  },
  "exterior-paint": {
    role: "exterior-paint",
    interior: true,
    exterior: true,
    wetArea: true,
    substrates: "all",
  },
  "joint-filler": {
    role: "joint-filler",
    interior: true,
    exterior: false,
    wetArea: false,
    substrates: ["drywall", "block", "brick", "masonry", "concrete"],
  },
  "mist-coat": {
    role: "mist-coat",
    interior: true,
    exterior: false,
    wetArea: false,
    substrates: ["drywall", "block", "brick", "masonry"],
  },
  "skim-plaster": {
    role: "skim-plaster",
    interior: true,
    exterior: false,
    wetArea: false,
    substrates: ["block", "brick", "masonry", "drywall"],
  },
  "bonding-plaster": {
    role: "bonding-plaster",
    interior: true,
    exterior: false,
    wetArea: false,
    substrates: ["block", "brick", "masonry", "concrete"],
  },
  "gypsum-plaster": {
    role: "gypsum-plaster",
    interior: true,
    exterior: false,
    wetArea: false,
    substrates: ["block", "brick", "masonry"],
  },
  "fine-filler": {
    role: "fine-filler",
    interior: true,
    exterior: false,
    wetArea: false,
    substrates: ["drywall", "block", "brick", "masonry", "concrete"],
  },
  "joint-tape": {
    role: "joint-tape",
    interior: true,
    exterior: false,
    wetArea: false,
    substrates: ["drywall"],
  },
  primer: {
    role: "primer",
    interior: true,
    exterior: true,
    wetArea: true,
    substrates: "all",
  },
};

export interface CompatibilityCheck {
  ok: boolean;
  warnings: string[];
}

/**
 * Check a role against the surface and substrate the layer will
 * be applied to. Warnings surface in the UI; the estimator keeps
 * working with a visible incompatibility notice.
 */
export function checkCompatibility(
  role: string,
  surface: "interior" | "exterior",
  substrate: WallSubstrate[],
  isWetArea = false,
): CompatibilityCheck {
  const warnings: string[] = [];
  const compat = ROLE_COMPATIBILITY[role];
  if (!compat) return { ok: true, warnings };

  if (surface === "exterior" && !compat.exterior) {
    warnings.push(
      `'${role}' is an interior-only product: using it on an exterior wall will fail ` +
        `weathering. Choose an exterior-grade material instead.`,
    );
  }
  if (surface === "interior" && !compat.interior) {
    warnings.push(`'${role}' is not rated for interior use.`);
  }
  if (isWetArea && !compat.wetArea) {
    warnings.push(
      `'${role}' is not wet-area rated: bathrooms and kitchens need a moisture-compatible product.`,
    );
  }
  if (compat.substrates !== "all") {
    const supported = substrate.every((s) => compat.substrates!.includes(s));
    if (!supported) {
      warnings.push(
        `'${role}' is not rated for this substrate (${substrate.join(", ")}).`,
      );
    }
  }
  return { ok: warnings.length === 0, warnings };
}
