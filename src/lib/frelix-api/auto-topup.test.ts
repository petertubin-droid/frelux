// =========================================================
// Auto top-up stays honest until it is actually built.
//
// The wallet stores the owner's auto top-up preference, but nothing charges a
// card: that needs a saved payment method, a consent flow, and a decision about
// who is allowed to move money without being asked. Half of that feature is
// worse than none of it, because a seller who believes their balance refills
// itself will one day find requests refused at 402.
//
// This test pins the current boundary. It lists every file allowed to mention
// the flag. Implementing auto top-up means adding the charging file here on
// purpose, which is the point: the list is a decision, not an accident.
// =========================================================

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "supabase/functions"];

const ALLOWED = new Set([
  // Storage and read model.
  "src/lib/frelix-api/portal-client.ts",
  // Display, with the "not active" wording.
  "src/components/frelix-api/ApiWalletCard.tsx",
  "src/components/frelix-api/ApiWalletCard.test.tsx",
  // Portal integration test fixtures.
  "src/pages/DeveloperPortal.test.tsx",
  // This boundary itself.
  "src/lib/frelix-api/auto-topup.test.ts",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("auto top-up is a stored preference, not a charge", () => {
  it("is mentioned only by the files that store, show or test it", () => {
    const referencing = [...ROOTS.flatMap(walk)]
      .filter((file) =>
        readFileSync(file, "utf8").includes("auto_topup_enabled"),
      )
      .map((file) => file.replace(/\\/g, "/"))
      .sort();

    expect(referencing).toEqual([...ALLOWED].sort());
  });

  it("is never credited or charged without a stored payment method", () => {
    // A charge would have to go through the wallet credit function, which is
    // only reachable from the signed webhook, and the webhook has no notion of
    // a saved card.
    const webhook = readFileSync(
      "supabase/functions/flutterwave-webhook/index.ts",
      "utf8",
    );
    expect(webhook).not.toContain("auto_topup");
  });
});
