import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Server not configured', code: 'CONFIG_ERROR' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return jsonResponse({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return jsonResponse({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, 401);

  let payload: {
    adProvider: string;
    adEventId: string;
    adToken?: string;
    mode?: 'earn_credits' | 'unlock_feature';
    featureKey?: string;
    metadata?: Record<string, unknown>;
  };
  try { payload = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON', code: 'BAD_REQUEST' }, 400); }

  const { adProvider, adEventId, mode = 'earn_credits', featureKey, metadata = {} } = payload;
  if (!adProvider || !adEventId) return jsonResponse({ error: 'adProvider and adEventId are required', code: 'BAD_REQUEST' }, 400);

  // AD VERIFICATION — check for a verified ad event from the postback handler
  // or allow in dev mode
  const devMode = Deno.env.get('REWARDED_DEV_MODE') === 'true';
  if (!devMode) {
    const { data: postbackEvent } = await admin
      .from('rewarded_ad_credit_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('ad_provider', adProvider)
      .eq('ad_event_id', adEventId)
      .eq('status', 'completed')
      .maybeSingle();

    if (!postbackEvent) {
      // Also check rewarded_ad_events table (from the postback edge function)
      const { data: adEvent } = await admin
        .from('rewarded_ad_events')
        .select('*')
        .eq('event_type', 'reward')
        .eq('client_hash', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!adEvent) {
        return jsonResponse({ error: 'Ad not verified. No completed ad event found.', code: 'AD_NOT_VERIFIED' }, 403);
      }
    }
  }

  // MODE: earn_credits
  if (mode === 'earn_credits') {
    const { data: config } = await admin.from('rewarded_ad_credit_config').select('credits_per_ad, is_enabled').eq('id', 1).maybeSingle();
    if (!config) return jsonResponse({ error: 'Config not found', code: 'CONFIG_ERROR' }, 500);
    if (!config.is_enabled) return jsonResponse({ error: 'Rewarded ads are currently disabled', code: 'DISABLED' }, 403);

    const { data: result, error: fnError } = await admin.rpc('award_ad_credits', {
      p_user_id: user.id, p_ad_provider: adProvider, p_ad_event_id: adEventId, p_amount: config.credits_per_ad, p_metadata: metadata,
    });

    if (fnError) return jsonResponse({ error: 'Failed to award credits', code: 'AWARD_FAILED', details: fnError.message }, 500);
    const row = result?.[0];
    if (!row?.success) {
      if (row?.error === 'already_awarded') return jsonResponse({ success: false, error: 'This ad has already been rewarded.', code: 'ALREADY_AWARDED', newBalance: row?.new_balance ?? 0 }, 409);
      if (row?.error === 'daily_earn_limit') return jsonResponse({ success: false, error: 'Daily earning limit reached. Come back tomorrow!', code: 'DAILY_LIMIT', newBalance: row?.new_balance ?? 0 }, 429);
      return jsonResponse({ success: false, error: row?.error ?? 'Unknown error', code: 'AWARD_FAILED' }, 400);
    }
    return jsonResponse({ success: true, creditsEarned: config.credits_per_ad, newBalance: row.new_balance, message: `+${config.credits_per_ad} FRELUX Credits earned!` });
  }

  // MODE: unlock_feature
  if (mode === 'unlock_feature') {
    if (!featureKey) return jsonResponse({ error: 'featureKey required', code: 'BAD_REQUEST' }, 400);
    const { data: result, error: fnError } = await admin.rpc('unlock_ai_feature_via_ad', {
      p_user_id: user.id, p_feature_key: featureKey, p_ad_provider: adProvider, p_ad_event_id: adEventId, p_metadata: metadata,
    });
    if (fnError) return jsonResponse({ error: 'Failed to unlock', code: 'UNLOCK_FAILED', details: fnError.message }, 500);
    const row = result?.[0];
    if (!row?.success) return jsonResponse({ success: false, error: row?.error ?? 'Unknown error', code: 'UNLOCK_FAILED' }, 400);
    return jsonResponse({ success: true, message: 'Feature unlocked via rewarded ad!', featureKey });
  }

  return jsonResponse({ error: 'Invalid mode', code: 'BAD_REQUEST' }, 400);
});
