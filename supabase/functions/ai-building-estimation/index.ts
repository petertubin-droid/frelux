// =========================================================
// FRELUX Edge Function: ai-building-estimation
// Phase 31
//
// Receives a building photo, uses Google Gemini Vision to analyze
// building characteristics, then runs the Build-to-Roof engine
// logic to produce a full construction cost estimate.
//
// Access is premium-gated via site_settings configuration.
// Usage is consumed server-side only on success.
// =========================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_MODEL = 'gemini-2.0-flash';

interface EstimationRequest {
  imageDataUrl?: string;
  imageUrl?: string;
  clientId?: string;
  projectName?: string;
  location?: string;
}

interface SiteEstimationConfig {
  estimation_enabled: boolean;
  estimation_access_mode: string;
  estimation_daily_free_uses: number;
  estimation_admin_override: boolean;
  estimation_paid_enabled: boolean;
  estimation_paid_price: number;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAuthenticatedUserId(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function isUserAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin';
}

async function getUserPaidStatus(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_paid_status')
    .select('is_paid, paid_until')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data || !data.is_paid) return false;
  if (data.paid_until) {
    const expiry = new Date(data.paid_until).getTime();
    if (Date.now() > expiry) return false;
  }
  return true;
}

async function getEstimationConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<SiteEstimationConfig | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('estimation_enabled, estimation_access_mode, estimation_daily_free_uses, estimation_admin_override, estimation_paid_enabled, estimation_paid_price')
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    estimation_enabled: data.estimation_enabled ?? false,
    estimation_access_mode: data.estimation_access_mode ?? 'disabled',
    estimation_daily_free_uses: data.estimation_daily_free_uses ?? 0,
    estimation_admin_override: data.estimation_admin_override ?? true,
    estimation_paid_enabled: data.estimation_paid_enabled ?? false,
    estimation_paid_price: Number(data.estimation_paid_price) || 0,
  };
}

async function getDailyUsage(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  userId: string | null,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  let query;
  if (userId) {
    query = supabase
      .from('estimation_usage_daily')
      .select('uses_consumed')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle();
  } else {
    query = supabase
      .from('estimation_usage_daily')
      .select('uses_consumed')
      .eq('client_hash', clientId)
      .eq('usage_date', today)
      .maybeSingle();
  }
  const { data } = await query;
  return data?.uses_consumed ?? 0;
}

async function consumeDailyUse(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  userId: string | null,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  if (userId) {
    const { data: existing } = await supabase
      .from('estimation_usage_daily')
      .select('id, uses_consumed')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('estimation_usage_daily')
        .update({ uses_consumed: (existing.uses_consumed ?? 0) + 1 })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('estimation_usage_daily')
        .insert({
          user_id: userId,
          client_hash: clientId,
          usage_date: today,
          uses_consumed: 1,
        });
    }
  } else {
    const { data: existing } = await supabase
      .from('estimation_usage_daily')
      .select('id, uses_consumed')
      .eq('client_hash', clientId)
      .eq('usage_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('estimation_usage_daily')
        .update({ uses_consumed: (existing.uses_consumed ?? 0) + 1 })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('estimation_usage_daily')
        .insert({
          client_hash: clientId,
          usage_date: today,
          uses_consumed: 1,
        });
    }
  }
}

// ── Gemini Vision API call ──

async function analyzeBuildingImage(
  imageDataUrl: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const prompt = `You are a construction cost estimation expert specializing in Nigerian building construction.

Analyze this building image and extract the following information. Be precise and realistic. If you cannot determine a value, provide your best estimate based on visual cues.

Return a JSON object with these exact fields:
{
  "detected_building_type": "bungalow" | "duplex" | "two_storey" | "apartment" | "office" | "shop" | "custom",
  "detected_building_type_confidence": 0.0-1.0,
  "estimated_length": number (meters, estimate from visual scale),
  "estimated_width": number (meters),
  "estimated_floors": number (1, 2, 3, etc.),
  "estimated_height_per_floor": number (meters, typically 3-3.5m),
  "detected_roof_type": "gable" | "hip" | "mono_pitch" | "flat" | "custom",
  "detected_roof_type_confidence": 0.0-1.0,
  "estimated_roof_pitch": number (degrees, estimate the pitch angle),
  "detected_roofing_material": "long_span_aluminium" | "stone_coated" | "gi_sheet" | "shingle" | "custom",
  "detected_block_type": "225mm" | "150mm" | "125mm" | "custom",
  "estimated_internal_wall_length": number (meters, estimate total internal partition wall length),
  "detected_openings": [{"type": "door" | "window", "estimated_width": number, "estimated_height": number, "estimated_count": number}],
  "detected_foundation_type": "strip_footing" | "pad_footing" | "raft" | "pile" | "custom",
  "ai_confidence": "high" | "moderate" | "low",
  "analysis_notes": [array of strings explaining what you observed],
  "warnings": [array of strings about limitations of this estimate]
}

Important guidelines:
- Building dimensions from a single photo are approximate. State this in warnings.
- Roof pitch: gable roofs in Nigeria typically 15-30°, hip roofs 15-25°
- Foundation type cannot be seen in a photo — default to "strip_footing" and note in warnings
- Block type: most Nigerian buildings use 225mm (9-inch) blocks
- Internal walls: estimate based on building size (typically 40-60% of perimeter for bungalows)
- Count visible doors and windows, but note these are only the visible ones
- Be conservative in your estimates`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageDataUrl.split(',')[1] ?? imageDataUrl,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('[ai-building-estimation] Gemini API error:', response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const geminiData = await response.json();
  const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error('No response text from Gemini');

  return JSON.parse(textContent);
}

// ── Default prices/labour/wastage (mirror of engine defaults) ──

const DEFAULT_PRICES = {
  cement_per_bag: 9500,
  block_per_piece: 350,
  sand_per_m3: 45000,
  granite_per_m3: 95000,
  hardcore_per_m3: 35000,
  reinforcement_per_tonne: 1200000,
  binding_wire_per_kg: 2500,
  timber_per_m: 2500,
  roofing_sheet_per_piece: 8500,
  ridge_cap_per_meter: 3500,
  roofing_screws_per_piece: 150,
  fascia_per_meter: 2500,
  dpc_per_meter: 800,
  dpm_per_m2: 1200,
  formwork_per_m2: 4500,
  price_date: new Date().toISOString().split('T')[0],
  price_source: 'Default (Nigerian market estimate — please update)',
};

const DEFAULT_LABOUR = {
  excavation_per_m3: 3500,
  blockwork_per_block: 150,
  concrete_per_m3: 25000,
  reinforcement_per_tonne: 150000,
  formwork_per_m2: 5000,
  roofing_per_m2: 5000,
  blinding_per_m3: 8000,
  hardcore_per_m3: 6000,
  sand_filling_per_m3: 5000,
  compaction_per_m3: 3000,
  backfilling_per_m3: 2500,
  general_labour_per_day: 10000,
  general_labour_days: 5,
};

const DEFAULT_WASTAGE = {
  blocks: 5,
  cement: 5,
  sand: 10,
  aggregate: 10,
  reinforcement: 3,
  timber: 10,
  roofing_sheets: 5,
  hardcore: 5,
};

// ── Build the estimate input from AI analysis ──

function buildEstimateInput(analysis: Record<string, unknown>, projectName: string, location: string) {
  const openings = Array.isArray(analysis.detected_openings)
    ? analysis.detected_openings.map((o: Record<string, unknown>) => ({
        type: (o.type as 'door' | 'window') ?? 'window',
        width: Number(o.estimated_width) || 1.2,
        height: Number(o.estimated_height) || 1.2,
        count: Math.floor(Number(o.estimated_count) || 1),
      }))
    : [];

  // Ensure at least some openings if none detected
  if (openings.length === 0) {
    openings.push(
      { type: 'door', width: 0.9, height: 2.1, count: 4 },
      { type: 'window', width: 1.2, height: 1.2, count: 6 },
    );
  }

  return {
    project_name: projectName || 'AI-Estimated Building',
    location: location || 'Nigeria',
    building_type: (analysis.detected_building_type as string) || 'bungalow',
    number_of_floors: Math.max(1, Math.floor(Number(analysis.estimated_floors) || 1)),
    building_length: Math.max(1, Number(analysis.estimated_length) || 15),
    building_width: Math.max(1, Number(analysis.estimated_width) || 10),
    floor_to_floor_height: Math.max(2.5, Number(analysis.estimated_height_per_floor) || 3),
    wall_thickness: 0.225,
    internal_wall_length: Math.max(0, Number(analysis.estimated_internal_wall_length) || 25),
    internal_wall_thickness: 0.15,
    openings,
    foundation_type: (analysis.detected_foundation_type as string) || 'strip_footing',
    foundation_depth: 0.9,
    foundation_width: 0.675,
    footing_thickness: 0.225,
    blinding_thickness: 0.075,
    hardcore_thickness: 0.15,
    dpc_length: 50,
    block_size: (analysis.detected_block_type as string) || '225mm',
    block_length: 450,
    block_height: 225,
    block_width: 225,
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_aggregate: 4,
    mortar_mix_cement: 1,
    mortar_mix_sand: 6,
    roof_type: (analysis.detected_roof_type as string) || 'gable',
    roof_pitch_degrees: Number(analysis.estimated_roof_pitch) || 25,
    roof_overhang: 0.6,
    roofing_material: (analysis.detected_roofing_material as string) || 'long_span_aluminium',
    structural_members: [],
    has_engineer_schedule: false,
    wastage: DEFAULT_WASTAGE,
    prices: DEFAULT_PRICES,
    labour: DEFAULT_LABOUR,
    contingency_percent: 5,
  };
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_AI_API_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server not configured.', code: 'NOT_CONFIGURED' }, 500);
  }

  if (!geminiApiKey) {
    return jsonResponse({ error: 'AI service not configured.', code: 'NO_API_KEY' }, 503);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── Auth & access control ──
    const userId = await getAuthenticatedUserId(req, supabaseUrl, supabaseAnonKey);
    const admin = userId ? await isUserAdmin(supabase, userId) : false;
    const paid = userId ? await getUserPaidStatus(supabase, userId) : false;

    const config = await getEstimationConfig(supabase);
    if (!config || !config.estimation_enabled) {
      return jsonResponse({ error: 'Image estimation is currently disabled.', code: 'AI_DISABLED' }, 403);
    }

    if (config.estimation_access_mode === 'disabled') {
      return jsonResponse({ error: 'Image estimation is currently disabled.', code: 'AI_DISABLED' }, 403);
    }

    // Admin override
    if (admin && config.estimation_admin_override) {
      // Admins can always use it
    } else {
      // Paid mode
      if (config.estimation_access_mode === 'paid') {
        if (!paid) {
          return jsonResponse({
            error: 'This feature requires a premium subscription.',
            code: 'NOT_SUBSCRIBED',
            price: config.estimation_paid_price,
          }, 403);
        }
      } else {
        // Free/rewarded modes — check daily limit
        const body = await req.json() as EstimationRequest;
        const clientId = body.clientId ?? 'unknown';
        const usedToday = await getDailyUsage(supabase, clientId, userId);

        if (usedToday >= config.estimation_daily_free_uses) {
          return jsonResponse({
            error: 'You have used all your free image estimations for today.',
            code: 'USAGE_LIMIT_REACHED',
            usedToday,
            limit: config.estimation_daily_free_uses,
          }, 429);
        }
      }
    }

    // ── Process request ──
    const body = await req.json() as EstimationRequest;
    const clientId = body.clientId ?? 'unknown';
    const projectName = body.projectName ?? 'AI-Estimated Building';
    const location = body.location ?? 'Nigeria';

    if (!body.imageDataUrl && !body.imageUrl) {
      return jsonResponse({ error: 'No image provided.', code: 'NO_IMAGE' }, 400);
    }

    // For image URLs, we'd need to fetch and convert to base64.
    // For now, we support imageDataUrl (base64 from frontend)
    const imageDataUrl = body.imageDataUrl;
    if (!imageDataUrl) {
      return jsonResponse({ error: 'Image URL processing not yet supported.', code: 'UNSUPPORTED' }, 400);
    }

    // ── AI analysis ──
    const analysis = await analyzeBuildingImage(imageDataUrl, geminiApiKey);

    // ── Consume usage (only on success) ──
    if (!admin || !config.estimation_admin_override) {
      await consumeDailyUse(supabase, clientId, userId);
    }

    // ── Build estimate input ──
    const estimateInput = buildEstimateInput(analysis, projectName, location);

    // ── Save to database if authenticated ──
    let savedId: string | null = null;
    if (userId) {
      const { data: saved } = await supabase
        .from('estimation_results')
        .insert({
          user_id: userId,
          project_name: projectName,
          analysis,
          estimate_summary: {
            building_type: analysis.detected_building_type,
            floors: analysis.estimated_floors,
            ai_confidence: analysis.ai_confidence,
          },
          full_estimate: estimateInput,
        })
        .select('id')
        .maybeSingle();

      savedId = saved?.id ?? null;
    }

    return jsonResponse({
      analysis,
      estimateInput,
      savedId,
    });

  } catch (err) {
    console.error('[ai-building-estimation] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message, code: 'INTERNAL_ERROR' }, 500);
  }
});
