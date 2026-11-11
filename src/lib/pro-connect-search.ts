/** Sanitize free-text directory terms before composing a PostgREST `or` filter. */
export function normalizeProConnectSearchQuery(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
