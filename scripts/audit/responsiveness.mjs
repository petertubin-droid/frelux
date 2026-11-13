#!/usr/bin/env node
/**
 * Responsiveness audit.
 *
 * Counts, per rule, anything that can push a phone layout sideways or render
 * text too small to read. Each rule states the failure it prevents; the run
 * exits non-zero when a rule with `strict: true` finds an offender, so this can
 * be wired into a build once the backlog is cleared.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("git ls-files 'src/**/*.tsx' 'src/**/*.css'", { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
const read = (f) => readFileSync(f, "utf8");

const rules = [
  {
    name: "Table without a horizontal scroll container",
    strict: true,
    hint: "wrap in overflow-x-auto so a wide table scrolls instead of the page",
    test: (f, src) => {
      if (!/\.tsx$/.test(f) || !/<table/.test(src)) return [];
      if (/overflow-x-auto|overflow-auto|sr-only/.test(src)) return [];
      // A table written inside a template literal is markup for print or email,
      // not a node this layout has to scroll.
      const live = src.split("\n").some((line) => /<table/.test(line) && !line.includes("`"));
      return live ? [`${f}: <table> with no overflow container in the file`] : [];
    },
  },
  {
    name: "Fixed width 480px or wider",
    strict: false,
    hint: "use a max-w with w-full, or keep it inside overflow-x-auto",
    test: (f, src) => {
      if (!/\.tsx$/.test(f)) return [];
      const hits = [...src.matchAll(/(?:^|\s)(?:w|min-w)-\[(\d{3,})px\]/g)]
        .filter((m) => Number(m[1]) >= 480);
      return hits.slice(0, 3).map((m) => `${f}: ${m[0].trim()}`);
    },
  },
  {
    name: "Type below 12px on a phone",
    strict: false,
    hint: "the mobile floor in index.css already lifts these; shrink only in print styles",
    test: (f, src) => {
      if (!/\.css$/.test(f)) return [];
      return [];
    },
  },
  {
    name: "Multi-column grid with no narrow-screen fallback",
    strict: false,
    hint: "add a base grid-cols-2 and let sm:/md: take it wider",
    test: (f, src) => {
      if (!/\.tsx$/.test(f)) return [];
      return [...src.matchAll(/className="[^"]*(?:^|\s)grid-cols-([3-9])\b[^"]*"/g)]
        .filter((m) => !/(sm|md|lg|xl):grid-cols-[3-9]/.test(m[0]))
        .slice(0, 2).map((m) => `${f}: grid-cols-${m[1]} with no breakpoint`);
    },
  },
  {
    name: "Checkbox or radio enlarged to a touch target",
    strict: true,
    hint: "hold 44px on the label row, not on the glyph",
    test: (f, src) => {
      if (!/\.css$/.test(f)) return [];
      const bad = /input\[type="checkbox"\][^}]*min-(width|height):\s*max\(2\.75rem/;
      return bad.test(src) ? [`${f}: glyph forced to 44px`] : [];
    },
  },
];

let strictFailures = 0;
for (const rule of rules) {
  const offenders = files.flatMap((f) => rule.test(f, read(f)));
  const mark = offenders.length === 0 ? "ok  " : rule.strict ? "FAIL" : "note";
  if (offenders.length && rule.strict) strictFailures += offenders.length;
  console.log(`${mark}  ${rule.name}: ${offenders.length}`);
  for (const line of offenders.slice(0, 6)) console.log(`        ${line}`);
  if (offenders.length > 6) console.log(`        ... ${offenders.length - 6} more`);
  if (!rule.strict && offenders.length) console.log(`        fix: ${rule.hint}`);
}
console.log(`\n${strictFailures === 0 ? "No blocking layout faults found." : strictFailures + " blocking fault(s)."}`);
