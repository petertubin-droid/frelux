/**
 * Returns a safe, user-friendly error message from a caught error.
 * Strips internal/technical details (Stack traces, Supabase codes, etc.)
 * and falls back to a friendly default.
 *
 * Handles both native Error instances AND plain error-shaped objects
 * (e.g. Supabase's PostgrestError, which has a `.message` but is NOT
 * `instanceof Error`). Passing those through `String(err)` produces the
 * useless "[object Object]" — this extracts `.message` first instead.
 *
 * Usage in catch blocks:
 *   catch (e) { setError(getSafeError(e, "Failed to load data")); }
 */
export function getSafeError(
  e: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const msg = extractMessage(e);
  if (msg == null) return fallback;

  // Strip Supabase/Postgres error patterns
  if (msg.includes("relation") && msg.includes("does not exist"))
    return fallback;
  if (msg.includes("permission denied"))
    return "You don't have permission to do that.";
  if (msg.includes("JWT") || msg.includes("token") || msg.includes("session"))
    return "Your session has expired. Please sign in again.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many requests. Please wait a moment and try again.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network error. Check your connection and try again.";
  if (msg.includes("timeout"))
    return "The request timed out. Please try again.";

  // If the message is short and doesn't contain newlines, pass it through
  if (msg.length <= 120 && !msg.includes("\n")) return msg;

  return fallback;
}

/**
 * Extracts a usable string message from a caught value.
 * - Error instances -> .message
 * - Plain objects with a string `.message` (e.g. Supabase PostgrestError) -> .message
 * - Anything else (strings, numbers, null, undefined, opaque objects) -> null,
 *   so callers fall back to the generic message rather than leaking raw
 *   unstructured input (matches prior behavior for non-Error values).
 */
function extractMessage(e: unknown): string | null {
  if (e instanceof Error) return e.message;
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return null;
}
