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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server not configured', code: 'CONFIG_ERROR' }, 500);
  }

  // Create service role client — bypasses RLS
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Create user-scoped client using the caller's JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Get the authenticated user
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
  }

  let payload: {
    eventType: string;
    referenceId: string;
    amount: number;
    reason: string;
    metadata?: Record<string, unknown>;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400);
  }

  const { eventType, referenceId, amount, reason, metadata } = payload;

  if (!eventType || !referenceId || !amount || !reason) {
    return jsonResponse({ error: 'eventType, referenceId, amount, and reason are required', code: 'BAD_REQUEST' }, 400);
  }

  if (amount <= 0) {
    return jsonResponse({ error: 'Amount must be positive', code: 'INVALID_AMOUNT' }, 400);
  }

  // Call the secure RPC function (SECURITY DEFINER, bypasses RLS)
  const { data, error } = await admin.rpc('award_credits', {
    p_user_id: user.id,
    p_event_type: eventType,
    p_reference_id: referenceId,
    p_amount: amount,
    p_reason: reason,
    p_metadata: metadata ?? {},
  });

  if (error) {
    return jsonResponse({ error: error.message, code: 'AWARD_FAILED' }, 500);
  }

  const result = data?.[0];
  if (!result) {
    return jsonResponse({ error: 'No result returned', code: 'UNKNOWN' }, 500);
  }

  return jsonResponse({
    success: result.success,
    newBalance: result.new_balance,
    alreadyAwarded: result.already_awarded,
  });
});
