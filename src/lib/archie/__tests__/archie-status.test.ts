// =========================================================
// FRELUX ARCHIE STAGE 1, SYSTEM REGISTRY TESTS
//
// Honesty contract for the Owner Control Dashboard:
//  * systems with a real backend report operational with
//    real figures
//  * systems without a backend report ADAPTER PENDING —
//    never fake "operational"
//  * security severity drives alert/degraded states
// =========================================================
import { describe, it, expect } from "vitest";
import { buildSystemsRegistry, type ArchieStatus } from "@/lib/archie/status";

const base: ArchieStatus = {
  coreReachable: true,
  domains: { total: 10, active: 8 },
  knowledge: { active: 42 },
  learning: {
    ingestions: 5,
    processing: 0,
    pipeline_states: { AWAITING_APPROVAL: 5 },
  },
  agents: { total: 3, active: 1, by_status: { EXECUTING: 1, TERMINATED: 2 } },
  devices: { trusted: 2, pending: 1 },
  security: { events24h: 0, latestSeverity: null },
  projects: { contractorProjects: 7, estimates: 120 },
  conversations: 4,
  infraCostMonthCents: 5432,
};

describe("buildSystemsRegistry", () => {
  it("reports real systems as operational with real figures", () => {
    const sections = buildSystemsRegistry(base);
    const knowledge = sections.find((s) => s.key === "knowledge");
    expect(knowledge?.state).toBe("operational");
    expect(knowledge?.detail).toContain("42");

    const devices = sections.find((s) => s.key === "devices");
    expect(devices?.detail).toContain("2 trusted");
    expect(devices?.detail).toContain("1 pending");

    const costs = sections.find((s) => s.key === "costs");
    expect(costs?.detail).toContain("$54.32");
  });

  it("marks systems without a backend as adapter-pending, never operational", () => {
    const sections = buildSystemsRegistry(base);
    const pendingKeys = [
      "properties",
      "construction",
      "market",
      "web",
      "code",
      "documents",
      "images",
      "voice",
      "location",
      "social",
      "family",
    ];
    for (const key of pendingKeys) {
      const s = sections.find((x) => x.key === key);
      expect(s, `missing section ${key}`).toBeDefined();
      expect(s?.state).toBe("pending");
      expect(s?.detail.length).toBeGreaterThan(0);
    }
  });

  it("escelates security state from real event severity", () => {
    const critical = buildSystemsRegistry({
      ...base,
      security: { events24h: 1, latestSeverity: "CRITICAL" },
    });
    expect(critical.find((s) => s.key === "security")?.state).toBe("alert");

    const warning = buildSystemsRegistry({
      ...base,
      security: { events24h: 3, latestSeverity: "WARNING" },
    });
    expect(warning.find((s) => s.key === "security")?.state).toBe("degraded");

    const calm = buildSystemsRegistry(base);
    expect(calm.find((s) => s.key === "security")?.state).toBe("operational");
  });

  it("covers every Owner dashboard section with unique keys", () => {
    const sections = buildSystemsRegistry(base);
    const expected = [
      "intelligence",
      "knowledge",
      "learning",
      "projects",
      "properties",
      "construction",
      "calculators",
      "market",
      "web",
      "code",
      "sentry",
      "documents",
      "images",
      "voice",
      "location",
      "social",
      "professional",
      "devices",
      "family",
      "api",
      "agents",
      "infrastructure",
      "security",
      "permissions",
      "audit",
      "integrations",
      "costs",
      "config",
    ];
    expect(sections.map((s) => s.key).sort()).toEqual([...expected].sort());
    expect(new Set(sections.map((s) => s.key)).size).toBe(expected.length);
  });
});
