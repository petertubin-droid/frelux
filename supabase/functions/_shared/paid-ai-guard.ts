// =========================================================
// paid-ai-guard — server-side enforcement of "AI access is
// paid subscription only".
//
// Why this exists: the browser gate (checkAiAccess) decides what
// to SHOW a visitor. It is not a security boundary, because any
// caller can POST straight to an edge function. Before this file
// only ai-color-consult, ai-building-estimation and
// ai-tv-console-extract verified a paid subscription; the other
// user-facing AI functions were reachable without one.
//
// Authority, in order:
//   1. site_settings.ai_enabled = false  -> AI is off for everyone.
//   2. site_settings.ai_access_mode      -> when the owner has NOT
//      chosen "paid", the guard stands down and the function keeps
//      its own access rules (credits, rewarded, guest allowance).
//   3. an admin (profiles.role = 'admin') is always allowed.
//   4. an active user_paid_status row (is_paid and paid_until in
//      the future, or no expiry set) is required.
//
// Everything fails closed: a settings or lookup error returns 503,
// never an open door.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

export type PaidAiGate =
  | {
      ok: true;
      /** null only when the guard stood down (mode is not "paid"). */
      userId: string | null;
      plan: string | null;
      admin: boolean;
      /** Set when a purchased AI credit paid for this request. Calling it
       *  refunds that credit, so a failed generation costs the buyer nothing. */
      release?: () => Promise<void>;
      /** 'subscription' | 'admin' | 'purchased_credit' | 'mode_off' */
      via: "subscription" | "admin" | "purchased_credit" | "mode_off";
    }
  | { ok: false; response: Response };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Gate an AI edge function behind the paid-subscription rule.
 *
 * Call at the top of the handler:
 *   const gate = await requirePaidAiAccess(req);
 *   if (!gate.ok) return gate.response;
 */
/** One AI operation costs the same everywhere (AI_CREDIT_COST in src/lib/credits.ts). */
export const AI_OPERATION_COST = 100;

export async function requirePaidAiAccess(
  req: Request,
  options: {
    allowAnonymous?: boolean;
    /** Spend one purchased AI credit for a non-subscriber. */
    consumePurchased?: boolean;
    /** Label written to the credit ledger, e.g. "ai-copilot". */
    featureKey?: string;
  } = {},
): Promise<PaidAiGate> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!url || !serviceRole || !anonKey) {
    return {
      ok: false,
      response: json(503, {
        error: "AI access could not be verified.",
        code: "AI_GATE_UNAVAILABLE",
      }),
    };
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  // 1/2. Global switch and access mode.
  const { data: settings, error: settingsError } = await admin
    .from("site_settings")
    .select("ai_enabled, ai_access_mode")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    return {
      ok: false,
      response: json(503, {
        error: "AI access could not be verified.",
        code: "AI_GATE_UNAVAILABLE",
      }),
    };
  }

  if (settings && settings.ai_enabled === false) {
    return {
      ok: false,
      response: json(503, {
        error: "AI features are currently unavailable.",
        code: "AI_DISABLED",
      }),
    };
  }

  const paidOnly = settings?.ai_access_mode === "paid";

  // Resolve the caller whenever a token is present, even when the
  // guard stands down, so admin/staff checks stay accurate.
  let userId: string | null = null;
  const token = bearerToken(req);
  if (token) {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await anon.auth.getUser(token);
    if (!error && data.user) userId = data.user.id;
  }

  if (!paidOnly) {
    return { ok: true, userId, plan: null, admin: false, via: "mode_off" };
  }

  if (!userId) {
    if (options.allowAnonymous) {
      return { ok: true, userId: null, plan: null, admin: false };
    }
    return {
      ok: false,
      response: json(401, {
        error: "Sign in to use FRELUX AI.",
        code: "AUTH_REQUIRED",
        upgradeUrl: "/pricing",
      }),
    };
  }

  // 3. Admins keep their access.
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role === "admin") {
    return { ok: true, userId, plan: "admin", admin: true, via: "admin" };
  }

  // 4. Paid subscription only.
  const { data: paid, error: paidError } = await admin
    .from("user_paid_status")
    .select("is_paid, plan, paid_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (paidError) {
    return {
      ok: false,
      response: json(503, {
        error: "AI access could not be verified.",
        code: "AI_GATE_UNAVAILABLE",
      }),
    };
  }

  const subscribed =
    paid?.is_paid === true &&
    (!paid.paid_until || new Date(paid.paid_until).getTime() > Date.now());

  if (subscribed) {
    return {
      ok: true,
      userId,
      plan: paid.plan ?? "pro",
      admin: false,
      via: "subscription",
    };
  }

  // A user with no subscription may still use AI with credits they BOUGHT.
  // Rewarded-ad and task credits stay parked in the earned bucket, so farming
  // ads can never buy an AI operation.
  const featureKey = options.featureKey ?? "ai_generation";

  if (options.consumePurchased) {
    const idempotencyKey = `ai_credit_${userId}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    const { data, error } = await admin.rpc("spend_purchased_ai_credits", {
      p_user_id: userId,
      p_amount: AI_OPERATION_COST,
      p_feature_key: featureKey,
      p_idempotency_key: idempotencyKey,
    });

    const row = Array.isArray(data) ? data[0] : data;

    if (error) {
      return {
        ok: false,
        response: json(503, {
          error: "AI access could not be verified.",
          code: "AI_GATE_UNAVAILABLE",
        }),
      };
    }

    if (!row?.success) {
      return {
        ok: false,
        response: json(402, {
          error: `FRELUX AI is for paid subscribers, or you can buy AI credits (${AI_OPERATION_COST} credits per operation).`,
          code: "AI_CREDIT_REQUIRED",
          upgradeUrl: "/pricing",
          creditShopUrl: "/rewards",
          creditsNeeded: AI_OPERATION_COST,
          creditsAvailable: row?.purchased_balance ?? 0,
        }),
      };
    }

    return {
      ok: true,
      userId,
      plan: "credits",
      admin: false,
      via: "purchased_credit",
      release: async () => {
        await admin.rpc("refund_purchased_ai_credits", {
          p_user_id: userId,
          p_amount: AI_OPERATION_COST,
          p_idempotency_key: idempotencyKey,
        });
      },
    };
  }

  const { data: wallet } = await admin
    .from("credit_wallets")
    .select("purchased_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const purchased = wallet?.purchased_balance ?? 0;

  if (purchased < AI_OPERATION_COST) {
    return {
      ok: false,
      response: json(402, {
        error: `FRELUX AI is for paid subscribers, or you can buy AI credits (${AI_OPERATION_COST} credits per operation).`,
        code: "AI_CREDIT_REQUIRED",
        upgradeUrl: "/pricing",
        creditShopUrl: "/rewards",
        creditsNeeded: AI_OPERATION_COST,
        creditsAvailable: purchased,
      }),
    };
  }

  return {
    ok: true,
    userId,
    plan: "credits",
    admin: false,
    via: "purchased_credit",
  };
}
