// =========================================================
// Machine translation *drafts* for the review pipeline.
//
// This function never publishes. It produces a draft row marked
// translator='machine:google' that an editor must review and publish in the
// admin console. That separation is the whole point: search engines get only
// human-approved text, which is what makes /es/ indexable honestly instead of
// being a machine-translated duplicate of the English page.
//
// Auth: admin JWT only (profiles.role = 'admin').
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";

const TRANSLATE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MAX_CHUNK = 4000;

async function translate(text: string, locale: string, source = "en"): Promise<string> {
  if (!text?.trim()) return "";
  // Split on paragraph boundaries so alignment stays obvious for reviewers.
  const chunks: string[] = [];
  let buf = "";
  for (const para of text.split(/\n{2,}/)) {
    if ((buf + para).length > MAX_CHUNK) {
      if (buf) chunks.push(buf);
      buf = para;
    } else {
      buf = buf ? `${buf}\n\n${para}` : para;
    }
  }
  if (buf) chunks.push(buf);

  const out: string[] = [];
  for (const chunk of chunks) {
    const url = new URL(TRANSLATE_ENDPOINT);
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", source);
    url.searchParams.set("tl", locale);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", chunk);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (FRELUX translation drafts)" },
    });
    if (!res.ok) throw new Error(`translate_failed_${res.status}`);
    const data = await res.json();
    out.push(
      (data?.[0] ?? []).map((seg: unknown[]) => String(seg?.[0] ?? "")).join(""),
    );
  }
  return out.join("\n\n");
}

serveWithCors(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!token || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    contentType?: "article" | "page";
    key?: string;
    locale?: string;
    title?: string;
    description?: string;
    bodyMd?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = body.contentType === "page" ? "page" : "article";
  const locale = (body.locale ?? "").trim();
  const key = (body.key ?? "").trim();
  if (!key || !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
    return new Response(
      JSON.stringify({ error: "contentType, key and a valid locale are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (locale === "en") {
    return new Response(JSON.stringify({ error: "English is the source language" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Source text: an article row, or inline page copy.
  let sourceTitle = body.title ?? "";
  let sourceDescription = body.description ?? "";
  let sourceBody = body.bodyMd ?? "";

  if (contentType === "article") {
    const { data: article, error: articleError } = await admin
      .from("learn_articles")
      .select("slug, title, excerpt, meta_description, content, updated_at")
      .eq("slug", key)
      .maybeSingle();
    if (articleError || !article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    sourceTitle = article.title;
    sourceDescription = article.meta_description || article.excerpt || "";
    sourceBody = article.content || "";
  }

  try {
    const [title, description, bodyMd] = await Promise.all([
      translate(sourceTitle, locale),
      translate(sourceDescription, locale),
      translate(sourceBody, locale),
    ]);

    const { data: existing } = await admin
      .from("content_translations")
      .select("id, status")
      .eq("content_type", contentType)
      .eq("content_key", key)
      .eq("locale", locale)
      .maybeSingle();

    // Never overwrite a translation an editor already reviewed.
    if (existing && existing.status !== "draft") {
      return new Response(
        JSON.stringify({
          error: "translation_exists",
          status: existing.status,
          message: "A reviewed translation already exists for this locale.",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    const payload = {
      content_type: contentType,
      content_key: key,
      locale,
      title,
      description,
      body_md: bodyMd,
      status: "draft" as const,
      translator: "machine:google",
      notes: "Machine draft. Requires editorial review before publishing.",
    };

    const { data: row, error: upsertError } = existing
      ? await admin
          .from("content_translations")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single()
      : await admin
          .from("content_translations")
          .insert(payload)
          .select()
          .single();

    if (upsertError) throw upsertError;
    return new Response(JSON.stringify({ success: true, translation: row }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Draft failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
