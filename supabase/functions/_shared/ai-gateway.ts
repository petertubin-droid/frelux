// supabase/functions/_shared/ai-gateway.ts
// FRELUX Centralized AI Access Gate & Credit Economy
// Enforces 3 distinct user states:
// State A: Anonymous Guest (1 initial AI operation per calendar day, shared across all AI features).
// State B: Registered Free User (Deducts 10 credits from credit_wallets via spend_credits RPC).
// State C: Subscriber (Verified paid status without credit deduction if plan covers AI).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface GatewayAuthResult {
  userId: string | null;
  clientHash: string;
  accessTier:
    | "admin"
    | "subscriber"
    | "registered_credits"
    | "reward_grant"
    | "guest_allowance";
  plan?: string;
  reservationId?: string;
  /** Redeemed AI token being spent for this operation (reward_grant tier). */
  rewardRedemptionId?: string;
  creditCost?: number;
  creditsRemaining?: number;
}

export interface GateCheckOptions {
  featureKey: string;
  modelName: string;
  promptChars?: number;
  costOverride?: number;
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
   * Resolve identity: verifies Supabase Auth JWT or falls back to client hash.
   */
  async resolveIdentity(
    req: Request,
  ): Promise<{ userId: string | null; clientHash: string }> {
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data, error } = await this.supabaseAnon.auth.getUser(token);
      if (!error && data.user) {
        userId = data.user.id;
      }
    }

    const clientHash =
      req.headers.get("x-client-hash") ??
      req.headers.get("X-Client-Hash") ??
      (userId ? `user_${userId}` : "unknown_guest");

    return { userId, clientHash };
  }

  /**
   * Server controlled date string for UTC+1 (Nigeria/Lagos).
   */
  private getUsageDate(offsetHours: number = 1): string {
    const d = new Date();
    d.setHours(d.getHours() + offsetHours);
    return d.toISOString().split("T")[0];
  }

  /**
   * Verify whether user is an active paid subscriber.
   */
  async isSubscriber(
    userId: string,
  ): Promise<{ isSubscribed: boolean; plan?: string }> {
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
   * Verify if user is an admin.
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
   * Main gate check before calling Gemini API.
   */
  async checkAndReserve(
    req: Request,
    options: GateCheckOptions,
  ): Promise<GatewayAuthResult> {
    const { userId, clientHash } = await this.resolveIdentity(req);
    const featureCost = options.costOverride ?? 10; // authoritatively 10 credits

    // 1. Check global AI settings
    const { data: settings } = await this.supabase
      .from("ai_gateway_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settings && !settings.is_gateway_enabled) {
      throw new Error(
        "AI services are temporarily unavailable for maintenance.",
      );
    }

    // 2. Admin Check
    if (userId) {
      const userIsAdmin = await this.isAdmin(userId);
      if (userIsAdmin && (settings?.admin_exempt ?? true)) {
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

    // 3. Subscriber Check (State C)
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

    // 4. Anonymous Guest (State A: exactly 1 initial AI operation per calendar day)
    if (!userId) {
      const today = this.getUsageDate(settings?.timezone_offset_hours ?? 1);

      // Check guest daily allowance
      const { data: allowance } = await this.supabase
        .from("ai_gateway_daily_allowance")
        .select("*")
        .eq("client_hash", clientHash)
        .eq("usage_date", today)
        .maybeSingle();

      if (allowance && allowance.operations_used >= 1) {
        throw new Error(
          "GUEST_LIMIT_REACHED: You have used your 1 free guest AI operation for today. Please sign in or create a FRELUX account to continue.",
        );
      }

      // Guest MUST have watched an ad to unlock their 1 operation
      if (!allowance || !allowance.has_ad_credit) {
        throw new Error(
          "GUEST_AD_REQUIRED: Please watch a sponsor ad to unlock your 1 daily free guest AI operation.",
        );
      }

      // Reserve the guest operation atomically. The guest rule is
      // exactly 1 operation per day, so the reservation is a
      // compare-and-set: it only succeeds while nothing has been used
      // AND nothing is pending (operations_used = 0, operations_reserved
      // = 0). Two concurrent requests read the same row; only one CAS
      // wins — the loser gets GUEST_LIMIT_REACHED instead of a second
      // free operation.
      const { data: reservedRow } = await this.supabase
        .from("ai_gateway_daily_allowance")
        .update({
          operations_reserved: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", allowance.id)
        .eq("operations_used", 0)
        .eq("operations_reserved", 0)
        .select("id")
        .maybeSingle();
      if (!reservedRow) {
        throw new Error(
          "GUEST_LIMIT_REACHED: You have used your 1 free guest AI operation for today. Please sign in or create a FRELUX account to continue.",
        );
      }

      const { data: logEntry } = await this.supabase
        .from("ai_gateway_operations_log")
        .insert({
          client_hash: clientHash,
          feature_key: options.featureKey,
          model_name: options.modelName,
          access_tier: "guest_allowance",
          status: "reserved",
          prompt_chars: options.promptChars ?? 0,
        })
        .select("id")
        .single();

      return {
        userId: null,
        clientHash,
        accessTier: "guest_allowance",
        reservationId: logEntry?.id,
      };
    }

    // 5. Registered Free User (State B: costs 10 credits from credit wallet)
    // Query authoritative wallet balance first
    const { data: wallet } = await this.supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    const balance = wallet?.balance ?? 0;

    // Redeemed "AI Estimate Token" is spent here, before any wallet charge.
    // Fixes the reported bug where redeeming deducted credits and granted
    // nothing: redeem_reward only ever recorded an unconsumed redemption and
    // no AI path checked it. Atomic (FOR UPDATE SKIP LOCKED) and free.
    const { data: grantData } = await this.supabase.rpc("consume_reward_grant", {
      p_user_id: userId,
      p_reward_type: "ai_token",
    });
    const grantRow = Array.isArray(grantData) ? grantData[0] : grantData;
    if (grantRow?.success) {
      const { data: grantLog } = await this.supabase
        .from("ai_gateway_operations_log")
        .insert({
          user_id: userId,
          client_hash: clientHash,
          feature_key: options.featureKey,
          model_name: options.modelName,
          access_tier: "reward_grant",
          status: "reserved",
          prompt_chars: options.promptChars ?? 0,
        })
        .select("id")
        .single();

      return {
        userId,
        clientHash,
        accessTier: "reward_grant",
        reservationId: grantLog?.id,
        rewardRedemptionId: grantRow.redemption_id,
        creditCost: 0,
        creditsRemaining: balance,
      };
    }

    if (balance < featureCost) {
      const needed = featureCost - balance;
      throw new Error(
        `INSUFFICIENT_CREDITS: This feature costs ${featureCost} credits. You have ${balance} credits (need ${needed} more). Please visit your Profile to earn credits through rewarded ads or tasks, or purchase credits.`,
      );
    }

    // Atomically deduct/reserve using existing guarded spend_credits RPC
    const idempotencyKey = `ai_req_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const { data: spendResult, error: spendError } = await this.supabase.rpc(
      "spend_credits",
      {
        p_user_id: userId,
        p_feature_key: options.featureKey,
        p_amount: featureCost,
        p_idempotency_key: idempotencyKey,
        p_metadata: {
          feature_key: options.featureKey,
          model_name: options.modelName,
          prompt_chars: options.promptChars ?? 0,
        },
      },
    );

    if (
      spendError ||
      !spendResult ||
      spendResult.length === 0 ||
      !spendResult[0].success
    ) {
      const errMsg =
        spendResult?.[0]?.error ||
        spendError?.message ||
        "Failed to reserve credits";
      if (errMsg.includes("insufficient_credits")) {
        throw new Error(
          `INSUFFICIENT_CREDITS: Insufficient balance. This AI feature costs ${featureCost} credits. Visit your Profile to earn or purchase credits.`,
        );
      }
      throw new Error(`Credit deduction error: ${errMsg}`);
    }

    const newBalance = spendResult[0].new_balance;

    // Log the operation
    const { data: logEntry } = await this.supabase
      .from("ai_gateway_operations_log")
      .insert({
        user_id: userId,
        client_hash: clientHash,
        feature_key: options.featureKey,
        model_name: options.modelName,
        access_tier: "registered_credits",
        status: "reserved",
        prompt_chars: options.promptChars ?? 0,
      })
      .select("id")
      .single();

    return {
      userId,
      clientHash,
      accessTier: "registered_credits",
      reservationId: logEntry?.id,
      creditCost: featureCost,
      creditsRemaining: newBalance,
    };
  }

  /**
   * Finalize operation: updates log, marks guest use consumed, or restores credits on failure.
   */
  async finalize(
    auth: GatewayAuthResult,
    options: FinalizeOptions,
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

    // 2. Handle guest allowance finalization
    if (auth.accessTier === "guest_allowance") {
      const today = this.getUsageDate(1);
      const { data: allowance } = await this.supabase
        .from("ai_gateway_daily_allowance")
        .select("id, operations_used, operations_reserved")
        .eq("client_hash", auth.clientHash)
        .eq("usage_date", today)
        .maybeSingle();

      if (allowance) {
        if (isSuccess) {
          await this.supabase
            .from("ai_gateway_daily_allowance")
            .update({
              operations_used: (allowance.operations_used || 0) + 1,
              operations_reserved: Math.max(
                0,
                (allowance.operations_reserved || 1) - 1,
              ),
              last_used_at: now,
              updated_at: now,
            })
            .eq("id", allowance.id);
        } else {
          // Release reservation on failure so guest can retry
          await this.supabase
            .from("ai_gateway_daily_allowance")
            .update({
              operations_reserved: Math.max(
                0,
                (allowance.operations_reserved || 1) - 1,
              ),
              updated_at: now,
            })
            .eq("id", allowance.id);
        }
      }
    }

    // 3. Release a redeemed AI token if the operation failed, so the user
    // keeps the token instead of losing it to a provider error.
    if (
      !isSuccess &&
      auth.accessTier === "reward_grant" &&
      auth.rewardRedemptionId
    ) {
      await this.supabase
        .from("reward_redemptions")
        .update({
          consumed_at: null,
          consumed_context: {
            released_after: "ai_gateway_failure",
            error: options.errorMessage ?? null,
          },
        })
        .eq("id", auth.rewardRedemptionId);
    }

    // 4. Handle Registered Credits Refund on System/API failure
    if (
      !isSuccess &&
      auth.accessTier === "registered_credits" &&
      auth.userId &&
      auth.creditCost
    ) {
      // Refund the reserved credits back to the user's wallet
      await this.supabase.rpc("admin_adjust_credits_v2", {
        p_user_id: auth.userId,
        p_amount: auth.creditCost,
        p_reason: `Refund for failed AI operation (${options.errorMessage || "System error"})`,
        p_admin_user_id: auth.userId,
      });
    }
  }
}
