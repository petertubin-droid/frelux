// =========================================================
// ARCHIE COGNITIVE ENGINE — SECURITY & INTEGRITY ENGINE
// supabase/functions/_shared/archie-ai/cognitive/security-integrity.ts
//
// Protects ARCHIE's identity, memory, source code, data,
// credentials, infrastructure, permissions, trusted devices
// and audit history:
//   * append-only, hash-chained audit log (tamper-evident)
//   * secret/credential redaction on every ingest and store
//   * audit chain integrity verification
//   * core-identity protection hooks (used by the kernel)
// Real production security — no simulated checks.
// =========================================================

import { sha256 } from "./sha256.ts";
import type { SupabaseLike } from "../native-engine/persistence.ts";
import { CognitivePersistence } from "./persistence.ts";
import type { AuditEvent } from "./types.ts";

/** Patterns that indicate a credential in free text. Found
 *  secrets are REDACTED before any storage or processing. */
const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[a-zA-Z0-9]{16,}\b/g, // OpenAI-style key
  /\bsk-ant-[a-zA-Z0-9-]{16,}\b/g, // Anthropic-style key
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
  /\b(?:api[_-]?key|secret|password|token|credential)\s*[:=]\s*["']?[^\s"']{8,}/gi,
  /\bghp_[A-Za-z0-9]{30,}\b/g, // GitHub PAT
  /\bpk_(?:live|test)_[A-Za-z0-9]{16,}\b/g, // Stripe key
  /\bsupabase[_-]?(?:service[_-]?role|anon)[_-]?key\s*[:=]\s*["']?[^\s"']{20,}/gi,
];

export function redactSecrets(text: string): {
  redacted: string;
  foundCount: number;
} {
  let foundCount = 0;
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (m) => {
      foundCount += 1;
      return `[redacted-credential:${m.slice(0, 6)}…]`;
    });
  }
  return { redacted, foundCount };
}

function hashEvent(input: string): string {
  return sha256(input);
}

export const GENESIS_HASH = "0".repeat(64);

export class SecurityIntegrityEngine {
  private chain: AuditEvent[] = [];
  private persistence: CognitivePersistence;
  private seqCounter = 0;
  private lastHash = GENESIS_HASH;
  private hydrated = false;
  private persistenceHealthy = true;

  constructor(db?: SupabaseLike) {
    this.persistence = new CognitivePersistence(db);
  }

  /** Load the persisted chain and verify its integrity. */
  async hydrate(): Promise<{
    events: number;
    chainValid: boolean;
  }> {
    if (this.hydrated) {
      return { events: this.chain.length, chainValid: true };
    }
    this.hydrated = true;
    const stored = await this.persistence.loadAudit();
    if (stored.length > 0) {
      const valid = this.verifyChain(stored);
      this.chain = valid ? stored : [];
      this.seqCounter = valid ? stored[stored.length - 1].seq : 0;
      this.lastHash = valid ? stored[stored.length - 1].hash : GENESIS_HASH;
      // A broken chain is preserved but quarantined: new
      // events continue from a fresh genesis and the failure
      // is reported (never silently ignored).
      return { events: stored.length, chainValid: valid };
    }
    return { events: 0, chainValid: true };
  }

  /** Append a tamper-evident audit event. */
  async audit(
    eventType: AuditEvent["eventType"],
    payload: Record<string, unknown>,
  ): Promise<AuditEvent> {
    // Never allow a credential into the audit log itself.
    const safePayload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      safePayload[k] = typeof v === "string" ? redactSecrets(v).redacted : v;
    }
    this.seqCounter += 1;
    const at = new Date().toISOString();
    const prevHash = this.lastHash;
    const hash = hashEvent(
      `${this.seqCounter}|${eventType}|${JSON.stringify(safePayload)}|${at}|${prevHash}`,
    );
    const event: AuditEvent = {
      seq: this.seqCounter,
      eventType,
      payload: safePayload,
      at,
      prevHash,
      hash,
    };
    this.chain.push(event);
    this.lastHash = hash;
    this.persistenceHealthy = await this.persistence.appendAudit(event);
    return event;
  }

  /** Verify the full hash chain of the given events. */
  verifyChain(events: AuditEvent[]): boolean {
    let prev = GENESIS_HASH;
    for (const e of events) {
      if (e.prevHash !== prev) return false;
      const recomputed = hashEvent(
        `${e.seq}|${e.eventType}|${JSON.stringify(e.payload)}|${e.at}|${e.prevHash}`,
      );
      if (recomputed !== e.hash) return false;
      prev = e.hash;
    }
    return true;
  }

  /** Current integrity state — surfaced in diagnostics. */
  integrity(): {
    events: number;
    chainValid: boolean;
    persistenceHealthy: boolean;
  } {
    return {
      events: this.chain.length,
      chainValid: this.verifyChain(this.chain),
      persistenceHealthy: this.persistenceHealthy,
    };
  }

  /** Core identity protection: ARCHIE's permanent core
   *  principles are immutable. Any write path that would
   *  touch them is flagged as owner-gated and refused. */
  guardCoreIdentity(target: string): {
    allowed: boolean;
    reason: string;
  } {
    const protectedTargets = [
      "frelux_archie_core_principles",
      "archie-identity",
      "core-principles",
    ];
    const hit = protectedTargets.find((p) => target.toLowerCase().includes(p));
    if (hit) {
      return {
        allowed: false,
        reason: `"${hit}" is a permanent core-identity store — changes require explicit Owner Authority and cannot be executed autonomously`,
      };
    }
    return { allowed: true, reason: "" };
  }
}
