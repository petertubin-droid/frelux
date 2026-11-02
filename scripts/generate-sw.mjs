/**
 * Generate the production service worker using Workbox injectManifest.
 *
 * Takes public/sw-template.js as input, injects a precache manifest of all
 * built assets (JS, CSS, fonts, images, HTML), and writes the final SW to
 * dist/sw.js.
 *
 * This replaces the hand-rolled precaching from sw.js v3, which only cached
 * a handful of static pages but missed all the hashed JS/CSS bundles — so
 * returning visitors on slow connections re-downloaded everything.
 *
 * Run AFTER `vite build` and `prerender.mjs` (needs all dist/ files present).
 * Usage: node scripts/generate-sw.mjs
 */
import { injectManifest } from 'workbox-build';
import { existsSync } from 'fs';

const inputDir = 'public/sw-template.js';
const outputDir = 'dist/sw.js';
const distDir = 'dist';

if (!existsSync(inputDir)) {
  console.error('❌ public/sw-template.js not found.');
  process.exit(1);
}
if (!existsSync(distDir)) {
  console.error('❌ dist/ not found. Run `vite build` first.');
  process.exit(1);
}

const { count, size } = await injectManifest({
  swSrc: inputDir,
  swDest: outputDir,
  globDirectory: distDir,
  globPatterns: [
    '**/*.{js,css,woff2,png,jpg,jpeg,svg,webp,ico,html}',
  ],
  globIgnores: [
    // Don't precache prerendered route HTML files — they change on every
    // deploy and would bloat the precache. Navigation requests fall back
    // to the network-first runtime cache strategy.
    '**/index.html',
    '404.html',
    // Don't precache sitemap (regenerated each build, large)
    'sitemap.xml',
  ],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB — covers the largest chunks
  // Don't self-destroy the SW cache if injection finds nothing
  dontCacheBustURLsMatching: /\.\w{8,}\./, // content-hashed files
});

console.log(`✅ Service Worker generated — ${count} files precached (${(size / 1024).toFixed(1)}KB total)`);
