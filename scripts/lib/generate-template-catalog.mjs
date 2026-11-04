#!/usr/bin/env node
import { writeFileSync } from "node:fs";
const mod = await import(process.cwd() + "/src/lib/template-data.ts");
const list = mod.FALLBACK_TEMPLATES.map((t) => ({
  slug: t.slug,
  name: t.name,
  type: t.calculator_type,
  description: t.description || "",
  seoDescription: t.seo_description || "",
  // Real pre-filled inputs. The template page shows these so two templates in
  // the same market are not the same page with a different name.
  inputs: t.input_data || {},
}));
const header = `// GENERATED from src/lib/template-data.ts (FALLBACK_TEMPLATES).
// Regenerate with: npx tsx scripts/lib/generate-template-catalog.mjs
// Used by build-time SEO scripts (prerender + sitemap) that cannot import TS.
`;
writeFileSync(
  "scripts/lib/template-catalog.mjs",
  header +
    "export const TEMPLATE_CATALOG = " +
    JSON.stringify(list, null, 2) +
    ";\n",
);
console.log("wrote", list.length, "templates");
