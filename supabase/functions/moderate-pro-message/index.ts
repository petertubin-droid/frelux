// =========================================================
// FRELUX AI Moderation — Pro Connect Messages
// Uses OpenAI to analyze messages between clients and professionals
// for spam, scams, harassment, and policy violations.
// Auto-flags or removes based on severity.
// =========================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OPENAI_MODEL = 'gpt-4o-mini';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface ModerationResult {
  action: 'allow' | 'flag' | 'remove';
  score: number;
  categories: string[];
  reason: string;
}

interface ModerationRequest {
  messageId: string;
  content: string;
  conversationId: string;
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Server not configured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const anon = createClient(supabaseUrl, anonKey);

  // Authenticate the caller
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData } = await anon.auth.getUser(token);
  if (!userData.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // Parse request body
  let body: ModerationRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!body.messageId || !body.content) {
    return jsonResponse({ error: 'Missing messageId or content' }, 400);
  }

  // Quick check: if no OpenAI key, allow everything (fail open)
  if (!openaiKey) {
    return jsonResponse({
      action: 'allow',
      score: 0,
      categories: [],
      reason: 'AI moderation not configured',
    } satisfies ModerationResult);
  }

  // Step 1: Basic banned word check (fast path)
  const lowerContent = body.content.toLowerCase();
  const obviousBanned = ['scam', 'send me money', 'bitcoin investment', 'crypto giveaway', 'nude', 'sex chat'];
  const matchedBanned = obviousBanned.filter((w) => lowerContent.includes(w));

  if (matchedBanned.length > 0) {
    await takeAction(admin, body, 'remove', 1.0, matchedBanned, `Matched banned content: ${matchedBanned.join(', ')}`, userData.user.id);
    return jsonResponse({
      action: 'remove',
      score: 1.0,
      categories: matchedBanned,
      reason: `Matched banned content: ${matchedBanned.join(', ')}`,
    } satisfies ModerationResult);
  }

  // Step 2: AI analysis with OpenAI
  try {
    const result = await analyzeWithOpenAI(body.content, openaiKey);
    if (!result) {
      // AI returned unparseable response — allow
      return jsonResponse({
        action: 'allow',
        score: 0,
        categories: ['safe'],
        reason: 'No issues detected',
      } satisfies ModerationResult);
    }

    // Apply thresholds
    const autoRemoveThreshold = 0.85;
    const autoFlagThreshold = 0.60;

    if (result.score >= autoRemoveThreshold) {
      result.action = 'remove';
    } else if (result.score >= autoFlagThreshold) {
      result.action = 'flag';
    } else {
      result.action = 'allow';
    }

    // Take action on the message
    if (result.action !== 'allow') {
      await takeAction(admin, body, result.action, result.score, result.categories, result.reason, userData.user.id);
    }

    return jsonResponse(result);
  } catch (err) {
    console.error('[pro-moderation] AI analysis failed:', err);
    // Fail open — allow the message if AI is unavailable
    return jsonResponse({
      action: 'allow',
      score: 0,
      categories: ['safe'],
      reason: 'Moderation temporarily unavailable',
    } satisfies ModerationResult);
  }
});

// =========================================================
// OpenAI Analysis
// =========================================================
async function analyzeWithOpenAI(
  content: string,
  apiKey: string
): Promise<ModerationResult | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a content moderation AI for a professional services marketplace called FRELUX Pro Connect in Nigeria. ' +
            'This platform connects clients with painting, POP ceiling, tiling, and screeding professionals. ' +
            'Analyze messages for: spam, scams/fraud, offensive language, harassment, hate speech, misinformation, or attempts to take transactions off-platform. ' +
            'Consider Nigerian context — common scam patterns include advance-fee fraud, fake job offers, and investment schemes. ' +
            'Normal professional communication (discussing quotes, scheduling, project details, negotiating prices) is SAFE. ' +
            'Respond with ONLY a JSON object: {"score": 0.0-1.0, "categories": ["..."], "reason": "..."}. ' +
            'Score 0.0 = completely safe, 1.0 = definitely harmful. ' +
            'Categories: spam, scam, offensive, harassment, hate_speech, off_platform, safe. ' +
            'Be strict on scams and harassment but not overzealous on normal business chat.',
        },
        {
          role: 'user',
          content: `Analyze this message: "${content}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      action: 'allow',
      score: Math.min(1, Math.max(0, Number(parsed.score) || 0)),
      categories: Array.isArray(parsed.categories) ? parsed.categories : ['unknown'],
      reason: String(parsed.reason ?? 'AI analysis'),
    };
  } catch {
    return null;
  }
}

// =========================================================
// Take Action — flag or remove message
// =========================================================
async function takeAction(
  admin: ReturnType<typeof createClient>,
  body: ModerationRequest,
  action: 'flag' | 'remove',
  score: number,
  categories: string[],
  reason: string,
  userId: string
): Promise<void> {
  if (action === 'remove') {
    // Remove the message
    await admin
      .from('pro_messages')
      .update({
        is_removed: true,
        is_flagged: true,
        flag_reason: reason,
        flagged_by: 'ai_bot',
        removed_at: new Date().toISOString(),
      })
      .eq('id', body.messageId);

    // Post a system message
    await admin.from('pro_messages').insert({
      conversation_id: body.conversationId,
      sender_id: userId,
      body: '⚠️ A message was removed by the AI moderator for violating community guidelines.',
      message_type: 'moderation',
    });
  } else {
    // Flag the message but don't remove
    await admin
      .from('pro_messages')
      .update({
        is_flagged: true,
        flag_reason: reason,
        flagged_by: 'ai_bot',
      })
      .eq('id', body.messageId);
  }

  // Log the moderation action
  await admin.from('pro_moderation_log').insert({
    message_id: body.messageId,
    conversation_id: body.conversationId,
    action,
    reason,
    performed_by: 'ai_bot',
    ai_score: score,
    ai_categories: categories,
  }).then(() => {}).catch(() => {
    // Table might not exist yet — don't fail
  });
}
