import { describe, expect, it, vi } from "vitest";
import { handleDocumentPrintPass } from "./document-print-pass";

const env = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  PAYSTACK_SECRET_KEY: "sk_test",
  FLUTTERWAVE_SECRET_KEY: "FLWSECK_test",
  NOWPAYMENTS_API_KEY: "np-key",
} as unknown as Parameters<typeof handleDocumentPrintPass>[1];

const cors = { "access-control-allow-origin": "*" };

function post(body: unknown, auth = "Bearer user-token") {
  return new Request("https://worker/api/fn/document-print-pass", {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

type Call = { url: string; init?: RequestInit };

function stubFetch(handlers: (url: string, init?: RequestInit) => unknown) {
  const calls: Call[] = [];
  const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    const result = handlers(url, init);
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result ?? {}), { status: 200 });
  });
  vi.stubGlobal("fetch", fake);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("worker document-print-pass", () => {
  it("rejects a request with no bearer token", async () => {
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "r1", gateway: "paystack" }, ""),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(401);
  });

  it("rejects a token GoTrue does not recognise", async () => {
    stubFetch((url) =>
      url.includes("/auth/v1/user")
        ? new Response("{}", { status: 401 })
        : {},
    );
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "r1", gateway: "paystack" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(401);
  });

  it("issues nothing when Paystack says the charge failed", async () => {
    stubFetch((url) => {
      if (url.includes("/auth/v1/user")) return { id: "user-1" };
      return { status: true, data: { status: "failed", amount: 149163 } };
    });
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "r1", gateway: "paystack" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "payment_not_successful" });
  });

  it("refuses a payment stamped for a different document", async () => {
    stubFetch((url) => {
      if (url.includes("/auth/v1/user")) return { id: "user-1" };
      return {
        status: true,
        data: {
          status: "success",
          amount: 149163,
          currency: "NGN",
          metadata: {
            purpose: "document_print",
            user_id: "user-1",
            document_id: "other-doc",
          },
        },
      };
    });
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "r1", gateway: "paystack" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(403);
  });

  it("refuses an underpaid charge", async () => {
    stubFetch((url) => {
      if (url.includes("/auth/v1/user")) return { id: "user-1" };
      if (url.includes("/rest/v1/fx_rates")) return [{ rate: "1000" }];
      return {
        status: true,
        data: {
          status: "success",
          amount: 50000,
          currency: "NGN",
          metadata: {
            purpose: "document_print",
            user_id: "user-1",
            document_id: "d1",
          },
        },
      };
    });
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "r1", gateway: "paystack" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(402);
  });

  it("refuses a currency it cannot price instead of assuming parity", async () => {
    stubFetch((url) => {
      if (url.includes("/auth/v1/user")) return { id: "user-1" };
      if (url.includes("/rest/v1/fx_rates")) return [];
      return {
        status: true,
        data: {
          status: "success",
          amount: 149163,
          currency: "NGN",
          metadata: {
            purpose: "document_print",
            user_id: "user-1",
            document_id: "d1",
          },
        },
      };
    });
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "r1", gateway: "paystack" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(409);
  });

  it("writes the pass once the charge matches and the amount clears", async () => {
    const calls = stubFetch((url, init) => {
      if (url.includes("/auth/v1/user")) return { id: "user-1" };
      if (url.includes("/rest/v1/fx_rates")) return [{ rate: "1000" }];
      if (url.includes("/rest/v1/document_print_passes")) {
        const sent = JSON.parse(String(init?.body ?? "{}"));
        return [
          {
            document_id: sent.document_id,
            expires_at: sent.expires_at,
            currency: sent.currency,
            amount_minor: sent.amount_minor,
          },
        ];
      }
      return {
        status: true,
        data: {
          status: "success",
          amount: 109000,
          currency: "NGN",
          metadata: {
            purpose: "document_print",
            user_id: "user-1",
            document_id: "d1",
          },
        },
      };
    });

    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "r1", gateway: "paystack" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pass: { document_id: string } };
    expect(body.pass.document_id).toBe("d1");

    const upsert = calls.find((c) => c.url.includes("document_print_passes"));
    expect(upsert?.url).toContain("on_conflict=user_id,document_id");
    const headers = new Headers(upsert?.init?.headers as HeadersInit);
    expect(headers.get("Prefer")).toContain("merge-duplicates");
  });

  it("matches a NOWPayments invoice by the order id this server set", async () => {
    stubFetch((url) => {
      if (url.includes("/auth/v1/user")) return { id: "user-1" };
      if (url.includes("/v1/invoice/")) {
        return {
          payment_status: "finished",
          price_amount: "1.09",
          price_currency: "usd",
          order_id: "FRX-PRINT-d1",
        };
      }
      return [
        {
          document_id: "d1",
          expires_at: "2026-11-26T00:00:00.000Z",
          currency: "USD",
          amount_minor: 109,
        },
      ];
    });
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "6107386341", gateway: "nowpayments" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(200);
  });

  it("does not treat a waiting crypto invoice as money", async () => {
    stubFetch((url) => {
      if (url.includes("/auth/v1/user")) return { id: "user-1" };
      return {
        payment_status: "waiting",
        price_amount: "1.09",
        price_currency: "usd",
        order_id: "FRX-PRINT-d1",
      };
    });
    const res = await handleDocumentPrintPass(
      post({ documentId: "d1", reference: "inv-1", gateway: "nowpayments" }),
      env,
      {},
      cors,
    );
    expect(res.status).toBe(402);
  });
});
