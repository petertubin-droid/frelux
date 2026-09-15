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

describe("health — liveness probe", () => {
  it("reports healthy with the database reachable", async () => {
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("healthy");
    expect(body.checks.database).toBe("up");
    expect(body.version).toBeTruthy();
    expect(typeof body.uptime_seconds).toBe("number");
  });

  it("reports AI/payment providers as unknown without their keys", async () => {
    const res = await handler(req("GET", ""));
    const body = await json(res);
    expect(body.checks.ai_providers).toBe("unknown");
    expect(body.checks.payment).toBe("unknown");
  });

  it("rejects non-GET with 405", async () => {
    const res = await handler(req("POST", "", {}));
    expect(res.status).toBe(405);
  });
});
