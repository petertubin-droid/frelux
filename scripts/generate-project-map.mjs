#!/usr/bin/env node
/**
 * Project map generator.
 *
 * The Studio's Project Explorer used to render a hand-written tree, so it
 * described the repository as it was the day someone typed it and silently
 * drifted from the real one. This walks the actual working tree and writes
 * public/studio/project-map.json, which the explorer fetches. What an admin
 * sees is therefore the build that is deployed, not a memory of it.
 *
 * Scope is deliberate: source directories are walked to a shallow depth, while
 * very large families (migrations, public assets) are summarised as counts so
 * the map stays a map and does not become a file dump.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const OUT = join(ROOT, "public", "studio", "project-map.json");

// Directories walked as a tree, with how deep to go.
const TREE_ROOTS = [
  { path: "src", depth: 3 },
  { path: "scripts", depth: 1 },
  { path: "netlify", depth: 2 },
];

// Families summarised as a single node with real counts.
const SUMMARY_ROOTS = [
  "supabase/migrations",
  "supabase/functions",
  "public",
  "src/components",
  "src/pages",
];

const IGNORED = new Set([
  "node_modules",
  ".git",
  "dist",
  ".vite",
  "coverage",
  ".turbo",
]);

const BINARY = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2",
  ".ttf", ".otf", ".pdf", ".zip", ".mp4", ".webm", ".avif", ".svg",
]);

const totals = { files: 0, dirs: 0 };

function countLines(absPath, ext) {
  if (BINARY.has(ext)) return null;
  try {
    const size = statSync(absPath).size;
    if (size > 512 * 1024) return null; // too big to be worth counting
    const text = readFileSync(absPath, "utf-8");
    return text.split("\n").length;
  } catch {
    return null;
  }
}

function walk(relPath, depthLeft) {
  const abs = join(ROOT, relPath);
  let entries;
  try {
    entries = readdirSync(abs, { withFileTypes: true });
  } catch {
    return null;
  }

  const children = [];
  let fileCount = 0;
  let dirCount = 0;

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED.has(entry.name) || entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      dirCount += 1;
      totals.dirs += 1;
      const childPath = `${relPath}/${entry.name}`;
      if (depthLeft > 0) {
        const sub = walk(childPath, depthLeft - 1);
        if (sub) children.push(sub);
      } else {
        children.push({
          name: entry.name,
          path: childPath,
          type: "dir",
          purpose: "Not expanded at this depth. Counts are included in the parent total.",
        });
      }
    } else if (entry.isFile()) {
      fileCount += 1;
      totals.files += 1;
      const ext = extname(entry.name).toLowerCase();
      const lines = countLines(join(abs, entry.name), ext);
      children.push({
        name: entry.name,
        path: `${relPath}/${entry.name}`,
        type: "file",
        purpose:
          lines === null
            ? "Binary or large file."
            : `${lines.toLocaleString()} lines of ${ext ? ext.slice(1) : "text"}.`,
      });
    }
  }

  return {
    name: relPath.split("/").pop(),
    path: relPath,
    type: "dir",
    purpose: `${fileCount.toLocaleString()} files, ${dirCount.toLocaleString()} folders.`,
    children,
  };
}

function summarise(relPath) {
  const abs = join(ROOT, relPath);
  let files = 0;
  let dirs = 0;
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (IGNORED.has(entry.name)) continue;
      if (entry.isDirectory()) {
        dirs += 1;
        stack.push(join(current, entry.name));
      } else if (entry.isFile()) {
        files += 1;
      }
    }
  }
  if (files === 0 && dirs === 0) return null;
  totals.files += files;
  totals.dirs += dirs;
  return {
    name: relPath.split("/").pop(),
    path: relPath,
    type: "dir",
    purpose: `${files.toLocaleString()} files, ${dirs.toLocaleString()} folders (summarised, not expanded).`,
    children: [],
  };
}

let commit = "";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
} catch {
  commit = "";
}

const tree = [];
for (const root of TREE_ROOTS) {
  const node = walk(root.path, root.depth);
  if (node) tree.push(node);
}
for (const path of SUMMARY_ROOTS) {
  // Skip a summary root that is already covered by a walked root.
  if (TREE_ROOTS.some((r) => path === r.path || path.startsWith(`${r.path}/`))) continue;
  const node = summarise(path);
  if (node) tree.push(node);
}

// ── Engine inventory ────────────────────────────────────────────────
// Engine Studio can only run engines that have a registered adapter, and
// nothing told an admin how many engine modules exist beyond those. This
// records every engine module in the codebase with its exported entry points,
// so the console can state the real coverage instead of implying completeness.
function findEngineModules(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(join(ROOT, dir), { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      findEngineModules(rel, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.test\.|\.spec\./.test(entry.name)) continue;
    if (!/engine/i.test(entry.name)) continue;
    // Shared plumbing, not a calculation engine: listing these as engines
    // would inflate the inventory with helpers that cannot be run.
    if (/^engine-(canonical|manifest|pricing|result|registry|types|shared)\./.test(entry.name)) continue;

    let exports = [];
    try {
      const text = readFileSync(join(ROOT, rel), "utf-8");
      exports = [...text.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)]
        .map((m) => m[1])
        .slice(0, 8);
    } catch {
      exports = [];
    }
    acc.push({ path: rel, name: entry.name.replace(/\.(ts|tsx)$/, ""), exports });
  }
  return acc;
}

const engines = findEngineModules("src/lib").sort((a, b) => a.path.localeCompare(b.path));

mkdirSync(join(ROOT, "public", "studio"), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      commit,
      totals,
      tree,
      engines,
    },
    null,
    2,
  ),
);

console.log(
  `project map: ${tree.length} top-level entries, ${totals.files.toLocaleString()} files, ${totals.dirs.toLocaleString()} folders -> ${relative(ROOT, OUT)}`,
);
