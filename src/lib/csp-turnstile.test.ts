import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the Content-Security-Policy that the sign-in, sign-up and password
 * reset forms depend on.
 *
 * Why this test exists: the deploy served TWO CSP headers — one from
 * netlify.toml and one from public/_headers — and a browser enforces the
 * *intersection* of them. netlify.toml's copy had drifted: it never gained
 * `challenges.cloudflare.com`, so the Turnstile script was blocked, no token
 * was ever issued, and the Login form's submit button stayed permanently
 * disabled (`disabled={turnstile.required && !turnstile.token}`). Sign-in
 * looked like a dead button and the widget never appeared. Vercel's CSP and
 * public/_headers both allowed the origin; only the Netlify copy was stale,
 * which is why it only broke in production.
 *
 * The two policies are now kept identical, so the intersection equals either
 * one and a drift in a single file cannot silently break authentication again.
 */

const rootDir = process.cwd();
const netlifyToml = readFileSync(join(rootDir, "netlify.toml"), "utf8");
const headersFile = readFileSync(join(rootDir, "public/_headers"), "utf8");
const turnstileSource = readFileSync(
  join(rootDir, "src/lib/turnstile.ts"),
  "utf8",
);

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

function netlifyCsp(): string {
  const match = netlifyToml.match(/Content-Security-Policy = "([^"]+)"/);
  if (!match)
    throw new Error("netlify.toml has no Content-Security-Policy header");
  return match[1];
}

function headersCsp(): string {
  const match = headersFile.match(/Content-Security-Policy:\s*(\S.*)/);
  if (!match)
    throw new Error("public/_headers has no Content-Security-Policy header");
  return match[1].trim();
}

function directive(csp: string, name: string): string[] {
  for (const part of csp.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens[0] === name) return tokens.slice(1);
  }
  return [];
}

describe.each([
  ["netlify.toml", netlifyCsp],
  ["public/_headers", headersCsp],
])(
  "%s CSP permits the bot-check and its verification hops",
  (_label, readCsp) => {
    it("allows the Turnstile script to load", () => {
      expect(directive(readCsp(), "script-src")).toContain(TURNSTILE_ORIGIN);
    });

    it("allows the Turnstile widget to reach Cloudflare", () => {
      expect(directive(readCsp(), "connect-src")).toContain(TURNSTILE_ORIGIN);
    });

    it("allows the challenge iframe", () => {
      const frame = directive(readCsp(), "frame-src");
      // 'https:' already covers it; an explicit origin is accepted too.
      expect(frame.includes("https:") || frame.includes(TURNSTILE_ORIGIN)).toBe(
        true,
      );
    });

    it("allows the file Worker that verifies the token first", () => {
      // turnstile.ts prefers the R2 worker before falling back to the edge
      // function; a blocked origin here means every submit waits out the
      // fallback timeout instead of verifying promptly.
      const workerUrl = turnstileSource.match(
        /VITE_R2_WORKER_URL[\s\S]{0,120}?\)/,
      );
      if (!workerUrl) return; // worker not configured in this checkout
      expect(directive(readCsp(), "connect-src")).toContain(
        "https://files.freluxtools.com",
      );
    });

    it("still locks down script execution to named origins", () => {
      // A regression guard for the fix itself: allowing the bot check must not
      // have come from dropping to a wildcard or 'unsafe-eval'.
      const script = directive(readCsp(), "script-src");
      expect(script).not.toContain("*");
      expect(script).not.toContain("https:");
      expect(script).not.toContain("'unsafe-eval'");
      expect(directive(readCsp(), "object-src")).toEqual(["'none'"]);
      expect(directive(readCsp(), "base-uri")).toEqual(["'self'"]);
    });
  },
);

describe("the two served CSPs cannot drift apart", () => {
  it("declares the same directives in the same order", () => {
    const names = (csp: string) =>
      csp
        .split(";")
        .map((p) => p.trim().split(/\s+/)[0])
        .filter(Boolean);
    expect(names(headersCsp())).toEqual(names(netlifyCsp()));
  });

  it("declares the same sources for every directive", () => {
    // Browsers enforce the intersection of multiple CSP headers, so any
    // source present in one file and missing from the other is a source that
    // is blocked in production while looking fine in the file that has it.
    for (const name of [
      "default-src",
      "script-src",
      "style-src",
      "connect-src",
      "frame-src",
    ]) {
      expect(directive(headersCsp(), name).sort()).toEqual(
        directive(netlifyCsp(), name).sort(),
      );
    }
  });
});
