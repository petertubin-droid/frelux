#!/usr/bin/env node
/**
 * Wraps visible text in the translation layer.
 *
 * The dictionary only helps when a string passes through t("..."). This tool
 * converts static JSX text and the usual display attributes into t() calls,
 * and makes sure the component actually has the hook.
 *
 * It is deliberately conservative: it skips anything containing an expression,
 * a tag, or an entity, and it refuses to touch a file whose component it cannot
 * locate with confidence. Run --check to preview without writing.
 *
 * Usage:
 *   node scripts/i18n-wrap.mjs --files=src/pages/X.tsx,src/pages/Y.tsx
 *   node scripts/i18n-wrap.mjs --dir=src/pages/home --check
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const HOOK_IMPORT = 'import { useLanguage } from "@/lib/i18n";';
const TX_IMPORT = 'import { tx } from "@/lib/i18n";';

// --mode=tx wraps text in the module-level translator instead of adding a
// hook. It is the fallback for files whose component boundaries the tool
// cannot locate reliably, and it never goes out of scope.
const TX_MODE = args.mode === "tx";

const files = args.files
  ? String(args.files).split(",").map((f) => f.trim()).filter(Boolean)
  : execSync(
      `find ${args.dir || "src"} -name "*.tsx" -not -name "*.test.tsx"`,
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);

// Text that is safe to wrap: starts with a capital or a digit, no JSX
// expressions, no markup, no template syntax, no trailing/leading whitespace
// surprises, short enough to be a label rather than prose.
// The opening bracket must not be an arrow's "=>" or a generic's "<T>":
// a type such as `=> {Promise<void>}` reads like JSX text to a regex.
const TEXT_NODE = /(?<![=>])(?<![A-Za-z])>(\s*)([A-Z][A-Za-z0-9 ,.'&()/+-]{1,80}?)(\s*)</g;
const ATTRS = /(placeholder|aria-label|title|alt)="([A-Z][^"{<>{}$]{1,80})"/g;

const INTERACTIVE = /^(Save|Cancel|Submit|Delete|Next|Back|Close|Search)$/;

// A file that already binds `t` (a template row, a timer, a tuple) cannot take
// the hook without a collision. Those are wrapped by hand instead.
const RESERVES_T = /(\bconst\s+t\b|\blet\s+t\b|\bt\s*=>|\(\s*t\s*[,)])/;

function wrapTextNodes(source, keys, callee) {
  return source.replace(TEXT_NODE, (full, lead, text, trail) => {
    const value = text.trim();
    if (!value || value.length < 2) return full;
    if (/[{}<>;=$`\\]/.test(value)) return full;
    if (/^(https?:|\/|#)/.test(value)) return full;
    if (/\.(tsx|ts|js|png|jpg|svg|css)$/.test(value)) return full;
    keys.add(value);
    return `>${lead}{${callee}("${value}")}${trail}<`;
  });
}

function wrapAttributes(source, keys, callee) {
  return source.replace(ATTRS, (full, attr, value) => {
    const trimmed = value.trim();
    if (!trimmed || /[{}<>$]/.test(trimmed)) return full;
    keys.add(trimmed);
    return `${attr}={${callee}("${trimmed}")}`;
  });
}

// Anchored at column 0: only top-level component declarations are real
// insertion points. Without the anchor the hook landed inside a prop type
// ("user: {") and produced invalid syntax.
const COMPONENT_PATTERNS = [
  /^export\s+default\s+function\s+[A-Z]\w*\s*\([^)]*\)[^{\n]*\{/gm,
  /^export\s+function\s+[A-Z]\w*\s*\([^)]*\)[^{\n]*\{/gm,
  /^const\s+[A-Z]\w*\s*(?::\s*React\.FC[^=]*)?=\s*\([^)]*\)\s*(?::\s*[^=\n]+)?=>\s*\{/gm,
  /^function\s+[A-Z]\w*\s*\([^)]*\)[^{\n]*\{/gm,
];

/**
 * Every component that ended up containing a t() call needs its own hook.
 * Inserting one hook at the top of the file only fixes the first component,
 * which is exactly what broke on the 3,000-line estimator page.
 */
function ensureHooks(source, callee) {
  let out = source;

  if (!out.includes(HOOK_IMPORT)) {
    const imports = [...out.matchAll(/^import .*;$/gm)];
    if (imports.length === 0) return { ok: false, reason: "no imports" };
    const last = imports[imports.length - 1];
    const at = last.index + last[0].length;
    out = `${out.slice(0, at)}\n${HOOK_IMPORT}${out.slice(at)}`;
  }

  const starts = [];
  for (const pattern of COMPONENT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(out)) !== null) {
      starts.push({ at: match.index + match[0].length, name: match[0].slice(0, 60) });
    }
  }
  if (starts.length === 0) return { ok: false, reason: "component not located" };
  starts.sort((a, b) => a.at - b.at);

  // Walk backwards so inserted text never shifts an earlier index.
  for (let i = starts.length - 1; i >= 0; i -= 1) {
    const bodyStart = starts[i].at;
    const bodyEnd = i + 1 < starts.length ? starts[i + 1].at : out.length;
    const body = out.slice(bodyStart, bodyEnd);
    if (!body.includes(`${callee}("`)) continue;
    const opening = out.slice(bodyStart - 400, bodyStart);
    if (/\bconst\s*\{[^}]*\}\s*=\s*useLanguage\(\)/.test(opening)) continue;
    if (/\bconst\s*\{[^}]*\}\s*=\s*useLanguage\(\)/.test(body.slice(0, 400))) continue;
    const hook = callee === "t" ? "const { t } = useLanguage();" : `const { t: ${callee} } = useLanguage();`;
    out = `${out.slice(0, bodyStart)}\n  ${hook}${out.slice(bodyStart)}`;
  }
  return { ok: true, source: out };
}

let touchedFiles = 0;
let touchedNodes = 0;
const report = [];

for (const file of files) {
  const original = readFileSync(file, "utf8");
  // If the file already binds `t`, translate through an alias instead of
  // skipping it: the alias collides with nothing and the call sites stay clear.
  const callee = TX_MODE ? "tx" : RESERVES_T.test(original)
    ? (/(\bconst\s+tr\b|\btr\s*=>|\(\s*tr\s*[,)])/.test(original) ? "tf" : "tr")
    : "t";
  if (original.includes("useLanguage") && !TEXT_NODE.test(original)) {
    TEXT_NODE.lastIndex = 0;
    continue;
  }
  TEXT_NODE.lastIndex = 0;

  const keys = new Set();
  let next = wrapTextNodes(original, keys, callee);
  next = wrapAttributes(next, keys, callee);
  if (keys.size === 0) continue;

  if (TX_MODE) {
    if (!next.includes(TX_IMPORT)) {
      const imports = [...next.matchAll(/^import .*;$/gm)];
      const last = imports[imports.length - 1];
      const at = last.index + last[0].length;
      next = `${next.slice(0, at)}\n${TX_IMPORT}${next.slice(at)}`;
    }
    if (args.check) {
      report.push(`would wrap ${keys.size} strings (tx) in ${file}`);
      continue;
    }
    writeFileSync(file, next);
    touchedFiles += 1;
    touchedNodes += keys.size;
    report.push(`${keys.size} strings (tx): ${file}`);
    continue;
  }

  const hooked = ensureHooks(next, callee);
  if (!hooked.ok) {
    report.push(`skip ${file}: ${hooked.reason}`);
    continue;
  }
  next = hooked.source;

  if (args.check) {
    report.push(`would wrap ${keys.size} strings in ${file}`);
    continue;
  }

  writeFileSync(file, next);
  touchedFiles += 1;
  touchedNodes += keys.size;
  report.push(`${keys.size} strings: ${file}`);
}

console.log(report.join("\n"));
if (!args.check) {
  console.log(`\nwrapped ${touchedNodes} strings across ${touchedFiles} files`);
}
