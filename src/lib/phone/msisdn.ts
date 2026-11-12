/**
 * Dial codes for the markets FRELUX serves.
 *
 * Professionals type their number the way they dial it at home, which is a
 * leading zero in most of these markets (`0816...` in Nigeria). A wa.me link
 * and a tel: link both need the international form, so the number is
 * normalised before it is put in a link. Guessing a country would be worse
 * than refusing: when the digits cannot produce a plausible international
 * number, this returns null and the caller hides the link.
 */
export const DIAL_CODES: Record<string, string> = {
  NG: "234",
  GH: "233",
  KE: "254",
  ZA: "27",
  ET: "251",
  EG: "20",
  TZ: "255",
  CI: "225",
  US: "1",
  CA: "1",
  BR: "55",
  MX: "52",
  GB: "44",
  DE: "49",
  FR: "33",
  IT: "39",
  ES: "34",
  NL: "31",
  PL: "48",
  SE: "46",
  CH: "41",
  CN: "86",
  JP: "81",
  ID: "62",
  IN: "91",
  KR: "82",
  SG: "65",
  AE: "971",
  SA: "966",
  TR: "90",
  AU: "61",
  NZ: "64",
};

/** Dial codes sorted longest first so 234 wins over 23, and so on. */
const ORDERED_DIAL_CODES = [...new Set(Object.values(DIAL_CODES))].sort(
  (a, b) => b.length - a.length,
);

/**
 * Return an international number with no punctuation and no plus sign, or null
 * when the input cannot be read as one. `country` is the ISO code on the
 * professional's profile and only decides which dial code a local number gets.
 */
export function toE164(
  raw: string | null | undefined,
  country?: string | null,
): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^0-9+]/g, "");
  // A leading plus is a promise, not part of the number.
  digits = digits.replace(/\+/g, "");
  if (!digits) return null;

  // 00 international prefix (common in Nigeria and much of Europe).
  if (digits.startsWith("00")) digits = digits.slice(2);

  const dialCode = DIAL_CODES[(country ?? "").toUpperCase()] ?? null;

  // A local number: leading trunk zero. Replace it with the country's code.
  if (digits.startsWith("0")) {
    if (!dialCode) return null;
    const national = digits.replace(/^0+/, "");
    return national.length >= 7 ? `${dialCode}${national}` : null;
  }

  // Already international: starts with a known country code and still has a
  // full national number behind it. The length guard matters: a 10-digit
  // national number such as 8161234567 also starts with 81 (Japan), and
  // treating that as international would throw the number away.
  const international = ORDERED_DIAL_CODES.find(
    (code) =>
      digits.startsWith(code) &&
      digits.length >= 11 &&
      digits.length <= 15 &&
      digits.length - code.length >= 7,
  );
  if (international) return digits;

  // A national number typed without its trunk zero.
  if (dialCode && digits.length >= 7 && digits.length <= 11) {
    return `${dialCode}${digits}`;
  }

  return null;
}
