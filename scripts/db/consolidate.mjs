#!/usr/bin/env node
/**
 * FRELUX DB consolidation — moves all FRELUX items from the old project
 * (Frelukx mirror) to the current project, excluding everything ARCHIE.
 *
 * Modes:
 *   report            — read-only inventory: migration state + row counts both sides
 *   apply-migrations  — apply pending non-ARCHIE migrations to CURRENT project
 *   copy-data         — copy rows that exist on OLD but not CURRENT (non-ARCHIE tables)
 *
 * Uses the Supabase management API query endpoint (runs as the postgres role),
 * so it bypasses anon RLS/grant limits on both projects.
 *
 * ARCHIE exclusion: migration files whose name contains "archie" are skipped,
 * and tables whose name contains "archie" are never touched.
 */
import { readdir, readFile, writeFileSync } from "node:fs/promises";
import { join } from "node:path";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const OLD_REF = "pjvtqkshewerpvggtgqx"; // Frelukx mirror (source)
const CUR_REF = "hqhvlkunkdrxyuvziorm"; // Freluxtools (target)
const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const ARCHIE_RE = /archie/i;

if (!TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const report = { mode: "", oldRef: OLD_REF, curRef: CUR_REF, startedAt: new Date().toISOString(), steps: [], errors: [] };

async function query(ref, sql, { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res, text;
    try {
      res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      text = await res.text();
    } catch (e) {
      if (attempt < retries) { await sleep(2000); continue; }
      throw new Error(`query request failed: ${e.message}`);
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt < retries) { await sleep(3000 * (attempt + 1)); continue; }
    }
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (!res.ok) {
      const detail = (parsed && (parsed.message || parsed.error || parsed.hint)) || text.slice(0, 300);
      const err = new Error(`HTTP ${res.status} on ${ref}: ${detail}`);
      err.statusCode = res.status;
      err.detail = typeof detail === "string" ? detail : JSON.stringify(detail);
      throw err;
    }
    if (parsed && !Array.isArray(parsed) && typeof parsed === "object" && "error" in parsed) {
      throw new Error(`SQL error on ${ref}: ${JSON.stringify(parsed).slice(0, 500)}`);
    }
    return Array.isArray(parsed) ? parsed : [];
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function logStep(name, data) {
  report.steps.push({ name, ...data });
  console.log(`[step] ${name}: ${JSON.stringify(data).slice(0, 400)}`);
}

async function appliedMigrations(ref) {
  const rows = await query(ref, `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`);
  return new Set(rows.map((r) => r.version));
}

async function migrationFiles() {
  const names = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql"));
  const files = names
    .map((f) => ({ file: f, version: f.split("_")[0], name: f.slice(0, -4) }))
    .filter((f) => /^\d{14}$/.test(f.version))
    .sort((a, b) => a.version.localeCompare(b.version));
  return files;
}

async function publicTables(ref) {
  const rows = await query(
    ref,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'
     ORDER BY table_name`
  );
  return rows.map((r) => r.table_name);
}

async function exactPk(ref, table) {
  const rows = await query(
    ref,
    `SELECT kcu.column_name AS col
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
     WHERE tc.table_schema='public' AND tc.table_name='${table.replace(/'/g, "''")}'
       AND tc.constraint_type='PRIMARY KEY'`
  );
  return rows.map((r) => r.col);
}

async function rowCount(ref, table) {
  const rows = await query(ref, `SELECT count(*)::int AS n FROM public."${table.replace(/"/g, '""')}"`);
  return rows[0]?.n ?? -1;
}

// ---------- report ----------
async function doReport() {
  report.mode = "report";
  const [oldApplied, curApplied, files, oldTables, curTables] = await Promise.all([
    appliedMigrations(OLD_REF),
    appliedMigrations(CUR_REF),
    migrationFiles(),
    publicTables(OLD_REF),
    publicTables(CUR_REF),
  ]);

  const pending = files.filter((f) => !curApplied.has(f.version));
  const pendingNonArchie = pending.filter((f) => !ARCHIE_RE.test(f.name));
  const pendingArchie = pending.filter((f) => ARCHIE_RE.test(f.name));

  logStep("migrations", {
    repoFiles: files.length,
    oldApplied: oldApplied.size,
    curApplied: curApplied.size,
    pendingForCurrent: pending.length,
    pendingNonArchie: pendingNonArchie.length,
    pendingArchieSkipped: pendingArchie.length,
  });
  console.log("Pending (non-ARCHIE):");
  for (const f of pendingNonArchie) console.log(`  ${f.file}`);

  const oldOnly = oldTables.filter((t) => !ARCHIE_RE.test(t) && !curTables.includes(t));
  const archieTablesOld = oldTables.filter((t) => ARCHIE_RE.test(t)).length;
  const archieTablesCur = curTables.filter((t) => ARCHIE_RE.test(t)).length;
  logStep("tables", {
    oldTables: oldTables.length,
    curTables: curTables.length,
    oldOnlyNonArchie: oldOnly,
    archieTablesOld,
    archieTablesCur,
  });

  // row counts for shared non-ARCHIE tables
  const shared = oldTables.filter((t) => curTables.includes(t) && !ARCHIE_RE.test(t));
  const counts = [];
  for (const t of shared) {
    const [o, c] = [await rowCount(OLD_REF, t), await rowCount(CUR_REF, t)];
    counts.push({ table: t, old: o, cur: c });
    if (o !== c) console.log(`  [diff] ${t}: old=${o} cur=${c}`);
  }
  report.tableCounts = counts;
  const oldRicher = counts.filter((c) => c.old > c.cur);
  logStep("counts", {
    compared: counts.length,
    differing: counts.filter((c) => c.old !== c.cur).length,
    oldRicherTables: oldRicher.map((c) => `${c.table}(${c.cur}->${c.old})`).slice(0, 60),
  });
}

// ---------- apply-migrations ----------
async function doApplyMigrations() {
  report.mode = "apply-migrations";
  const [curApplied, files] = await Promise.all([appliedMigrations(CUR_REF), migrationFiles()]);
  const pending = files
    .filter((f) => !curApplied.has(f.version) && !ARCHIE_RE.test(f.name))
    .sort((a, b) => a.version.localeCompare(b.version));
  logStep("plan", { toApply: pending.length, skippedArchie: files.filter((f) => !curApplied.has(f.version) && ARCHIE_RE.test(f.name)).length });

  const migColumns = await query(
    CUR_REF,
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='supabase_migrations' AND table_name='schema_migrations'`
  );
  const hasName = migColumns.some((c) => c.column_name === "name");
  const hasStatements = migColumns.some((c) => c.column_name === "statements");

  let applied = 0;
  const failures = [];
  for (const f of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, f.file), "utf8");
    process.stdout.write(`applying ${f.file} ... `);
    try {
      await query(CUR_REF, sql);
      await query(
        CUR_REF,
        `INSERT INTO supabase_migrations.schema_migrations (version${hasName ? ", name" : ""}${hasStatements ? ", statements" : ""})
         VALUES ('${f.version}'${hasName ? `, '${f.name.replace(/'/g, "''")}'` : ""}${hasStatements ? `, ARRAY[]::text[]` : ""})
         ON CONFLICT (version) DO NOTHING`
      );
      applied++;
      console.log("ok");
    } catch (e) {
      console.log("FAILED");
      failures.push({ file: f.file, error: (e.detail || e.message).slice(0, 500) });
      report.errors.push({ stage: "migration", ...failures[failures.length - 1] });
      console.error(`  -> ${e.message}`);
      break; // stop at first failure to keep the chain inspectable
    }
  }
  logStep("apply", { applied, failed: failures.length, firstFailure: failures[0] ?? null });
}

// ---------- copy-data ----------
async function doCopyData() {
  report.mode = "copy-data";
  const [oldTables, curTables] = await Promise.all([publicTables(OLD_REF), publicTables(CUR_REF)]);
  const targets = oldTables.filter((t) => curTables.includes(t) && !ARCHIE_RE.test(t));
  logStep("plan", { candidateTables: targets.length });

  const results = [];
  for (const t of targets) {
    const [o, c] = [await rowCount(OLD_REF, t), await rowCount(CUR_REF, t)];
    if (o === 0 || o <= c) continue; // nothing to bring over
    const pk = await exactPk(CUR_REF, t);
    if (!pk.length) {
      results.push({ table: t, skipped: "no primary key", old: o, cur: c });
      continue;
    }
    try {
      // fetch rows missing on current (by PK), in batches
      let copied = 0;
      const batchSize = 200;
      const orderBy = pk.length ? `ORDER BY ${pk.map(qi).join(",")}` : "ORDER BY 1";
      let offset = 0;
      while (true) {
        const rows = await query(
          OLD_REF,
          `SELECT * FROM public."${t.replace(/"/g, '""')}" ${orderBy} LIMIT ${batchSize} OFFSET ${offset}`
        );
        if (!rows.length) break;
        offset += rows.length;
        if (pk.length === 1) {
          const missing = await query(
            CUR_REF,
            `SELECT count(*)::int AS n FROM public."${t.replace(/"/g, '""')}"
             WHERE "${pk[0]}" IN (${rows.map((r) => sqlLit(r[pk[0]])).join(",")})`
          );
          if (missing[0].n >= rows.length) continue;
        }
        const payload = JSON.stringify(rows);
        const cols = Object.keys(rows[0]);
        const res = await query(
          CUR_REF,
          `INSERT INTO public."${t.replace(/"/g, '""')}" (${cols.map(qi).join(",")})
           SELECT ${cols.map(qi).join(",")}
           FROM jsonb_populate_recordset(null::public."${t.replace(/"/g, '""')}", $json$${payload}$json$)
           ON CONFLICT (${pk.map(qi).join(",")}) DO NOTHING`
        );
        copied += res.length === 0 ? 0 : 0; // no rowcount from endpoint; verified by counts below
      }
      const after = await rowCount(CUR_REF, t);
      results.push({ table: t, old: o, before: c, after, added: Math.max(0, after - c) });
      console.log(`[copy] ${t}: ${c} -> ${after} (old had ${o})`);
    } catch (e) {
      results.push({ table: t, error: (e.detail || e.message).slice(0, 300), old: o, cur: c });
      console.log(`[skip] ${t}: ${e.message.slice(0, 160)}`);
    }
  }
  report.copies = results;
  const ok = results.filter((r) => !r.error && !r.skipped);
  logStep("copy", {
    tablesWithGaps: results.length,
    copiedTables: ok.length,
    problemTables: results.filter((r) => r.error || r.skipped).map((r) => r.table + ":" + (r.error || r.skipped)).slice(0, 40),
  });
}

function qi(c) { return `"${c.replace(/"/g, '""')}"`; }
function sqlLit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ---------- main ----------
const mode = process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1] ?? "report";
try {
  if (mode === "report") await doReport();
  else if (mode === "apply-migrations") await doApplyMigrations();
  else if (mode === "copy-data") await doCopyData();
  else { console.error(`unknown mode ${mode}`); process.exit(1); }
} catch (e) {
  report.fatal = e.message;
  console.error(`FATAL: ${e.message}`);
}

report.finishedAt = new Date().toISOString();
writeFileSync("db-restore-report.json", JSON.stringify(report, null, 2));
const summary = [
  `## DB consolidation — ${mode}`,
  `- source (old): \`${OLD_REF}\``,
  `- target (current): \`${CUR_REF}\``,
  ...report.steps.map((s) => `- **${s.name}**: <pre>${JSON.stringify(s, null, 1).slice(0, 3000)}</pre>`),
  report.errors?.length ? `\n### errors\n${report.errors.map((e) => `- ${e.stage} ${e.file ?? ""}: ${String(e.error).slice(0, 200)}`).join("\n")}` : "",
].join("\n");
writeFileSync("db-restore-summary.md", summary);
console.log("done.");
