/** ayeT S2S signature: HMAC-SHA256 of the alphabetically sorted,
 * application/x-www-form-urlencoded query parameters, using the publisher API key. */
export async function verifyAyetS2SSignature(
  params: URLSearchParams,
  suppliedSignature: string | null,
  apiKey: string,
): Promise<boolean> {
  if (!suppliedSignature || !apiKey) return false;
  const sorted = new URLSearchParams(params);
  sorted.sort();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(sorted.toString()),
    ),
  );
  const expected = [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== suppliedSignature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |=
      expected.charCodeAt(i) ^ suppliedSignature.toLowerCase().charCodeAt(i);
  }
  return diff === 0;
}
