// =========================================================
// FRELUX PHASE 8 — ARCHIE CODE INTELLIGENCE
//
// ARCHIE may inspect AUTHORIZED FRELUX source code and learn
// the application architecture: frontend, backend, database,
// Supabase functions, APIs, calculator engines, auth, PWA,
// integrations, tests, dependencies, deployment configuration
// and documentation.
//
// ARCHIE may understand, explain, analyze and identify bugs,
// vulnerabilities, architectural problems and inconsistencies,
// and may generate implementation plans, code, tests and docs
// WHEN INSTRUCTED.
//
// ARCHIE has NO unrestricted production authority:
// read-only inspection, proposals and isolated-environment
// testing only. Production modification/deployment stays
// separately permission-controlled (engineering review + repo
// gates). These guards are enforced in code, not convention.
// =========================================================

import type { ArchieCodeFinding } from "./types";

/** Authorized roots ARCHIE may inspect — nothing else. */
export const AUTHORIZED_CODE_ROOTS: readonly {
  root: string;
  area: ArchieCodeFinding["area"];
  description: string;
}[] = [
  {
    root: "src/pages",
    area: "frontend",
    description: "Application pages and routes",
  },
  { root: "src/components", area: "frontend", description: "UI components" },
  {
    root: "src/lib",
    area: "backend",
    description: "Business logic, engines, services",
  },
  {
    root: "src/lib/estimation",
    area: "backend",
    description: "Deterministic calculation engines",
  },
  { root: "src/App.tsx", area: "frontend", description: "Route table" },
  {
    root: "supabase/functions",
    area: "edge",
    description: "Supabase edge functions (APIs, integrations)",
  },
  {
    root: "supabase/migrations",
    area: "database",
    description: "Database schema and RLS policies",
  },
  { root: "docs", area: "config", description: "Documentation" },
  { root: "package.json", area: "deps", description: "Dependencies" },
  { root: "src/**/__tests__", area: "tests", description: "Test suites" },
  { root: "src/**/*.test.ts", area: "tests", description: "Test files" },
];

/** Roots ARCHIE must NEVER touch — secrets, credentials, env. */
export const FORBIDDEN_CODE_ROOTS: readonly string[] = [
  ".env",
  ".env.local",
  "secrets",
  "credentials",
  "auth/migrations",
  "supabase/config",
];

/** May ARCHIE inspect this path at all? */
export function canInspectPath(path: string): { ok: boolean; error?: string } {
  const normalized = path.replace(/^\.?\//, "");
  for (const forbidden of FORBIDDEN_CODE_ROOTS) {
    if (
      normalized.startsWith(forbidden) ||
      normalized.includes(`/${forbidden}`)
    ) {
      return {
        ok: false,
        error: `Path "${path}" is outside ARCHIE's authorized code scope`,
      };
    }
  }
  const authorized = AUTHORIZED_CODE_ROOTS.some(({ root }) => {
    if (root.includes("*")) {
      const rx = new RegExp(
        "^" +
          root
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*\*/g, ".*")
            .replace(/\*/g, "[^/]*") +
          "($|/)",
      );
      return rx.test(normalized);
    }
    return normalized === root || normalized.startsWith(`${root}/`);
  });
  if (!authorized) {
    return {
      ok: false,
      error: `Path "${path}" is outside ARCHIE's authorized code scope`,
    };
  }
  return { ok: true };
}

/** The authority model — fixed, not configurable by ARCHIE. */
export const ARCHIE_CODE_AUTHORITY = {
  mayInspect: true,
  mayExplain: true,
  mayAnalyze: true,
  mayGenerateCode: true, // when instructed — as proposals
  mayRunTests: true, // isolated environment only
  mayModifyProduction: false, // hard-false, never flipped
  mayDeploy: false, // hard-false, never flipped
} as const;

/** Can ARCHIE apply a code change to production? Always no. */
export function mayApplyToProduction(): false {
  return false; // Production modification requires the human repo gates
}

/** A code finding is ALWAYS a recommendation — this constructor
 *  makes it impossible to create an actionable finding. */
export function makeCodeFinding(
  finding: Omit<ArchieCodeFinding, "requires_engineering_review">,
): ArchieCodeFinding {
  return { ...finding, requires_engineering_review: true };
}

/** Validate findings returned by an analysis pass. */
export function validateCodeFindings(findings: ArchieCodeFinding[]): {
  ok: ArchieCodeFinding[];
  rejected: string[];
} {
  const ok: ArchieCodeFinding[] = [];
  const rejected: string[] = [];
  for (const f of findings) {
    const pathOk = f.path ? canInspectPath(f.path).ok : true;
    if (!pathOk || !f.requires_engineering_review) {
      rejected.push(f.summary.slice(0, 80));
      continue;
    }
    ok.push(f);
  }
  return { ok, rejected };
}

/** Code knowledge contributions enter as candidates through the
 *  standard pipeline: AI_RECOMMENDATION evidence state, always
 *  requiring engineering review. */
export function codeKnowledgeRequirements() {
  return {
    evidence_state: "AI_RECOMMENDATION" as const,
    requires_engineering_review: true,
    may_auto_promote: false,
  };
}
