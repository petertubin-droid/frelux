/**
 * Returns a safe, user-friendly error message from a caught error.
 * Strips internal/technical details (Stack traces, Supabase codes, etc.)
 * and falls back to a friendly default.
 *
 * Usage in catch blocks:
 *   catch (e) { setError(getSafeError(e, "Failed to load data")); }
 */
export function getSafeError(
  e: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (e instanceof Error) {
    const msg = e.message;

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
    if (msg.length <= 120 && !msg.includes("\n"))
      return msg;

    return fallback;
  }
  return fallback;
}
