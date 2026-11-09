/**
 * Structural guard on the gateway's two metering paths.
 *
 * The auth-failure meter was once left carrying the billing routine's body, so it
 * dereferenced variables that did not exist, threw, and every keyed route answered
 * 500 on what should have been a 401. The comment above that function described the
 * correct behaviour the whole time, which is why this test reads the code rather
 * than the prose: it fails when the refusal path starts touching request-scoped
 * state that only a successful call has.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// happy-dom has no file: URL support, so resolve from the project root instead.
const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/frelix-api/index.ts"),
  "utf8",
);

const bodyOf = (name: string): string => {
  const start = source.indexOf(`async function ${name}(`);
  expect(start, `${name} must exist in the gateway`).toBeGreaterThan(-1);
  // The next top-level declaration ends the body.
  const rest = source.slice(start);
  const end = rest.indexOf("\n}\n");
  return rest.slice(0, end === -1 ? rest.length : end);
};

describe("the refusal path cannot bill or throw", () => {
  const body = bodyOf("meterAuthFailure");

  it("does not reference request-scoped billing state", () => {
    // statusCode, opts and key belong to meter(); none of them exist here.
    expect(body).not.toMatch(/\bstatusCode\b/);
    expect(body).not.toMatch(/\bopts\??\./);
    expect(body).not.toMatch(/\bkey\./);
  });

  it("records the rejection as unbilled", () => {
    expect(body).toMatch(/usage_units:\s*0/);
    expect(body).toMatch(/cost:\s*0/);
    expect(body).toMatch(/status_code:\s*401/);
  });

  it("never queries the wallet or charges on a rejection", () => {
    expect(body).not.toMatch(/charge_api_request/);
    expect(body).not.toMatch(/frelux_api_wallets/);
  });

  it("cannot throw out of the meter", () => {
    // The insert must sit inside a try, or a logging failure becomes a 500.
    expect(body).toMatch(/try\s*\{/);
    expect(body).toMatch(/catch\s*\(/);
  });
});

describe("the success path meters without risking the response", () => {
  const body = bodyOf("meter");

  it("wraps the usage insert and the key touch", () => {
    expect(body).toMatch(/try\s*\{/);
    expect((body.match(/catch\s*\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("charges only through the reviewed routine", () => {
    if (body.includes("charge_api_request")) {
      expect(body).toMatch(/try\s*\{/);
      expect(body).toMatch(/balance/);
    }
  });

  it("records the cost it actually charged", () => {
    expect(body).toMatch(/cost,\s*\n/);
  });
});
