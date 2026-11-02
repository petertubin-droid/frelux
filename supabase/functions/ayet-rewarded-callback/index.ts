import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";
import { verifyAyetS2SSignature } from "../_shared/ayet-signature.ts";

const headers = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Ayetstudios-Security-Hash",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
// ayeT expects HTTP 200 acknowledgements for callbacks. Invalid or unrelated
// callbacks are acknowledged but never grant anything; transient DB failures
// return 500 so ayeT can retry.
serveWithCors(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "GET")
    return json({ success: false, error: "Method not allowed" }, 405);
  const url = new URL(req.url);
  if (
    [...url.searchParams.keys()].some(
      (key) => url.searchParams.getAll(key).length !== 1,
    )
  ) {
    console.warn("ayeT callback rejected: duplicate query parameters");
    return json({ success: false, error: "Rejected" });
  }
  const transactionId = url.searchParams.get("transaction_id") ?? "";
  const externalIdentifier = url.searchParams.get("external_identifier") ?? "";
  const adslotId = url.searchParams.get("adslot_id") ?? "";
  if (!transactionId || !externalIdentifier || !adslotId) {
    console.warn("ayeT callback rejected: required parameters missing");
    return json({ success: false, error: "Rejected" });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey)
    return json({ error: "Server configuration error" }, 500);
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: provider, error: providerError } = await admin
    .from("ad_providers")
    .select("is_active, credentials, settings")
    .eq("slug", "ayet_studios")
    .maybeSingle();
  if (providerError)
    return json({ error: "Could not read provider configuration" }, 500);
  const creds = provider?.credentials as Record<string, unknown> | undefined;
  const settings = provider?.settings as Record<string, unknown> | undefined;
  if (
    !provider?.is_active ||
    settings?.rewarded_video_enabled !== true ||
    typeof creds?.api_key !== "string" ||
    !creds.api_key.trim() ||
    typeof settings?.rewarded_adslot_id !== "string" ||
    settings.rewarded_adslot_id.trim() !== adslotId
  ) {
    console.warn(
      "ayeT callback rejected: inactive or mismatched configuration",
    );
    return json({ success: false, error: "Rejected" });
  }
  const validSignature = await verifyAyetS2SSignature(
    url.searchParams,
    req.headers.get("X-Ayetstudios-Security-Hash"),
    creds.api_key,
  );
  if (!validSignature) {
    console.warn("ayeT callback rejected: invalid signature");
    return json({ success: false, error: "Rejected" });
  }
  const { data: result, error } = await admin.rpc(
    "complete_ayet_rewarded_session",
    {
      p_external_identifier: externalIdentifier,
      p_transaction_id: transactionId,
      p_metadata: { adslot_id: adslotId, provider: "ayet_studios" },
    },
  );
  if (error) {
    console.error("ayeT callback reward RPC failed", error.message);
    return json({ error: "Could not process verified callback" }, 500);
  }
  const row = result?.[0];
  if (
    row?.success ||
    row?.error === "session_already_used" ||
    row?.error === "duplicate_transaction"
  ) {
    return json({
      success: true,
      message: row?.already_awarded
        ? "Already processed"
        : "Callback processed",
    });
  }
  console.warn("ayeT callback not awarded", row?.error ?? "unknown");
  return json({ success: false, error: "No reward was granted" });
});
