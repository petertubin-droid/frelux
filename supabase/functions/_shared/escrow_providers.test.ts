import { describe, expect, it } from "vitest";
import {
  classifyFlutterwaveEvent,
  currencyIsSupported,
  majorToMinor,
  minorToMajor,
  providerForCurrency,
} from "./escrow_providers";
import { planEscrowFunding } from "./escrow_paystack";

describe("escrow rails", () => {
  it("keeps naira on Paystack and sends other currencies to Flutterwave", () => {
    expect(providerForCurrency("NGN")).toBe("paystack");
    expect(providerForCurrency("ngn")).toBe("paystack");
    expect(providerForCurrency("USD")).toBe("flutterwave");
    expect(providerForCurrency("GBP")).toBe("flutterwave");
    expect(providerForCurrency("KES")).toBe("flutterwave");
  });

  it("refuses a currency its rail cannot collect", () => {
    expect(currencyIsSupported("flutterwave", "GBP")).toBe(true);
    expect(currencyIsSupported("flutterwave", "JPY")).toBe(false);
    expect(currencyIsSupported("paystack", "NGN")).toBe(true);
  });

  it("converts between minor units and Flutterwave major units", () => {
    expect(minorToMajor(450000)).toBe(4500);
    expect(minorToMajor(450050)).toBe(4500.5);
    expect(majorToMinor(4500)).toBe(450000);
    expect(majorToMinor("120.75")).toBe(12075);
    expect(majorToMinor("abc")).toBeNull();
    expect(majorToMinor(0)).toBeNull();
  });

  it("reads a successful Flutterwave charge", () => {
    const event = classifyFlutterwaveEvent({
      event: "charge.completed",
      data: {
        id: 8123456,
        tx_ref: "ESC-ABC123",
        status: "successful",
        amount: 4500,
        currency: "usd",
      },
    });
    expect(event.kind).toBe("charge");
    expect(event.reference).toBe("ESC-ABC123");
    expect(event.transactionId).toBe("8123456");
    expect(event.amountMinor).toBe(450000);
    expect(event.currency).toBe("USD");
    expect(event.successful).toBe(true);
  });

  it("reads a failed Flutterwave charge and a refund", () => {
    const failed = classifyFlutterwaveEvent({
      event: "charge.failed",
      data: {
        id: 9,
        tx_ref: "ESC-X",
        status: "failed",
        amount: 10,
        currency: "USD",
      },
    });
    expect(failed.kind).toBe("charge");
    expect(failed.successful).toBe(false);

    const refund = classifyFlutterwaveEvent({
      event: "refund.completed",
      data: {
        id: 9,
        tx_ref: "ESC-X",
        status: "successful",
        amount: 10,
        currency: "USD",
      },
    });
    expect(refund.kind).toBe("refund");
  });

  it("ignores unrelated events", () => {
    expect(
      classifyFlutterwaveEvent({ event: "transfer.completed", data: {} }).kind,
    ).toBe("other");
    expect(classifyFlutterwaveEvent(null).kind).toBe("other");
  });

  it("refuses an event from the other rail", () => {
    const decision = planEscrowFunding(
      {
        id: "c1",
        status: "pending_payment",
        total_minor: 450000,
        currency: "USD",
        provider: "flutterwave",
      },
      {
        id: "1",
        status: "success",
        amount: 450000,
        currency: "USD",
        reference: "ESC-1",
      },
      { provider: "paystack" },
    );
    expect(decision.action).toBe("reject");
  });

  it("funds a Flutterwave contract on a matching charge", () => {
    const decision = planEscrowFunding(
      {
        id: "c1",
        status: "pending_payment",
        total_minor: 450000,
        currency: "USD",
        provider: "flutterwave",
      },
      {
        id: "77",
        status: "success",
        amount: 450000,
        currency: "USD",
        reference: "ESC-1",
      },
      { provider: "flutterwave" },
    );
    expect(decision).toEqual({
      action: "fund",
      transactionId: "77",
      amountMinor: 450000,
    });
  });
});
