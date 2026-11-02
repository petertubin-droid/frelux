// Unit tests for ai-ingestion (frelux learning pipeline).
// Gates: 401/403, 405 method honesty, honest 400 validation.
// Owner directive 2026-09-20: ARCHIE removed; Gemini advisory only.
import "./index.ts";
import {
  getHandler,
  givenOwnerIsAdmin,
  req,
  OWNER_AUTH,
  json,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

describe("archie-ingestion — gate + validation", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(req("POST", "", {}));
    expect(res.status).toBe(401);
  });

  it("does not accept GET (405 method honesty)", async () => {
    const res = await handler(req("GET", "", undefined, OWNER_AUTH));
    expect(res.status).toBe(405);
  });

  it("validates the body honestly (400, never a silent noop)", async () => {
    givenOwnerIsAdmin();
    const res = await handler(req("POST", "", {}, OWNER_AUTH));
    expect(res.status).toBe(400);
    const body = await json(res);
    // honest structured rejection — never a silent noop
    expect(body.accepted === false || body.error || body.message).toBeTruthy();
  });
});
