import { describe, expect, it } from "vitest";
import { isOriginAllowed, resolveCorsHeaders } from "./cors.ts";

describe("CORS origin validation", () => {
  it("allows production domains", () => {
    expect(isOriginAllowed("https://freluxtools.com")).toBe(true);
    expect(isOriginAllowed("https://www.freluxtools.com")).toBe(true);
    expect(isOriginAllowed("http://freluxtools.com")).toBe(true);
    expect(isOriginAllowed("http://www.freluxtools.com")).toBe(true);
    expect(isOriginAllowed("https://freluxtools.netlify.app")).toBe(true);
  });

  it("allows Lovable platform, preview, and project domains", () => {
    expect(isOriginAllowed("https://frelux.lovable.app")).toBe(true);
    expect(isOriginAllowed("https://preview-123.lovable.app")).toBe(true);
    expect(isOriginAllowed("https://abc-123.lovableproject.com")).toBe(true);
    expect(isOriginAllowed("https://lovable.dev")).toBe(true);
    expect(isOriginAllowed("https://preview.lovable.dev")).toBe(true);
  });

  it("allows Netlify branch deploy previews", () => {
    expect(isOriginAllowed("https://deploy-preview-42--freluxtools.netlify.app")).toBe(true);
  });

  it("allows local dev servers on any port", () => {
    expect(isOriginAllowed("http://localhost:5173")).toBe(true);
    expect(isOriginAllowed("http://localhost:3000")).toBe(true);
    expect(isOriginAllowed("http://localhost:8080")).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:4173")).toBe(true);
  });

  it("refuses unlisted and attacker origins", () => {
    expect(isOriginAllowed("https://evil.example.com")).toBe(false);
    expect(isOriginAllowed("https://attacker-freluxtools.com")).toBe(false);
    expect(isOriginAllowed("https://notlovable.app.fake.com")).toBe(false);
    expect(isOriginAllowed("null")).toBe(false);
    expect(isOriginAllowed(null)).toBe(false);
  });

  it("returns proper CORS headers for allowed origins", () => {
    const req = new Request("https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/health", {
      headers: {
        origin: "https://frelux.lovable.app",
        "access-control-request-headers": "authorization, content-type, apikey",
      },
    });
    const headers = resolveCorsHeaders(req);
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://frelux.lovable.app");
    expect(headers["Vary"]).toBe("Origin");
    expect(headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toContain("authorization");
  });

  it("omits Access-Control-Allow-Origin for blocked origins", () => {
    const req = new Request("https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/health", {
      headers: {
        origin: "https://attacker.com",
      },
    });
    const headers = resolveCorsHeaders(req);
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(headers["Vary"]).toBe("Origin");
  });
});
