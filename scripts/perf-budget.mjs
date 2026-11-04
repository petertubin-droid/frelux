/**
 * Reports what a first visit actually costs on a weak connection.
 *
 * Lighthouse needs a browser; this does the arithmetic the browser would do.
 * For a route it reads the built HTML, the stylesheet and every module the
 * browser is told to fetch before hydration, then prints the bytes and the time
 * on a poor 3G profile (400 kbps, 400 ms round trip, 6 connections).
 *
 * Usage: node scripts/perf-budget.mjs [route ...]
 */
import { readFileSync, statSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
const Kbps = 400 / 8; // KB per second on poor 3G
const RTT = 0.4; // seconds per round trip
const CONNECTIONS = 6;

const routes = process.argv.slice(2);
const targets = routes.length
  ? routes
  : ["/", "/paint-calculator", "/tile-calculator", "/masonry-calculator", "/cost-estimator"];

const gz = (path) => {
  try {
    return gzipSync(readFileSync(path)).length;
  } catch {
    return 0;
  }
};

const htmlPath = (route) =>
  route === "/"
    ? join(DIST, "index.html")
    : join(DIST, route.replace(/^\//, ""), "index.html");

const rows = [];
for (const route of targets) {
  const file = htmlPath(route);
  if (!existsSync(file)) {
    rows.push({ route, note: "not prerendered" });
    continue;
  }
  const html = readFileSync(file, "utf-8");
  const htmlBytes = gz(file);
  const css = [...html.matchAll(/href="(\/assets\/css\/[^"]+\.css)"/g)].map((m) => m[1]);
  const modules = [
    ...new Set(
      [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]),
    ),
  ];
  const entry = (html.match(/type="module"[^>]*src="([^"]+)"/) ?? [])[1];
  const scripts = [entry, ...modules].filter(Boolean);
  const scriptBytes = scripts.reduce((sum, p) => sum + gz(join(DIST, p)), 0);
  const cssBytes = css.reduce((sum, p) => sum + gz(join(DIST, p)), 0);
  const total = htmlBytes + scriptBytes + cssBytes;
  // First paint needs the document, the stylesheet and the shell markup that is
  // already in the prerendered HTML. Hydration needs the JavaScript on top.
  const paintBytes = htmlBytes + cssBytes;
  const paintReqs = css.length + 1;
  const paint =
    paintBytes / 1024 / Kbps + Math.ceil(paintReqs / CONNECTIONS) * RTT;
  const hydrate =
    total / 1024 / Kbps +
    Math.ceil((scripts.length + css.length + 1) / CONNECTIONS) * RTT;
  rows.push({
    route,
    html: htmlBytes,
    css: cssBytes,
    js: scriptBytes,
    requests: scripts.length + css.length + 1,
    total,
    paint,
    hydrate,
  });
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log("Poor 3G model: 400 kbps, 400 ms RTT, 6 connections\n");
console.log(
  "route".padEnd(28),
  "html".padStart(8),
  "css".padStart(8),
  "js".padStart(9),
  "req".padStart(5),
  "total".padStart(9),
  "paint".padStart(7),
  "hydr".padStart(7),
);
for (const r of rows) {
  if (r.note) {
    console.log(r.route.padEnd(28), r.note);
    continue;
  }
  console.log(
    r.route.padEnd(28),
    kb(r.html).padStart(8),
    kb(r.css).padStart(8),
    kb(r.js).padStart(9),
    String(r.requests).padStart(5),
    kb(r.total).padStart(9),
    `${r.paint.toFixed(1)}s`.padStart(7),
    `${r.hydrate.toFixed(1)}s`.padStart(7),
  );
}
