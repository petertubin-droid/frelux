import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * Release gate for the tool surface.
 *
 * Every calculator FRELUX publishes has to be reachable, indexed, answerable and
 * laid out the same way. This runs the readiness audit and fails when one of
 * those breaks, so a new tool cannot ship as a route with no page, a page with
 * no sitemap entry, or a page whose questions exist but never render.
 *
 * The FAQ backlog is a declared number, not a silent allowance: it shrinks as
 * the remaining tools get their question sets, and it is checked so it cannot
 * grow.
 */

const FAQ_GROUP_BACKLOG = 14;

function audit(): {
  counts: Record<string, number>;
  noFaqGroup: string[];
} {
  const output = execFileSync(
    process.execPath,
    ["scripts/audit-global-readiness.mjs", "--json"],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  return JSON.parse(output);
}

describe("global readiness", () => {
  const report = audit();

  it("registers a route and a page for every catalogue tool", () => {
    expect(report.counts.tools).toBeGreaterThan(70);
    expect(report.counts.routeMissing, "routes missing from App").toBe(0);
    expect(report.counts.pageMissing, "pages the router cannot resolve").toBe(
      0,
    );
  });

  it("indexes every tool in the sitemap", () => {
    expect(report.counts.sitemapMissing, "tools missing from sitemap").toBe(0);
  });

  it("renders the questions of every tool that has them", () => {
    expect(report.counts.faqNotRendered, "FAQ groups never rendered").toBe(0);
  });

  it("lays every tool out with the shared display shell", () => {
    expect(report.counts.noUniversalLayout, "pages without the shell").toBe(0);
  });

  it("keeps the tools without questions shrinking", () => {
    expect(report.counts.noFaqGroup).toBeLessThanOrEqual(FAQ_GROUP_BACKLOG);
  });
});
