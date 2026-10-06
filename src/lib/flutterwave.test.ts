import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  verifyFlutterwavePayment,
  isFlutterwaveConfigured,
} from "./flutterwave";

describe("isFlutterwaveConfigured", () => {
  it("reflects the presence of the public key env var", () => {
    expect(typeof isFlutterwaveConfigured()).toBe("boolean");
  });
});

describe("verifyFlutterwavePayment", () => {
  const invoke = supabase.functions.invoke as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    invoke.mockReset();
    (isSupabaseConfigured as unknown as boolean) = true;
  });

  it("returns an error when Supabase is not configured", async () => {
    (isSupabaseConfigured as unknown as boolean) = false;
    const result = await verifyFlutterwavePayment("FLW_ref");
    expect(result.verified).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("calls flutterwave-verify with the tx_ref and returns verified", async () => {
    invoke.mockResolvedValueOnce({
      data: { verified: true, plan: "pro" },
      error: null,
    });
    const result = await verifyFlutterwavePayment("FLW_ref");
    expect(invoke).toHaveBeenCalledWith("flutterwave-verify", {
      body: { tx_ref: "FLW_ref" },
    });
    expect(result.verified).toBe(true);
    expect(result.plan).toBe("pro");
  });

  it("surfaces the server error message when verification fails", async () => {
    invoke.mockResolvedValueOnce({
      data: { verified: false, error: "AMOUNT_MISMATCH" },
      error: null,
    });
    const result = await verifyFlutterwavePayment("FLW_ref");
    expect(result.verified).toBe(false);
    expect(result.error).toBe("AMOUNT_MISMATCH");
  });

  it("returns a generic error when the edge function errors", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Function not found" },
    });
    const result = await verifyFlutterwavePayment("FLW_ref");
    expect(result.verified).toBe(false);
    expect(result.error).toBe("Function not found");
  });

  it("falls back to a generic message when neither verified nor error", async () => {
    invoke.mockResolvedValueOnce({ data: {}, error: null });
    const result = await verifyFlutterwavePayment("FLW_ref");
    expect(result.verified).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
