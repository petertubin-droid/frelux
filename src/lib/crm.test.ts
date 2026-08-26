import { describe, it, expect, vi } from "vitest";

// CRM module uses supabase directly — test that it handles unconfigured state
vi.mock("@/lib/supabase", () => ({
  supabase: {},
  isSupabaseConfigured: false,
}));

const { getClients, createClient, deleteClient } = await import("./crm");

describe("crm (supabase not configured)", () => {
  it("getClients returns empty array when not configured", async () => {
    const result = await getClients("user1");
    expect(result).toEqual([]);
  });

  it("createClient throws when not configured", async () => {
    await expect(createClient("user1", { name: "Test" })).rejects.toThrow(
      "Supabase is not configured",
    );
  });

  it("deleteClient throws when not configured", async () => {
    await expect(deleteClient("c1", "user1")).rejects.toThrow(
      "Supabase is not configured",
    );
  });
});
