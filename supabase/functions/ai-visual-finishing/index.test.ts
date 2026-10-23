import "./index.ts";
import {
  getHandler,
  req,
  json,
  givenUser,
  givenRows,
  OWNER_AUTH,
  OWNER_ID,
} from "../_shared/testing/harness.ts";
import { describe, expect, it } from "vitest";
import { sanitizeBBox, sanitizeOpenings, sanitizeSurfaces } from "./index.ts";

const handler = getHandler();
const validImage = "data:image/jpeg;base64,MTIzNDU2Nzg=";

function configuredUser() {
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("site_settings", [
    { estimation_enabled: true, estimation_access_mode: "enabled" },
  ]);
}

describe("ai-visual-finishing edge function", () => {
  it("rejects GET requests with 405 Method Not Allowed", async () => {
    expect((await handler(req("GET", "", undefined))).status).toBe(405);
  });

  it("requires verified authentication", async () => {
    const res = await handler(req("POST", "", { imageDataUrl: validImage }));
    expect(res.status).toBe(401);
    expect((await json(res)).code).toBe("UNAUTHORIZED");
  });

  it("rejects empty body with 400 NO_INPUT", async () => {
    configuredUser();
    const res = await handler(req("POST", "", {}, OWNER_AUTH));
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("NO_INPUT");
  });

  it("rejects malformed image data before provider access", async () => {
    configuredUser();
    const res = await handler(
      req(
        "POST",
        "",
        { imageDataUrl: "data:text/html;base64,PHNjcmlwdD4=" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("INVALID_IMAGE");
  });

  it("sanitizes impossible boxes and never assigns metric dimensions", () => {
    expect(sanitizeBBox({ x: 0.9, y: 0, w: 0.5, h: 0.2 })).toBeNull();
    expect(sanitizeBBox({ x: -0.2, y: 0, w: 0.4, h: 0.4 })).toBeNull();
    expect(
      sanitizeOpenings([{ type: "archway", bbox: { x: 0, y: 0, w: 1, h: 1 } }]),
    ).toEqual([]);
    const surfaces = sanitizeSurfaces([
      {
        id: "fake",
        category: "wall",
        name: "Wall",
        confidence: 0.9,
        bbox: { x: 0, y: 0, w: 1, h: 1 },
        widthM: 5,
        heightM: 3,
        grossAreaM2: 15,
        openings: [
          {
            id: "door",
            type: "door",
            confidence: 0.8,
            bbox: { x: 0.2, y: 0.2, w: 0.1, h: 0.4 },
            widthM: 0.9,
            heightM: 2.1,
          },
        ],
      },
    ]);
    expect(surfaces).toHaveLength(1);
    expect(surfaces[0].widthM).toBeNull();
    expect(surfaces[0].grossAreaM2).toBeNull();
    expect(surfaces[0].openings[0].widthM).toBeNull();
  });
});
