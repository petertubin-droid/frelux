import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards the "assign a professional from the admin screen" flow.
 *
 * The regression these hold: a client has no pro_profiles row, and the SQL
 * helper admin_update_pro_profile raises "This account has no professional
 * profile" in that case. When the edge function let that exception fail the
 * whole save, the screen could only show "Edge Function returned a non-2xx
 * status code" and no professional was ever created, so the account stayed
 * invisible in every Pro Connect register.
 */
const fn = readFileSync(
  resolve(process.cwd(), "supabase/functions/admin-user-management/index.ts"),
  "utf8",
);
const page = readFileSync(
  resolve(process.cwd(), "src/pages/admin/AdminUsers.tsx"),
  "utf8",
);
const directory = readFileSync(
  resolve(process.cwd(), "src/lib/pro-connect.ts"),
  "utf8",
);

describe("admin professional assignment", () => {
  it("creates the professional profile when the account has none", () => {
    expect(fn).toContain('.from("pro_profiles")');
    expect(fn).toContain("if (!existingPro)");
    expect(fn).toContain("if (insertProError)");
    // The assignment is auditable, not a silent row insert.
    expect(fn).toContain('action: "assign_pro_worker"');
  });

  it("patches an existing professional through the whitelisting helper", () => {
    expect(fn).toContain('"admin_update_pro_profile"');
    // The row lookup has to happen before the patch, or the first assignment
    // of a client would still hit the helper's exception.
    expect(fn.indexOf('.eq("user_id", userId)')).toBeLessThan(
      fn.indexOf('"admin_update_pro_profile"'),
    );
  });

  it("loads the professional's own record into the admin editor", () => {
    // Blank defaults wrote is_listed false, which unlisted a listed pro on save.
    expect(page).toContain('.from("pro_profiles")');
    expect(page).toContain("is_listed: pro.is_listed");
  });

  it("prints the function's own refusal instead of the wrapper message", () => {
    expect(page).toContain("getFunctionErrorMessage");
  });

  it("keeps the public directory to professionals who are not unlisted", () => {
    // is_listed is nullable on older rows, which were listed before the column
    // existed; those must stay visible.
    expect(directory).toContain('.or("is_listed.eq.true,is_listed.is.null")');
  });
});
