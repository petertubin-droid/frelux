import { describe, expect, it } from "vitest";
import { parseJsonFeed } from "../../../supabase/functions/_shared/market-feeds";

/**
 * Supplier catalogues are the only route to real product prices: the shops that
 * publish them expose Shopify or WooCommerce JSON. These tests pin the two
 * shapes so a catalogue that reads correctly never starts reading as an index.
 */

describe("catalogue feeds", () => {
  it("flattens Shopify variants into priced rows", () => {
    const payload = JSON.stringify({
      products: [
        {
          title: "C16 Treated Kiln Dried Timber",
          vendor: "Bravikon",
          product_type: "Timber",
          variants: [
            { title: "45 x 70 x 2400mm", price: "6.45" },
            { title: "45 x 70 x 3000mm", price: "8.10" },
          ],
        },
      ],
    });
    const rows = parseJsonFeed(payload, {
      items: "products",
      currency_default: "GBP",
      supplier: "Bravikon",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].price).toBe(6.45);
    expect(rows[0].currency).toBe("GBP");
    expect(rows[0].name).toContain("C16 Treated Kiln Dried Timber");
    expect(rows[0].brand).toBe("Bravikon");
    expect(rows[1].price).toBe(8.1);
  });

  it("reads WooCommerce prices held in minor units", () => {
    const payload = JSON.stringify([
      {
        name: "Builders Cement 20kg",
        prices: { price: 1250, currency_code: "AUD", currency_minor_unit: 2 },
      },
    ]);
    const rows = parseJsonFeed(payload, {
      supplier: "Prime Building Supplies",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe(12.5);
    expect(rows[0].currency).toBe("AUD");
  });

  it("still reads a flat product that carries its own price", () => {
    const payload = JSON.stringify([
      { name: "Sharp sand bulk bag", price: 54.99, currency: "GBP" },
    ]);
    const rows = parseJsonFeed(payload);
    expect(rows[0].price).toBe(54.99);
    expect(rows[0].currency).toBe("GBP");
  });
});
