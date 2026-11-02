import { describe, it, expect, vi } from "vitest";

function createChainable() {
  const chain: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: Record<string, unknown>, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "then") return target.then;
      target[prop] = vi.fn().mockReturnValue(proxy);
      return target[prop];
    },
  });
  return proxy;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue(createChainable()),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  isSupabaseConfigured: false,
}));

const {
  fetchProductCategories,
  fetchProductCategoryBySlug,
  searchProducts,
  fetchProduct,
  fetchMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = await import("./marketplace-products");

describe("marketplace-products (supabase not configured)", () => {
  it("fetchProductCategories returns array", async () => {
    const result = await fetchProductCategories();
    expect(Array.isArray(result)).toBe(true);
  });

  it("fetchProductCategoryBySlug returns null when not found", async () => {
    expect(await fetchProductCategoryBySlug("paint")).toBeNull();
  });

  it("searchProducts returns { products, total }", async () => {
    const result = await searchProducts({ query: "paint" } as unknown as never);
    expect(result).toBeTruthy();
    expect(result.products).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("fetchProduct returns null when not found", async () => {
    expect(await fetchProduct("test-id")).toBeNull();
  });

  it("fetchMyProducts returns array", async () => {
    expect(await fetchMyProducts("user1")).toEqual([]);
  });

  it("createProduct returns null (no data)", async () => {
    expect(await createProduct({} as unknown as never)).toBeNull();
  });

  it("updateProduct returns null (no data)", async () => {
    expect(await updateProduct("id1", {})).toBeNull();
  });

  it("deleteProduct resolves without error", async () => {
    await expect(deleteProduct("id1")).resolves.toBeUndefined();
  });
});
