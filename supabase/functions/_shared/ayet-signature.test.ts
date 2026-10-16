import { describe, expect, it } from "vitest";
import { verifyAyetS2SSignature } from "./ayet-signature.ts";

async function sign(params: URLSearchParams, apiKey: string): Promise<string> {
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
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("ayeT S2S HMAC verification", () => {
  it("accepts a matching sorted URL-encoded query signature and rejects tampering", async () => {
    const key = "test-publisher-key";
    const params = new URLSearchParams(
      "transaction_id=tx-1&external_identifier=user%20tag&adslot_id=16",
    );
    const signature = await sign(params, key);
    expect(await verifyAyetS2SSignature(params, signature, key)).toBe(true);
    expect(
      await verifyAyetS2SSignature(params, signature.toUpperCase(), key),
    ).toBe(true);
    expect(
      await verifyAyetS2SSignature(params, signature, "different-key"),
    ).toBe(false);
    expect(
      await verifyAyetS2SSignature(
        new URLSearchParams(
          "transaction_id=altered&external_identifier=user%20tag&adslot_id=16",
        ),
        signature,
        key,
      ),
    ).toBe(false);
    expect(await verifyAyetS2SSignature(params, null, key)).toBe(false);
  });

  it("returns false for incomplete credentials and malformed signatures", async () => {
    const params = new URLSearchParams(
      "transaction_id=tx-1&external_identifier=user&adslot_id=16",
    );
    expect(await verifyAyetS2SSignature(params, "abcd", "")).toBe(false);
    expect(await verifyAyetS2SSignature(params, "abcd", "valid-key")).toBe(
      false,
    );
  });
});
