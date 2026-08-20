/**
 * Generate sitemap.xml from the route list.
 * Usage: node scripts/generate-sitemap.mjs
 * Run AFTER `vite build` (writes to dist/sitemap.xml and public/sitemap.xml).
 */
import { writeFileSync, mkdirSync } from 'fs';

const SITE_URL = 'https://freluxpaintcalc.com';
const today = new Date().toISOString().split('T')[0];

const routes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/paint-calculator', priority: '0.9', changefreq: 'monthly' },
  { path: '/screeding-calculator', priority: '0.9', changefreq: 'monthly' },
  { path: '/cost-estimator', priority: '0.9', changefreq: 'monthly' },
  { path: '/pop-ceiling-calculator', priority: '0.8', changefreq: 'monthly' },
  { path: '/tile-calculator', priority: '0.8', changefreq: 'monthly' },
  { path: '/painting-estimator', priority: '0.8', changefreq: 'monthly' },
  { path: '/screeding-cost-estimator', priority: '0.8', changefreq: 'monthly' },
  { path: '/pop-ceiling-cost-estimator', priority: '0.8', changefreq: 'monthly' },
  { path: '/tile-cost-estimator', priority: '0.8', changefreq: 'monthly' },
  { path: '/finish-estimator', priority: '0.7', changefreq: 'monthly' },
  { path: '/tyrolene-estimator', priority: '0.7', changefreq: 'monthly' },
  { path: '/colors', priority: '0.8', changefreq: 'weekly' },
  { path: '/colors/compare', priority: '0.7', changefreq: 'monthly' },
  { path: '/ai-color-assistant', priority: '0.7', changefreq: 'monthly' },
  { path: '/learn', priority: '0.8', changefreq: 'weekly' },
  { path: '/templates', priority: '0.6', changefreq: 'weekly' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookie-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/disclaimer', priority: '0.3', changefreq: 'yearly' },
  { path: '/ai-disclaimer', priority: '0.3', changefreq: 'yearly' },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${' '}
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${routes.map(r => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

// Write to both dist/ and public/
try {
  writeFileSync('dist/sitemap.xml', xml);
  console.log('  ✅ dist/sitemap.xml');
} catch {
  console.log('  ⚠️  dist/ not found, skipping dist/sitemap.xml');
}
writeFileSync('public/sitemap.xml', xml);
console.log('  ✅ public/sitemap.xml');
console.log(`\n sitemap generated with ${routes.length} URLs`);
