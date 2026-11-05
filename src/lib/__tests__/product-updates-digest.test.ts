import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261105103000_product_updates_digest.sql",
  ),
  "utf8",
);
const fn = readFileSync(
  resolve(process.cwd(), "supabase/functions/product-updates-digest/index.ts"),
  "utf8",
);

describe("product updates digest", () => {
  it("runs every three days and is safe to reschedule", () => {
    expect(migration).toContain("'0 8 */3 * *'");
    expect(migration).toContain("cron.unschedule('product-updates-digest')");
    expect(migration).toContain("x-digest-token");
  });

  it("keeps the token gate and the unsubscribe route", () => {
    expect(fn).toContain("product_updates_digest_tokens");
    expect(fn).toContain("status: 401");
    expect(fn).toContain("newsletter-unsubscribe?token=");
  });

  it("never repeats an announcement to the same subscriber", () => {
    expect(fn).toContain("product_update_deliveries");
    expect(fn).toContain('onConflict: "subscriber_id,update_id"');
    expect(fn).toContain("ignoreDuplicates: true");
  });

  it("stays silent when there is nothing new to say", () => {
    expect(fn).toContain("if (batch.length === 0)");
    expect(fn).toContain('reason: "no published updates"');
  });

  it("seeds real shipped work rather than placeholders", () => {
    for (const slug of [
      "vernacular-units",
      "fence-block-calculator",
      "german-floor-calculator",
      "tank-stand-design",
      "imperial-units",
      "price-gateway",
      "borehole-faq",
      "one-page-header",
    ]) {
      expect(migration).toContain(`'${slug}'`);
    }
    expect(migration).toContain("on conflict (slug) do nothing");
  });
});
