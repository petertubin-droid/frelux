#!/usr/bin/env node
/**
 * Point FRELUX at a new public domain.
 *
 *   npm run set-domain -- frelux.com
 *   npm run set-domain -- https://www.frelux.com --dry-run
 *
 * Everything user-facing derives from one origin, so this rewrites the
 * default in the three runtime mirrors (client, Node build scripts, Deno
 * edge functions) plus the static SEO files that must carry the literal
 * host (index.html canonical/OG tags, robots.txt, sitemap.xml, 404 page).
 *
 * It deliberately does NOT touch:
 *   - supabase/functions/_shared/cors.ts, which keeps the previous Netlify
 *     origin allow-listed so shared links survive the transition,
 *   - applied migrations (immutable history),
 *   - VITE_SITE_URL / SITE_URL env vars in the Netlify and Supabase
 *     dashboards, which always win over the in-repo default. Set those too
 *     (docs/DOMAIN_SETUP.md).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!arg) {
  console.error('Usage: npm run set-domain -- <domain> [--dry-run]');
  process.exit(1);
}

function toOrigin(input) {
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    console.error(`✖ "${input}" is not a valid domain.`);
    process.exit(1);
  }
  if (!url.hostname.includes('.')) {
    console.error(`✖ "${input}" does not look like a domain name.`);
    process.exit(1);
  }
  return `https://${url.host}`;
}

const NEW_ORIGIN = toOrigin(arg);
const NEW_HOST = NEW_ORIGIN.replace(/^https?:\/\//, '');

// The origin currently baked into the repo, read from the client mirror.
const configPath = resolve(ROOT, 'src/lib/site-config.ts');
const current = /DEFAULT_SITE_URL = "([^"]+)"/.exec(readFileSync(configPath, 'utf8'));
if (!current) {
  console.error('✖ Could not read DEFAULT_SITE_URL from src/lib/site-config.ts');
  process.exit(1);
}
const OLD_ORIGIN = current[1].replace(/\/+$/, '');
const OLD_HOST = OLD_ORIGIN.replace(/^https?:\/\//, '');

if (OLD_ORIGIN === NEW_ORIGIN) {
  console.log(`✔ Already pointed at ${NEW_ORIGIN} — nothing to do.`);
  process.exit(0);
}

const FILES = [
  'src/lib/site-config.ts',
  'scripts/lib/site-url.mjs',
  'supabase/functions/_shared/site.ts',
  'netlify/functions/sitemap.js',
  'index.html',
  'public/404.html',
  'public/robots.txt',
  'public/sitemap.xml',
  '.env.example',
  '.env.staging.example',
  'docs/DOMAIN_SETUP.md',
];

let touched = 0;
let total = 0;

for (const rel of FILES) {
  const file = resolve(ROOT, rel);
  if (!existsSync(file)) continue;
  const before = readFileSync(file, 'utf8');
  const afterOrigin = before.split(OLD_ORIGIN).join(NEW_ORIGIN);
  const after = afterOrigin.split(OLD_HOST).join(NEW_HOST);
  if (after === before) continue;
  // Origin matches leave only the bare host, so count each phase separately.
  const hits =
    before.split(OLD_ORIGIN).length - 1 + afterOrigin.split(OLD_HOST).length - 1;
  total += hits;
  touched += 1;
  if (!DRY_RUN) writeFileSync(file, after);
  console.log(`${DRY_RUN ? '·' : '✔'} ${rel} (${hits} replacement${hits === 1 ? '' : 's'})`);
}

console.log(`\n${DRY_RUN ? 'Would move' : 'Moved'} ${OLD_ORIGIN} → ${NEW_ORIGIN} across ${touched} file(s), ${total} reference(s).`);
if (!DRY_RUN) {
  console.log(`
Next, outside the repo (these override the in-repo default):
  1. Netlify → Domain management → add ${NEW_HOST}, then point DNS at Netlify
  2. Netlify → Site configuration → Environment → VITE_SITE_URL=${NEW_ORIGIN}
  3. Supabase → Edge Functions → Secrets → SITE_URL=${NEW_ORIGIN}
  4. Supabase → Authentication → URL Configuration → Site URL ${NEW_ORIGIN}
     and add ${NEW_ORIGIN}/** to Redirect URLs
  5. Rebuild and deploy (builds are currently paused by owner)
See docs/DOMAIN_SETUP.md for the full launch checklist.`);
}
