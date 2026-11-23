// =========================================================
// Ported: verify-rewarded-ad and grant-rewarded-unlock
//
// Both are refusals by design, and the port keeps that: no client-generated
// token, SDK callback or provider flag proves an ad was viewed, so neither
// endpoint grants credits or unlocks until a provider-specific server-side
// verification is correlated to a server-created ad session.
//
// The port must not soften this. A refusal that moved to a faster runtime is
// still a refusal; nothing here can invent a reward.
// =========================================================

import {
  checkRateLimit,
  clientKey,
  json,
  type EdgeHandler,
} from "./runtime";

const AD_LIMIT = { maxRequests: 30, windowMs: 60_000 };

function refusal(
  request: Request,
  cors: Record<string, string>,
  body: unknown,
  required: readonly string[],
  successField: "success" | "ok",
): Response {
  const limit = checkRateLimit(`ad:${clientKey(request)}`, AD_LIMIT);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Try again shortly." }),
      {
        status: 429,
        headers: {
          ...cors,
          "content-type": "application/json",
          "retry-after": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  const record = (body ?? {}) as Record<string, unknown>;
  for (const field of required) {
    if (typeof record[field] !== "string" || !(record[field] as string).trim()) {
      return json(
        { error: `${required.join(" and ")} are required`, code: "BAD_REQUEST" },
        400,
        cors,
      );
    }
  }

  const provider =
    typeof record.adProvider === "string" ? record.adProvider.trim() : null;

  return json(
    {
      [successField]: false,
      error:
        successField === "success" && required.includes("toolKey")
          ? "Reward verification is not configured for this ad provider. No unlock was granted."
          : "Reward verification is not configured for this ad provider. No credits or unlocks were granted.",
      code: "SERVER_VERIFICATION_NOT_CONFIGURED",
      provider,
    },
    503,
    cors,
  );
}

async function readJson(request: Request): Promise<unknown | "invalid"> {
  try {
    return await request.json();
  } catch {
    return "invalid";
  }
}

export const verifyRewardedAdHandler: EdgeHandler = async (request, _env, _ctx, cors) => {
  const body = await readJson(request);
  if (body === "invalid") {
    return json({ error: "Invalid JSON", code: "BAD_REQUEST" }, 400, cors);
  }
  const record = (body ?? {}) as Record<string, unknown>;
  if (
    record.mode !== undefined &&
    !["earn_credits", "unlock_feature", "unlock_guest"].includes(String(record.mode))
  ) {
    return json({ error: "Invalid mode", code: "BAD_REQUEST" }, 400, cors);
  }
  return refusal(request, cors, record, ["adProvider", "adEventId"], "success");
};

export const grantRewardedUnlockHandler: EdgeHandler = async (request, _env, _ctx, cors) => {
  const body = await readJson(request);
  if (body === "invalid") {
    return json({ error: "Invalid JSON body", code: "BAD_REQUEST" }, 400, cors);
  }
  return refusal(request, cors, body, ["toolKey", "clientHash"], "success");
};

export const verifyRewardedAdConfig = {
  name: "verify-rewarded-ad",
  methods: ["POST", "OPTIONS"],
  requiredBindings: [],
  handler: verifyRewardedAdHandler,
};

export const grantRewardedUnlockConfig = {
  name: "grant-rewarded-unlock",
  methods: ["POST", "OPTIONS"],
  requiredBindings: [],
  handler: grantRewardedUnlockHandler,
};
