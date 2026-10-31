// =========================================================
// Auto top-up has exactly one charging path.
//
// This file used to guard a preference that nothing honoured. Now that the
// sweep really charges saved cards, the risk has inverted: a second place
// that charges from the flag, or a surface that turns it on without consent,
// is how an owner gets billed twice or billed unexpectedly.
//
// So the list below is exhaustive on purpose. Adding a file means making a
// deliberate decision about automatic charges, which is the point.
// =========================================================

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "supabase/functions"];

const ALLOWED = new Set([
  // Storage and read model.
  "src/lib/frelix-api/portal-client.ts",
  // Display and consent.
  "src/components/frelix-api/ApiAutoTopupPanel.tsx",
  "src/components/frelix-api/ApiAutoTopupPanel.test.tsx",
  // Wallet card integration and its fixtures.
  "src/components/frelix-api/ApiWalletCard.test.tsx",
  "src/pages/DeveloperPortal.test.tsx",
  // This boundary itself.
  "src/lib/frelix-api/auto-topup.test.ts",
]);

/**
 * Built at runtime: a literal here would make this file match its own scan and
 * report itself as a second charger.
 */
const CHARGE_ENDPOINT = ["tokenized", "charges"].join("-");

/** The only function allowed to charge a saved card unattended. */
const SWEEP = "supabase/functions/frelix-wallet-autotopup/index.ts";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("auto top-up", () => {
  it("is mentioned only by the files that store, show, consent or sweep it", () => {
    const referencing = [...ROOTS.flatMap(walk)]
      .filter((file) =>
        readFileSync(file, "utf8").includes("auto_topup_enabled"),
      )
      .map((file) => file.replace(/\\/g, "/"))
      .sort();

    expect(referencing).toEqual([...ALLOWED].sort());
  });

  it("charges from exactly one place, and that place needs the sweep secret", () => {
    const chargers = [...ROOTS.flatMap(walk)]
      .filter((file) => readFileSync(file, "utf8").includes(CHARGE_ENDPOINT))
      .map((file) => file.replace(/\\/g, "/"))
      .sort();

    expect(chargers).toEqual([SWEEP]);

    const sweep = readFileSync(SWEEP, "utf8");
    // Fail closed: no secret configured means no charges, and a caller
    // without the header is refused before any database work.
    expect(sweep).toContain("AUTOTOPUP_CRON_SECRET");
    expect(sweep).toContain('"Unauthorized"');
    // The token is read server side only.
    expect(sweep).toContain("provider_token");
  });

  it("never turns itself on without recorded consent", () => {
    // Consent is enforced in the database, not in the browser, so the guard
    // has to live where the charge decision is made.
    const migration = readFileSync(
      "supabase/migrations/20261031220000_api_auto_topup.sql",
      "utf8",
    );
    expect(migration).toContain(
      "consent is required to charge a card automatically",
    );
    expect(migration).toContain("and w.auto_topup_consent_at is not null");
  });
});
