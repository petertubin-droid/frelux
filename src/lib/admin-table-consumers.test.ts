import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: an admin console may only manage a table that something reads.
 *
 * The audit found seven tables with a full admin console and no consumer at
 * all, so an admin could "configure" data that never reached a page. Each
 * table below now has a public read path, or is documented here as
 * deliberately internal. Adding a console for a new table means either
 * wiring a reader or writing down why it is internal, in this list.
 */

const SRC = "src";

/** Tables that must have at least one read outside src/pages/admin. */
const PUBLIC_TABLES = [
  "learn_wall_finishing_topics",
  "learn_wall_finishing_article_slots",
  "worker_safety_settings",
  "market_price_observations",
  "market_price_alerts",
] as const;

/**
 * Tables with an admin console and no public reader, by design. Keep the
 * reason beside the name so the next person does not "fix" it.
 */
const INTERNAL_ONLY: Record<string, string> = {
  supplier_bills:
    "Internal payables ledger for the business; customers have no supplier portal, and the console says so.",
  learn_wall_finishing_market_status:
    "Editorial coverage state (needs_research / verified) used to decide what to publish; it is not visitor-facing content.",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);
const publicFiles = files.filter(
  (f) =>
    !f.startsWith(join(SRC, "pages", "admin")) && !/\.test\.(ts|tsx)$/.test(f),
);
const contents = publicFiles.map((f) => ({
  path: f,
  text: readFileSync(f, "utf8"),
}));

describe("admin tables have a consumer", () => {
  it.each(PUBLIC_TABLES)("%s is read outside the admin console", (table) => {
    const needle = `"${table}"`;
    const reader = contents.find((f) => f.text.includes(needle));
    expect(
      reader,
      `${table} is managed in admin but never read by the app. Wire a reader or document it in INTERNAL_ONLY.`,
    ).toBeTruthy();
  });

  it("every documented internal table really has no public reader", () => {
    for (const [table, reason] of Object.entries(INTERNAL_ONLY)) {
      expect(reason.length, `${table} needs a written reason`).toBeGreaterThan(
        20,
      );
      const reader = contents.find((f) => f.text.includes(`"${table}"`));
      expect(
        reader,
        `${table} is now read publicly (${reader?.path}); move it to PUBLIC_TABLES.`,
      ).toBeUndefined();
    }
  });
});
