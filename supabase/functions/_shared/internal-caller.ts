/**
 * Who is allowed to run an internal edge function.
 *
 * Several functions exist for cron or for another function to call: they carry
 * the service role key, mutate data, and are deployed with verify_jwt off so the
 * cron invoker can reach them without a user session. That combination means the
 * platform gateway is not a gate at all, and the only gate is this check.
 *
 * Two callers are legitimate:
 *   - the service role key itself, presented as a bearer token by another
 *     function (or by the scheduler when it knows the key);
 *   - a per-function cron secret in `x-cron-secret`, when one is configured.
 *
 * Everything else is refused. A missing configuration fails closed: an endpoint
 * whose secret was never set must not become world-callable, which is the bug
 * this module exists to prevent.
 */

export type CallerKind = "internal" | "cron" | "none";

export interface CallerInput {
  /** Raw Authorization header, or null when absent. */
  authorization: string | null;
  /** Header value of x-cron-secret, or null when absent. */
  cronHeader: string | null;
  serviceRoleKey: string | undefined;
  cronSecret: string | undefined;
}

function bearer(authorization: string | null): string {
  if (!authorization) return "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : "";
}

/** Timing-safe string compare that does not leak length through early exit. */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function classifyCaller(input: CallerInput): CallerKind {
  const token = bearer(input.authorization);
  const serviceKey = (input.serviceRoleKey ?? "").trim();
  if (token && serviceKey && safeEqual(token, serviceKey)) return "internal";

  const header = (input.cronHeader ?? "").trim();
  const secret = (input.cronSecret ?? "").trim();
  if (header && secret && safeEqual(header, secret)) return "cron";

  return "none";
}

/** Convenience wrapper: classify straight from a Request. */
export function callerKindFor(
  req: Request,
  opts: { serviceRoleKey: string | undefined; cronSecret?: string | undefined },
): CallerKind {
  return classifyCaller({
    authorization: req.headers.get("Authorization"),
    cronHeader: req.headers.get("x-cron-secret"),
    serviceRoleKey: opts.serviceRoleKey,
    cronSecret: opts.cronSecret,
  });
}
