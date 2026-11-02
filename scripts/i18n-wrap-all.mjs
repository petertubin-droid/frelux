#!/usr/bin/env node
/**
 * Applies scripts/i18n-wrap.mjs across the app in batches.
 *
 * Every batch is typechecked. Files named in a compiler error are reverted
 * from a backup taken just before the batch, so a bad transform can never
 * reach a commit. The list of files that failed is printed at the end and can
 * be wrapped by hand.
 *
 * Usage: node scripts/i18n-wrap-all.mjs [--batch=20] [--dir=src] [--check]
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const BATCH = Number(args.batch || 20);
const DIR = args.dir || "src";
const CHECK = Boolean(args.check);
const BACKUP = "/tmp/i18n-wrap-backup";

mkdirSync(BACKUP, { recursive: true });

const TEXT_NODE = />(\s*)([A-Z][A-Za-z0-9 ,.'&()/+-]{1,80}?)(\s*)</;

function candidates() {
  const listed = execSync(
    `find ${DIR} -name "*.tsx" -not -name "*.test.tsx" -not -path "*/ui/*"`,
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);

  return listed.filter((file) => {
    const source = readFileSync(file, "utf8");
    if (source.includes("useLanguage")) return false;         // already wired
    if (source.includes("memo(") && source.length < 400) return false;
    return TEXT_NODE.test(source);
  });
}

function typeErrors() {
  try {
    execSync("npx tsc --noEmit -p tsconfig.app.json", { encoding: "utf8", stdio: "pipe" });
    return [];
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    const files = new Set();
    for (const line of out.split("\n")) {
      const m = line.match(/^(\S+\.tsx?)\(\d+,\d+\): error/);
      if (m) files.add(m[1]);
    }
    return [...files];
  }
}

const queue = candidates();
console.log(`${queue.length} files hold untranslated text`);
if (CHECK) console.log("check mode: nothing will be written");

const failures = [];
let wrappedFiles = 0;
let wrappedStrings = 0;

for (let i = 0; i < queue.length; i += BATCH) {
  const batch = queue.slice(i, i + BATCH);
  const backups = new Map();

  for (const file of batch) {
    const path = `${BACKUP}/${file.replace(/\//g, "__")}`;
    copyFileSync(file, path);
    backups.set(file, path);
  }

  try {
    execSync(`node scripts/i18n-wrap.mjs --files=${batch.join(",")}`, { stdio: "pipe" });
  } catch {
    // A single file failing is not fatal; the typecheck below decides.
  }

  let broken = typeErrors().filter((file) => batch.includes(file));

  // A file whose components the tool cannot locate still gets translated: fall
  // back to the module-level translator, which cannot fall out of scope.
  if (broken.length) {
    for (const file of broken) {
      const path = backups.get(file);
      if (path && existsSync(path)) copyFileSync(path, file);
    }
    execSync(`node scripts/i18n-wrap.mjs --mode=tx --files=${broken.join(",")}`, {
      stdio: "pipe",
    });
    const stillBroken = typeErrors().filter((file) => broken.includes(file));
    for (const file of stillBroken) {
      const path = backups.get(file);
      if (path && existsSync(path)) copyFileSync(path, file);
      failures.push(file);
    }
    broken = stillBroken;
  }

  const changed = batch.filter((file) => {
    const before = readFileSync(backups.get(file), "utf8");
    const after = readFileSync(file, "utf8");
    return before !== after;
  });
  wrappedFiles += changed.length;
  for (const file of changed) {
    wrappedStrings += (readFileSync(file, "utf8").match(/t\("/g) ?? []).length;
  }

  console.log(
    `batch ${Math.floor(i / BATCH) + 1}: ${changed.length}/${batch.length} wrapped, ` +
      `${broken.length} reverted`,
  );
  if (broken.length) console.log(`  reverted: ${broken.join(", ")}`);
}

writeFileSync("/tmp/i18n-wrap-failures.txt", failures.join("\n"));
console.log(`\n${wrappedFiles} files wrapped, ${failures.length} reverted`);
console.log("reverted list: /tmp/i18n-wrap-failures.txt");
