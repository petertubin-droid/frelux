import { describe, expect, it } from "vitest";
import {
  buildOciPunchoutUrl,
  parseOciCartForm,
  type OciMerchantConfig,
} from "./punchout-oci";

const config: OciMerchantConfig = {
  merchantName: "Bunnings Trade",
  baseUrl: "https://trade.bunnings.example/sap/bbp/bb_pshopping",
  username: "FRELUX-TECH-USER",
  password: "oci-pass-1",
  currency: "AUD",
};

describe("buildOciPunchoutUrl", () => {
  it("appends the standard OCI hook parameters", () => {
    const r = buildOciPunchoutUrl(config, {
      hookUrl: "https://freluxtools.netlify.app/api/punchout/oci-return",
    });
    expect(r.ok).toBe(true);
    expect(r.url).toContain(config.baseUrl);
    const url = new URL(r.url!);
    expect(url.searchParams.get("username")).toBe("FRELUX-TECH-USER");
    expect(url.searchParams.get("password")).toBe("oci-pass-1");
    expect(url.searchParams.get("HOOK_LEVEL")).toBe("2");
    expect(url.searchParams.get("HOOK_URL")).toBe(
      "https://freluxtools.netlify.app/api/punchout/oci-return",
    );
  });

  it("uses & when the base URL already has query parameters", () => {
    const r = buildOciPunchoutUrl(
      { ...config, baseUrl: "https://x.io/shop?lang=en" },
      { hookUrl: "https://freluxtools.netlify.app/hook" },
    );
    expect(r.url).toContain("shop?lang=en&");
  });

  it("refuses missing credentials and hook URL", () => {
    expect(
      buildOciPunchoutUrl({ ...config, username: "" }, { hookUrl: "https://x.io/h" }).ok,
    ).toBe(false);
    expect(
      buildOciPunchoutUrl(config, { hookUrl: "" }).ok,
    ).toBe(false);
  });
});

describe("parseOciCartForm", () => {
  const cart = new URLSearchParams({
    "NEW_ITEM-MATNR[1]": "BUN-PX-20L",
    "NEW_ITEM-DESCRIPTION[1]": "Premium Exterior Paint 20L",
    "NEW_ITEM-QUANTITY[1]": "20",
    "NEW_ITEM-UNITPRICE[1]": "89.90",
    "NEW_ITEM-PRICEUNIT[1]": "1",
    "NEW_ITEM-UNIT[1]": "EA",
    "NEW_ITEM-CURRENCY[1]": "AUD",
    "NEW_ITEM-MATNR[2]": "BUN-CEM-50",
    "NEW_ITEM-DESCRIPTION[2]": "Cement 50kg",
    "NEW_ITEM-QUANTITY[2]": "100",
    "NEW_ITEM-UNITPRICE[2]": "8.50",
    "NEW_ITEM-PRICEUNIT[2]": "10", // price covers 10 units
    "NEW_ITEM-UNIT[2]": "BAG",
    "NEW_ITEM-CURRENCY[2]": "AUD",
    "NEW_ITEM-TOTALPRICE": "1883.00",
  });

  it("parses the item blocks and honours PRICEUNIT", () => {
    const c = parseOciCartForm(cart);
    expect(c.ok).toBe(true);
    expect(c.lines).toHaveLength(2);
    expect(c.lines[0]).toMatchObject({
      matnr: "BUN-PX-20L",
      quantity: 20,
      unitPrice: 89.9,
      priceUnit: 1,
      lineTotal: 1798, // 20 × 89.90
    });
    // 100 units at 8.50 per 10 units = 85.00
    expect(c.lines[1].lineTotal).toBe(85);
    expect(c.total).toBe(1883); // 1798 + 85
    expect(c.currency).toBe("AUD");
  });

  it("refuses a total that disagrees with the line sum", () => {
    const tampered = new URLSearchParams(cart);
    tampered.set("NEW_ITEM-TOTALPRICE", "10.00");
    const c = parseOciCartForm(tampered);
    expect(c.ok).toBe(false);
    expect(c.errors.join(" ")).toContain("disagrees with the line sum");
  });

  it("excludes lines without a part number, quantity or price, never guesses", () => {
    const partial = new URLSearchParams({
      "NEW_ITEM-MATNR[1]": "",
      "NEW_ITEM-QUANTITY[1]": "5",
      "NEW_ITEM-UNITPRICE[1]": "3",
      "NEW_ITEM-MATNR[2]": "OK-2",
      "NEW_ITEM-QUANTITY[2]": "0",
      "NEW_ITEM-UNITPRICE[2]": "3",
      "NEW_ITEM-MATNR[3]": "OK-3",
      "NEW_ITEM-QUANTITY[3]": "2",
      "NEW_ITEM-UNITPRICE[3]": "7",
    });
    const c = parseOciCartForm(partial);
    expect(c.ok).toBe(true);
    expect(c.lines).toHaveLength(1);
    expect(c.lines[0].matnr).toBe("OK-3");
    expect(c.warnings.join(" ")).toContain("no material number");
    expect(c.warnings.join(" ")).toContain("invalid quantity");
  });

  it("refuses an empty checkout with no item blocks", () => {
    const c = parseOciCartForm(new URLSearchParams());
    expect(c.ok).toBe(false);
    expect(c.errors.join(" ")).toContain("no line data");
  });

  it("flags mixed-currency carts for manual review", () => {
    const mixed = new URLSearchParams({
      "NEW_ITEM-MATNR[1]": "A",
      "NEW_ITEM-QUANTITY[1]": "1",
      "NEW_ITEM-UNITPRICE[1]": "5",
      "NEW_ITEM-CURRENCY[1]": "AUD",
      "NEW_ITEM-MATNR[2]": "B",
      "NEW_ITEM-QUANTITY[2]": "1",
      "NEW_ITEM-UNITPRICE[2]": "5",
      "NEW_ITEM-CURRENCY[2]": "NZD",
    });
    const c = parseOciCartForm(mixed);
    expect(c.ok).toBe(true);
    expect(c.warnings.join(" ")).toContain("flagged for manual review");
  });

  it("accepts a raw record as well as URLSearchParams", () => {
    const c = parseOciCartForm({
      "NEW_ITEM-MATNR[1]": "X-1",
      "NEW_ITEM-QUANTITY[1]": "2",
      "NEW_ITEM-UNITPRICE[1]": "4,50", // European decimal comma
    });
    expect(c.ok).toBe(true);
    expect(c.lines[0].unitPrice).toBe(4.5);
    expect(c.total).toBe(9);
  });
});
