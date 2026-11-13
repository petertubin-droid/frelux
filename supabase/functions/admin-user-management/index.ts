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

        // An admin-added professional is a professional straight away: without a
        // pro_profiles row they would show up as a client and never appear in any
        // professional register or directory listing.
        if (account_type === "pro_worker") {
          const base =
            (full_name || email.split("@")[0])
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 40) || "pro";
          const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
          const { error: proError } = await admin.from("pro_profiles").insert({
            user_id: data.user.id,
            display_name: full_name || email.split("@")[0],
            slug,
            is_listed: false,
            verification_status: "unverified",
          });
          if (proError) {
            return jsonResponse({
              ok: true,
              userId: data.user.id,
              warning:
                "Invitation sent, but the professional profile could not be created. Create it before inviting them to list.",
            });
          }
        }

        await admin.from("admin_account_events").insert({
          user_id: data.user.id,
          actor_id: actorId,
          action: "create",
          to_state: "active",
          detail: { account_type, email },
        });
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

      // Professional details live on pro_profiles; the whitelist there is the
      // authority on which of them an admin may set.
      const proPatch = body.pro as Record<string, unknown> | undefined;
      if (proPatch && typeof proPatch === "object") {
        const { error: proError } = await admin.rpc(
          "admin_update_pro_profile",
          {
            p_user_id: userId,
            p_patch: proPatch,
            p_actor: actorId,
          },
        );
        if (proError) return errorResponse(proError.message, 400);
      }
      return jsonResponse({ ok: true });
    }
    if (action === "suspend" || action === "revoke" || action === "restore") {
      const state =
        action === "restore"
          ? "active"
          : action === "suspend"
            ? "suspended"
            : "revoked";
      const reason = String(body.reason ?? "")
        .trim()
        .slice(0, 300);
      if (state !== "active" && reason.length < 3)
        return errorResponse("Give a reason of at least 3 characters.", 400);

      const { error: stateError } = await admin.rpc("admin_set_account_state", {
        p_user_id: userId,
        p_state: state,
        p_reason: reason || null,
        p_actor: actorId,
      });
      if (stateError) return errorResponse(stateError.message, 400);

      // The state row is the record; the auth ban is what actually stops a
      // suspended or revoked account from signing back in.
      const { error: banError } = await admin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: state === "active" ? "none" : "876000h",
        },
      );
      if (banError) {
        return jsonResponse({
          ok: true,
          state,
          warning:
            "State saved, but the sign-in block could not be applied. Retry to enforce it.",
        });
      }
      return jsonResponse({ ok: true, state });
    }

    if (action === "delete") {
      // History outlives people: an account with orders, contracts or
      // verification records is revoked, never erased.
      const { data: hasHistory, error: historyError } = await admin.rpc(
        "admin_account_has_history",
        { p_user_id: userId },
      );
      if (historyError) return errorResponse(historyError.message, 500);
      if (hasHistory) {
        return errorResponse(
          "This account has orders, contracts or verification history. Revoke it instead: the person loses access and the record stays reviewable.",
          409,
        );
      }
      const reason =
        String(body.reason ?? "")
          .trim()
          .slice(0, 300) || null;

      // One transaction, one audit row, and an error the screen can print.
      // GoTrue's own delete endpoint refused placeholder accounts without ever
      // saying why, which reached the administrator as "Edge Function returned
      // a non-2xx status code".
      const { data: deleted, error: rpcError } = await admin.rpc(
        "admin_delete_account",
        { p_user_id: userId, p_actor: actorId, p_reason: reason },
      );

      if (rpcError) {
        // Older environments may predate the function; fall back to GoTrue so
        // the screen keeps working there.
        await admin.from("admin_account_events").insert({
          user_id: userId,
          actor_id: actorId,
          action: "delete",
          reason,
        });
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) {
          return errorResponse(rpcError.message || error.message, 400);
        }
      }
      return jsonResponse({ ok: true, ...(deleted ?? {}) });
    }
    return errorResponse("Unsupported user-management action.", 400);
  } catch (error) {
    console.error("[admin-user-management] request failed", error);
    return errorResponse("User management request failed.", 500);
  }
});
