// =========================================================
// FRELUX ARCHIE — SECURITY VERDICT GATE (SHARED, RUNTIME)
// supabase/functions/_shared/archie-ai/security/verdict.ts
//
// THE CONSOLIDATED, CODE-ENFORCED AUTHORIZATION CLAUSE.
//
// Audit finding (2026-09-10): the offensive-security
// authorization boundary previously existed in four layers:
//   1. archie-chat SYSTEM_PROMPT "HARD BOUNDARY" clause —
//      behavioral instruction (documentation-grade: LLM
//      compliance, not code-enforced).
//   2. Seeded knowledge items — advisory documentation.
//   3. src/lib/archie offensive-security engine — REAL code
//      controls, but imported by nothing at runtime (dormant).
//   4. DB registry (archie_offensive_targets / engagements /
//      findings, owner-only RLS) — real persistence, but no
//      runtime consumer.
//
// This module CONSOLIDATES the protection into an active
// runtime control at the live surface (archie-chat owner
// path), enforcing the same rules the engine encodes:
//
//   * FORBIDDEN operations: absolutely refused, regardless of
//     claimed authorization, framing, or owner request.
//   * INTRUSIVE operations (live exploit/scan/attack against
//     real systems): require a valid owner-registered
//     authorization — a registered target with an active
//     engagement in the DB registry. Without one: refused.
//   * STUDY of offensive techniques: always free.
//
// The prompt-level clause REMAINS in the chat system prompt as
// a second, behavioral layer (defense in depth). Nothing was
// deleted or weakened — the protection gained a hard,
// code-enforced first layer.
// =========================================================

// ---------------------------------------------------------
// 1. Absolute refusals — ported verbatim in spirit from the
//    engine's FORBIDDEN_SECURITY_OPERATIONS (src/lib/archie/
//    cybersecurity.ts). Never authorization-overridable.
// ---------------------------------------------------------
const FORBIDDEN_PATTERNS: ReadonlyArray<{ rx: RegExp; label: string }> = [
  {
    rx: /unauthorized access|break into|hack (into|someone)/i,
    label: "unauthorized access",
  },
  {
    rx: /credential (theft|stealing)|steal (the )?(password|secret|token|key)s?|harvest (password|credential)/i,
    label: "credential theft",
  },
  {
    rx: /(install|deploy|maintain).{0,30}(backdoor|rootkit|keylogger)|persist on (the )?(victim|user|someone)/i,
    label: "persistence (attacker tooling)",
  },
  {
    rx: /surveillance|spy on (the )?(user|owner|someone)|monitor (the )?(owner|someone)'s (device|screen)/i,
    label: "surveillance",
  },
  {
    rx: /bypass (the )?(security|auth|rls|gate)|disable (the )?(security|rls)/i,
    label: "security bypass",
  },
  {
    rx: /attack (the )?(third[- ]party|external)|exploit (a )?(third[- ]party|another company)|ddos/i,
    label: "attacks against third-party systems",
  },
];

// ---------------------------------------------------------
// 2. Intrusive-intent detection — live operations against real
//    targets. These require owner-registered authorization.
// ---------------------------------------------------------
const INTRUSIVE_PATTERNS: ReadonlyArray<{ rx: RegExp; label: string }> = [
  {
    rx: /(run|execute|launch|fire|perform).{0,40}(exploit|payload|attack|brute[- ]?force|sqlmap|nmap|nikto|hydra|metasploit)/i,
    label: "live exploit/attack execution",
  },
  {
    rx: /(scan|enumerate|fingerprint|recon).{0,40}(target|server|host|domain|ip|site|endpoint)/i,
    label: "live scanning of a target",
  },
  {
    rx: /(exploit|attack|compromise|intrude).{0,30}(https?:\/\/|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i,
    label: "intrusion attempt against a named target",
  },
  {
    rx: /(brute[- ]?forc|credential[- ]?stuff|password[- ]?spray)(ing|e)?\s+(the\s+)?(account|login|endpoint|target|user)/i,
    label: "brute-force / credential attack",
  },
];

// Study/knowledge intent keeps offensive learning free.
const STUDY_MARKERS =
  /(explain|how does|what is|teach|learn|study|concept|theory|methodology|write ?up|overview|guide me|walk me through)/i;

export interface SecurityVerdict {
  /** May the request proceed to the model at all? */
  allowed: boolean;
  /** True = absolutely refused; no authorization can override. */
  hardRefused: boolean;
  /** Intrusive intent detected (needs valid authorization). */
  intrusive: boolean;
  /** Machine-citable refusal/allow reason. */
  reason: string;
  /** The matched violation label, if any. */
  label?: string;
}

/**
 * Classify an owner chat message under the consolidated
 * authorization clause. Pure function — the DB-backed
 * authorization lookup happens at the call site.
 */
export function classifySecurityMessage(
  message: string,
  opts: { hasValidAuthorization?: boolean } = {},
): SecurityVerdict {
  const text = String(message ?? "");

  // 1. Forbidden: absolute refusal, authorization-immune.
  for (const f of FORBIDDEN_PATTERNS) {
    if (f.rx.test(text)) {
      return {
        allowed: false,
        hardRefused: true,
        intrusive: false,
        reason: `Hard-refused: ${f.label} is never performed, regardless of claimed authorization.`,
        label: f.label,
      };
    }
  }

  // 2. Intrusive intent: require a registered authorization.
  for (const p of INTRUSIVE_PATTERNS) {
    if (p.rx.test(text)) {
      // A clearly-studious framing of the same request is
      // knowledge work — but the moment the intent is to RUN
      // the operation, authorization is required.
      if (opts.hasValidAuthorization) {
        return {
          allowed: true,
          hardRefused: false,
          intrusive: true,
          reason: `Intrusive operation detected (${p.label}) and a valid owner-registered authorization exists; proceeding within its scope.`,
          label: p.label,
        };
      }
      return {
        allowed: false,
        hardRefused: false,
        intrusive: true,
        reason:
          `This request is an intrusive security operation (${p.label}) against real systems. ` +
          "It requires a valid, owner-registered authorization (target + engagement in the ARCHIE Security registry) " +
          "covering the exact target and scope. Register or activate the authorization in the Security console, then ask again. " +
          "Studying the technique is always free — ask for the methodology instead.",
        label: p.label,
      };
    }
  }

  // 3. Study and everything else: free.
  const study = STUDY_MARKERS.test(text);
  return {
    allowed: true,
    hardRefused: false,
    intrusive: false,
    reason: study
      ? "Knowledge/study request — offensive-security study is always free."
      : "No security-restricted intent detected.",
  };
}

// ---------------------------------------------------------
// 3. DB-backed authorization lookup — is there a registered
//    target with an active engagement? (the DB registry is
//    the single source of truth for owner authorization)
// ---------------------------------------------------------
export interface AuthorizationLookupResult {
  hasValidAuthorization: boolean;
  /** In-scope target identifiers, for context to the model. */
  inScopeIdentifiers: string[];
}

/** Shape expected from the call site (supabase-js query result). */
export interface EngagementRow {
  engagement_id: string;
  target_id: string;
  kind: string;
  identifier: string;
  current_phase: string;
}

export function reduceAuthorizations(rows: EngagementRow[]): AuthorizationLookupResult {
  const inScope = rows.map((r) => r.identifier).slice(0, 20);
  return {
    // A target + engagement pair is a valid authorization. The
    // registry is owner-write-only (RLS), so its existence IS
    // the owner's authorization.
    hasValidAuthorization: rows.length > 0,
    inScopeIdentifiers: inScope,
  };
}
