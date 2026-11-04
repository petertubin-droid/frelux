import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function repairInternalLinks(dir, { quiet = false } = {}) {
  const norm = (s) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/gi, " ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const routes = new Set();
  const files = new Set();
  const walk = (abs, prefix) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === "assets") continue;
      const full = join(abs, entry.name);
      const rel = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full, rel);
      } else {
        files.add(rel);
        if (entry.name === "index.html") {
          routes.add(prefix === "" ? "/" : prefix);
        }
      }
    }
  };
  walk(dir, "");

  // Anchor text -> route, from the h1 of every learn page.
  const titleIndex = new Map();
  for (const route of routes) {
    if (!route.includes("/learn/")) continue;
    const file = join(dir, `${route}/index.html`);
    if (!existsSync(file)) continue;
    const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(readFileSync(file, "utf8"));
    if (!m) continue;
    const key = norm(m[1].replace(/<[^>]+>/g, ""));
    if (key && !titleIndex.has(key)) titleIndex.set(key, route);
  }

  const exists = (target) => {
    const clean = target.replace(/\/$/, "");
    if (routes.has(clean === "" ? "/" : clean)) return true;
    return files.has(target) || files.has(clean);
  };

  // Translated or informal paths that have a real counterpart. Each entry lists
  // candidates in order of preference and the first one that exists wins, so an
  // alias can never point at a page that was not built.
  const aliasCandidates = (target) => {
    const p = target.replace(/\/$/, "");
    if (/^\/(aprender|aprende|aprendiz|aprendiza)\//.test(p))
      return ["/es/learn", "/learn"];
    // A documented app route with an :id placeholder is a pattern, not a page.
    if (p.includes(":")) return ["/calculators"];
    if (/^\/calculadora/.test(p) || /^\/estructural/.test(p))
      return ["/calculators"];
    if (/^\/estimador/.test(p)) return ["/calculators"];
    const table = {
      "/market": ["/global-markets"],
      "/markets": ["/global-markets"],
      "/screed-calculator": ["/screeding-calculator"],
      "/colores": ["/colors"],
      "/quotes": ["/projects", "/calculators"],
      "/my-projects": ["/projects", "/calculators"],
      "/climate-advisor": ["/calculators"],
      "/cost-guides": ["/learn", "/prices"],
    };
    return table[p] ?? [];
  };

  const alias = (target) => {
    for (const candidate of aliasCandidates(target)) {
      if (exists(candidate)) return candidate;
    }
    return null;
  };

  const ancestors = (target) => {
    const parts = target.replace(/\/$/, "").split("/").filter(Boolean);
    for (let i = parts.length - 1; i > 0; i--) {
      const candidate = `/${parts.slice(0, i).join("/")}`;
      if (routes.has(candidate)) return candidate;
    }
    return null;
  };

  const stats = {
    files: 0,
    rewrote: 0,
    byAnchor: 0,
    byAlias: 0,
    byAncestor: 0,
    left: 0,
  };
  const unresolved = new Set();

  const htmlFiles = [];
  const collect = (abs, prefix) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === "assets") continue;
      const full = join(abs, entry.name);
      const rel = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) collect(full, rel);
      else if (entry.name === "index.html")
        htmlFiles.push([full, prefix === "" ? "/" : prefix]);
    }
  };
  collect(dir, "");

  for (const [file, page] of htmlFiles) {
    const html = readFileSync(file, "utf8");
    let changed = false;
    const out = html.replace(
      /href="(\/[^"#?]*)"([^>]*)>([\s\S]{0,200}?)<\/a>/g,
      (match, href, attrs, inner) => {
        if (exists(href)) return match;
        const text = norm(inner.replace(/<[^>]+>/g, " "));
        let next = text ? titleIndex.get(text) : null;
        // Two articles can share a heading, so a title match must never point
        // the page at itself; that would turn a broken link into a no-op.
        if (next === page) next = null;
        if (next) stats.byAnchor++;
        if (!next) {
          next = alias(href);
          if (next) stats.byAlias++;
        }
        if (!next) {
          next = ancestors(href);
          if (next) stats.byAncestor++;
        }
        if (!next) {
          unresolved.add(href);
          stats.left++;
          return match;
        }
        stats.rewrote++;
        changed = true;
        return `href="${next}"${attrs}>${inner}</a>`;
      },
    );
    if (changed) {
      writeFileSync(file, out);
      stats.files++;
    }
  }

  if (!quiet)
    console.log(
      ` link repair: ${stats.rewrote} links rewritten in ${stats.files} pages ` +
        `(anchor ${stats.byAnchor}, alias ${stats.byAlias}, ancestor ${stats.byAncestor}), ` +
        `${stats.left} unresolved`,
    );
  if (!quiet && unresolved.size) {
    console.log(
      ` unresolved targets: ${[...unresolved].slice(0, 10).join(", ")}`,
    );
  }
  return stats;
}
