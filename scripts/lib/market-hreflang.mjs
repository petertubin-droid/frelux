// Single source of truth for market hreflang values, shared by the app
// (src/lib/templates-market.ts) and the prerenderer, so the static HTML and
// the client-rendered head can never disagree.
//
// hreflang requires a language or language-REGION value. A bare country code is
// invalid: "us" is not a language, and "ng" is the ISO code for Ndonga, so
// emitting the country code alone told Google nothing about which country a
// page serves.

export const MARKET_LANGUAGE = Object.freeze({
  AE: "ar",
  AU: "en",
  BR: "pt",
  CA: "en",
  CH: "de",
  CI: "fr",
  CN: "zh",
  DE: "de",
  EG: "ar",
  ES: "es",
  ET: "am",
  FR: "fr",
  GB: "en",
  GH: "en",
  ID: "id",
  IN: "en",
  IT: "it",
  JP: "ja",
  KE: "en",
  KR: "ko",
  MX: "es",
  NG: "en",
  NL: "nl",
  NZ: "en",
  PL: "pl",
  SA: "ar",
  SE: "sv",
  SG: "en",
  TR: "tr",
  TZ: "sw",
  US: "en",
  ZA: "en",
});

// Languages the interface actually renders (see UI_LOCALES in
// src/lib/international/market-context.tsx). A market whose language is not
// here is served in English, and hreflang has to say so: declaring th-TH for an
// English page tells Google the page is Thai and gets the cluster discarded.
export const RENDERED_LANGUAGES = Object.freeze(
  new Set(["ar", "de", "en", "es", "fr", "hi", "id", "ja", "nl", "pt", "ru", "sw", "zh"]),
);

/** Valid language-REGION hreflang for a market, e.g. "en-US". */
export function marketHreflang(countryCode) {
  const upper = String(countryCode || "").toUpperCase();
  const declared = MARKET_LANGUAGE[upper] ?? "en";
  const rendered = RENDERED_LANGUAGES.has(declared) ? declared : "en";
  return `${rendered}-${upper}`;
}
