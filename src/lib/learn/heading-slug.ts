/**
 * Shared heading-id slug used by the Learn article page and the
 * wall-finishing article page so TOC anchors always match rendered ids.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
