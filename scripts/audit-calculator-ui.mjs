#!/usr/bin/env node
/**
 * UI completeness audit for every calculator and estimator page.
 *
 * Checks the things a tool page has to get right regardless of its maths:
 * a header, no more ad slots than the rule allows, share and PDF, a reset,
 * the method explanation, an estimate disclaimer, input labelling, and whether
 * the page offers feet without forcing metric first.
 *
 * Run: node scripts/audit-calculator-ui.mjs [--write]
 * With --write it refreshes docs/calculator-ui-audit.md.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PAGES = "src/pages";
const TOOL = /(Calculator|Estimator|Takeoff|Boq|BOQ|Count)/i;

const files = readdirSync(PAGES)
  .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
  .filter((f) => TOOL.test(f));

/**
 * Several calculators are thin wrappers: they render a shared shell and pass a
 * title, so their own file contains none of the chrome. Checking only the page
 * file reported those shells' share button and disclaimer as missing. Resolve
 * one level of delegation so a feature counts wherever it actually renders.
 */
const SHELLS = ["ConfigurableFinishCalculator", "SpecialtyCalculatorShell"];
const shellCache = new Map();
function shellProvides(name) {
  if (shellCache.has(name)) return shellCache.get(name);
  let source = "";
  for (const dir of [PAGES, "src/components/calculators"]) {
    try {
      source = readFileSync(join(dir, name + ".tsx"), "utf8");
      break;
    } catch {
      /* try the next location */
    }
  }
  shellCache.set(name, source);
  return source;
}

const rows = files.map((file) => {
  const own = readFileSync(join(PAGES, file), "utf8");
  const delegated = SHELLS.filter((n) => own.includes("<" + n));
  const s = own + delegated.map(shellProvides).join("\n");
  const adSlots = (s.match(/<AdSlot/g) ?? []).length;
  const inputs = (s.match(/<input\b/g) ?? []).length;
  // A field wrapper carrying a label prop counts as a label: most calculators
  // use <Field label="Length">, which renders its own <label> element, so a
  // naive count of <label> tags reports false positives.
  const labels = (s.match(/<label\b|<Label\b|label=\{|label="/g) ?? []).length;
  const aria = (s.match(/aria-label=/g) ?? []).length;
  const feet = /\bft\b|feet|Feet|FT/.test(s);
  // A redirect stub renders no UI at all, and a hub is an index of tools with
  // no inputs of its own. Neither owes a disclaimer or a share button, so they
  // are classified instead of being counted as failures.
  const redirect = own.trim().length < 1200 && /<Navigate/.test(own);
  const hub =
    /Hub\.tsx$/.test(file) ||
    (!/<input\b/.test(own) && !/Field\b/.test(own) && !/type="file"/.test(own));

  return {
    kind: redirect ? "redirect" : hub ? "index" : "calculator",
    file,
    // Thin wrappers delegate to a shared shell that renders the header.
    header: /PageHeader|SpecialtyCalculatorShell|ConfigurableFinishCalculator/.test(s),
    ads: adSlots,
    adRule: adSlots <= 3,
    share:
      /ShareEstimateButton|QuoteShareButton|shareEstimateOnWhatsApp|downloadEstimatePdf/.test(
        s,
      ),
    reset: /CalculatorResetButton|setState\(|Reset/.test(s),
    method: /HowCalculatedSection|HowCalculated/.test(s),
    disclaimer: /EstimateDisclaimer|estimateOnly|Disclaimer/i.test(s),
    unlabelledInputs: Math.max(0, inputs - labels - aria),
    feet,
    // Only unprefixed fixed pixel widths are a phone overflow risk; a
    // grid-cols-4 behind an sm: breakpoint is fine.
    // min-w on a table is the standard scrollable table pattern, so only a
    // bare fixed width on a block is a real overflow risk.
    wideFixed: /(?<![:a-z-])w-\[\d{3,}px\]/.test(s),
  };
});

const real = rows.filter((r) => r.kind === "calculator");
const fails = (pred) => real.filter((r) => !pred(r));
const share = fails((r) => r.share);
const method = fails((r) => r.method);
const disclaimer = fails((r) => r.disclaimer);
const header = fails((r) => r.header);
const ads = real.filter((r) => !r.adRule);
const labelling = real.filter((r) => r.unlabelledInputs > 0);
const feet = fails((r) => r.feet);
const wide = real.filter((r) => r.wideFixed);

console.log(`pages: ${rows.length} (${real.length} calculators, ${rows.length - real.length} hub or redirect)`);
console.log(`no header:        ${header.length}`);
console.log(
  `over 3 ad slots:  ${ads.length} ${ads.map((r) => r.file).join(", ")}`,
);
console.log(`no share/PDF:     ${share.length}`);
console.log(`no method note:   ${method.length}`);
console.log(`no disclaimer:    ${disclaimer.length}`);
console.log(`inputs possibly unlabelled: ${labelling.length}`);
console.log(`no feet reference (check if length based): ${feet.length}`);
console.log(`fixed wide layout:${wide.length}`);

if (process.argv.includes("--verbose")) {
  const show = (label, list) =>
    console.log(`${label}: ${list.map((r) => r.file).join(", ") || "none"}`);
  show("missing share", share);
  show("missing method", method);
  show("missing disclaimer", disclaimer);
  show("over ad slots", ads);
}

if (process.argv.includes("--write")) {
  const line = (r) =>
    `| \`${r.file}\` | ${r.kind} | ${r.header ? "yes" : "**no**"} | ${r.ads} | ${r.share ? "yes" : "**no**"} | ${r.method ? "yes" : "**no**"} | ${r.disclaimer ? "yes" : "**no**"} | ${r.unlabelledInputs || ""} |`;
  const body = [
    "---",
    "title: Calculator UI audit",
    "summary: Per page UI completeness checks for every calculator and estimator, generated by scripts/audit-calculator-ui.mjs. Regenerate after changes instead of editing.",
    "---",
    "",
    "# Calculator UI audit",
    "",
    "Generated. Regenerate with `node scripts/audit-calculator-ui.mjs --write`.",
    "",
    `Pages checked: ${rows.length}`,
    "",
    "## Totals",
    "",
    `- Missing header: ${header.length}`,
    `- More than 3 ad slots: ${ads.length}`,
    `- Missing share or PDF: ${share.length}`,
    `- Missing method explanation: ${method.length}`,
    `- Missing disclaimer: ${disclaimer.length}`,
    `- Inputs that may lack a label: ${labelling.length} pages`,
    `- No feet reference at all (only a defect on length based tools): ${feet.length}`,
    `- Fixed wide layout that can overflow a phone: ${wide.length}`,
    "",
    "## Per page",
    "",
    "| Page | Kind | Header | Ads | Share/PDF | Method | Disclaimer | Unlabelled inputs |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.sort((a, b) => a.file.localeCompare(b.file)).map(line),
    "",
  ].join("\n");
  writeFileSync("docs/calculator-ui-audit.md", body);
  console.log("\nwrote docs/calculator-ui-audit.md");
}
