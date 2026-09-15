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

describe("award-credits — server-side reward catalog", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(
      req("POST", "", { eventType: "first_calc", referenceId: "r1" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing eventType/referenceId with 400", async () => {
    givenUser42();
    const res = await handler(
      req("POST", "", { eventType: "first_calc" }, OWNER_AUTH),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("BAD_REQUEST");
  });

  it("rejects unknown reward event types", async () => {
    givenUser42();
    const res = await handler(
      req(
        "POST",
        "",
        { eventType: "not_a_real_event", referenceId: "r1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("UNKNOWN_EVENT_TYPE");
  });

  it("grants from the server catalog — client-supplied amount is ignored", async () => {
    givenUser42();
    let captured: any = null;
    givenRpc("award_credits", (args: any) => {
      captured = args;
      return {
        data: [{ success: true, new_balance: 12, already_awarded: false }],
        error: null,
      };
    });
    const res = await handler(
      req(
        "POST",
        "",
        { eventType: "first_calc", referenceId: "r1", amount: 999999 },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.newBalance).toBe(12);
    expect(body.alreadyAwarded).toBe(false);
    // The catalog decides: first_calc is worth 2, never the client's 999999
    expect(captured.p_amount).toBe(2);
    expect(captured.p_reason).toBe("Completed first calculator");
    expect(captured.p_user_id).toBe(USER_ID);
  });

  it("rejects GET with 405", async () => {
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(405);
  });
});
