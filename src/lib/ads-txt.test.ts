import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();

describe("ads.txt & app-ads.txt integrity and crawlability", () => {
  const adsTxtPath = join(rootDir, "public/ads.txt");
  const appAdsTxtPath = join(rootDir, "public/app-ads.txt");
  const headersPath = join(rootDir, "public/_headers");
  const netlifyTomlPath = join(rootDir, "netlify.toml");
  const robotsTxtPath = join(rootDir, "public/robots.txt");
  const legacyRobotsTxtPath = join(rootDir, "public/legacy-robots.txt");

  it("ensures public/ads.txt exists, contains valid seller line, and has no BOM", () => {
    expect(existsSync(adsTxtPath)).toBe(true);
    const buffer = readFileSync(adsTxtPath);
    // Check no UTF-8 BOM (0xEF, 0xBB, 0xBF)
    expect(buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf).toBe(false);

    const content = buffer.toString("utf8");
    expect(content).toContain("google.com, pub-3404100134534192, DIRECT, f08c47fec0942fa0");
    expect(content.endsWith("\n")).toBe(true);
  });

  it("ensures public/app-ads.txt exists and matches the publisher ID", () => {
    expect(existsSync(appAdsTxtPath)).toBe(true);
    const content = readFileSync(appAdsTxtPath, "utf8");
    expect(content).toContain("google.com, pub-3404100134534192, DIRECT, f08c47fec0942fa0");
  });

  it("ensures public/_headers allows cross-origin reading and sets proper Content-Type", () => {
    const headers = readFileSync(headersPath, "utf8");
    expect(headers).toContain("/ads.txt");
    expect(headers).toContain("/app-ads.txt");
    expect(headers).toContain("Cross-Origin-Resource-Policy: cross-origin");
    expect(headers).toContain("Access-Control-Allow-Origin: *");
  });

  it("ensures netlify.toml configures open headers and static passthrough redirects", () => {
    const toml = readFileSync(netlifyTomlPath, "utf8");
    expect(toml).toContain('for = "/ads.txt"');
    expect(toml).toContain('for = "/app-ads.txt"');
    expect(toml).toContain('Cross-Origin-Resource-Policy = "cross-origin"');
    expect(toml).toContain('Access-Control-Allow-Origin = "*"');
    expect(toml).toContain('from = "https://freluxtools.netlify.app/ads.txt"');
    expect(toml).toContain('from = "/ads.txt"');
  });

  it("ensures public/robots.txt explicitly allows ad crawlers to fetch ads.txt", () => {
    const robots = readFileSync(robotsTxtPath, "utf8");
    expect(robots).toContain("Allow: /ads.txt");
    expect(robots).toContain("Allow: /app-ads.txt");
    expect(robots).toContain("User-agent: Google-adstxt");
    expect(robots).toContain("User-agent: Mediapartners-Google");
    expect(robots).toContain("User-agent: AdsBot-Google");
  });

  it("ensures legacy robots.txt permits ad crawlers", () => {
    const legacyRobots = readFileSync(legacyRobotsTxtPath, "utf8");
    expect(legacyRobots).toContain("Allow: /ads.txt");
    expect(legacyRobots).toContain("User-agent: Google-adstxt");
  });
});
