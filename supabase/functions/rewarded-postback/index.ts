import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Rewarded Ad Postback Handler
 *
 * Receives server-to-server postback callbacks from web rewarded ad providers
 * (AdGate Media, OfferToro, AdGem, CPX Research, Ayet Studios, RevU,
 * Wannads, MyLead, AdWork Media, RevenueHits, Notik, Bitcot Rewards).
 *
 * Each provider sends a different callback format. This function:
 * 1. Identifies the provider from the URL path or query params
 * 2. Validates the postback using provider-specific signatures/secrets
 * 3. Extracts the user identifier (client hash) and reward amount
 * 4. Grants the unlock via the rewarded_unlock_logs table
 * 5. The client polls checkRewardedUnlock and detects the unlock
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const providerSlug = pathParts[pathParts.length - 1] || url.searchParams.get('provider') || '';

  // Get Supabase client with service role (server-side, bypasses RLS)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse postback data based on provider and method
  let clientHash = '';
  let toolKey = '';
  let rewardAmount = 0;
  let providerName = '';
  let isValid = false;

  try {
    if (providerSlug === 'adgate_media' || url.searchParams.has('af')) {
      // AdGate Media postback
      // GET /rewarded-postback/adgate_media?user_id=USER&credits=AMOUNT&gateway_id=XXXX
      clientHash = url.searchParams.get('user_id') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('credits') ?? '0');
      providerName = 'AdGate Media';
      const gatewayId = url.searchParams.get('gateway_id') ?? '';
      // Validate against ad_providers credentials
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'adgate_media')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.gateway_id === gatewayId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'offertoro' || url.searchParams.has('pub')) {
      // OfferToro postback
      // GET /rewarded-postback/offertoro?user_id=USER&amount=AMOUNT&app_id=XXXX&pub=PUB
      clientHash = url.searchParams.get('user_id') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'OfferToro';
      const appId = url.searchParams.get('app_id') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'offertoro')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.app_id === appId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'adgem' || url.searchParams.has('placement')) {
      // AdGem postback
      clientHash = url.searchParams.get('user_id') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'AdGem';
      const placementId = url.searchParams.get('placement') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'adgem')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.placement_id === placementId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'cpx_research') {
      // CPX Research postback
      clientHash = url.searchParams.get('ext_user_id') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('payout') ?? '0');
      providerName = 'CPX Research';
      const secureHash = url.searchParams.get('secure_hash') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'cpx_research')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.secure_hash === secureHash) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'ayet_studios') {
      // Ayet Studios postback
      clientHash = url.searchParams.get('user') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'Ayet Studios';
      const appId = url.searchParams.get('appid') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'ayet_studios')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.app_id === appId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'revu') {
      // RevU postback
      clientHash = url.searchParams.get('user_id') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'RevU';
      const placementId = url.searchParams.get('placement_id') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'revu')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.placement_id === placementId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'wannads') {
      // Wannads postback
      clientHash = url.searchParams.get('userid') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'Wannads';
      const subId = url.searchParams.get('subid') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'wannads')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.sub_id === subId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'my_lead') {
      // MyLead postback
      clientHash = url.searchParams.get('uid') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('payout') ?? '0');
      providerName = 'MyLead';
      const appId = url.searchParams.get('app') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'my_lead')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.app_id === appId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'adwork_media') {
      // AdWork Media postback
      clientHash = url.searchParams.get('uid') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'AdWork Media';
      const campId = url.searchParams.get('camp') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'adwork_media')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.campaign_id === campId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'revenuehits') {
      // RevenueHits postback
      clientHash = url.searchParams.get('user') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'RevenueHits';
      const clientId = url.searchParams.get('client') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'revenuehits')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.client_id === clientId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'notik') {
      // Notik postback
      clientHash = url.searchParams.get('user') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'Notik';
      const appId = url.searchParams.get('app') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'notik')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.app_id === appId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else if (providerSlug === 'bitcot') {
      // Bitcot postback
      clientHash = url.searchParams.get('user') ?? '';
      rewardAmount = parseFloat(url.searchParams.get('amount') ?? '0');
      providerName = 'Bitcot Rewards';
      const appId = url.searchParams.get('app') ?? '';
      const { data: provider } = await supabase
        .from('ad_providers')
        .select('credentials')
        .eq('slug', 'bitcot')
        .eq('is_active', true)
        .maybeSingle();
      if (provider?.credentials?.app_id === appId) {
        isValid = true;
      }
      toolKey = url.searchParams.get('tool_key') ?? 'advanced_calculator';
    } else {
      return jsonResponse({ error: 'Unknown provider', slug: providerSlug }, 400);
    }
  } catch (e) {
    console.error('Postback parsing error:', e);
    return jsonResponse({ error: 'Failed to parse postback' }, 400);
  }

  if (!isValid) {
    console.error('Postback validation failed for', providerName);
    return jsonResponse({ error: 'Invalid postback — credential mismatch' }, 403);
  }

  if (!clientHash) {
    return jsonResponse({ error: 'Missing user identifier' }, 400);
  }

  // Grant the unlock
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const expiresAt = endOfDay.toISOString();

  try {
    // Insert unlock record
    const { error: insertError } = await supabase.from('rewarded_unlock_log').insert({
      tool_key: toolKey,
      client_hash: clientHash,
      ad_provider: providerName,
      unlock_date: now.toISOString().slice(0, 10),
      unlocked_at: now.toISOString(),
      expires_at: expiresAt,
      ad_revenue_estimated: rewardAmount,
    });

    if (insertError) {
      console.error('Failed to insert unlock:', insertError);
      return jsonResponse({ error: 'Failed to grant unlock' }, 500);
    }

    // Log the ad event
    const { data: providerData } = await supabase
      .from('ad_providers')
      .select('id')
      .eq('slug', providerSlug)
      .maybeSingle();

    await supabase.from('ad_analytics_events').insert({
      event_type: 'reward',
      provider_id: providerData?.id ?? null,
      tool_key: toolKey,
      client_hash: clientHash,
      revenue_estimated: rewardAmount,
      metadata: { provider_slug: providerSlug, postback: true },
    });

    console.log(`Unlock granted via ${providerName} postback for ${clientHash}`);
    return jsonResponse({ success: true, message: 'Unlock granted' });
  } catch (e) {
    console.error('Postback processing error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
