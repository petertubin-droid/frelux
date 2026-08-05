import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://freluxpaintcalc.com";

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

    // Fetch all active paint colors, published palettes, and learn articles
    const [colorsRes, palettesRes, articlesRes, categoriesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/paint_colors?select=slug,updated_at&is_active=eq.true&order=slug.asc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/color_combinations?select=slug,updated_at&is_published=eq.true&order=slug.asc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/learn_articles?select=slug,updated_at,published_at,category_slug&status=eq.published&order=published_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/learn_categories?select=slug,is_active&is_active=eq.true&order=sort_order.asc`, { headers }),
    ]);

    const colors = await colorsRes.json() as { slug: string; updated_at: string }[];
    const palettes = await palettesRes.json() as { slug: string; updated_at: string }[];
    const articles = await articlesRes.json() as { slug: string; updated_at: string; published_at: string; category_slug: string }[];
    const categories = await categoriesRes.json() as { slug: string }[];

    const staticUrls = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/paint-calculator", priority: "0.9", changefreq: "monthly" },
      { loc: "/cost-estimator", priority: "0.9", changefreq: "monthly" },
      { loc: "/screeding-calculator", priority: "0.9", changefreq: "monthly" },
      { loc: "/screeding-cost-estimator", priority: "0.9", changefreq: "monthly" },
      { loc: "/colors", priority: "0.9", changefreq: "weekly" },
      { loc: "/colors/compare", priority: "0.8", changefreq: "monthly" },
      { loc: "/ai-color-assistant", priority: "0.8", changefreq: "monthly" },
      { loc: "/learn", priority: "0.9", changefreq: "weekly" },
      { loc: "/contact", priority: "0.5", changefreq: "monthly" },
      { loc: "/about", priority: "0.4", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms", priority: "0.3", changefreq: "yearly" },
      { loc: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/disclaimer", priority: "0.3", changefamp: "yearly" },
      { loc: "/ai-disclaimer", priority: "0.3", changefreq: "yearly" },
    ];

    const urls: string[] = [];

    for (const u of staticUrls) {
      urls.push(`  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`);
    }

    for (const c of colors) {
      urls.push(`  <url>
    <loc>${SITE_URL}/colors/paint/${c.slug}</loc>
    <lastmod>${new Date(c.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    for (const p of palettes) {
      urls.push(`  <url>
    <loc>${SITE_URL}/colors/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    for (const cat of categories) {
      urls.push(`  <url>
    <loc>${SITE_URL}/learn/category/${cat.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    for (const a of articles) {
      const lastmod = (a.published_at ?? a.updated_at).split("T")[0];
      urls.push(`  <url>
    <loc>${SITE_URL}/learn/${a.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
