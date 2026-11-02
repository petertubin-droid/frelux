import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for the Search Console "Product snippets" warning
 * (missing aggregateRating / review, 2026-10-10).
 *
 * FRELUX has no physical merchant products and never fabricates ratings,
 * so no informational page may emit schema.org "Product" JSON-LD.
 * Software subscriptions use SoftwareApplication, colours use DefinedTerm.
 *
 * The one allowed exception is a real marketplace listing (price, stock,
 * seller), where Product + Offer is the correct type; its rating/review
 * fields are optional and are only ever emitted from genuine data.
 */
const ALLOWED = ["marketplace/ProductDetail.tsx"];
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("structured data: no Product snippets", () => {
  const files = walk(join(process.cwd(), "src"));

  it("no source file declares a schema.org Product @type", () => {
    const offenders = files
      .filter((f) => !ALLOWED.some((a) => f.replace(/\\/g, "/").endsWith(a)))
      .filter((f) =>
        /"@type":\s*"Product"|'@type':\s*'Product'|"@type":\s*\[[^\]]*"Product"/.test(
          readFileSync(f, "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
