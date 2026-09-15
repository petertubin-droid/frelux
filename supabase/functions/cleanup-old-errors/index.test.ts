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

describe("cleanup-old-errors — retention sweeper", () => {
  it("sweeps resolved errors and aged API usage on POST", async () => {
    const res = await handler(req("POST", "", {}));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("ok");
    expect(body.retention_days).toBe(90);
    expect(body.api_usage_retention_days).toBe(90);
    expect(typeof body.deleted).toBe("number");
    expect(typeof body.api_usage_deleted).toBe("number");
  });
});
