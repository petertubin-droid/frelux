import { describe, expect, it } from "vitest";
import {
  escrowReferenceOf,
  planEscrowFunding,
  planEscrowRefund,
  verifyPaystackSignature,
} from "./escrow_paystack.ts";

const LIVE = "sk_live_test_primary";
const ESCROW = "sk_test_escrow_secondary";

async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const fundedContract = {
  id: "c1",
  status: "pending_payment",
  total_minor: 5_000_000,
  currency: "NGN",
  held_minor: 0,
  provider_transaction_id: null as string | null,
};

const charge = {
  id: 302961,
  reference: "ESC-AB133FC7",
  amount: 5_000_000,
  currency: "NGN",
  status: "success",
};

describe("paystack signature", () => {
  it("accepts a body signed with the primary secret", async () => {
    const body = JSON.stringify({ event: "charge.success" });
    const sig = await sign(body, LIVE);
    expect(await verifyPaystackSignature(body, sig, [LIVE, ESCROW])).toBe(true);
  });

  it("accepts a body signed with the escrow secret", async () => {
    const body = JSON.stringify({ event: "charge.success" });
    const sig = await sign(body, ESCROW);
    expect(await verifyPaystackSignature(body, sig, [LIVE, ESCROW])).toBe(true);
  });

  it("rejects a forged or missing signature", async () => {
    const body = JSON.stringify({ event: "charge.success" });
    const sig = await sign(body, "wrong_secret");
    expect(await verifyPaystackSignature(body, sig, [LIVE, ESCROW])).toBe(
      false,
    );
    expect(await verifyPaystackSignature(body, null, [LIVE, ESCROW])).toBe(
      false,
    );
    expect(await verifyPaystackSignature(body, sig, [])).toBe(false);
  });

  it("rejects a body altered after signing", async () => {
    const body = JSON.stringify({ event: "charge.success", amount: 1 });
    const sig = await sign(body, LIVE);
    expect(await verifyPaystackSignature(`${body} `, sig, [LIVE])).toBe(false);
  });
});

describe("escrow reference routing", () => {
  it("only treats ESC- references as escrow", () => {
    expect(escrowReferenceOf({ reference: "ESC-AB133FC7" })).toBe(
      "ESC-AB133FC7",
    );
    expect(escrowReferenceOf({ reference: "sub_abc123" })).toBeNull();
    expect(escrowReferenceOf({ reference: "apikey_ref" })).toBeNull();
    expect(escrowReferenceOf({})).toBeNull();
  });
});

describe("escrow funding decisions", () => {
  it("funds a matching pending contract", () => {
    expect(planEscrowFunding(fundedContract, charge)).toEqual({
      action: "fund",
      transactionId: "302961",
      amountMinor: 5_000_000,
    });
  });

  it("treats a replay of the same transaction as a duplicate", () => {
    const contract = {
      ...fundedContract,
      status: "funds_held",
      provider_transaction_id: "302961",
    };
    expect(planEscrowFunding(contract, charge)).toMatchObject({
      action: "duplicate",
    });
  });

  it("rejects a different transaction once funded", () => {
    const contract = {
      ...fundedContract,
      status: "funds_held",
      provider_transaction_id: "111",
    };
    expect(planEscrowFunding(contract, charge)).toMatchObject({
      action: "reject",
    });
  });

  it("rejects an amount that does not match the contract", () => {
    expect(
      planEscrowFunding(fundedContract, { ...charge, amount: 100 }),
    ).toMatchObject({
      action: "reject",
    });
  });

  it("rejects a currency that does not match the contract", () => {
    expect(
      planEscrowFunding(fundedContract, { ...charge, currency: "USD" }),
    ).toMatchObject({
      action: "reject",
    });
  });

  it("rejects an unsuccessful charge", () => {
    expect(
      planEscrowFunding(fundedContract, { ...charge, status: "failed" }),
    ).toMatchObject({
      action: "reject",
    });
  });

  it("rejects a contract that is already released", () => {
    expect(
      planEscrowFunding({ ...fundedContract, status: "released" }, charge),
    ).toMatchObject({ action: "reject" });
  });
});

describe("escrow refund decisions", () => {
  const holding = {
    ...fundedContract,
    status: "funds_held",
    held_minor: 5_000_000,
    provider_transaction_id: "302961",
    released_minor: 2_000_000,
  } as typeof fundedContract & { released_minor: number };

  it("refunds everything still held when no amount is sent", () => {
    expect(planEscrowRefund(holding, { id: 302961 })).toEqual({
      action: "refund",
      amountMinor: 3_000_000,
    });
  });

  it("caps a refund at what is still held", () => {
    expect(
      planEscrowRefund(holding, { id: 302961, amount: 9_000_000 }),
    ).toEqual({
      action: "refund",
      amountMinor: 3_000_000,
    });
  });

  it("treats a refund on an empty ledger as a duplicate", () => {
    const empty = { ...holding, held_minor: 2_000_000 } as typeof holding;
    expect(planEscrowRefund(empty, { id: 302961 })).toMatchObject({
      action: "duplicate",
    });
  });

  it("rejects a refund for a different transaction", () => {
    expect(planEscrowRefund(holding, { id: 999 })).toMatchObject({
      action: "reject",
    });
  });

  it("rejects a refund on an unfunded contract", () => {
    expect(planEscrowRefund(fundedContract, { id: 302961 })).toMatchObject({
      action: "reject",
    });
  });
});
