import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://freluxtools.netlify.app";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const headers = {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // Static public routes — only real routes that exist in App.tsx
    // No private, auth, admin, dashboard, or nonexistent URLs
    const staticUrls = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/paint-calculator", priority: "0.9", changefreq: "monthly" },
      { loc: "/cost-estimator", priority: "0.9", changefreq: "monthly" },
      { loc: "/screeding-calculator", priority: "0.9", changefreq: "monthly" },
      { loc: "/screeding-cost-estimator", priority: "0.8", changefreq: "monthly" },
      { loc: "/pop-ceiling-calculator", priority: "0.8", changefreq: "monthly" },
      { loc: "/pop-ceiling-cost-estimator", priority: "0.8", changefreq: "monthly" },
      { loc: "/tile-calculator", priority: "0.8", changefreq: "monthly" },
      { loc: "/tile-cost-estimator", priority: "0.8", changefreq: "monthly" },
      { loc: "/finish-estimator", priority: "0.7", changefreq: "monthly" },
      { loc: "/colors", priority: "0.8", changefreq: "weekly" },
      { loc: "/colors/compare", priority: "0.7", changefreq: "monthly" },
      { loc: "/ai-color-assistant", priority: "0.7", changefreq: "monthly" },
      { loc: "/learn", priority: "0.8", changefreq: "weekly" },
      { loc: "/templates", priority: "0.8", changefreq: "weekly" },
      { loc: "/contact", priority: "0.5", changefreq: "monthly" },
      { loc: "/about", priority: "0.5", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms", priority: "0.3", changefreq: "yearly" },
      { loc: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/disclaimer", priority: "0.3", changefreq: "yearly" },
      { loc: "/ai-disclaimer", priority: "0.3", changefreq: "yearly" },
    ];

    const urls: string[] = [];

    // Add static URLs
    for (const u of staticUrls) {
      urls.push(`  <url>
    <loc>${SITE_URL}${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`);
    }

    // Fetch dynamic public content in parallel
    const [colorsRes, palettesRes, articlesRes, categoriesRes, templatesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/paint_colors?select=slug,updated_at&is_active=eq.true&order=slug.asc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/color_combinations?select=slug,updated_at&is_published=eq.true&order=slug.asc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/learn_articles?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/learn_categories?select=slug,is_active&is_active=eq.true&order=sort_order.asc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/calculator_templates?select=slug,updated_at&visibility=eq.public&is_published=eq.true&order=slug.asc`, { headers }),
    ]);

    // Add active paint colors — /colors/paint/{slug}
    const colors = await colorsRes.json() as { slug: string; updated_at: string }[];
    for (const c of colors) {
      const slug = escapeXml(c.slug);
      const lastmod = new Date(c.updated_at).toISOString().split("T")[0];
      urls.push(`  <url>
    <loc>${SITE_URL}/colors/paint/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    // Add published color palettes — /colors/{slug}
    const palettes = await palettesRes.json() as { slug: string; updated_at: string }[];
    for (const p of palettes) {
      const slug = escapeXml(p.slug);
      const lastmod = new Date(p.updated_at).toISOString().split("T")[0];
      urls.push(`  <url>
    <loc>${SITE_URL}/colors/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    // Add active learn categories — /learn/category/{slug}
    const categories = await categoriesRes.json() as { slug: string }[];
    for (const cat of categories) {
      const slug = escapeXml(cat.slug);
      urls.push(`  <url>
    <loc>${SITE_URL}/learn/category/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // Add published learn articles — /learn/{slug}
    const articles = await articlesRes.json() as { slug: string; updated_at: string; published_at: string }[];
    for (const a of articles) {
      const slug = escapeXml(a.slug);
      const lastmod = escapeXml((a.published_at ?? a.updated_at).split("T")[0]);
      urls.push(`  <url>
    <loc>${SITE_URL}/learn/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // Add published public templates — /templates/{slug}
    const templates = await templatesRes.json() as { slug: string; updated_at: string }[];
    for (const t of templates) {
      const slug = escapeXml(t.slug);
      if (!slug) continue; // skip templates without slugs
      const lastmod = new Date(t.updated_at).toISOString().split("T")[0];
      urls.push(`  <url>
    <loc>${SITE_URL}/templates/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to generate sitemap" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
