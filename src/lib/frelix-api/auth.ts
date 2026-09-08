// =========================================================
// FRELUX PHASE 7 — API AUTHORIZATION & QUOTA LOGIC
//
// Pure decision logic shared by the API gateway (edge runtime)
// and its tests. All database access is injected — this module
// NEVER trusts client-provided identity: the tenant is resolved
// from the key record, never from request headers or payloads.
// =========================================================

export type ApiKeyStatus = "active" | "revoked" | "disabled" | "expired";

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  status: ApiKeyStatus;
  permissions: string[];
  plan_key: string;
  rate_limit_per_minute: number;
  daily_quota: number;
  monthly_quota: number;
  expires_at: string | null;
}

export type AuthFailureCode =
  | "invalid_api_key"
  | "revoked_api_key"
  | "disabled_api_key"
  | "expired_api_key"
  | "rate_limit_exceeded"
  | "daily_quota_exceeded"
  | "monthly_quota_exceeded"
  | "capability_not_allowed";

export interface AuthSuccess {
  ok: true;
  keyId: string;
  userId: string;
  permissions: string[];
  rateLimitPerMinute: number;
}

export type AuthResult =
  | AuthSuccess
  | { ok: false; code: AuthFailureCode; retryAfterSeconds?: number };

/** Status + expiration validation. Key existence is checked by the caller (hash lookup). */
export function evaluateKeyStatus(row: ApiKeyRecord, now: Date): AuthResult {
  if (row.status === "revoked") return { ok: false, code: "revoked_api_key" };
  if (row.status === "disabled") return { ok: false, code: "disabled_api_key" };
  if (
    row.expires_at !== null &&
    new Date(row.expires_at).getTime() <= now.getTime()
  ) {
    return { ok: false, code: "expired_api_key" };
  }
  if (row.status !== "active") return { ok: false, code: "invalid_api_key" };
  return {
    ok: true,
    keyId: row.id,
    userId: row.user_id,
    permissions: row.permissions,
    rateLimitPerMinute: row.rate_limit_per_minute,
  };
}

/** Per-minute rate limit (durable count from metering). */
export function evaluateRateLimit(
  requestsLastMinute: number,
  rateLimitPerMinute: number,
): { allowed: boolean; retryAfterSeconds: number } {
  if (requestsLastMinute < rateLimitPerMinute)
    return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: 60 };
}

export type QuotaScope = "daily" | "monthly";

/** Daily / monthly request quotas from the key's plan configuration. */
export function evaluateQuota(
  scope: QuotaScope,
  used: number,
  quota: number,
): { allowed: boolean; retryAfterSeconds: number } {
  if (used < quota) return { allowed: true, retryAfterSeconds: 0 };
  return scope === "daily"
    ? { allowed: false, retryAfterSeconds: 86400 }
    : { allowed: false, retryAfterSeconds: 2592000 };
}

/**
 * Capability authorization. permissions is the key's allow-list;
 * '*' grants all generally-available capabilities. Regional
 * gating is layered on top by the gateway from plan config.
 */
export function capabilityAllowed(
  permissions: string[],
  capability: string,
): boolean {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(capability);
}

/** Region entitlement from a plan config's `regions` array ('*' = all). */
export function regionAllowed(
  planRegions: unknown,
  requestedRegion: string | null,
): boolean {
  if (!Array.isArray(planRegions)) return false;
  if (planRegions.includes("*")) return true;
  if (requestedRegion === null) return true; // no regional scope requested
  return planRegions.includes(requestedRegion);
}

// ---------------------------------------------------------
// Structured API error contract (Phase 7 §22, §19)
// ---------------------------------------------------------
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    documentation?: string;
  };
}

export const API_ERROR_DOCUMENTATION = "https://frelux.app/developers#errors";

export function apiError(
  code: string,
  message: string,
  requestId?: string,
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      ...(requestId ? { requestId } : {}),
      documentation: API_ERROR_DOCUMENTATION,
    },
  };
}
