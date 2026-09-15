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

describe("ai-logo-generation — Brand Studio logo generator", () => {
  it("rejects non-POST with 405", async () => {
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(405);
  });

  it("requires prompt and userId", async () => {
    const res = await handler(req("POST", "", { prompt: "Frelux" }));
    expect(res.status).toBe(400);
  });

  it("refuses generation when Brand Studio is disabled", async () => {
    givenRows("site_settings", [
      { ai_logo_daily_limit: 3, brand_studio_enabled: false },
    ]);
    const res = await handler(
      req("POST", "", { prompt: "Frelux", userId: USER_ID }),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error).toContain("Brand Studio is not enabled");
  });

  it("honestly reports 503 when no AI key is configured", async () => {
    givenRows("site_settings", [
      { ai_logo_daily_limit: 3, brand_studio_enabled: true },
    ]);
    const res = await handler(
      req("POST", "", { prompt: "Frelux", userId: USER_ID }),
    );
    expect(res.status).toBe(503);
    expect((await json(res)).error).toContain("not configured");
  });
});
