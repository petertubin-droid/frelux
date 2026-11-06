/**
 * Guards the price read paths against the legacy frelux_price column.
 *
 * market_material_prices still carries frelux_price from the first price
 * writer. Nothing has read it since the applied price moved to median_price,
 * and by November 2026 it disagreed with median_price on 53 rows while
 * looking authoritative in an admin table. The column is aligned now, but a
 * query that starts selecting it again would reintroduce a second answer to
 * the same question, so this suite fails if one appears in application code.
 *
 * Migrations are excluded: they are the record of the change, including the
 * alignment itself.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    if (/\.test\.(ts|tsx)$/.test(entry)) return [];
    return [full];
  });
}

describe("legacy frelux_price column", () => {
  it("is selected by no application module", () => {
    const offenders = walk(ROOT).filter((file) =>
      /\bfrelux_price\b/.test(readFileSync(file, "utf8")),
    );
    expect(offenders.map((f) => f.replace(ROOT, "src"))).toEqual([]);
  });
});
