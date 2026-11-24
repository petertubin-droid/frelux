import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
        `${PROJECT}/functions/v1/nowpayments-verify`,
        PROJECT,
        EDGE,
      ),
    ).toBe(`${EDGE}/nowpayments-verify`);
  });

  it("keeps AI functions on Supabase, because the Worker does not deploy them", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { rewriteFunctionUrl } = await load();
    for (const name of ["ai-building-estimation", "ai-copilot", "count-vision"]) {
      const url = `${PROJECT}/functions/v1/${name}`;
      expect(rewriteFunctionUrl(url, PROJECT, EDGE), name).toBe(url);
    }
  });

  it("keeps functions over the 10 ms CPU budget on Supabase", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { rewriteFunctionUrl } = await load();
    for (const name of ["pdf-studio-export", "sitemap", "price-intel-scan"]) {
      const url = `${PROJECT}/functions/v1/${name}`;
      expect(rewriteFunctionUrl(url, PROJECT, EDGE), name).toBe(url);
    }
  });

  it("still relays an unknown name, which the Worker proxies back", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { rewriteFunctionUrl } = await load();
    expect(
      rewriteFunctionUrl(
        `${PROJECT}/functions/v1/some-new-function?x=1`,
        PROJECT,
        EDGE,
      ),
    ).toBe(`${EDGE}/some-new-function?x=1`);
  });

  it("agrees with the Worker registry on every Supabase-only name", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { SUPABASE_ONLY_FUNCTIONS } = await import("@/lib/edge/supabase-only");
    const registry = readFileSync(
      join(process.cwd(), "cloudflare/src/functions/registry.ts"),
      "utf8",
    );
    // Only the SUPABASE_ONLY map, not the CPU-measurement list further down.
    const section = registry.slice(
      registry.indexOf("export const SUPABASE_ONLY"),
      registry.indexOf("AWAITING_CPU_MEASUREMENT"),
    );
    const workerOnly = new Set(
      // Both shapes: a bare "name", entry and a ["name", "reason"] pair.
      [...section.matchAll(/^\s*\[?"([a-z0-9-]+)"/gm)].map((m) => m[1]),
    );
    const browserOnly = new Set(SUPABASE_ONLY_FUNCTIONS);
    expect([...workerOnly].filter((n) => !browserOnly.has(n))).toEqual([]);
    expect([...browserOnly].filter((n) => !workerOnly.has(n))).toEqual([]);
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

describe("edgeFunctionsFetch fallback resilience", () => {
  it("falls back to Supabase directly if edge gateway throws network/CORS error", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { edgeFunctionsFetch } = await load();

    const fetchCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const urlStr = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
        fetchCalls.push(urlStr);
        if (urlStr.startsWith(EDGE)) {
          throw new TypeError("Failed to fetch (CORS/Network error)");
        }
        return new Response(JSON.stringify({ ok: true, source: "supabase" }), { status: 200 });
      }),
    );

    const res = await edgeFunctionsFetch(`${PROJECT}/functions/v1/health`, {
      method: "POST",
      body: JSON.stringify({ ping: true }),
    });

    expect(fetchCalls[0]).toBe(`${EDGE}/health`);
    expect(fetchCalls[1]).toBe(`${PROJECT}/functions/v1/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("supabase");
    vi.unstubAllGlobals();
  });

  it("falls back to Supabase directly if edge gateway returns 502 or 503", async () => {
    vi.stubEnv("VITE_EDGE_FUNCTIONS_URL", EDGE);
    const { edgeFunctionsFetch } = await load();

    const fetchCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const urlStr = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
        fetchCalls.push(urlStr);
        if (urlStr.startsWith(EDGE)) {
          return new Response(JSON.stringify({ error: "Bad gateway" }), { status: 502 });
        }
        return new Response(JSON.stringify({ ok: true, source: "supabase" }), { status: 200 });
      }),
    );

    const res = await edgeFunctionsFetch(`${PROJECT}/functions/v1/nowpayments-checkout`, {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
    });

    expect(fetchCalls[0]).toBe(`${EDGE}/nowpayments-checkout`);
    expect(fetchCalls[1]).toBe(`${PROJECT}/functions/v1/nowpayments-checkout`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("supabase");
    vi.unstubAllGlobals();
  });
});
