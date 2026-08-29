// =========================================================
// AI Admin Assistant — Supabase Edge Function
// =========================================================
// Proxies chat messages from the FRELUX admin panel to the
// Solas Superagent API (Base44). Admins can describe issues,
// request fixes, and get AI-powered responses.
//
// Flow:
//   1. Admin sends { message, conversationId? } from admin UI
//   2. This function reads the Solas API key from env or DB
//   3. Creates or reuses a conversation with Solas
//   4. Sends the message, waits for the agent loop to complete
//   5. Returns { response, conversationId, messageId }
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  corsHeaders as _corsHeaders,
  jsonResponse,
  errorResponse,
  handleCors,
} from "../_shared/cors.ts";

const SUPERAGENT_BASE = "https://app.base44.com/api/agents";
const DEFAULT_AGENT_ID = "6a872e1df3b5e9fc45fc13fb";

interface RequestBody {
  message: string;
  conversationId?: string;
  // Optional: for tracking
  actionTitle?: string;
  actionCategory?: string;
}

async function getApiKey(
  supabaseClient: ReturnType<typeof createClient>,
): Promise<string | null> {
  // 1. Try environment variable (Supabase secret)
  const envKey = Deno.env.get("SOLAS_API_KEY");
  if (envKey) return envKey;

  // 2. Fall back to site_settings table
  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("solas_api_key")
    .limit(1)
    .single();

  if (error || !data?.solas_api_key) return null;
  return data.solas_api_key;
}

async function getAgentId(
  supabaseClient: ReturnType<typeof createClient>,
): Promise<string> {
  const { data } = await supabaseClient
    .from("site_settings")
    .select("solas_agent_id")
    .limit(1)
    .single();
  return data?.solas_agent_id || DEFAULT_AGENT_ID;
}

async function createConversation(
  agentId: string,
  apiKey: string,
): Promise<{ id: string } | null> {
  try {
    const res = await fetch(`${SUPERAGENT_BASE}/${agentId}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: apiKey,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      console.error(
        "[ai-admin-assistant] createConversation failed:",
        res.status,
        await res.text(),
      );
      return null;
    }

    const data = await res.json();
    // The API might return { id } or { conversation: { id } } or similar
    return {
      id: data.id || data.conversation_id || data.conversation?.id || data._id,
    };
  } catch (err) {
    console.error("[ai-admin-assistant] createConversation error:", err);
    return null;
  }
}

async function sendMessage(
  agentId: string,
  conversationId: string,
  apiKey: string,
  message: string,
): Promise<{ response: string; messageId: string } | null> {
  try {
    const res = await fetch(
      `${SUPERAGENT_BASE}/${agentId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          api_key: apiKey,
        },
        body: JSON.stringify({ message }),
      },
    );

    if (!res.ok) {
      console.error(
        "[ai-admin-assistant] sendMessage failed:",
        res.status,
        await res.text(),
      );
      return null;
    }

    const data = await res.json();
    // Extract the assistant's response text
    const responseText =
      data.response ||
      data.message ||
      data.content ||
      data.text ||
      (typeof data === "string" ? data : JSON.stringify(data));
    const messageId = data.id || data.message_id || data._id || "";

    return { response: responseText, messageId };
  } catch (err) {
    console.error("[ai-admin-assistant] sendMessage error:", err);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Authentication required", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return errorResponse("Invalid authentication", 401);
    }

    // Verify admin role
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return errorResponse("Admin access required", 403);
    }

    const body: RequestBody = await req.json();
    if (!body.message || !body.message.trim()) {
      return errorResponse("Message is required", 400);
    }

    // Get API key and agent ID
    const apiKey = await getApiKey(supabaseClient);
    if (!apiKey) {
      return jsonResponse(
        {
          error:
            "Solas API key not configured. Go to Admin → AI Assistant → Settings to add it.",
          needsConfig: true,
        },
        400,
      );
    }

    const agentId = await getAgentId(supabaseClient);

    // Create or reuse conversation
    let conversationId = body.conversationId;
    if (!conversationId) {
      const conv = await createConversation(agentId, apiKey);
      if (!conv) {
        return errorResponse(
          "Failed to create conversation with Solas. Check the API key.",
          502,
        );
      }
      conversationId = conv.id;
    }

    // Send message and get response
    const result = await sendMessage(
      agentId,
      conversationId,
      apiKey,
      body.message,
    );
    if (!result) {
      return errorResponse(
        "Failed to get response from Solas. The request may have timed out.",
        502,
      );
    }

    // Log the action
    if (body.actionTitle) {
      await supabaseClient.from("admin_ai_actions").insert({
        reported_by: user.id,
        title: body.actionTitle,
        description: body.message,
        category: body.actionCategory || "bug",
        conversation_id: conversationId,
        message_id: result.messageId,
        status: "in_progress",
        resolution: result.response,
      });
    }

    return jsonResponse({
      response: result.response,
      conversationId,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error("[ai-admin-assistant] Unhandled error:", err);
    return errorResponse("Internal server error", 500);
  }
});
