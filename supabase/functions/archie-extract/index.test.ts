// Unit tests for archie-extract (construction extraction + ARCHIE
// training ingestion). The contributor gate is BY DESIGN: only an
// active (non-OBSERVER) contributor profile may feed training data.
// E2E-verified live 2026-09-15: honest 403 without a contributor.
import { describe, it, expect } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenOwnerIsAdmin,
  givenRows,
  req,
  OWNER_AUTH,
  json,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

function contributorRow(active: boolean) {
  return {
    user_id: "11111111-1111-4111-8111-111111111111",
    active,
    role: "CONTRIBUTOR",
  };
}

describe("archie-extract — contributor gate", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(req("POST", "", { text: "hello" }));
    expect(res.status).toBe(401);
  });

  it("rejects a user without an active contributor profile — training integrity", async () => {
    givenOwnerIsAdmin();
    // no contributor fixture → gate must hold
    const res = await handler(
      req(
        "POST",
        "",
        { input_type: "text", text: "Lekki site needs 40 bags of cement." },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error).toMatch(/contributor/i);
  });

  it("rejects an OBSERVER contributor — observation is not training", async () => {
    givenOwnerIsAdmin();
    givenRows("frelux_archie_contributors", [
      {
        user_id: "11111111-1111-4111-8111-111111111111",
        active: true,
        role: "OBSERVER",
      },
    ]);
    const res = await handler(
      req("POST", "", { input_type: "text", text: "test" }, OWNER_AUTH),
    );
    expect(res.status).toBe(403);
  });
});
