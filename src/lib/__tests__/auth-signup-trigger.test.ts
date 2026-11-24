import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_MARKET_CODES } from "@/lib/international/countries";

/**
 * Static guards over the signup trigger.
 *
 * The trigger is the only code path that can create a profile, and it runs
 * inside auth.users INSERT, so a mistake in it does not fail a test: it makes
 * every signup return "Database error saving new user" while the suite stays
 * green. That is exactly what happened with NEW.app_metadata, which does not
 * exist on auth.users (the column is raw_app_meta_data; the camelCase name only
 * exists in GoTrue's API response). These checks read the migration chain the
 * way a fresh database would replay it and assert the final definition.
 */

const MIGRATIONS = join(process.cwd(), "supabase/migrations");

function migrationFiles(): { version: string; file: string; sql: string }[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({
      version: file.slice(0, 14),
      file,
      sql: readFileSync(join(MIGRATIONS, file), "utf8"),
    }));
}

/** The last migration that defines handle_new_user is the live definition. */
function latestTriggerDefinition() {
  const defining = migrationFiles().filter((m) =>
    /FUNCTION\s+public\.handle_new_user\s*\(/i.test(m.sql),
  );
  expect(defining.length, "no migration defines handle_new_user").toBeGreaterThan(0);
  return defining[defining.length - 1];
}

describe("handle_new_user trigger definition", () => {
  it("reads raw_app_meta_data, the column auth.users actually has", () => {
    const latest = latestTriggerDefinition();
    expect(latest.sql).toContain("NEW.raw_app_meta_data");
    // The camelCase name is a GoTrue API field, not a column: referencing it
    // raises 42703 on every insert and kills registration.
    expect(latest.sql).not.toMatch(/NEW\.app_metadata/);
  });

  it("keeps its supported-country seed identical to the form's list", () => {
    // The trigger asks public.registration_countries rather than carrying a
    // literal list, so the risk moved from the function body to the seed. This
    // compares the seed a fresh database would insert with the codes the form
    // actually offers: a country offered but not seeded is a signup that dies
    // on submit, and a seeded country nobody offers is dead weight.
    const seeding = migrationFiles().filter((m) =>
      /INSERT INTO public\.registration_countries/i.test(m.sql),
    );
    expect(seeding.length, "no migration seeds registration_countries").toBeGreaterThan(0);
    const latest = seeding[seeding.length - 1];
    const block = latest.sql.slice(
      latest.sql.search(/INSERT INTO public\.registration_countries/i),
    );
    const seeded = new Set(
      [...block.matchAll(/\('([A-Z]{2})'\)/g)].map((m) => m[1]),
    );
    const offered = new Set(APPROVED_MARKET_CODES);
    expect([...offered].filter((c) => !seeded.has(c))).toEqual([]);
    expect([...seeded].filter((c) => !offered.has(c))).toEqual([]);
  });

  it("enforces the Nigerian NIN rule in the database, not only the form", () => {
    const latest = latestTriggerDefinition();
    // The trigger is the one path every signup passes through, including a
    // direct call to the auth API that never renders the form.
    expect(latest.sql).toMatch(/requested_nin !~ '\^\[0-9\]\{11\}\$'/);
    expect(latest.sql).toContain("A Nigerian NIN must be exactly 11 digits.");
    expect(latest.sql).toContain("Unsupported government ID type.");
  });

  it("still writes the identity and location columns it was extended for", () => {
    const latest = latestTriggerDefinition();
    for (const column of [
      "location",
      "nin_number",
      "government_id_type",
      "government_id_number",
    ]) {
      expect(latest.sql, column).toContain(column);
    }
  });
});
