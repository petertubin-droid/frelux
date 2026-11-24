import "./index.ts";
import {
  getHandler,
  givenRows,
  givenUser,
  installDeno,
  json,
  req,
  resetCapture,
  OWNER_AUTH,
  OWNER_ID,
} from "../_shared/testing/harness.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();

const BASE_ENV = {
  SUPABASE_URL: "https://test-project.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
};

function configure(extra: Record<string, string> = {}) {
  installDeno({ ...BASE_ENV, GEMINI_API_KEY: "test-gemini-key", ...extra });
}

function adminUser() {
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("profiles", [
    { id: OWNER_ID, email: "owner@test.local", role: "admin" },
  ]);
  givenRows("user_roles", [{ user_id: OWNER_ID, role: "admin" }]);
  givenRows("site_settings", [{ ai_enabled: true, ai_access_mode: "paid" }]);
}

function stubGemini(text: string, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    if (String(url).includes("/auth/v1/user")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: OWNER_ID, email: "owner@test.local" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text }] } }],
        }),
        { status, headers: { "Content-Type": "application/json" } },
      ),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const SAMPLE_PROJECT = {
  name: "Living Room Renovation",
  project_type: "interior",
  building_type: "residential",
  finish_quality: "standard",
  budget_level: "medium",
  status: "draft",
  total_material_cost: 500000,
  total_labour_cost: 200000,
  total_project_cost: 700000,
  currency: "NGN",
  currency_symbol: "₦",
};

beforeEach(() => {
  resetCapture();
  configure();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-project-assistant edge function", () => {
  it("rejects non-POST with 405", async () => {
    adminUser();
    const res = await handler(req("GET", "", undefined, OWNER_AUTH));
    expect(res.status).toBe(405);
  });

  it("rejects missing projectData with 400", async () => {
    adminUser();
    const res = await handler(
      req("POST", "", { action: "review" }, OWNER_AUTH),
    );
    expect(res.status).toBe(400);
  });

  it("rejects QA action with missing question with 400", async () => {
    adminUser();
    const res = await handler(
      req(
        "POST",
        "",
        { action: "qa", projectData: SAMPLE_PROJECT },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(400);
  });

  it("handles optimize action correctly with defined currencySymbol", async () => {
    adminUser();
    const stubText = JSON.stringify({
      strategy: "Material substitution",
      savings: "10%",
      changes: [],
      tradeOffs: [],
      newEstimate: "₦630,000",
      warnings: [],
    });
    const fetchMock = stubGemini(stubText);

    const res = await handler(
      req(
        "POST",
        "",
        {
          action: "optimize",
          projectData: SAMPLE_PROJECT,
          optimizationTarget: "Reduce cost by 10%",
        },
        OWNER_AUTH,
      ),
    );

    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.result.strategy).toBe("Material substitution");
    expect(fetchMock).toHaveBeenCalled();
  });
});
