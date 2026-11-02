import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { serveWithCors } from "../_shared/serve.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serveWithCors(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey)
      return errorResponse("User management is not configured.", 500);
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return errorResponse("Authentication required.", 401);
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } =
      await admin.auth.getUser(token);
    if (authError || !authData.user)
      return errorResponse("Invalid authentication.", 401);
    const actorId = authData.user.id;
    const { data: actor, error: actorError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", actorId)
      .single();
    if (actorError || actor?.role !== "admin")
      return errorResponse("Admin access required.", 403);

    const body = await req.json();
    const action = body?.action;
    if (action === "invite") {
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      if (!EMAIL_RE.test(email))
        return errorResponse("Enter a valid email address.", 400);
      const full_name = String(body.full_name ?? "")
        .trim()
        .slice(0, 120);
      const phone = String(body.phone ?? "")
        .trim()
        .slice(0, 40);
      const account_type =
        body.account_type === "pro_worker" ? "pro_worker" : "client";
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name, phone, account_type },
      });
      if (error) return errorResponse(error.message, 400);
      if (data.user?.id) {
        const { error: profileError } = await admin
          .from("profiles")
          .update({ full_name, phone, account_type })
          .eq("id", data.user.id);
        if (profileError)
          return errorResponse(
            "Invitation was sent, but profile details could not be saved. Edit the user after they appear.",
            500,
          );
      }
      return jsonResponse({ ok: true, userId: data.user?.id });
    }
    const userId = String(body.userId ?? "");
    if (!UUID_RE.test(userId))
      return errorResponse("A valid user ID is required.", 400);
    if (userId === actorId)
      return errorResponse(
        "You cannot modify or delete your own admin account here.",
        400,
      );
    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();
    if (targetError || !target) return errorResponse("User not found.", 404);
    if (target.role === "admin")
      return errorResponse(
        "Admin accounts are protected from this user-management screen.",
        403,
      );

    if (action === "update") {
      const full_name = String(body.full_name ?? "")
        .trim()
        .slice(0, 120);
      const phone = String(body.phone ?? "")
        .trim()
        .slice(0, 40);
      const account_type =
        body.account_type === "pro_worker" ? "pro_worker" : "client";
      const { error: profileError } = await admin
        .from("profiles")
        .update({ full_name, phone, account_type })
        .eq("id", userId);
      if (profileError) return errorResponse(profileError.message, 500);
      return jsonResponse({ ok: true });
    }
    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return errorResponse(error.message, 400);
      return jsonResponse({ ok: true });
    }
    return errorResponse("Unsupported user-management action.", 400);
  } catch (error) {
    console.error("[admin-user-management] request failed", error);
    return errorResponse("User management request failed.", 500);
  }
});
