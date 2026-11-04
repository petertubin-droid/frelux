import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The assistants are prompt-and-code, so their guardrails are only as good as
 * the text and the gates around them. These assertions keep the fixes of
 * 2026-11-04 from drifting: an assistant that renames itself, cites a route
 * that does not exist, or prices a market it has no prices for is a bug a user
 * experiences as a wrong answer.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf-8");

const app = read("src/App.tsx");
const livechat = read("supabase/functions/ai-livechat/index.ts");

describe("visitor assistant", () => {
  it("presents itself as FRELUX, not another product", () => {
    expect(livechat).toContain("You are the FRELUX assistant");
    expect(livechat).not.toContain("You are ARCHIE");
  });

  it("only names estimator routes that exist", () => {
    const cited = Array.from(livechat.matchAll(/\/(?:[a-z0-9]+-)+[a-z0-9]+\b/g))
      .map((m) => m[0])
      .filter((p) => p.includes("estimator") || p.includes("calculator"));
    expect(cited.length).toBeGreaterThan(3);
    for (const path of new Set(cited)) {
      expect(app).toContain(`path="${path}"`);
    }
  });

  it("forbids stating technical constants and prices as fact", () => {
    expect(livechat).toContain("Never state a technical figure as fact");
    expect(livechat).toContain("Never quote a price");
  });

  it("refuses to assume the country", () => {
    expect(livechat).toContain("Never assume the country");
    expect(livechat).toContain("{{MARKET_CONTEXT}}");
  });

  it("does not claim a feature the platform does not list", () => {
    expect(livechat).toContain("This is the complete list");
  });
});

describe("photo estimation", () => {
  const fn = read("supabase/functions/ai-building-estimation/index.ts");

  it("refuses to price a market it has no price book for", () => {
    expect(fn).toContain('code: "PRICE_NOT_DETERMINED"');
    expect(fn).toContain('statedMarket !== "NG"');
  });

  it("labels its price source honestly", () => {
    expect(fn).toContain("Nigerian price book is configured here");
    expect(fn).not.toContain("auto-updated");
  });
});

describe("project assistant", () => {
  const fn = read("supabase/functions/ai-project-assistant/index.ts");

  it("uses the project currency instead of naira everywhere", () => {
    expect(fn).not.toContain("₦");
    expect(fn).toContain("currencySymbol");
  });

  it("does not assume a Nigerian market in its review prompt", () => {
    expect(fn).not.toContain("a Nigerian construction estimation platform");
    expect(fn).not.toContain("this project type in Nigeria");
  });
});

describe("retired brand in assistant prompts", () => {
  it("no assistant tells the model to call itself PAINT CALC", () => {
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(join(process.cwd(), dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) out.push(...walk(rel));
        else if (entry.name.endsWith(".ts")) out.push(rel);
      }
      return out;
    };
    const offenders = walk("supabase/functions").filter((f) =>
      read(f).includes("FRELUX PAINT CALC"),
    );
    expect(offenders).toEqual([]);
  });
});

describe("learning assistant", () => {
  const fn = read("supabase/functions/ai-learn-assistant/index.ts");

  it("forbids stating technical constants and prices as fact", () => {
    expect(fn).toContain("Never state a technical figure as fact");
    expect(fn).toContain("Never quote a price");
    expect(fn).toContain("Do not assume the country");
  });
});

describe("colour consultant", () => {
  const fn = read("supabase/functions/ai-color-consult/index.ts");

  it("normalises or refuses a colour without a usable hex", () => {
    expect(fn).toContain("function normalizeHex");
    expect(fn).toContain("INVALID_HEX");
  });

  it("does not let the model quote prices or imply stock", () => {
    expect(fn).toContain("Never quote a price");
  });
});
