import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { repairInternalLinks } from "../../scripts/lib/internal-link-repair.mjs";

// The repair pass is the thing that keeps translated article bodies from
// linking at 404s, so it is tested against a real directory rather than by
// asserting on the build script's source text.
const page = (body: string) =>
  `<!doctype html><html><body>${body}</body></html>`;

const write = (root: string, route: string, html: string) => {
  const dir = join(root, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
};

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "frelux-links-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("repairInternalLinks", () => {
  it("resolves a translated link by its anchor text", () => {
    write(
      root,
      "es/learn/como-planificar",
      page(
        `<h1>Guía de planificación</h1><a href="/aprender/paso-a-paso">Paso a paso</a>`,
      ),
    );
    write(root, "es/learn/paso-a-paso", page(`<h1>Paso a paso</h1>`));

    const stats = repairInternalLinks(root, { quiet: true });

    expect(stats.byAnchor).toBe(1);
    expect(stats.left).toBe(0);
    const html = readFileSync(
      join(root, "es/learn/como-planificar/index.html"),
      "utf8",
    );
    expect(html).toContain('href="/es/learn/paso-a-paso"');
    expect(html).not.toContain("/aprender/");
  });

  it("uses a known alias only when the target was actually built", () => {
    write(root, "calculators", page(`<h1>Calculators</h1>`));
    write(
      root,
      "es/learn/a",
      page(`<h1>A</h1><a href="/calculadora-de-pintura">Calculadora</a>`),
    );

    const stats = repairInternalLinks(root, { quiet: true });

    expect(stats.byAlias).toBe(1);
    const html = readFileSync(join(root, "es/learn/a/index.html"), "utf8");
    expect(html).toContain('href="/calculators"');
  });

  it("falls back to the nearest existing ancestor", () => {
    write(root, "learn", page(`<h1>Learn</h1>`));
    write(
      root,
      "learn/hub",
      page(`<h1>Hub</h1><a href="/learn/hub/missing">x</a>`),
    );

    const stats = repairInternalLinks(root, { quiet: true });

    expect(stats.byAncestor).toBe(1);
    const html = readFileSync(join(root, "learn/hub/index.html"), "utf8");
    expect(html).toContain('href="/learn/hub"');
  });

  it("leaves an unresolvable link alone instead of pointing it at the home page", () => {
    write(root, "learn", page(`<h1>Learn</h1>`));
    write(root, "learn/a", page(`<h1>A</h1><a href="/nowhere-at-all">x</a>`));

    const stats = repairInternalLinks(root, { quiet: true });

    expect(stats.left).toBe(1);
    const html = readFileSync(join(root, "learn/a/index.html"), "utf8");
    expect(html).toContain('href="/nowhere-at-all"');
  });

  it("never rewrites a link that already resolves", () => {
    write(root, "learn", page(`<h1>Learn</h1>`));
    write(root, "learn/a", page(`<h1>A</h1><a href="/learn">back</a>`));

    const stats = repairInternalLinks(root, { quiet: true });

    expect(stats.rewrote).toBe(0);
    expect(stats.files).toBe(0);
  });
});
