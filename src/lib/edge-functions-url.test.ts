import { afterEach, describe, expect, it, vi } from "vitest";

const PROJECT = "https://nfgaaohweygwydoelxnf.supabase.co";
const EDGE = "https://api.freluxtools.com/api/fn";

async function load() {
  vi.resetModules();
  return import("./supabase");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rewriteFunctionUrl", () => {
  it("points a function call at the edge base", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { rewriteFunctionUrl } = await load();
    expect(
      rewriteFunctionUrl(
        `${PROJECT}/functions/v1/nowpayments-checkout`,
        PROJECT,
        EDGE,
      ),
    ).toBe(`${EDGE}/nowpayments-checkout`);
  });

  it("keeps the function name and nothing else of the Supabase host", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { rewriteFunctionUrl } = await load();
    expect(
      rewriteFunctionUrl(
        `${PROJECT}/functions/v1/ai-building-estimation`,
        PROJECT,
        EDGE,
      ),
    ).toBe(`${EDGE}/ai-building-estimation`);
  });

  it("leaves non-function traffic alone", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { rewriteFunctionUrl } = await load();
    const rest = `${PROJECT}/rest/v1/site_settings?select=*`;
    expect(rewriteFunctionUrl(rest, PROJECT, EDGE)).toBe(rest);
    const auth = `${PROJECT}/auth/v1/token?grant_type=password`;
    expect(rewriteFunctionUrl(auth, PROJECT, EDGE)).toBe(auth);
  });

  it("does nothing when no edge base is configured", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", "");
    const { rewriteFunctionUrl } = await load();
    const fn = `${PROJECT}/functions/v1/health`;
    expect(rewriteFunctionUrl(fn, PROJECT, "")).toBe(fn);
  });

  it("ignores a function URL belonging to another project", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { rewriteFunctionUrl } = await load();
    const other =
      "https://hqhvlkunkdrxyuvziorm.supabase.co/functions/v1/health";
    expect(rewriteFunctionUrl(other, PROJECT, EDGE)).toBe(other);
  });
});

describe("edgeFunctionsBase", () => {
  it("uses the configured value and trims trailing slashes", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", `${EDGE}/`);
    const { edgeFunctionsBase } = await load();
    expect(edgeFunctionsBase()).toBe(EDGE);
  });

  it("returns empty for an explicitly empty value", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", "");
    const { edgeFunctionsBase } = await load();
    expect(edgeFunctionsBase()).toBe("");
  });
});
