#!/usr/bin/env node
/**
 * Responsiveness audit.
 *
 * Each rule names the fault it prevents and reports the exact lines. Rules
 * marked strict fail the run, so a regression cannot be merged quietly; the
 * advisory rules are the measured backlog and their count should only fall.
 *
 * Usage: node scripts/audit/responsiveness.mjs [--max=20]
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const max = Number((process.argv.find((a) => a.startsWith("--max=")) || "--max=8").split("=")[1]);
const files = execSync("git ls-files 'src/**/*.tsx' 'src/**/*.css'", { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);

const rules = [
  {
    name: "Table that cannot scroll sideways",
    strict: true,
    fix: "wrap the table in <div className=\"overflow-x-auto\">",
    run(f, lines) {
      const out = [];
      let inTemplate = false;
      lines.forEach((line, i) => {
        const ticks = (line.match(/`/g) || []).length;
        const wasTemplate = inTemplate;
        if (ticks % 2 === 1) inTemplate = !inTemplate;
        if (!line.includes("<table")) return;
        if (wasTemplate || line.includes("`")) return;         // print or email markup
        const context = lines.slice(Math.max(0, i - 14), i).join("\n");
        if (/overflow-x-auto|overflow-auto/.test(context)) return;
        if (/sr-only/.test(line)) return;                      // off-screen fallback table
        if (/hidden[^"]*\bmd:block\b|hidden[^"]*\blg:block\b/.test(context)) return; // desktop-only
        out.push(`${f}:${i + 1}`);
      });
      return out;
    },
  },
  {
    name: "Checkbox or radio glyph stretched to a touch target",
    strict: true,
    fix: "hold the 44px target on the label row, not on the replaced element",
    run(f, lines) {
      if (!f.endsWith(".css")) return [];
      const src = lines.join("\n");
      return /input\[type="checkbox"\][^}]*min-(width|height):\s*max\(2\.75rem/.test(src) ? [f] : [];
    },
  },
  {
    name: "Fixed width 480px or wider outside a scroll container",
    strict: false,
    fix: "use w-full with max-w, or place it inside overflow-x-auto",
    run(f, lines) {
      if (!f.endsWith(".tsx")) return [];
      const out = [];
      lines.forEach((line, i) => {
        const m = /(?:^|\s)(?:w|min-w)-\[(\d{3,})px\]/.exec(line);
        if (!m || Number(m[1]) < 480) return;
        if (/pointer-events-none/.test(line)) return;           // decorative glow, clipped by parent
        if (/absolute/.test(line) && /-translate/.test(line)) return; // full-bleed glow, section clips it
        const context = lines.slice(Math.max(0, i - 14), i).join("\n");
        if (/overflow-x-auto|overflow-auto/.test(context)) return; // already scrolls
        out.push(`${f}:${i + 1} ${m[0].trim()}`);
      });
      return out;
    },
  },
  {
    name: "Multi-column grid with no phone fallback",
    strict: false,
    fix: "start at grid-cols-2 and move the wide count to sm:",
    run(f, lines) {
      if (!f.endsWith(".tsx")) return [];
      const out = [];
      lines.forEach((line, i) => {
        if (!/className="/.test(line)) return;
        for (const m of line.matchAll(/(?:^|\s)grid-cols-([3-9])\b/g)) {
          if (/(sm|md|lg|xl):grid-cols-[3-9]/.test(line)) continue;
          out.push(`${f}:${i + 1} grid-cols-${m[1]}`);
        }
      });
      return out;
    },
  },
];

let strict = 0;
for (const rule of rules) {
  const offenders = files.flatMap((f) => rule.run(f, readFileSync(f, "utf8").split("\n")));
  const tag = offenders.length === 0 ? "ok  " : rule.strict ? "FAIL" : "note";
  if (rule.strict) strict += offenders.length;
  console.log(`${tag}  ${rule.name}: ${offenders.length}`);
  offenders.slice(0, max).forEach((o) => console.log(`        ${o}`));
  if (offenders.length > max) console.log(`        ... ${offenders.length - max} more`);
  if (!rule.strict && offenders.length) console.log(`        fix: ${rule.fix}`);
}
console.log(`\n${strict === 0 ? "No blocking layout fault." : strict + " blocking layout fault(s)."}`);
process.exit(strict === 0 ? 0 : 1);
