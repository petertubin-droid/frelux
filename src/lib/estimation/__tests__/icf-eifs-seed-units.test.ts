/**
 * Guards the ICF/EIFS price seed against the engines' own unit contract.
 *
 * A role mapping whose unit_label disagrees with the unit the BOQ line is priced
 * in is worse than no mapping: system-boq-pricing excludes the line on the unit
 * check, so the calculator silently drops a cost it appears to have priced. This
 * test reads the seed migration and compares every unit_label with the
 * pricingUnit the engines attach to that role.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculateIcfWall, type IcfWallInput } from "../icf-engine";
import { calculateEifsWall, type EifsWallInput } from "../eifs-engine";
import { MATERIAL_ROLES } from "../market-materials";

const SEED = resolve(
  __dirname,
  "../../../../supabase/migrations/20261119150000_icf_eifs_gb_au_roles.sql",
);

const icfInput: IcfWallInput = {
  wallLengthM: 40,
  wallHeightM: 3,
  coreThicknessMm: 150,
  foamType: "standard_eps",
  corners90Count: 4,
  corners45Count: 0,
  tWallsCount: 0,
  verticalRebarSize: "12M",
  verticalRebarSpacingMm: 400,
  horizontalRebarCourses: "every_course",
  wasteFactorPercent: 4,
  isBasement: false,
  marketCode: "US",
  laborCrewSize: 4,
};

const eifsInput: EifsWallInput = {
  wallLengthM: 40,
  wallHeightM: 3,
  insulationThicknessMm: 50,
  substrateType: "exterior_sheathing",
  insulationType: "standard_eps",
  systemType: "drainable_eifs",
  attachmentMethod: "dual_adhesive_mechanical",
  finishTexture: "medium_swirl",
  wasteFactorPercent: 5,
  exteriorCornersCount: 4,
  impactMeshHeightM: 2,
  laborCrewSize: 4,
};

/** role -> unit the engine prices that role in. */
function engineRoleUnits(): Map<string, string> {
  const units = new Map<string, string>();
  for (const line of [
    ...calculateIcfWall(icfInput).boq,
    ...calculateEifsWall(eifsInput).boq,
  ]) {
    if (line.priceRole && line.pricingUnit) {
      units.set(line.priceRole, line.pricingUnit);
    }
  }
  return units;
}

interface SeededRole {
  market: string;
  role: string;
  slug: string;
  unitLabel: string;
}

function seededRoles(): SeededRole[] {
  const sql = readFileSync(SEED, "utf8");
  const rows: SeededRole[] = [];
  const pattern =
    /\(\s*'(GB|AU)',\s*'([a-z-]+)',\s*'([a-z0-9-]+)',\s*'[^']*',\s*'([^']+)'/g;
  for (const match of sql.matchAll(pattern)) {
    rows.push({
      market: match[1],
      role: match[2],
      slug: match[3],
      unitLabel: match[4],
    });
  }
  return rows;
}

describe("ICF/EIFS price seed", () => {
  it("seeds GB and AU roles", () => {
    const rows = seededRoles();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.filter((r) => r.market === "GB").length).toBeGreaterThanOrEqual(
      3,
    );
    expect(rows.filter((r) => r.market === "AU").length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("seeds no Nigerian role, because neither system is stocked at retail there", () => {
    expect(seededRoles().some((r) => r.market === "NG")).toBe(false);
  });

  it("uses only roles the price book knows", () => {
    for (const row of seededRoles()) {
      expect(MATERIAL_ROLES as readonly string[]).toContain(row.role);
    }
  });

  it("prices every seeded role in the unit its engine line uses", () => {
    const units = engineRoleUnits();
    for (const row of seededRoles()) {
      expect(units.has(row.role)).toBe(true);
      expect(row.unitLabel).toBe(units.get(row.role));
    }
  });

  it("gives each seeded role a matching material slug for its market", () => {
    for (const row of seededRoles()) {
      expect(row.slug.startsWith(`${row.market.toLowerCase()}-`)).toBe(true);
    }
  });
});
