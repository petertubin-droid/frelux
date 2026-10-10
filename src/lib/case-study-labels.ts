// Shared category labels for gallery-backed pages (gallery, case studies).
// Keys match gallery_entries.project_category values.
export const CATEGORY_LABELS: Record<string, string> = {
  painting: "Painting",
  screeding: "Screeding",
  pop_ceiling: "POP Ceiling",
  tiling: "Tiling",
  finishing: "Finishing",
  construction: "Construction",
  other: "Other",
};

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key.replace(/_/g, " ");
}
