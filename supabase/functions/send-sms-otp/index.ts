// =========================================================
// FRELUX SMS OTP Sender — Termii Gateway
// Called by the send_mobile_otp RPC via pg_net or directly
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Apikey, X-Client-Info",
};

serveWithCors(async (req: Request) => {
  // Audit fix M-7 (2026-09-11): rate limit this endpoint per user
  // (falls back to client IP). OPTIONS preflights are answered at
  // the CORS boundary and never reach this check.
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.AUTH);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let phone_number: unknown;
  try {
    ({ phone_number } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (
    typeof phone_number !== "string" ||
    !/^\+?[0-9][0-9 ()-]{6,20}$/.test(phone_number)
  ) {
    return new Response(JSON.stringify({ error: "Invalid phone number" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!supabaseUrl || !serviceKey || !accessToken) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: authData, error: authError } =
    await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: profile } = await supabase
    .from("pro_profiles")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!profile) {
    return new Response(
      JSON.stringify({ error: "Professional profile not found" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const { data: pendingOtp, error: otpError } = await supabase
    .from("pro_mobile_otp_log")
    .select("otp_code")
    .eq("profile_id", profile.id)
    .eq("phone_number", phone_number)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (otpError || !pendingOtp?.otp_code) {
    return new Response(
      JSON.stringify({ error: "No active verification request found" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const otp_code = pendingOtp.otp_code;

  const termiiKey = Deno.env.get("TERMII_API_KEY") ?? "";
  // Termii only accepts a sender ID that its compliance team has approved.
  // FRELUX is registered but not yet approved, so an OTP sent with it is
  // rejected and the user is locked out of phone verification. N-Alert is
  // Termii's own always-approved alphanumeric sender: fall back to it so
  // verification works today, and use the branded sender the moment approval
  // lands.
  const brandedSender = Deno.env.get("TERMII_SENDER_ID") ?? "FRELUX";
  const SENDER_FALLBACK = "N-Alert";

  if (!termiiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "SMS gateway is not configured. Please contact support.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // This edge function uses Termii's Nigeria endpoint. Never turn a foreign
  // country code into a different Nigerian number.
  const compactPhone = phone_number.replace(/[\s()-]/g, "");
  let formattedPhone: string;
  if (/^\+234[0-9]{10}$/.test(compactPhone)) {
    formattedPhone = compactPhone.slice(1);
  } else if (/^234[0-9]{10}$/.test(compactPhone)) {
    formattedPhone = compactPhone;
  } else if (/^0[0-9]{10}$/.test(compactPhone)) {
    formattedPhone = `234${compactPhone.slice(1)}`;
  } else {
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "SMS verification currently supports Nigerian phone numbers only.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const message = `FRELUX: Your verification code is ${otp_code}. Do not share this code with anyone.`;

  const sendOnce = async (sender: string) => {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: termiiKey,
        to: formattedPhone,
        from: sender,
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });
    return { response, result: await response.json() };
  };

  try {
    // Branded sender first; if Termii rejects it (unapproved sender ID), retry
    // once on the always-approved fallback so verification never dead-ends.
    let { response, result } = await sendOnce(brandedSender);
    const senderRejected =
      !response.ok ||
      (result.code && result.code !== "ok") ||
      /sender|approved|invalid/i.test(String(result.message ?? ""));
    if (senderRejected && brandedSender !== SENDER_FALLBACK) {
      console.warn(
        `Termii rejected sender ${brandedSender}, retrying with ${SENDER_FALLBACK}`,
      );
      ({ response, result } = await sendOnce(SENDER_FALLBACK));
    }

    if (!response.ok || (result.code && result.code !== "ok")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message ?? "SMS delivery failed",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent via SMS",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Network error: " + String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
