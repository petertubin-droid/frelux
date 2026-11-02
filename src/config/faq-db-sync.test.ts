import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildFaqDbRows } from "@/config/faq-db-rows";
import { TOOL_FAQS } from "@/config/tool-faqs";

const manifest = JSON.parse(
  readFileSync("supabase/seed/tool-faq-articles.json", "utf8"),
) as ReturnType<typeof buildFaqDbRows>;

const migration = readFileSync(
  "supabase/migrations/20261031770000_tool_faq_articles.sql",
  "utf8",
);

describe("tool FAQ content in the database", () => {
  it("seeds a row for every tool with five questions and its article", () => {
    const rows = buildFaqDbRows();
    expect(rows).toHaveLength(TOOL_FAQS.length);
    for (const row of rows) {
      expect(row.question_count, row.slug).toBe(5);
      expect(row.questions, row.slug).toHaveLength(5);
      expect(row.article.description.length, row.slug).toBeGreaterThan(80);
      expect(row.article.functions.length, row.slug).toBeGreaterThanOrEqual(3);
      expect(row.seo.title, row.slug).toBeTruthy();
    }
    expect(rows.reduce((sum, row) => sum + row.question_count, 0)).toBe(
      TOOL_FAQS.length * 5,
    );
  });

  it("keeps the committed seed identical to the registries", () => {
    expect(manifest).toEqual(buildFaqDbRows());
  });

  it("writes every row into the migration, and nothing else", () => {
    const seeded = [...migration.matchAll(/^ {2}\('([a-z0-9-]+)', /gm)].map(
      (match) => match[1],
    );
    expect(seeded.sort()).toEqual(
      buildFaqDbRows()
        .map((r) => r.slug)
        .sort(),
    );
  });

  it("publishes read access and keeps writes to admins", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("Public can read published tool FAQs");
    expect(migration).toContain("Admins can manage tool FAQs");
    expect(migration).toContain(
      "GRANT SELECT ON public.tool_faq_articles TO anon, authenticated",
    );
  });
});
