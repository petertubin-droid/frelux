import { describe, expect, it } from "vitest";
import {
  currencyAmounts,
  firstAmountIsUsablePrice,
  isChromeAmount,
  isListingPage,
} from "./price-guards.ts";

// The shape that produced three false GBP 99 candidates: a catalogue page whose
// first amount is a free-delivery threshold, with no JSON-LD offer and no meta
// price, so the extractor fell through to the first-amount regex.
const BANNER_PAGE = `<!doctype html><html><head><title>Primer Paint | Screwfix</title></head>
<body>
  <div class="promo">Free delivery on orders over £99</div>
  <div class="cat">Primer Paint</div>
</body></html>`;

const PRODUCT_PAGE = `<!doctype html><html><head><title>Zinsser BIN Primer 1L</title></head>
<body>
  <h1>Zinsser BIN Primer 1L</h1>
  <span class="price">£27.99</span>
  <p>In stock. Delivery £4.99.</p>
</body></html>`;

const LISTING_PAGE = `<!doctype html><html><body>
  <div class="card"><span class="price">£9.99</span> Tape 150m</div>
  <div class="card"><span class="price">£24.49</span> Sealer 5L</div>
  <div class="card"><span class="price">£27.99</span> Primer 1L</div>
  <div class="card"><span class="price">£4.99</span> Brush set</div>
</body></html>`;

describe("currency guards", () => {
  it("reads every amount in document order", () => {
    expect(currencyAmounts(LISTING_PAGE).map((a) => a.value)).toEqual([
      9.99, 24.49, 27.99, 4.99,
    ]);
  });

  it("treats a multi-amount page as a listing", () => {
    expect(isListingPage(LISTING_PAGE)).toBe(true);
    expect(isListingPage(BANNER_PAGE)).toBe(false);
    expect(isListingPage(PRODUCT_PAGE)).toBe(false);
  });

  it("recognises a threshold banner as chrome", () => {
    const [first] = currencyAmounts(BANNER_PAGE);
    expect(isChromeAmount(BANNER_PAGE, first.index)).toBe(true);
  });

  it("refuses the banner amount as a price", () => {
    expect(firstAmountIsUsablePrice(BANNER_PAGE)).toBe(false);
  });

  it("still accepts a genuine single-product page", () => {
    expect(firstAmountIsUsablePrice(PRODUCT_PAGE)).toBe(true);
  });

  it("refuses a listing page even when its first amount is not chrome", () => {
    expect(firstAmountIsUsablePrice(LISTING_PAGE)).toBe(false);
  });

  it("refuses a page with no amount at all", () => {
    expect(firstAmountIsUsablePrice("<html><body>Sold out</body></html>")).toBe(
      false,
    );
  });
});
