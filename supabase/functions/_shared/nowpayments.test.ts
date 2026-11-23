import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  mapNowPaymentsStatus,
  nowPaymentsInvoiceMatchesExpected,
  sortObject,
  verifyNowPaymentsIpnSignature,
} from "./nowpayments.ts";

const expected = {
  amountFiat: 29.0,
  currencyFiat: "USD",
  orderId: "FRX-order-test-123",
};

const invoice = {
  id: "5070216170",
  order_id: expected.orderId,
  order_description: "FRELUX PRO (monthly)",
  price_amount: "29.00",
  price_currency: "usd",
  invoice_url: "https://nowpayments.io/payment/?iid=5070216170",
};

Deno.test(
  "NOWPayments invoice binding accepts an exact matching record",
  () => {
    assertEquals(nowPaymentsInvoiceMatchesExpected(invoice, expected), true);
  },
);

Deno.test(
  "NOWPayments invoice binding rejects amount, order, and currency mismatches",
  () => {
    assertEquals(
      nowPaymentsInvoiceMatchesExpected(
        { ...invoice, price_amount: "28.99" },
        expected,
      ),
      false,
    );
    assertEquals(
      nowPaymentsInvoiceMatchesExpected(
        { ...invoice, order_id: "other-order" },
        expected,
      ),
      false,
    );
    assertEquals(
      nowPaymentsInvoiceMatchesExpected(
        { ...invoice, price_currency: "eur" },
        expected,
      ),
      false,
    );
  },
);

Deno.test(
  "NOWPayments status mapping correctly classifies provider states",
  () => {
    assertEquals(mapNowPaymentsStatus("finished"), "Confirmed");
    assertEquals(mapNowPaymentsStatus("confirmed"), "Confirmed");
    assertEquals(mapNowPaymentsStatus("sending"), "Processing");
    assertEquals(mapNowPaymentsStatus("confirming"), "Processing");
    assertEquals(mapNowPaymentsStatus("partially_paid"), "Processing");
    assertEquals(mapNowPaymentsStatus("waiting"), "Pending");
    assertEquals(mapNowPaymentsStatus("expired"), "Expired");
    assertEquals(mapNowPaymentsStatus("failed"), "Failed");
    assertEquals(mapNowPaymentsStatus("refunded"), "Refunded");
    assertEquals(mapNowPaymentsStatus("unknown"), "Pending");
  },
);

Deno.test("NOWPayments sortObject sorts nested keys alphabetically", () => {
  const input = { z: 1, a: 2, m: { b: 3, a: 4 } };
  const sorted = sortObject(input);
  assertEquals(JSON.stringify(sorted), '{"a":2,"m":{"a":4,"b":3},"z":1}');
});

Deno.test(
  "NOWPayments IPN signature verification accepts authentic HMAC-SHA512",
  async () => {
    const secret = "secret_ipn_key_456";
    const payload = {
      payment_id: 12345678,
      invoice_id: 87654321,
      payment_status: "finished",
      price_amount: 29.0,
      price_currency: "usd",
      order_id: "FRX-12345",
    };

    // Compute expected signature
    const sorted = sortObject(payload);
    const serialized = JSON.stringify(sorted);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const buffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(serialized),
    );
    const hex = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Signature check with object
    const validObj = await verifyNowPaymentsIpnSignature(payload, hex, secret);
    assertEquals(validObj, true);

    // Signature check with string
    const validStr = await verifyNowPaymentsIpnSignature(
      JSON.stringify(payload),
      hex,
      secret,
    );
    assertEquals(validStr, true);

    // Rejection with incorrect secret
    const invalidSecret = await verifyNowPaymentsIpnSignature(
      payload,
      hex,
      "wrong-secret",
    );
    assertEquals(invalidSecret, false);

    // Rejection with altered payload
    const alteredPayload = { ...payload, price_amount: 1.0 };
    const invalidPayload = await verifyNowPaymentsIpnSignature(
      alteredPayload,
      hex,
      secret,
    );
    assertEquals(invalidPayload, false);
  },
);

Deno.test(
  "NOWPayments getNowPaymentsPayments queries endpoint with correct query params",
  async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        capturedUrl = input.toString();
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        return new Response(
          JSON.stringify({
            data: [
              {
                payment_id: 998877,
                order_id: "FRX-test-order",
                payment_status: "finished",
                price_amount: 29.0,
                price_currency: "usd",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch;

      const { getNowPaymentsPayments } = await import("./nowpayments.ts");
      const res = await getNowPaymentsPayments(
        { apiKey: "test-api-key", apiUrl: "https://api.nowpayments.io/v1" },
        { limit: 25, page: 2 },
      );

      assertEquals(res.data.length, 1);
      assertEquals(res.data[0].payment_id, 998877);
      assertEquals(
        capturedUrl,
        "https://api.nowpayments.io/v1/payment/?limit=25&page=2",
      );
      assertEquals(capturedHeaders["x-api-key"], "test-api-key");
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);
