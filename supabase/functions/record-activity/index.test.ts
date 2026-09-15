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

describe("record-activity — streaks and missions", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(req("POST", "", { activityType: "calc" }));
    expect(res.status).toBe(401);
  });

  it("rejects a missing activityType with 400", async () => {
    givenUser42();
    const res = await handler(req("POST", "", {}, OWNER_AUTH));
    expect(res.status).toBe(400);
  });

  it("records activity and reports no mission update by default", async () => {
    givenUser42();
    givenRpc("generate_weekly_mission_if_needed", () => ({
      data: null,
      error: null,
    }));
    givenRpc("record_activity", () => ({
      data: [{ streak_awarded: 0 }],
      error: null,
    }));
    const res = await handler(
      req("POST", "", { activityType: "calc" }, OWNER_AUTH),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.streakAwarded).toBe(0);
    expect(body.missionUpdated).toBe(false);
  });

  it("updates mission progress when a task type is provided", async () => {
    givenUser42();
    givenRpc("generate_weekly_mission_if_needed", () => ({
      data: null,
      error: null,
    }));
    givenRpc("record_activity", () => ({
      data: [{ streak_awarded: 5 }],
      error: null,
    }));
    givenRpc("update_mission_progress", () => ({
      data: [{ success: true }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        { activityType: "calc", missionTaskType: "run_calculators" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.streakAwarded).toBe(5);
    expect(body.missionUpdated).toBe(true);
  });
});
