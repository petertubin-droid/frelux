/**
 * Builds the SEO optimisation tracker (deliverable: page-level change log).
 *
 * "Before" comes from the committed prerender route list, "after" from the
 * prerendered files this build produced. The diff is therefore the real change
 * that shipped, not a hand-kept list that can drift from reality.
 *
 * Usage: node scripts/seo/tracker.mjs
 * Writes: src/config/seo-tracker.json
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const auditPath = "dist/_seo-audit.json";
if (!existsSync(auditPath)) {
  console.error("Run the build first: dist/_seo-audit.json is missing.");
  process.exit(1);
}
const audit = JSON.parse(readFileSync(auditPath, "utf-8"));
const after = new Map(audit.pages.map((p) => [p.path, p]));

let beforeSrc = "";
try {
  beforeSrc = execSync("git show HEAD:scripts/prerender.mjs", { encoding: "utf-8" });
} catch {
  console.error("Could not read the committed prerender list; nothing to compare.");
  process.exit(1);
}

const before = new Map();
const routeRe = /\{\s*path:\s*"([^"]+)",\s*[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)",\s*[\s\S]*?description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
for (const m of beforeSrc.matchAll(routeRe)) {
  const unescape = (s) => s.replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
  before.set(m[1], { title: unescape(m[2]), description: unescape(m[3]) });
}

const pageType = (path) => {
  if (path.includes("/templates/")) return "market-template";
  if (path.startsWith("/colors/paint/")) return "colour";
  if (path.startsWith("/colors/")) return "palette";
  if (path.startsWith("/templates/")) return "template";
  if (path.startsWith("/learn/")) return "article";
  if (path.startsWith("/market/")) return "market";
  if (path.startsWith("/admin/")) return "admin";
  return "tool";
};

const entries = [];
for (const [path, old] of before) {
  const now = after.get(path.replace(/\/?$/, "/"));
  if (!now) continue;
  if (old.title === now.title && old.description === now.description) continue;
  entries.push({
    path: now.path,
    pageType: pageType(now.path),
    oldTitle: old.title,
    newTitle: now.title,
    oldDescription: old.description,
    newDescription: now.description,
    status: "implemented",
    implementedAt: "2026-11-02",
  });
}

entries.sort((a, b) => a.path.localeCompare(b.path));
const out = {
  generatedAt: new Date().toISOString(),
  note:
    "Before/after is diffed from the committed prerender list against the built output. Only pages whose listing copy actually changed are listed.",
  changedPages: entries.length,
  entries,
};
writeFileSync("src/config/seo-tracker.json", JSON.stringify(out, null, 2));
console.log(`tracker: ${entries.length} pages changed`);
const byType = entries.reduce((acc, e) => {
  acc[e.pageType] = (acc[e.pageType] || 0) + 1;
  return acc;
}, {});
console.log(byType);
