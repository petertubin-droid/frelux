/**
 * Verified caller identity for native handlers.
 *
 * A JWT payload is readable by anyone, so the subject claim is only a bucket
 * key, never proof of who is calling. Anything that writes asks Supabase to
 * verify the token and returns the user id it vouches for.
 */
import type { ApiEnv } from "../api";

export async function verifiedUserId(
  request: Request,
  env: ApiEnv,
): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;

  try {
    const response = await fetch(
      `${env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`,
      {
        headers: {
          authorization: auth,
          apikey: env.SUPABASE_ANON_KEY,
        },
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { id?: unknown };
    return typeof body?.id === "string" && body.id ? body.id : null;
  } catch {
    return null;
  }
}
