// =========================================================
// Request identity for the public API.
//
// Billing promises that a retry carrying the same request id is never charged
// twice, and the database enforces that with a unique index on
// (api_key_id, request_id). The promise was void while the gateway generated a
// fresh uuid for every call and only ever echoed it back: a client retry could
// not name the request it was retrying, so every retry looked like new work and
// was metered as such.
//
// So an inbound X-Request-Id is honoured, but only when it is a bounded token.
// Anything else is replaced with a server uuid: client text must never reach a
// log column unvalidated.
// =========================================================

/** 8 to 64 characters of URL-safe token. No spaces, slashes or newlines. */
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function resolveRequestId(
  headerValue: string | null | undefined,
  generate: () => string = () => crypto.randomUUID(),
): string {
  const candidate = (headerValue ?? "").trim();
  if (REQUEST_ID_PATTERN.test(candidate)) return candidate;
  return generate();
}
