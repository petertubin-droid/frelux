import { describe, it, expect } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenUser,
  givenRows,
  givenRpc,
  req,
  OWNER_AUTH,
  json,
} from "../_shared/testing/harness.ts";

const handler = getHandler();
const USER_ID = "11111111-1111-4111-8111-111111111111";

function givenUser42() {
  givenUser({ id: USER_ID, email: "user@test.local" });
}

describe("sitemap — XML sitemap generation", () => {
  it("serves static public routes", async () => {
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain(
      "<loc>https://freluxtools.netlify.app/paint-calculator</loc>",
    );
    expect(xml).not.toContain("/admin");
  });

  it("includes dynamic learn articles from the database", async () => {
    givenRows("learn_articles", [
      {
        slug: "how-to-paint-a-wall",
        updated_at: "2026-09-01T10:00:00Z",
        published_at: "2026-09-01T10:00:00Z",
      },
    ]);
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("/learn/how-to-paint-a-wall");
  });

  it("includes indexable marketplace categories only", async () => {
    givenRows("pro_categories", [
      { slug: "painters", name: "Painters", seo_indexable: true },
      { slug: "secret", name: "Secret", seo_indexable: false },
    ]);
    const res = await handler(req("GET", ""));
    const xml = await res.text();
    expect(xml).toContain("/marketplace/category/painters");
    expect(xml).not.toContain("/marketplace/category/secret");
  });
});
