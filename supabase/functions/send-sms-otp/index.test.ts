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

describe("send-sms-otp — Termii SMS gateway", () => {
  it("rejects non-POST with 405", async () => {
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(405);
  });

  it("rejects a missing phone or OTP with 400", async () => {
    const res = await handler(req("POST", "", { phone_number: "08031234567" }));
    expect(res.status).toBe(400);
  });

  it("returns the dev OTP when the gateway key is not configured", async () => {
    const res = await handler(
      req("POST", "", { phone_number: "08031234567", otp_code: "123456" }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(false);
    expect(body.dev_otp).toBe("123456");
    expect(body.message).toContain("not configured");
  });
});
