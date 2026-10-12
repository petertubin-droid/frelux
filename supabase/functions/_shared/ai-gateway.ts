// supabase/functions/_shared/ai-gateway.ts
// Centralized server-side entitlement, daily allowance reservation, rate limiting and Gemini cost protection.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface GatewayAuthResult {
  userId: string | null;
  clientHash: string;
  accessTier: "admin" | "subscriber" | "rewarded_credit";
  plan?: string;
  reservationId?: string;
}

export interface GateCheckOptions {
  featureKey: string;
  modelName: string;
  promptChars?: number;
}

export interface FinalizeOptions {
  status: "success" | "failed";
  outputChars?: number;
  errorMessage?: string;
  durationMs?: number;
}

export class AiGateway {
  private supabase: ReturnType<typeof createClient>;
  private supabaseAnon: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, serviceRoleKey: string, anonKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey);
    this.supabaseAnon = createClient(supabaseUrl, anonKey);
  }

  /**
   * Resolve calling user identity from Authorization Bearer JWT or x-client-hash.
   */
  async resolveIdentity(req: Request): Promise<{ userId: string | null; clientHash: string }> {
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data, error } = await this.supabaseAnon.auth.getUser(token);
      if (!error && data.user) {
        userId = data.user.id;
      }
    }

    const clientHash = req.headers.get("x-client-hash") ?? 
                       req.headers.get("X-Client-Hash") ?? 
                       (userId ? `user_${userId}` : "unknown_client");

    return { userId, clientHash };
  }

  /**
   * Get server-controlled date string respecting the timezone offset (default UTC+1 Nigeria).
   */
  private getUsageDate(offsetHours: number = 1): string {
    const d = new Date();
    d.setHours(d.getHours() + offsetHours);
    return d.toISOString().split("T")[0];
  }

  /**
   * Check whether user is a verified active subscriber.
   */
  async isSubscriber(userId: string): Promise<{ isSubscribed: boolean; plan?: string }> {
    if (!userId) return { isSubscribed: false };

    const { data } = await this.supabase
      .from("user_paid_status")
      .select("is_paid, plan, paid_until")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data || !data.is_paid) return { isSubscribed: false };

    if (data.paid_until) {
      const expiry = new Date(data.paid_until).getTime();
      if (Date.now() > expiry) return { isSubscribed: false };
    }

    return { isSubscribed: true, plan: data.plan ?? "pro" };
  }

  /**
   * Check whether user is an admin.
   */
  async isAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;
    const { data } = await this.supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return data?.role === "admin";
  }

  /**
   * Authorize and reserve AI operation.
   * Unsubscribed users MUST have 1 unconsumed rewarded ad credit for today.
   */
  async checkAndReserve(
    req: Request,
    options: GateCheckOptions
  ): Promise<GatewayAuthResult> {
    const { userId, clientHash } = await this.resolveIdentity(req);

    // 1. Fetch settings
    const { data: settings } = await this.supabase
      .from("ai_gateway_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const isEnabled = settings?.is_gateway_enabled ?? true;
    if (!isEnabled) {
      throw new Error("AI services are temporarily unavailable for maintenance.");
    }

    const offsetHours = settings?.timezone_offset_hours ?? 1;
    const today = this.getUsageDate(offsetHours);

    // 2. Admin Check
    if (userId) {
      const userIsAdmin = await this.isAdmin(userId);
      if (userIsAdmin && (settings?.admin_exempt ?? true)) {
        // Log admin access
        const { data: logEntry } = await this.supabase
          .from("ai_gateway_operations_log")
          .insert({
            user_id: userId,
            client_hash: clientHash,
            feature_key: options.featureKey,
            model_name: options.modelName,
            access_tier: "admin",
            status: "reserved",
            prompt_chars: options.promptChars ?? 0,
          })
          .select("id")
          .single();

        return {
          userId,
          clientHash,
          accessTier: "admin",
          reservationId: logEntry?.id,
        };
      }
    }

    // 3. Subscriber Check
    if (userId) {
      const sub = await this.isSubscriber(userId);
      if (sub.isSubscribed) {
        const { data: logEntry } = await this.supabase
          .from("ai_gateway_operations_log")
          .insert({
            user_id: userId,
            client_hash: clientHash,
            feature_key: options.featureKey,
            model_name: options.modelName,
            access_tier: "subscriber",
            status: "reserved",
            prompt_chars: options.promptChars ?? 0,
          })
          .select("id")
          .single();

        return {
          userId,
          clientHash,
          accessTier: "subscriber",
          plan: sub.plan,
          reservationId: logEntry?.id,
        };
      }
    }

    // 4. Free Unsubscribed User: Rewarded Ad Enforcement (1 operation per day)
    // Find today's allowance
    let query = this.supabase
      .from("ai_gateway_daily_allowance")
      .select("*")
      .eq("usage_date", today);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.eq("client_hash", clientHash);
    }

    const { data: allowance } = await query.maybeSingle();

    if (!allowance || !allowance.has_ad_credit) {
      throw new Error(
        "NO_AD_REWARD: Unsubscribed users receive 1 daily AI operation after completing a rewarded ad. Please complete an ad or subscribe."
      );
    }

    if (allowance.operations_used >= 1) {
      throw new Error(
        "DAILY_LIMIT_REACHED: You have used your 1 free AI operation for today. Upgrade to a subscription for unlimited access."
      );
    }

    if (allowance.operations_reserved >= 1) {
      throw new Error("OPERATION_IN_PROGRESS: An AI operation is currently processing.");
    }

    // Atomically reserve
    const { error: reserveError } = await this.supabase
      .from("ai_gateway_daily_allowance")
      .update({
        operations_reserved: allowance.operations_reserved + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", allowance.id)
      .eq("operations_reserved", allowance.operations_reserved);

    if (reserveError) {
      throw new Error("Concurrency collision: could not reserve daily AI credit.");
    }

    // Create reservation log
    const { data: logEntry } = await this.supabase
      .from("ai_gateway_operations_log")
      .insert({
        user_id: userId,
        client_hash: clientHash,
        feature_key: options.featureKey,
        model_name: options.modelName,
        access_tier: "rewarded_credit",
        status: "reserved",
        prompt_chars: options.promptChars ?? 0,
      })
      .select("id")
      .single();

    return {
      userId,
      clientHash,
      accessTier: "rewarded_credit",
      reservationId: logEntry?.id,
    };
  }

  /**
   * Finalize reservation: consume quota on success, or release back on system failure.
   */
  async finalize(
    auth: GatewayAuthResult,
    options: FinalizeOptions
  ): Promise<void> {
    const now = new Date().toISOString();
    const isSuccess = options.status === "success";

    // 1. Update operations log
    if (auth.reservationId) {
      await this.supabase
        .from("ai_gateway_operations_log")
        .update({
          status: isSuccess ? "success" : "failed",
          output_chars: options.outputChars ?? 0,
          error_message: options.errorMessage ?? null,
          duration_ms: options.durationMs ?? 0,
          finalized_at: now,
        })
        .eq("id", auth.reservationId);
    }

    // 2. Adjust allowance if rewarded credit
    if (auth.accessTier === "rewarded_credit") {
      const today = this.getUsageDate(1);
      let query = this.supabase
        .from("ai_gateway_daily_allowance")
        .select("id, operations_used, operations_reserved")
        .eq("usage_date", today);

      if (auth.userId) {
        query = query.eq("user_id", auth.userId);
      } else {
        query = query.eq("client_hash", auth.clientHash);
      }

      const { data: allowance } = await query.maybeSingle();
      if (allowance) {
        if (isSuccess) {
          // Success: Mark used, release reservation
          await this.supabase
            .from("ai_gateway_daily_allowance")
            .update({
              operations_used: (allowance.operations_used || 0) + 1,
              operations_reserved: Math.max(0, (allowance.operations_reserved || 1) - 1),
              last_used_at: now,
              updated_at: now,
            })
            .eq("id", allowance.id);
        } else {
          // Failure: Release reservation so user does not lose their earned ad credit!
          await this.supabase
            .from("ai_gateway_daily_allowance")
            .update({
              operations_reserved: Math.max(0, (allowance.operations_reserved || 1) - 1),
              updated_at: now,
            })
            .eq("id", allowance.id);
        }
      }
    }
  }

  /**
   * Grants today's rewarded ad credit upon verified ad completion.
   */
  async grantAdCredit(
    userId: string | null,
    clientHash: string,
    adProvider: string,
    adEventId: string
  ): Promise<{ success: boolean; message: string }> {
    const today = this.getUsageDate(1);
    const now = new Date().toISOString();

    let query = this.supabase
      .from("ai_gateway_daily_allowance")
      .select("*")
      .eq("usage_date", today);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.eq("client_hash", clientHash);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      if (existing.has_ad_credit) {
        return { success: true, message: "Daily AI ad credit is already active." };
      }
      await this.supabase
        .from("ai_gateway_daily_allowance")
        .update({
          has_ad_credit: true,
          ad_credit_granted_at: now,
          ad_provider: adProvider,
          ad_event_id: adEventId,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await this.supabase
        .from("ai_gateway_daily_allowance")
        .insert({
          user_id: userId,
          client_hash: clientHash,
          usage_date: today,
          has_ad_credit: true,
          ad_credit_granted_at: now,
          ad_provider: adProvider,
          ad_event_id: adEventId,
          operations_used: 0,
          operations_reserved: 0,
        });
    }

    return { success: true, message: "Rewarded ad credit granted for today." };
  }
}
