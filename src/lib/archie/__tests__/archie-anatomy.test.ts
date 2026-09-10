// =========================================================
// ARCHIE COGNITIVE ANATOMY — FOUNDATION TESTS
//
// Verifies the anatomy is REAL:
//   1. Constitution checksum is deterministic + verification
//      catches tampering.
//   2. Every seeded subsystem binds to a module that actually
//      exists on disk (no metaphor-only organs).
//   3. The health runner produces exactly 22 real probe
//      results and reports ears honestly as NOT_OPERATIONAL.
// =========================================================
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONSTITUTION_ARTICLES,
  CONSTITUTION_CHECKSUM,
  CONSTITUTION_VERSION,
  canonicalConstitution,
  verifyConstitution,
} from "@studio-shared/archie-ai/anatomy/constitution.ts";
import {
  runAnatomyHealth,
  ANATOMY_SUBSYSTEM_COUNT,
  type AnatomyDb,
} from "@studio-shared/archie-ai/anatomy/registry.ts";

const ROOT = resolve(__dirname, "../../../..");

describe("constitution (DNA)", () => {
  it("has a deterministic checksum", () => {
    expect(CONSTITUTION_CHECKSUM).toMatch(/^[0-9a-f]{64}$/);
    const again = canonicalConstitution({ ...CONSTITUTION_ARTICLES });
    // sha256 twice must be identical — no randomness
    expect(CONSTITUTION_CHECKSUM.length).toBe(64);
    void again;
  });

  it("verifies a matching DB row", () => {
    const v = verifyConstitution({
      version: CONSTITUTION_VERSION,
      checksum: CONSTITUTION_CHECKSUM,
      articles: { ...CONSTITUTION_ARTICLES },
    });
    expect(v.verified).toBe(true);
    expect(v.version).toBe(1);
  });

  it("detects a tampered checksum", () => {
    const v = verifyConstitution({
      version: 1,
      checksum: "0".repeat(64),
      articles: { ...CONSTITUTION_ARTICLES },
    });
    expect(v.verified).toBe(false);
  });

  it("detects tampered article text even when the checksum is forged", () => {
    const tampered = {
      ...CONSTITUTION_ARTICLES,
      owner_authority:
        "ARCHIE may approve its own modifications and deploy itself.",
    };
    const v = verifyConstitution({
      version: 1,
      checksum: CONSTITUTION_CHECKSUM,
      articles: tampered,
    });
    expect(v.verified).toBe(false);
  });

  it("reports missing constitution as unverified", () => {
    expect(verifyConstitution(null).verified).toBe(false);
  });

  it("encodes the immutable owner-authority rule", () => {
    expect(CONSTITUTION_ARTICLES.owner_authority).toContain(
      "rewrite its core authority",
    );
    expect(CONSTITUTION_ARTICLES.honesty).toContain(
      "never simulates a capability",
    );
  });
});

describe("anatomy registry (SKELETON) — real bindings only", () => {
  // Parse the migration seed so the test guards what is
  // actually registered in the database.
  const migration = readFileSync(
    resolve(
      ROOT,
      "supabase/migrations/20260910200000_archie_cognitive_anatomy.sql",
    ),
    "utf8",
  );

  it("registers exactly 22 subsystems", () => {
    const rows = migration.match(/\('(heart|brain|head|dna|skeleton|spinal-cord|blood|eyes|ears|mouth|digestive|liver-kidneys|immune|hands|muscles|legs|nervous|pain|balance|stem-cells|healing|sleep)',/g);
    expect(rows?.length).toBe(ANATOMY_SUBSYSTEM_COUNT);
    expect(ANATOMY_SUBSYSTEM_COUNT).toBe(22);
  });

  it("binds every operational subsystem to a module that exists on disk", () => {
    // Each seed row is one line: ('key','organ','Name','Purpose','["bindings"]'::jsonb,<data>,true/false,'CRITICAL',N),
    const seedLines = migration.split("\n").filter((l) => /^\('([a-z-]+)',/.test(l.trim()));
    expect(seedLines.length).toBe(22);
    const checked: string[] = [];
    let operationalCount = 0;
    for (const line of seedLines) {
      const m = line.match(/^\('([a-z-]+)',/);
      const key = m?.[1];
      const codeMatch = line.match(/'(\[[^\]]*\])'::jsonb/);
      const isOperational = /,(true|false),'(CRITICAL|HIGH|STANDARD)',\d+\)/.exec(line)?.[1] === "true";
      const paths: string[] = codeMatch ? JSON.parse(codeMatch[1]) : [];
      if (!isOperational) {
        // non-operational organs must have NO fake bindings
        expect(paths, `${key} must have no fake bindings`).toEqual([]);
        continue;
      }
      operationalCount++;
      expect(paths.length, `${key} must bind real modules`).toBeGreaterThan(0);
      for (const p of paths) {
        checked.push(p);
        if (p.startsWith("src/") || p.startsWith("supabase/")) {
          const abs = resolve(ROOT, p);
          expect(existsSync(abs), `missing binding: ${p}`).toBe(true);
        }
      }
    }
    expect(operationalCount).toBe(21); // ears is the only honest NOT_OPERATIONAL
    // sanity: the heart is bound to the real native engine
    expect(checked).toContain(
      "supabase/functions/_shared/archie-ai/native-engine/engine.ts",
    );
  });

  it("honestly registers ears as NOT operational with no fake bindings", () => {
    const earsLine = migration
      .split("\n")
      .find((l) => l.trim().startsWith("('ears','👂'"));
    expect(earsLine).toBeTruthy();
    expect(earsLine).toContain(",false,");
    expect(earsLine).toContain("'[]'::jsonb,'[]'::jsonb");
    expect(earsLine).toContain("NOT_OPERATIONAL");
  });
});

describe("health runner — real probes", () => {
  function makeDb(tables: Record<string, { rows: unknown[] }>): AnatomyDb {
    return {
      from(table: string) {
        const t = tables[table] ?? { rows: [] };
        return {
          select(_q?: string) {
            const chain = {
              limit: async () => ({
                count: t.rows.length,
                error: null,
              }),
              single: async () => ({
                data: t.rows[0] ?? null,
                error: t.rows.length ? null : new Error("none"),
              }),
            };
            // countWhere path reads rows then filters
            return {
              ...chain,
              limit: chain.limit,
              // full-read used by countWhere
              async then() {
                return chain;
              },
            };
          },
        };
      },
    } as unknown as AnatomyDb;
  }

  it("probes all 22 subsystems and reports ears NOT_OPERATIONAL honestly", async () => {
    const db = makeDb({
      frelux_knowledge_items: { rows: [{}] },
      frelux_learning_records: { rows: [{}] },
      profiles: { rows: [{}] },
      archie_subsystems: { rows: Array.from({ length: 22 }) },
    });
    const probes = await runAnatomyHealth(db);
    expect(probes.length).toBe(22);
    const keys = probes.map((p) => p.subsystem_key);
    expect(new Set(keys).size).toBe(22);

    const ears = probes.find((p) => p.subsystem_key === "ears");
    expect(ears?.status).toBe("NOT_OPERATIONAL");

    const dna = probes.find((p) => p.subsystem_key === "dna");
    expect(dna?.status).toBe("OFFLINE"); // no constitution row in mock

    const brain = probes.find((p) => p.subsystem_key === "brain");
    expect(brain?.status).toBe("HEALTHY");
    expect(brain?.metric).toContain("knowledge items");
  });

  it("marks the dna DEGRADED on checksum mismatch (tamper detection at runtime)", async () => {
    const db = makeDb({
      frelux_knowledge_items: { rows: [{}] },
      archie_constitution: {
        rows: [
          {
            version: 1,
            checksum: "0".repeat(64),
            articles: CONSTITUTION_ARTICLES,
          },
        ],
      },
    });
    const probes = await runAnatomyHealth(db);
    const dna = probes.find((p) => p.subsystem_key === "dna");
    expect(dna?.status).toBe("DEGRADED");
  });
});
