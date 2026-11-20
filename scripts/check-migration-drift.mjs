#!/usr/bin/env node
/**
 * Migration drift check.
 *
 * Compares the migrations recorded in the live project against the SQL files in
 * supabase/migrations. Two things can go wrong and both are silent otherwise:
 *
 *   pending     a file exists that was never applied, so production is behind;
 *   remote-only a version is applied that has no file, so a fresh environment
 *               cannot be rebuilt to match production.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/check-migration-drift.mjs [project-ref]
 *
 * The token is a Supabase personal access token. It is read from the
 * environment and never printed.
 */

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DEFAULT_REF = "nfgaaohweygwydoelxnf";
const ref = process.argv[2] || process.env.SUPABASE_PROJECT_REF || DEFAULT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN is not set. Refusing to guess.");
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

const local = new Map();
for (const file of readdirSync(migrationsDir)) {
  if (!file.endsWith(".sql")) continue;
  const version = file.split("_")[0];
  local.set(version, file);
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "select version::text as version, name from supabase_migrations.schema_migrations order by version",
    }),
  },
);

if (!response.ok) {
  console.error(`Query failed: HTTP ${response.status}`);
  process.exit(2);
}

const rows = await response.json();
const applied = new Map(rows.map((row) => [String(row.version), row.name]));

const pending = [...local.keys()].filter((v) => !applied.has(v)).sort();
const remoteOnly = [...applied.keys()].filter((v) => !local.has(v)).sort();

console.log(`project ${ref}`);
console.log(`applied ${applied.size}, in repo ${local.size}`);

if (pending.length === 0 && remoteOnly.length === 0) {
  console.log("no drift: every file is applied and every version has a file");
  process.exit(0);
}

if (pending.length > 0) {
  console.log(`\n${pending.length} pending (in repo, not applied):`);
  for (const v of pending) console.log(`  ${local.get(v)}`);
}

if (remoteOnly.length > 0) {
  console.log(`\n${remoteOnly.length} applied without a file in the repo:`);
  for (const v of remoteOnly) console.log(`  ${v}  ${applied.get(v) ?? ""}`);
  console.log(
    "\nA version applied without a file cannot be rebuilt in a fresh environment. Capture its SQL.",
  );
}

process.exit(1);
