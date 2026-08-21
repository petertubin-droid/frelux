/**
 * Generate sitemap.xml from the route list.
 * Usage: node scripts/generate-sitemap.mjs
 * Run AFTER `vite build` (writes to dist/sitemap.xml and public/sitemap.xml).
 */
import { writeFileSync, mkdirSync } from 'fs';

const SITE_URL = 'https://freluxtools.netlify.app';
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
  { path: '/achievements', priority: '0.7', changefreq: 'weekly' },
  { path: '/ai-color-assistant', priority: '0.7', changefreq: 'monthly' },
  { path: '/learn', priority: '0.8', changefreq: 'weekly' },
  { path: '/templates', priority: '0.6', changefreq: 'weekly' },
  { path: '/templates/standard-living-room-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/master-bedroom-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-accent-wall-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/exterior-bungalow-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/childrens-room-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-walls-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-stairwell-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/2-bedroom-flat-full-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/office-space-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/exterior-duplex-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/shop-retail-front-painting', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-floor-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/bathroom-wall-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/large-hall-floor-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-backsplash-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/balcony-floor-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-floor-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/guest-toilet-wall-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/staircase-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/terrazzo-porcelain-floor-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/wall-feature-strip-tiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-room-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-wall-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/living-room-ceiling-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-walls-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/office-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/single-feature-wall-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/shop-front-screeding', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/standard-bedroom-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/large-living-room-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/small-office-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/hall-cornice-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/dining-room-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/kitchen-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/corridor-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/master-bedroom-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
  { path: '/templates/conference-room-pop-ceiling', priority: '0.5', changefreq: 'monthly' },
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
