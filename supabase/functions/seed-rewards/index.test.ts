import { describe, it, expect } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenUser,
  givenRows,
  givenRpc,
  req,
  OWNER_AUTH,
  json,
} from "../_shared/testing/harness.ts";

const handler = getHandler();
const USER_ID = "11111111-1111-4111-8111-111111111111";

function givenUser42() {
  givenUser({ id: USER_ID, email: "user@test.local" });
}

describe("seed-rewards — admin-only catalogue seeding", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(req("POST", ""));
    expect(res.status).toBe(401);
  });

  it("rejects non-admin users with 403", async () => {
    givenUser42();
    givenRows("profiles", [{ id: USER_ID, role: "user" }]);
    const res = await handler(req("POST", "", {}, OWNER_AUTH));
    expect(res.status).toBe(403);
  });

  it("seeds via the RPC when available", async () => {
    givenUser42();
    givenRows("profiles", [{ id: USER_ID, role: "admin" }]);
    givenRpc("seed_reward_catalogue", () => ({
      data: [{ reward_key: "premium_week" }],
      error: null,
    }));
    const res = await handler(req("POST", "", {}, OWNER_AUTH));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.rewards[0].reward_key).toBe("premium_week");
  });

  it("falls back to a direct upsert when the RPC is missing", async () => {
    givenUser42();
    givenRows("profiles", [{ id: USER_ID, role: "admin" }]);
    givenRpc("seed_reward_catalogue", () => ({
      data: null,
      error: { message: "function does not exist" },
    }));
    const res = await handler(req("POST", "", {}, OWNER_AUTH));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.message).toContain("fallback insert");
    // 4 catalogue rewards landed in the table fixture
    expect(body.rewards.length).toBe(4);
  });
});
