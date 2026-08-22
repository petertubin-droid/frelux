import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://freluxtools.netlify.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_REQUESTS_PER_HOUR = 20;

interface LiveChatRequest {
  question: string;
  clientId?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function checkHourlyRateLimit(
  supabase: ReturnType<typeof createClient>,
  clientHash: string
): Promise<{ allowed: boolean; count: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('ai_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('client_hash', clientHash)
    .eq('request_type', 'livechat')
    .gte('created_at', oneHourAgo);
  if (error) return { allowed: true, count: 0 };
  return { allowed: (count ?? 0) < MAX_REQUESTS_PER_HOUR, count: count ?? 0 };
}

async function logAiRequest(
  supabase: ReturnType<typeof createClient>,
  clientHash: string,
  status: 'success' | 'error' | 'rate_limited',
  providerError?: string
): Promise<void> {
  await supabase.from('ai_request_log').insert({
    request_type: 'livechat',
    client_hash: clientHash,
    status,
    provider_error: providerError ?? null,
  });
}

// Fetch published learn articles as knowledge base context
async function fetchKnowledgeBase(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const { data } = await supabase
    .from('learn_articles')
    .select('title, excerpt, content, category_slug')
    .eq('status', 'published')
    .limit(20);
  if (!data || data.length === 0) return '';
  return data
    .map(
      (a) =>
        `## ${a.title}\nCategory: ${a.category_slug}\n${a.excerpt ?? ''}\n${a.content.slice(0, 800)}`
    )
    .join('\n\n---\n\n');
}

const SYSTEM_PROMPT = `You are the FRELUX PAINT CALC live chat assistant. You help website visitors with questions about painting, POP ceiling installation, tile installation, screeding, color selection, and paint products.

Your job:
- Answer questions clearly, concisely, and practically
- Keep responses short — this is a chat, not an article. 2-4 sentences max unless the user asks for detail.
- Reference the website's knowledge base when relevant
- Cover painting, POP ceiling, tile installation, screeding, color psychology, surface preparation, and DIY topics
- Be specific and actionable, avoid generic advice
- If a user asks about pricing, guide them to the relevant calculator (e.g. /painting-estimator for paint, /tile-calculator for tiles, /cost-estimator for cost breakdowns)
- If a question is outside the scope of painting, POP ceiling, tiles, or home improvement, politely redirect and suggest they contact support on WhatsApp
- Use a friendly, conversational tone — like a knowledgeable friend helping out

Knowledge base context from the website:

{{KNOWLEDGE_BASE}}

When the knowledge base has relevant content, reference it. When it doesn't, provide general expert guidance.`;

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.9,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${errText}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');
  return text.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    if (!apiKey) {
      return jsonResponse({
        error: 'AI service is not configured. Set OPENAI_API_KEY in Supabase edge function secrets.',
        code: 'NO_API_KEY',
      }, 503);
    }

    const body = await req.json() as LiveChatRequest;

    // Validate input
    if (!body.question?.trim()) {
      return jsonResponse({ error: 'Question is required.', code: 'BAD_REQUEST' }, 400);
    }
    if (body.question.length > 2000) {
      return jsonResponse({ error: 'Question too long (max 2000 characters).', code: 'BAD_REQUEST' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limiting
    const clientHash = await sha256(body.clientId || crypto.randomUUID());
    const { allowed, count } = await checkHourlyRateLimit(supabase, clientHash);
    if (!allowed) {
      await logAiRequest(supabase, clientHash, 'rate_limited');
      return jsonResponse({
        error: `Rate limit exceeded (${count}/${MAX_REQUESTS_PER_HOUR} messages per hour). Please try again later or reach us on WhatsApp.`,
        code: 'RATE_LIMITED',
      }, 429);
    }

    // Fetch knowledge base
    const knowledgeBase = await fetchKnowledgeBase(supabase);
    const systemPrompt = SYSTEM_PROMPT.replace(
      '{{KNOWLEDGE_BASE}}',
      knowledgeBase || 'No published articles yet. Provide general expert guidance.'
    );
    const userPrompt = `User question: ${body.question}\n\nProvide a helpful, practical answer. Keep it concise — this is a live chat.`;

    // Call OpenAI
    const result = await callOpenAI(apiKey, systemPrompt, userPrompt);

    await logAiRequest(supabase, clientHash, 'success');

    return jsonResponse({ result });
  } catch (error) {
    console.error('Live chat error:', error);
    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const body = await req.clone().json().catch(() => ({}));
        const clientHash = await sha256(body.clientId || crypto.randomUUID());
        await logAiRequest(supabase, clientHash, 'error', String(error));
      }
    } catch {}
    return jsonResponse({
      error: 'Failed to get a response. Please try again or reach us on WhatsApp.',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});
