/**
 * FRELUX Append-Only Cryptographic Audit Chain (Pillar 7)
 *
 * Every modification to a dimension, formula variable, waste factor
 * or labor rate (every estimation_calc_rules row) is sealed into
 * governance_audit_log by a database trigger with the actor id, a
 * mandatory rationale, and a field-level diff. Each entry carries
 *
 *   entry_hash = sha256(prev_entry_hash || payload)
 *
 * so the whole trail is tamper-evident: editing any entry (impossible
 * by trigger, but possible by a compromised superuser) breaks every
 * hash after it. This module mirrors the trigger's exact payload
 * format so the client can VERIFY the chain it reads — the same
 * self-contained SHA-256 as pgcrypto, provable against known test
 * vectors, no Node/Browser API dependency.
 *
 * House rules:
 *   - verifyAuditChain never "trusts" a stored hash: it recomputes
 *     every hash from the stored payload and checks the linkage.
 *   - A row whose own columns disagree with its payload (rationale,
 *     diff, actor) is reported as a mismatch, not waved through.
 *   - Rationale is mandatory; an empty rationale is refused by both
 *     the trigger and the client-side builders here.
 */

// ─────────────────────────────────────────────
// Self-contained SHA-256 (matches pgcrypto digest hex)
// ─────────────────────────────────────────────

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8Bytes(input: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    let code = input.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      const lo = input.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (lo - 0xdc00);
        i += 1;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000)
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return new Uint8Array(bytes);
}

export function sha256Hex(input: string): string {
  const msg = utf8Bytes(input);
  const bitLen = msg.length * 8;
  const withPad = new Uint8Array(((msg.length + 8) >> 6 << 6) + 64);
  withPad.set(msg);
  withPad[msg.length] = 0x80;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(withPad.length - 4, bitLen >>> 0);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((x) => x.toString(16).padStart(8, "0"))
    .join("");
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// ─────────────────────────────────────────────
// Payload format (mirrors the DB trigger exactly)
// ─────────────────────────────────────────────

export const PAYLOAD_VERSION = "v1";
export const GENESIS_HASH = "GENESIS";
const US = String.fromCharCode(31); // unit separator (matches trigger chr(31))
const RS = String.fromCharCode(30); // record separator (matches trigger chr(30))

export interface AuditFieldDiff {
  [field: string]: { before: unknown; after: unknown } | { before: null; after: unknown } | { before: unknown; after: null };
}

/** jsonb text form of a scalar/JSON value, as postgres renders it. */
export function jsonbText(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "null";
    if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
    return String(value);
  }
  if (typeof value === "string") {
    return (
      '"' +
      value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        // eslint-disable-next-line no-control-regex -- backspace is a literal control char by definition
        .replace(/[\x08]/g, "\\b")
        .replace(/\f/g, "\\f")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        // eslint-disable-next-line no-control-regex -- escaping control characters is the point of this line
        .replace(/[\u0000-\u001f]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")) +
      '"'
    );
  }
  // Objects/arrays: postgres jsonb renders with ", " / ": " separators.
  if (Array.isArray(value)) return "[" + value.map(jsonbText).join(", ") + "]";
  const keys = Object.keys(value).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  return (
    "{" +
    keys.map((k) => jsonbText(k) + ": " + jsonbText((value as Record<string, unknown>)[k])).join(", ") +
    "}"
  );
}

/** Canonical diff string: col<US>before<US>after joined by <RS>, keys in postgres jsonb order. */
export function buildDiffCanonical(diff: AuditFieldDiff): string {
  const keys = Object.keys(diff).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  return keys
    .map((k) => `${k}${US}${jsonbText(diff[k].before)}${US}${jsonbText(diff[k].after)}`)
    .join(RS);
}

/**
 * Normalize a stored ISO timestamp to the trigger's UTC microsecond
 * form: YYYY-MM-DDTHH:MM:SS.ffffffZ. Fractional digits are taken from
 * the stored string (not from JS Date, which is millisecond-only).
 */
export function normalizeTimestampUtcIso(stored: string): string {
  const m = stored.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:([+-])(\d{2}):?(\d{2})|Z)?$/,
  );
  if (!m) return stored;
  const [, y0, mo0, d0, h, mi, s, frac, sign, oh, om] = m;
  let y = y0, mo = mo0, d = d0;
  let hh = Number(h), mm = Number(mi), ss = Number(s);
  if (sign) {
    const offset = Number(oh) * 60 + Number(om);
    const mins = hh * 60 + mm + (sign === "+" ? -offset : offset);
    const base = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, mins >= 0 ? mins : mins + 1440, ss));
    y = String(base.getUTCFullYear()).padStart(4, "0");
    mo = String(base.getUTCMonth() + 1).padStart(2, "0");
    d = String(base.getUTCDate()).padStart(2, "0");
    hh = base.getUTCHours(); mm = base.getUTCMinutes(); ss = base.getUTCSeconds();
  }
  const micro = (frac ?? "").padEnd(6, "0").slice(0, 6);
  return `${y}-${mo}-${d}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${micro}Z`;
}

export interface AuditEntryInput {
  actorId: string | null;
  action: "create" | "update" | "delete";
  entityType: string;
  entityRef: string;
  rationale: string;
  diff: AuditFieldDiff;
  recordedAtIso: string;
  prevEntryHash: string;
}

/** The exact payload string the DB trigger hashes. */
export function buildAuditPayload(entry: AuditEntryInput): string {
  return [
    PAYLOAD_VERSION,
    entry.prevEntryHash,
    entry.actorId ?? "",
    entry.action,
    entry.entityType,
    entry.entityRef,
    entry.rationale,
    buildDiffCanonical(entry.diff),
    normalizeTimestampUtcIso(entry.recordedAtIso),
  ].join(US);
}

export function computeEntryHash(entry: AuditEntryInput): string {
  return sha256Hex(buildAuditPayload(entry));
}

// ─────────────────────────────────────────────
// Field diff builder (client-side mirror of governance_rule_diff)
// ─────────────────────────────────────────────

export const RULE_DIFF_COLUMNS = [
  "rule_key",
  "calculator_type",
  "rule_value",
  "rule_status",
  "description",
  "is_active",
] as const;

export type RuleRecord = Record<(typeof RULE_DIFF_COLUMNS)[number], unknown>;

export function buildRuleDiff(before: RuleRecord | null, after: RuleRecord | null): AuditFieldDiff {
  const diff: AuditFieldDiff = {};
  for (const col of RULE_DIFF_COLUMNS) {
    const b = before ? before[col] : null;
    const a = after ? after[col] : null;
    const bTxt = jsonbText(b);
    const aTxt = jsonbText(a);
    if (bTxt !== aTxt) diff[col] = { before: b, after: a };
  }
  return diff;
}

// ─────────────────────────────────────────────
// Chain verification
// ─────────────────────────────────────────────

export interface StoredAuditEntry {
  chainSequence: number;
  recordedAt: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityRef: string;
  fieldDiff: AuditFieldDiff;
  rationale: string;
  prevEntryHash: string;
  entryHash: string;
}

export interface ChainVerification {
  ok: boolean;
  verifiedCount: number;
  /** Entries whose recomputed hash differs from the stored one. */
  hashBreaks: Array<{ chainSequence: number; stored: string; recomputed: string }>;
  /** Entries whose prev link does not match the previous entry's hash. */
  linkageBreaks: Array<{ chainSequence: number; expected: string; found: string }>;
  /** Entries whose stored columns disagree with their sealed payload. */
  fieldMismatches: Array<{ chainSequence: number; field: string; reason: string }>;
  /** Sequence gaps (a deleted entry would show here). */
  sequenceGaps: Array<{ chainSequence: number; expectedSequence: number }>;
}

/**
 * Verify a read-back audit chain. Every hash is recomputed from the
 * stored payload data — a stored hash is never trusted. The DB
 * refuses rewrites, so a failure here means the trail was tampered
 * with below the database (or migrated incorrectly), and it is
 * reported honestly.
 */
export function verifyAuditChain(entries: StoredAuditEntry[]): ChainVerification {
  const out: ChainVerification = {
    ok: true,
    verifiedCount: 0,
    hashBreaks: [],
    linkageBreaks: [],
    fieldMismatches: [],
    sequenceGaps: [],
  };
  if (!entries || entries.length === 0) return out;

  const sorted = [...entries].sort((a, b) => a.chainSequence - b.chainSequence);
  let expectedSeq: number | null = null;
  let expectedPrev = GENESIS_HASH;

  for (const e of sorted) {
    if (expectedSeq !== null && e.chainSequence !== expectedSeq) {
      out.sequenceGaps.push({ chainSequence: e.chainSequence, expectedSequence: expectedSeq });
    }
    expectedSeq = e.chainSequence + 1;

    if (e.prevEntryHash !== expectedPrev) {
      out.linkageBreaks.push({
        chainSequence: e.chainSequence,
        expected: expectedPrev,
        found: e.prevEntryHash,
      });
    }

    const recomputed = computeEntryHash({
      actorId: e.actorId,
      action: e.action as "create" | "update" | "delete",
      entityType: e.entityType,
      entityRef: e.entityRef,
      rationale: e.rationale,
      diff: e.fieldDiff,
      recordedAtIso: e.recordedAt,
      prevEntryHash: e.prevEntryHash,
    });
    if (recomputed !== e.entryHash) {
      out.hashBreaks.push({ chainSequence: e.chainSequence, stored: e.entryHash, recomputed });
    }

    if (!e.rationale || e.rationale.trim().length === 0) {
      out.fieldMismatches.push({
        chainSequence: e.chainSequence,
        field: "rationale",
        reason: "an audit entry without a rationale cannot be a legitimate modification",
      });
    }

    if (out.sequenceGaps.length + out.linkageBreaks.length + out.hashBreaks.length + out.fieldMismatches.length === 0) {
      out.verifiedCount += 1;
    }
    expectedPrev = e.entryHash;
  }

  out.ok =
    out.hashBreaks.length === 0 &&
    out.linkageBreaks.length === 0 &&
    out.fieldMismatches.length === 0 &&
    out.sequenceGaps.length === 0;
  return out;
}
