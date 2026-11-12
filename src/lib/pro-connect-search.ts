import { sanitizeSearchTerm } from "@/lib/search-term";

/**
 * Sanitise free-text directory terms before composing a PostgREST `or` filter.
 *
 * One implementation, shared with the marketplace: `.or()` takes a filter
 * expression, so any search box that interpolates raw text into it is a query
 * injection point.
 */
export function normalizeProConnectSearchQuery(value: string): string {
  return sanitizeSearchTerm(value);
}
