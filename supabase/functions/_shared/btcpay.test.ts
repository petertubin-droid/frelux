import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { btcPayInvoiceMatchesExpected } from "./btcpay.ts";

const expected = {
  invoiceId: "invoice-123",
  storeId: "store-456",
  amountFiat: 25,
  currencyFiat: "USD",
  userId: "user-789",
  purpose: "subscription",
  orderId: "FRX-order-abc",
};
const invoice = {
  id: expected.invoiceId,
  storeId: expected.storeId,
  amount: "25.00",
  currency: "USD",
  type: "Standard",
  checkoutLink: "https://pay.example/i/invoice-123",
  status: "Settled" as const,
  additionalStatus: "None" as const,
  createdTime: 100,
  expirationTime: 200,
  monitoringTime: 300,
  metadata: { userId: expected.userId, purpose: expected.purpose, orderId: expected.orderId },
};

Deno.test("BTCPay invoice binding accepts an exact provider record", () => {
  assertEquals(btcPayInvoiceMatchesExpected(invoice, expected), true);
});

Deno.test("BTCPay invoice binding rejects amount, store, and ownership mismatches", () => {
  assertEquals(btcPayInvoiceMatchesExpected({ ...invoice, amount: "24.99" }, expected), false);
  assertEquals(btcPayInvoiceMatchesExpected({ ...invoice, storeId: "other-store" }, expected), false);
  assertEquals(btcPayInvoiceMatchesExpected({
    ...invoice,
    metadata: { ...invoice.metadata, userId: "other-user" },
  }, expected), false);
});
