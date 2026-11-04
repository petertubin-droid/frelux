// Static bodies for the tool directory pages (/construction-tools and the seven
// /tools/<category> pages).
//
// These pages used to ship one sentence each: the category blurb and a link
// back to the directory. The tools were only visible after JavaScript ran, so a
// crawler saw a page that named no tool. The copy below comes from the same
// registry the React page renders (`does`, `enters`, `gets`, `to`), so the
// static body cannot promise anything the calculator does not do.

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const CATEGORY_LABELS = {
  finishes: "Materials & Finishes",
  structure: "Building Structure",
  services: "Building Services",
  components: "Building Components",
  project: "Project & Cost",
  ai: "AI Assistants",
  pro: "Pro & Field",
};

const CATEGORY_PATHS = {
  finishes: "/tools/finishes",
  structure: "/tools/structure",
  services: "/tools/services",
  components: "/tools/components",
  project: "/tools/project",
  ai: "/tools/ai",
  pro: "/tools/pro",
};

const CATEGORY_BLURBS = {
  finishes:
    "Paint, screeding, tiling, flooring, waterproofing and ceiling finishes, each computed from measured areas rather than a flat rate per room.",
  structure:
    "Blockwork, concrete, foundations, reinforcement and the full build-to-roof scope, using the material quantities the design actually implies.",
  services:
    "Electrical, plumbing, solar, backup power and indoor comfort, sized from load and run lengths rather than a rule of thumb.",
  components:
    "Doors and windows as configurable components, with the frame, leaf and finishing quantities that follow from each opening.",
  project:
    "Budgets, bills of quantities, labour, timelines and long-term cost planning, tied to the same quantities the calculators produce.",
  ai: "Photo, chat and vision assistants that read a drawing, a plan or a site photo, then hand the extracted measurements to the deterministic engines.",
  pro: "Tools for professionals working on site with plans, projects and field data, including unit conversion and plan takeoff.",
};

/** One tool, described exactly as the card on the page describes it. */
function toolItem(tool) {
  const entries = [];
  if (tool.enters)
    entries.push(`<dt>You enter</dt><dd>${escapeHtml(tool.enters)}</dd>`);
  if (tool.gets)
    entries.push(`<dt>You get</dt><dd>${escapeHtml(tool.gets)}</dd>`);
  return (
    `<li>` +
    `<h3><a href="${escapeHtml(tool.path)}">${escapeHtml(tool.title)}</a></h3>` +
    (tool.does ? `<p>${escapeHtml(tool.does)}</p>` : "") +
    (entries.length ? `<dl>${entries.join("")}</dl>` : "") +
    `</li>`
  );
}

/**
 * Body HTML for each tool directory page, keyed by route path.
 * `registry` is the parsed CONSTRUCTION_TOOLS array.
 */
export function buildToolsDirectoryContent(registry) {
  const tools = Array.isArray(registry)
    ? registry.filter((t) => t && t.path && t.title)
    : [];
  if (tools.length === 0) return {};

  const byCategory = new Map();
  for (const tool of tools) {
    if (!tool.category) continue;
    if (!byCategory.has(tool.category)) byCategory.set(tool.category, []);
    byCategory.get(tool.category).push(tool);
  }

  const out = {};

  // Category pages: every tool in that category, in registry order.
  for (const [category, items] of byCategory) {
    const path = CATEGORY_PATHS[category];
    if (!path) continue;
    const label = CATEGORY_LABELS[category] ?? category;
    const others = [...byCategory.keys()].filter(
      (c) => c !== category && CATEGORY_PATHS[c],
    );
    out[path] = {
      title: `${label} tools`,
      html:
        `<h1>${escapeHtml(label)} tools</h1>` +
        `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/construction-tools">Construction tools</a> &rsaquo; ${escapeHtml(label)}</nav>` +
        `<p>${escapeHtml(CATEGORY_BLURBS[category] ?? "")} ${items.length} ${
          items.length === 1 ? "tool" : "tools"
        } in this group, each one free and usable without an account.</p>` +
        `<ul>${items.map(toolItem).join("")}</ul>` +
        `<nav aria-label="Other tool groups"><h2>Other tool groups</h2><ul>${others
          .map(
            (c) =>
              `<li><a href="${CATEGORY_PATHS[c]}">${escapeHtml(CATEGORY_LABELS[c] ?? c)}</a></li>`,
          )
          .join("")}</ul></nav>`,
    };
  }

  // The directory: every tool, grouped by category.
  const sections = [...byCategory.entries()]
    .map(([category, items]) => {
      const label = CATEGORY_LABELS[category] ?? category;
      const link = CATEGORY_PATHS[category];
      const heading = link
        ? `<h2><a href="${link}">${escapeHtml(label)}</a></h2>`
        : `<h2>${escapeHtml(label)}</h2>`;
      return `<section>${heading}<ul>${items.map(toolItem).join("")}</ul></section>`;
    })
    .join("");

  out["/construction-tools"] = {
    title: "All construction tools",
    html:
      `<h1>Every FRELUX construction tool</h1>` +
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Construction tools</nav>` +
      `<p>${tools.length} calculators, estimators and assistants, grouped by the part of the build they cover. Each entry says what it does, what you enter and what you get, so you can pick the right one before opening it.</p>` +
      sections,
  };

  return out;
}

/**
 * Body HTML for one tool's own page.
 *
 * Used only where the existing static body is thin (see scripts/prerender.mjs):
 * a tool page that ships a sentence and no links is a dead end for a crawler.
 * Everything below is the registry's own description of the tool plus real
 * internal links to its guide, its siblings and the directory.
 */
export function buildToolPageContent(registry, { faqSlugs = [] } = {}) {
  const tools = (Array.isArray(registry) ? registry : []).filter((t) => t && t.path && t.title);
  if (tools.length === 0) return {};
  const byCategory = new Map();
  for (const tool of tools) {
    if (!tool.category) continue;
    if (!byCategory.has(tool.category)) byCategory.set(tool.category, []);
    byCategory.get(tool.category).push(tool);
  }
  const faq = new Set(faqSlugs);
  const out = {};

  for (const tool of tools) {
    const label = CATEGORY_LABELS[tool.category] ?? tool.category ?? "Tool";
    const categoryPath = CATEGORY_PATHS[tool.category];
    const siblings = (byCategory.get(tool.category) ?? []).filter((t) => t.path !== tool.path);
    const slug = tool.path.replace(/^\//, "");
    const hasGuide = faq.has(slug);

    out[tool.path] = {
      title: tool.title,
      html:
        `<h1>${escapeHtml(tool.title)}</h1>` +
        `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/construction-tools">Construction tools</a> &rsaquo; ` +
        (categoryPath
          ? `<a href="${categoryPath}">${escapeHtml(label)}</a>`
          : escapeHtml(label)) +
        ` &rsaquo; ${escapeHtml(tool.title)}</nav>` +
        (tool.does ? `<p>${escapeHtml(tool.does)}</p>` : "") +
        (tool.enters ? `<h2>What you enter</h2><p>${escapeHtml(tool.enters)}</p>` : "") +
        (tool.gets ? `<h2>What you get</h2><p>${escapeHtml(tool.gets)}</p>` : "") +
        (siblings.length
          ? `<h2>Other ${escapeHtml(label.toLowerCase())} tools</h2><ul>${siblings
              .slice(0, 6)
              .map((s) => `<li><a href="${escapeHtml(s.path)}">${escapeHtml(s.title)}</a>${s.does ? `: ${escapeHtml(s.does)}` : ""}</li>`)
              .join("")}</ul>`
          : "") +
        (hasGuide
          ? `<p><a href="/faq/${slug}/">Read the full guide to ${escapeHtml(tool.title.toLowerCase())}</a></p>`
          : "") +
        `<p><a href="/construction-tools/">Every FRELUX construction tool</a></p>`,
    };
  }

  return out;
}
