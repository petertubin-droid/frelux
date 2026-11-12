/**
 * Sanitising free text before it is composed into a PostgREST filter.
 *
 * Supabase's `.or("title.ilike.%term%,description.ilike.%term%")` takes a filter
 * *expression*, not a value, so a term containing a comma, a parenthesis or a
 * percent sign becomes part of the query language. "cheap, used" turns into a
 * broken filter at best; a crafted term adds conditions the caller never asked
 * for. Neither is acceptable on a public search box, so the term is stripped to
 * letters, digits, spaces and hyphens before it is interpolated, and the result
 * is length-capped.
 */
export function sanitizeSearchTerm(value: string, maxLength = 80): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** True when a term survives sanitising with enough left to search on. */
export function hasSearchTerm(value: string): boolean {
  return sanitizeSearchTerm(value).length > 0;
}

/**
 * Build the `or()` expression for a set of ilike text columns.
 *
 * The term is sanitised first, so the returned string is always a plain list of
 * `column.ilike.%text%` clauses and never gains conditions of the caller's
 * choosing. Returns null when nothing searchable survives: an empty `.or()` would
 * be an error, and `ilike.%%` would match everything.
 */
export function buildIlikeOrFilter(
  fields: string[],
  term: string,
): string | null {
  const safe = sanitizeSearchTerm(term);
  if (!safe || fields.length === 0) return null;
  return fields.map((field) => `${field}.ilike.%${safe}%`).join(",");
}
