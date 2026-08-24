/**
 * FRELUX DIRECT CRAWLER — Content Extractor
 *
 * Extracts product and price data from fetched HTML pages.
 *
 * Extraction priority:
 *   1. JSON-LD structured data (schema.org Product/Offer)
 *   2. Open Graph metadata
 *   3. HTML element extraction (price patterns, product names)
 *   4. Meta tags
 *
 * Does NOT invent missing fields.
 * Does NOT depend on a single CSS selector.
 */

import type {
  ExtractedProduct,
  CrawlExtractionResult,
} from '@/types/crawler';
import type { MatchConfidence } from '@/types/market-intelligence';
import {
  extractPackageInfo,
  extractBrand,
  classifyCategory,
} from '../product-normalizer';

// ============================================================
// MAIN EXTRACTION FUNCTION
// ============================================================

export function extractProductsFromHtml(
  html: string,
  url: string,
): CrawlExtractionResult {
  const warnings: string[] = [];
  const products: ExtractedProduct[] = [];

  // 1. Try JSON-LD structured data first (highest confidence)
  const jsonLdProducts = extractFromJsonLd(html, url);
  if (jsonLdProducts.length > 0) {
    products.push(...jsonLdProducts);
    return {
      url,
      products: deduplicateProducts(products),
      renderingRequired: false,
      extractionMethod: 'jsonld',
      warnings,
    };
  }

  // 2. Try Open Graph metadata
  const ogProduct = extractFromOpenGraph(html, url);
  if (ogProduct) {
    products.push(ogProduct);
    return {
      url,
      products: deduplicateProducts(products),
      renderingRequired: false,
      extractionMethod: 'opengraph',
      warnings,
    };
  }

  // 3. Try meta tags
  const metaProduct = extractFromMetaTags(html, url);
  if (metaProduct) {
    products.push(metaProduct);
    return {
      url,
      products: deduplicateProducts(products),
      renderingRequired: false,
      extractionMethod: 'meta',
      warnings,
    };
  }

  // 4. Fall back to HTML element extraction
  const htmlProducts = extractFromHtmlElements(html, url);
  if (htmlProducts.length > 0) {
    products.push(...htmlProducts);
    return {
      url,
      products: deduplicateProducts(products),
      renderingRequired: false,
      extractionMethod: 'html',
      warnings,
    };
  }

  // 5. Nothing found
  warnings.push('No product or price data found on this page');
  return {
    url,
    products: [],
    renderingRequired: false,
    extractionMethod: 'none',
    warnings,
  };
}

// ============================================================
// 1. JSON-LD EXTRACTION (schema.org Product/Offer)
// ============================================================

function extractFromJsonLd(html: string, url: string): ExtractedProduct[] {
  const products: ExtractedProduct[] = [];

  // Find all <script type="application/ld+json"> blocks
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonText = match[1].trim();
      const data = JSON.parse(jsonText);

      // Handle single object or array
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Check for @graph (common in WordPress SEO plugins)
        const graphItems = item['@graph'] ? item['@graph'] : [item];

        for (const graphItem of graphItems) {
          const product = extractProductFromJsonLdObject(graphItem, url);
          if (product) {
            products.push(product);
          }
        }
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  return products;
}

function extractProductFromJsonLdObject(
  obj: Record<string, unknown>,
  url: string,
): ExtractedProduct | null {
  const type = obj['@type'] as string | string[] | undefined;
  const typeStr = Array.isArray(type) ? type.join(' ').toLowerCase() : (type ?? '').toLowerCase();

  // Must be a Product type (or include Product)
  if (!typeStr.includes('product')) {
    return null;
  }

  const name = obj.name as string | undefined;
  if (!name) return null;

  // Extract price from offers
  let price: number | null = null;
  let currency: string | null = null;
  let availability: string | null = null;

  const offers = obj.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
  if (offers) {
    const offerList = Array.isArray(offers) ? offers : [offers];
    for (const offer of offerList) {
      // Price can be in 'price' or 'lowPrice'/'highPrice'
      const offerPrice = offer.price as number | string | undefined;
      const lowPrice = offer.lowPrice as number | string | undefined;
      const offerCurrency = offer.priceCurrency as string | undefined;
      const offerAvailability = offer.availability as string | undefined;

      if (offerPrice !== undefined) {
        price = typeof offerPrice === 'string' ? parseFloat(offerPrice) : offerPrice;
      } else if (lowPrice !== undefined) {
        price = typeof lowPrice === 'string' ? parseFloat(lowPrice) : lowPrice;
      }

      if (offerCurrency) {
        currency = offerCurrency.toUpperCase();
      }

      if (offerAvailability) {
        const availLower = offerAvailability.toLowerCase();
        if (availLower.includes('instock')) availability = 'in_stock';
        else if (availLower.includes('outofstock')) availability = 'out_of_stock';
        else if (availLower.includes('preorder')) availability = 'preorder';
        else availability = 'unknown';
      }

      if (price !== null) break; // Use first available price
    }
  }

  // Brand extraction
  let brand: string | null = null;
  const brandData = obj.brand as Record<string, unknown> | string | undefined;
  if (brandData) {
    if (typeof brandData === 'string') {
      brand = brandData;
    } else if (typeof brandData === 'object' && brandData.name) {
      brand = brandData.name as string;
    }
  }
  if (!brand) {
    brand = extractBrand(name);
  }

  // Category
  let category: string | null = null;
  const categoryData = obj.category as string | Record<string, unknown> | undefined;
  if (categoryData) {
    if (typeof categoryData === 'string') {
      category = categoryData;
    } else if (typeof categoryData === 'object' && categoryData.name) {
      category = categoryData.name as string;
    }
  }
  if (!category) {
    category = classifyCategory(name);
  }

  // Package size from name
  const pkgInfo = extractPackageInfo(name);

  // SKU
  const sku = (obj.sku as string) || (obj.mpn as string) || null;

  // Determine confidence based on what we got
  let confidence: MatchConfidence = 'high';
  if (price === null) confidence = 'medium';
  if (price === null && !currency) confidence = 'low';

  return {
    productName: name,
    price,
    currency,
    brand,
    category,
    packageSize: pkgInfo.size,
    packageUnit: pkgInfo.unit,
    stockStatus: availability,
    sku,
    url: (obj.url as string) || url,
    extractionMethod: 'jsonld',
    confidence,
  };
}

// ============================================================
// 2. OPEN GRAPH EXTRACTION
// ============================================================

function extractFromOpenGraph(html: string, url: string): ExtractedProduct | null {
  const getMeta = (property: string): string | null => {
    const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
  };

  const getMetaName = (name: string): string | null => {
    const regex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
  };

  // Check if this is a product page (og:type = product, or has product: meta tags)
  const ogType = getMeta('og:type');
  const hasProductTags = html.includes('property="product:');

  if (!ogType?.includes('product') && !hasProductTags) {
    // Still try if there's a title and price info
    // But be more conservative
    if (!html.includes('product:price') && !html.includes('og:price')) {
      return null;
    }
  }

  const productName = getMeta('og:title') || getMetaName('title');
  if (!productName) return null;

  // Try product-specific OG tags
  const priceStr = getMeta('product:price:amount') || getMeta('og:price:amount') || getMeta('product:price');
  const currency = getMeta('product:price:currency') || getMeta('og:price:currency') || getMeta('product:currency');
  const availability = getMeta('product:availability') || getMeta('og:availability');

  let price: number | null = null;
  if (priceStr) {
    price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(price)) price = null;
  }

  const brand = extractBrand(productName);
  const category = classifyCategory(productName);
  const pkgInfo = extractPackageInfo(productName);

  let confidence: MatchConfidence = 'medium';
  if (price === null) confidence = 'low';

  return {
    productName,
    price,
    currency: currency?.toUpperCase() ?? null,
    brand,
    category,
    packageSize: pkgInfo.size,
    packageUnit: pkgInfo.unit,
    stockStatus: availability?.toLowerCase().includes('instock') ? 'in_stock'
      : availability?.toLowerCase().includes('outofstock') ? 'out_of_stock'
      : null,
    sku: null,
    url: getMeta('og:url') || url,
    extractionMethod: 'opengraph',
    confidence,
  };
}

// ============================================================
// 3. META TAG EXTRACTION
// ============================================================

function extractFromMetaTags(html: string, url: string): ExtractedProduct | null {
  const getMeta = (name: string): string | null => {
    const regex = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
  };

  // Try to get product name from title or description
  const title = getMeta('title') || getMeta('og:title');
  if (!title) return null;

  // Try price meta tags
  const priceStr = getMeta('price') || getMeta('product:price:amount') || getMeta('og:price:amount');
  const currency = getMeta('currency') || getMeta('product:price:currency') || getMeta('og:price:currency');

  let price: number | null = null;
  if (priceStr) {
    price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(price)) price = null;
  }

  if (price === null && !currency) return null;

  const brand = extractBrand(title);
  const category = classifyCategory(title);
  const pkgInfo = extractPackageInfo(title);

  return {
    productName: title,
    price,
    currency: currency?.toUpperCase() ?? null,
    brand,
    category,
    packageSize: pkgInfo.size,
    packageUnit: pkgInfo.unit,
    stockStatus: null,
    sku: getMeta('sku') || getMeta('product:retailer_item_id'),
    url,
    extractionMethod: 'meta',
    confidence: 'low',
  };
}

// ============================================================
// 4. HTML ELEMENT EXTRACTION
// ============================================================

function extractFromHtmlElements(html: string, url: string): ExtractedProduct[] {
  const products: ExtractedProduct[] = [];

  // Try to find product name from <h1> or <title>
  let productName: string | null = null;

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    productName = stripTags(h1Match[1]).trim();
  }

  if (!productName) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      productName = stripTags(titleMatch[1]).trim();
    }
  }

  if (!productName) return products;

  // Check if this looks like a construction material product page
  const category = classifyCategory(productName);
  if (!category) {
    // Not a construction product — skip HTML extraction for this page
    return products;
  }

  // Extract price from various price patterns
  const priceInfo = extractPriceFromHtml(html);

  // Package size from product name
  const pkgInfo = extractPackageInfo(productName);
  const brand = extractBrand(productName);

  if (priceInfo.price !== null) {
    products.push({
      productName,
      price: priceInfo.price,
      currency: priceInfo.currency,
      brand,
      category,
      packageSize: pkgInfo.size,
      packageUnit: pkgInfo.unit,
      stockStatus: null,
      sku: null,
      url,
      extractionMethod: 'html',
      confidence: 'low',
    });
  }

  return products;
}

// ============================================================
// PRICE EXTRACTION FROM HTML
// ============================================================

// Common currency patterns:
// ₦10,500  |  NGN 10,500  |  N10,500  |  GHS 500  |  KES 1,200  |  R 250
const CURRENCY_PATTERNS: { pattern: RegExp; currency: string }[] = [
  { pattern: /₦\s*([\d,]+(?:\.\d+)?)/, currency: 'NGN' },
  { pattern: /\bNGN\s*([\d,]+(?:\.\d+)?)/i, currency: 'NGN' },
  { pattern: /\bGHS\s*([\d,]+(?:\.\d+)?)/i, currency: 'GHS' },
  { pattern: /₵\s*([\d,]+(?:\.\d+)?)/, currency: 'GHS' },
  { pattern: /\bKES\s*([\d,]+(?:\.\d+)?)/i, currency: 'KES' },
  { pattern: /\bKSh\s*([\d,]+(?:\.\d+)?)/i, currency: 'KES' },
  { pattern: /\bZAR\s*([\d,]+(?:\.\d+)?)/i, currency: 'ZAR' },
  { pattern: /\bR\s*([\d,]+(?:\.\d+)?)/, currency: 'ZAR' },
  { pattern: /\$\s*([\d,]+(?:\.\d+)?)/, currency: 'USD' },
];

// Price in common price-class elements
const PRICE_SELECTORS = [
  /class=["'][^"']*price[^"']*["'][^>]*>([\s\S]*?)<\//i,
  /class=["'][^"']*Price[^"']*["'][^>]*>([\s\S]*?)<\//i,
  /class=["'][^"']*product-price[^"']*["'][^>]*>([\s\S]*?)<\//i,
  /data-price=["']([\d,]+(?:\.\d+)?)["']/i,
  /itemprop=["']price["'][^>]*content=["']([\d,]+(?:\.\d+)?)["']/i,
];

function extractPriceFromHtml(html: string): { price: number | null; currency: string | null } {
  // 1. Try data-price and itemprop attributes first (most reliable)
  for (const selector of PRICE_SELECTORS) {
    const match = html.match(selector);
    if (match) {
      const priceStr = match[1].replace(/[^0-9.]/g, '');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        // Try to find currency near the price
        const currency = findCurrencyNear(html, match.index ?? 0);
        return { price, currency };
      }
    }
  }

  // 2. Try currency patterns in visible text
  // Strip scripts and styles for text search
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, ' ');

  for (const { pattern, currency } of CURRENCY_PATTERNS) {
    const match = textContent.match(pattern);
    if (match) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        return { price, currency };
      }
    }
  }

  return { price: null, currency: null };
}

function findCurrencyNear(html: string, position: number): string | null {
  // Look 200 chars before and after the price position
  const start = Math.max(0, position - 200);
  const end = Math.min(html.length, position + 200);
  const context = html.substring(start, end);

  for (const { pattern, currency } of CURRENCY_PATTERNS) {
    if (pattern.test(context)) {
      return currency;
    }
  }

  return null;
}

// ============================================================
// HELPERS
// ============================================================

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function deduplicateProducts(products: ExtractedProduct[]): ExtractedProduct[] {
  const seen = new Set<string>();
  const result: ExtractedProduct[] = [];

  for (const product of products) {
    // Deduplicate by name + price + package size
    const key = `${product.productName.toLowerCase()}|${product.price}|${product.packageSize}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(product);
    }
  }

  return result;
}

// ============================================================
// CURRENCY DETECTION FROM SOURCE CONTEXT
// ============================================================

/**
 * Determine currency from source context when extraction doesn't provide it.
 * Uses market_profiles mapping — does NOT assume Nigeria by default.
 */
export function deriveCurrencyFromMarket(marketCode: string): string | null {
  const marketCurrencyMap: Record<string, string> = {
    NG: 'NGN',
    GH: 'GHS',
    KE: 'KES',
    ZA: 'ZAR',
  };
  return marketCurrencyMap[marketCode] ?? null;
}
