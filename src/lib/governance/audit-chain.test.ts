import { describe, expect, it } from "vitest";
import {
  GENESIS_HASH,
  buildAuditPayload,
  buildDiffCanonical,
  buildRuleDiff,
  computeEntryHash,
  jsonbText,
  normalizeTimestampUtcIso,
  sha256Hex,
  verifyAuditChain,
  type AuditFieldDiff,
  type StoredAuditEntry,
} from "./audit-chain";

describe("sha256Hex (self-contained, matches pgcrypto)", () => {
  it("matches the FIPS 180 test vectors", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("handles multi-byte UTF-8 and control characters", () => {
    // "你好" and a unit-separator char
    expect(sha256Hex("你好")).toBe(
      "670d9743542cae3ea7ebe36af56bd53648b0a1126162e78d81a32934a711302e",
    );
    expect(typeof sha256Hex("xy")).toBe("string");
    expect(sha256Hex("xy")).toHaveLength(64);
  });
});

describe("jsonbText (postgres jsonb::text form)", () => {
  it("renders scalars exactly like postgres", () => {
    expect(jsonbText(null)).toBe("null");
    expect(jsonbText(true)).toBe("true");
    expect(jsonbText(12)).toBe("12");
    expect(jsonbText("plain")).toBe('"plain"');
    expect(jsonbText('quote " backslash \\')).toBe('"quote \\" backslash \\\\"');
    expect(jsonbText("nl\n")).toBe('"nl\\n"');
  });

  it("renders objects in jsonb key order (length, then bytes) with \": \" separators", () => {
    expect(jsonbText({ a: 1, b: "x" })).toBe('{"a": 1, "b": "x"}');
    // jsonb sorts keys by length first: "zz" before "aaa"
    expect(jsonbText({ aaa: 1, zz: 2 })).toBe('{"zz": 2, "aaa": 1}');
    expect(jsonbText({ deep: { k: [1, 2] } })).toBe('{"deep": {"k": [1, 2]}}');
  });
});

describe("buildDiffCanonical", () => {
  it("joins columns in jsonb key order with unit/record separators", () => {
    const diff: AuditFieldDiff = {
      rule_status: { before: "verified_frelux", after: "manual_adjustment" },
      rule_value: { before: { coverage: 8 }, after: { coverage: 8.5 } },
    };
    const US = String.fromCharCode(31);
    const RS = String.fromCharCode(30);
    expect(buildDiffCanonical(diff)).toBe(
      `rule_value${US}{"coverage": 8}${US}{"coverage": 8.5}${RS}rule_status${US}"verified_frelux"${US}"manual_adjustment"`,
    );
  });

  it("is empty for an empty diff", () => {
    expect(buildDiffCanonical({})).toBe("");
  });
});

describe("buildRuleDiff", () => {
  it("produces a before/after diff over the rule columns", () => {
    const before = {
      rule_key: "standard_room_height",
      calculator_type: "painting",
      rule_value: { value: 2.7 },
      rule_status: "verified_frelux",
      description: "Standard height",
      is_active: true,
    };
    const after = { ...before, rule_value: { value: 3.0 }, rule_status: "manual_adjustment" };
    const diff = buildRuleDiff(before, after);
    expect(Object.keys(diff).sort()).toEqual(["rule_status", "rule_value"]);
    expect(diff.rule_value.before).toEqual({ value: 2.7 });
    expect(diff.rule_value.after).toEqual({ value: 3 });
  });

  it("marks create/delete with null on the absent side", () => {
    const after = {
      rule_key: "labor_rate_mason",
      calculator_type: null,
      rule_value: { rate: 8500 },
      rule_status: "admin_configured",
      description: null,
      is_active: true,
    };
    const create = buildRuleDiff(null, after);
    // calculator_type and description are null on both sides: no diff.
    expect(Object.keys(create).sort()).toEqual([
      "is_active",
      "rule_key",
      "rule_status",
      "rule_value",
    ]);
  });
});

describe("normalizeTimestampUtcIso", () => {
  it("pads millisecond forms to microseconds and strips offsets", () => {
    expect(normalizeTimestampUtcIso("2026-10-27T20:45:12.123Z")).toBe(
      "2026-10-27T20:45:12.123000Z",
    );
    expect(normalizeTimestampUtcIso("2026-10-27T20:45:12.123456+00:00")).toBe(
      "2026-10-27T20:45:12.123456Z",
    );
    expect(normalizeTimestampUtcIso("2026-10-27T20:45:12+00:00")).toBe(
      "2026-10-27T20:45:12.000000Z",
    );
  });

  it("converts non-UTC offsets to UTC", () => {
    expect(normalizeTimestampUtcIso("2026-10-27T21:45:12.500000+01:00")).toBe(
      "2026-10-27T20:45:12.500000Z",
    );
  });
});

describe("chain build + verify", () => {
  const entry = (overrides: Partial<Parameters<typeof computeEntryHash>[0]> = {}) => ({
    actorId: "u-1",
    action: "update" as const,
    entityType: "dimension" as const,
    entityRef: "standard_room_height",
    rationale: "Client raised ceiling spec on signed variation V-7",
    diff: { rule_value: { before: { value: 2.7 }, after: { value: 3 } } } as AuditFieldDiff,
    recordedAtIso: "2026-10-27T20:45:12.123456Z",
    prevEntryHash: GENESIS_HASH,
    ...overrides,
  });

  const stored = (input: ReturnType<typeof entry>): StoredAuditEntry => {
    const payload = buildAuditPayload(input);
    const entryHash = sha256Hex(payload);
    return {
      chainSequence: 1,
      recordedAt: input.recordedAtIso,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityRef: input.entityRef,
      fieldDiff: input.diff,
      rationale: input.rationale,
      prevEntryHash: input.prevEntryHash,
      entryHash,
    };
  };

  it("verifies an intact chain it built itself", () => {
    const e1 = stored(entry());
    const e2 = stored(
      entry({
        prevEntryHash: e1.entryHash,
        recordedAtIso: "2026-10-27T21:00:00.000001Z",
        rationale: "Waste factor recalibrated after site waste audit",
        entityType: "waste_factor",
        entityRef: "paint_waste_factor",
      }),
    );
    e2.chainSequence = 2;
    const v = verifyAuditChain([e1, e2]);
    expect(v.ok).toBe(true);
    expect(v.verifiedCount).toBe(2);
  });

  it("detects a tampered rationale (hash break)", () => {
    const e1 = stored(entry());
    const tampered = { ...e1, rationale: "no reason given" };
    const v = verifyAuditChain([tampered]);
    expect(v.ok).toBe(false);
    expect(v.hashBreaks).toHaveLength(1);
    expect(v.hashBreaks[0].chainSequence).toBe(1);
  });

  it("detects a broken prev-link (inserted or reordered entry)", () => {
    const e1 = stored(entry());
    const rogue = stored(entry({ rationale: "sneaky change" }));
    rogue.chainSequence = 2;
    rogue.prevEntryHash = GENESIS_HASH; // does not link to e1
    const v = verifyAuditChain([e1, rogue]);
    expect(v.ok).toBe(false);
    expect(v.linkageBreaks).toHaveLength(1);
  });

  it("detects a deleted entry via the sequence gap", () => {
    const e1 = stored(entry());
    const e3 = stored(
      entry({ prevEntryHash: "deadbeef", recordedAtIso: "2026-10-27T22:00:00.000000Z" }),
    );
    e3.chainSequence = 3;
    const v = verifyAuditChain([e1, e3]);
    expect(v.ok).toBe(false);
    expect(v.sequenceGaps).toHaveLength(1);
    expect(v.sequenceGaps[0].expectedSequence).toBe(2);
  });

  it("flags an empty rationale as a field mismatch", () => {
    const e1 = stored(entry({ rationale: "  " }));
    const v = verifyAuditChain([e1]);
    expect(v.ok).toBe(false);
    expect(v.fieldMismatches[0].field).toBe("rationale");
  });

  it("verifies an empty chain trivially", () => {
    expect(verifyAuditChain([]).ok).toBe(true);
  });
});
