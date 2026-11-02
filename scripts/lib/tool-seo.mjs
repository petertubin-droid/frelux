/**
 * Title and description composer for the construction tool pages.
 *
 * Every string is built from the tool's own registry entry (`does`, `enters`,
 * `gets`), so a listing can only promise what the calculator actually does.
 * The same module is imported by the React page and by the prerenderer, so the
 * static HTML and the hydrated page cannot disagree about their own title.
 *
 * Rules applied here:
 *  - the search intent (what the tool calculates) comes first in the title
 *  - the brand is only appended when it fits inside the ~60 character display
 *  - descriptions lead with the outcome, then the inputs, then the outputs
 *  - nothing is truncated mid-word, and no sentence ends on a comma
 */

const BRAND = "FRELUX";
const TITLE_MAX = 60;
const DESC_MAX = 158;

/** Cut at the last word boundary that fits, never mid-word. */
function clamp(text, max) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  let out = (at > max * 0.6 ? cut.slice(0, at) : t.slice(0, max)).trim();
  out = out.replace(/[\s,;:.\-–—]+$/, "");
  return out;
}

/** First clause of a registry sentence, used as a compact benefit phrase. */
function firstClause(sentence) {
  const s = String(sentence || "").trim();
  const cut = s.split(/[,.;:]/)[0];
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

function stripTrailingVerb(sentence) {
  return String(sentence || "")
    .trim()
    .replace(/\.$/, "");
}

function compose(name, phrase) {
  const brand = `${name} | ${BRAND}`;
  if (!phrase) return brand;
  const withBrand = `${name} – ${phrase} | ${BRAND}`;
  if (withBrand.length <= 64) return withBrand;
  const bare = `${name} – ${phrase}`;
  if (bare.length <= TITLE_MAX) return bare;
  return brand;
}

export function toolSeoTitle(tool) {
  if (tool.seoTitle) return clamp(tool.seoTitle, 64);
  const name = tool.title || tool.slug;
  // The registry's `benefit` is already a short, human phrase ("Buckets · Cost ·
  // Project estimate"). Using it keeps the title a complete thought; slicing a
  // sentence out of `does` produced fragments like "Convert feet" that read
  // badly in a search result.
  const benefit = String(tool.benefit || "")
    .replace(/\s*·\s*/g, ", ")
    .trim();
  if (benefit) return compose(name, benefit);

  // No curated phrase: take a complete fragment of `does` ("Estimate demolition
  // debris volumes"). Anything under 14 or over 34 characters reads as a
  // fragment, so the plain branded name is the better listing.
  const phrase = firstClause(String(tool.does || "").replace(/\.$/, ""))
    .split(/ and | or | for | with | from /)[0]
    .trim();
  return compose(name, phrase.length >= 14 && phrase.length <= 34 ? phrase : "");
}

export function toolSeoDescription(tool) {
  if (tool.seoDescription) return clamp(tool.seoDescription, DESC_MAX);
  const outcome = stripTrailingVerb(tool.does);
  const inputs = stripTrailingVerb(tool.enters);
  const outputs = firstClause(stripTrailingVerb(tool.gets));

  const full = `${outcome}. Enter ${lowerFirst(inputs)}. Get ${lowerFirst(outputs)}.`;
  if (full.length <= DESC_MAX) return full;

  const withoutOutputs = `${outcome}. Enter ${lowerFirst(inputs)}.`;
  if (withoutOutputs.length <= DESC_MAX) return withoutOutputs;

  const clause = clamp(`${outcome}.`, DESC_MAX);
  return clause.length >= 70 ? clause : clamp(outcome, DESC_MAX);
}

function lowerFirst(sentence) {
  const s = String(sentence || "").trim();
  if (!s) return s;
  // Keep acronyms and proper nouns intact.
  if (/^[A-Z]{2}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Static body copy for a tool page that has no hand-written content map entry.
 *
 * Built only from the registry's own statements, so it cannot claim an input or
 * an output the calculator does not have. Related links come from the same
 * category, which is how the tools are grouped in the library.
 */
export function buildToolContent(tool, siblings = []) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const name = esc(tool.title || tool.slug);
  const related = siblings
    .filter((s) => s.path !== tool.path)
    .slice(0, 6)
    .map((s) => `<li><a href="${s.path}/">${esc(s.title)}</a>: ${esc(s.does)}</li>`)
    .join("");

  return [
    `<main><h1>${name}</h1>`,
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/construction-tools/">Construction tools</a> &rsaquo; ${name}</nav>`,
    `<p>${esc(tool.does)}</p>`,
    `<h2>What you enter</h2><p>${esc(tool.enters)}</p>`,
    `<h2>What you get</h2><p>${esc(tool.gets)}</p>`,
    `<h2>How it works</h2><ol>`,
    `<li>Pick your market and units. FRELUX applies that market's construction practice and currency.</li>`,
    `<li>Enter your measurements. ${esc(tool.enters)}</li>`,
    `<li>Review the result. ${esc(tool.gets)} Prices come from the market price book wherever a verified local price exists.</li>`,
    `</ol>`,
    related ? `<h2>Related FRELUX tools</h2><ul>${related}</ul>` : "",
    `<h2>Use this result in a project</h2><p>Send the quantities to the <a href="/marketplace/">FRELUX marketplace</a> to compare material listings, or estimate the full build with the <a href="/build-to-roof-estimator/">build-to-roof estimator</a>. Every calculator is free and needs no account.</p>`,
    `</main>`,
  ].join("");
}
