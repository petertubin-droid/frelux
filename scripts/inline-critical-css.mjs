/**
 * Critical CSS inlining — runs on dist/index.html BEFORE prerender.mjs duplicates
 * it into 76 route files, so every prerendered page inherits the same optimization.
 *
 * Problem: dist/assets/css/index-*.css is ~142KB and render-blocking (plain
 * <link rel="stylesheet">) on every single page, even though each page only
 * needs a small fraction of those Tailwind utility classes above the fold.
 *
 * Fix: use Beasties (maintained fork of Google's critters) to statically
 * analyze the shell HTML, inline the small set of CSS rules actually used,
 * and convert the full stylesheet link into a non-blocking preload+swap
 * (rel=preload as=style, onload flips it to rel=stylesheet) with a
 * <noscript> fallback for JS-disabled crawlers/users.
 *
 * Usage: node scripts/inline-critical-css.mjs
 * Run AFTER `vite build`, BEFORE `node scripts/prerender.mjs`.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import Beasties from 'beasties';

const distDir = 'dist';
const templatePath = join(distDir, 'index.html');

if (!existsSync(templatePath)) {
  console.error('❌ dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

const html = readFileSync(templatePath, 'utf-8');

const beasties = new Beasties({
  path: distDir,
  publicPath: '/',
  preload: 'swap', // non-critical CSS loads via <link rel=preload> then swaps to stylesheet on load
  noscriptFallback: true, // <noscript><link rel=stylesheet></noscript> fallback for no-JS
  pruneSource: false, // keep the full external stylesheet intact — we only add a critical subset inline
  compress: true,
  logLevel: 'warn',
});

const inlined = await beasties.process(html);

writeFileSync(templatePath, inlined);

const beforeBytes = Buffer.byteLength(html, 'utf-8');
const afterBytes = Buffer.byteLength(inlined, 'utf-8');
console.log(`✅ Critical CSS inlined — index.html: ${beforeBytes}B → ${afterBytes}B (+${afterBytes - beforeBytes}B inline styles, main stylesheet now non-blocking)`);
