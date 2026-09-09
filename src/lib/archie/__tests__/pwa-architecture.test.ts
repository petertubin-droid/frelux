import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  PWA_CAPABILITY_MAP,
  PWA_FUTURE_CAPABILITY_RULE,
  assertPwaExposure,
  pwaIntegrationRequirement,
} from "../pwa-architecture";

// =========================================================
// ARCHIE PWA ARCHITECTURE — PERMANENT CAPABILITY EXPOSURE
//
// These tests are the STRUCTURAL enforcement of the Owner's
// standing rule: the PWA is the Owner's complete command
// center. If a new core capability is added without a PWA
// surface, these fail — naming the missing integration.
// =========================================================

const ROOT = path.join(__dirname, "../../../..");

/** The Owner's enumerated required capabilities (the standing
 *  directive). Every id here MUST map to a live PWA route. */
const REQUIRED: readonly string[] = [
  "chat",
  "owner_authority",
  "knowledge",
  "learning",
  "coding",
  "code_intelligence",
  "evolution",
  "devices",
  "security",
  "migration",
  "system",
  "control",
  "training",
  "voice",
  "ops",
  "people",
  "shared",
  "terminology",
];

describe("PWA capability exposure (permanent rule)", () => {
  it("is healthy: every required capability has a PWA surface", () => {
    const report = assertPwaExposure(REQUIRED);
    if (!report.healthy) {
      console.error(
        "UNEXPOSED:",
        report.unexposed.map((c) => c.id),
      );
    }
    expect(report.healthy).toBe(true);
  });

  it("fails honestly when a capability is missing — and names it", () => {
    const report = assertPwaExposure([...REQUIRED, "quantum_thing"]);
    expect(report.healthy).toBe(false);
    expect(report.unexposed.map((c) => c.id)).toContain("quantum_thing");
  });

  it("rejects an owner restriction without a real reason", () => {
    // A restriction entry must carry a substantive reason (>= 10 chars).
    const report = assertPwaExposure(REQUIRED);
    expect(
      report.restricted.every(
        (c) => (c.ownerRestricted ?? "").trim().length >= 10,
      ),
    ).toBe(true);
  });

  it("has no duplicate capability ids", () => {
    const ids = PWA_CAPABILITY_MAP.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every mapped route is actually registered in App.tsx (real wiring, not just declared)", () => {
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    for (const cap of PWA_CAPABILITY_MAP) {
      const routeName = cap.route.replace("/archie/", "");
      expect(
        app,
        `PWA route "${cap.route}" (${cap.id}) is missing from App.tsx`,
      ).toMatch(new RegExp(`path="${routeName}"`));
    }
  });

  it("every mapped shared implementation exists on disk", () => {
    for (const cap of PWA_CAPABILITY_MAP) {
      const file = path.join(ROOT, cap.sharedModule);
      expect(
        existsSync(file),
        `shared module ${cap.sharedModule} (${cap.id}) not found`,
      ).toBe(true);
    }
  });

  it("admin and PWA render the SAME workbench — no duplicate implementation", () => {
    const pwa = readFileSync(
      path.join(ROOT, "src/pages/archie/ArchieCoding.tsx"),
      "utf8",
    );
    const admin = readFileSync(
      path.join(ROOT, "src/pages/admin/AdminArchieStudio.tsx"),
      "utf8",
    );
    // Both import the single shared components.
    expect(pwa).toContain('from "@/components/studio/StudioWorkbench"');
    expect(admin).toContain('from "@/components/studio/StudioWorkbench"');
    expect(pwa).toContain('from "@/components/archie/CodeIntelligencePanel"');
    expect(admin).toContain('from "@/components/archie/CodeIntelligencePanel"');
    // And neither defines its own studio logic.
    expect(pwa).not.toContain("studioAction");
    expect(admin).not.toContain("studioAction");
  });

  it("the PWA shell renders the coding surface in its navigation", () => {
    const layout = readFileSync(
      path.join(ROOT, "src/components/archie/ArchieLayout.tsx"),
      "utf8",
    );
    expect(layout).toContain('"/archie/coding"');
  });

  it("carries the permanent future-capability rule verbatim", () => {
    expect(PWA_FUTURE_CAPABILITY_RULE).toContain("same feature implementation");
    expect(PWA_FUTURE_CAPABILITY_RULE).toContain("Owner Authority Layer");
  });

  it("surfaces the integration requirement for new capabilities", () => {
    expect(pwaIntegrationRequirement()).toContain("PWA_CAPABILITY_MAP");
  });
});

describe("PWA rule permanence (core principle seeded in the database)", () => {
  const migration = readFileSync(
    path.join(
      ROOT,
      "supabase/migrations/20260912010000_archie_pwa_architecture.sql",
    ),
    "utf8",
  );

  it("seeds the rule idempotently (never erased by upgrades)", () => {
    expect(migration).toContain("pwa_complete_capability_exposure");
    expect(migration).toContain("ON CONFLICT (principle_id) DO NOTHING");
    expect(migration).toContain("OWNER_DIRECTIVE");
  });

  it("the seeded content matches the standing rule", () => {
    expect(migration).toContain("complete mobile command center");
    expect(migration).toContain("duplicate intelligence");
  });
});
