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
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
  isSupabaseConfigured: false,
}));

const {
  fetchEstimationUnits,
  createEstimationUnit,
  updateEstimationUnit,
  deleteEstimationUnit,
  fetchEstimationProducts,
  fetchEstimationProduct,
  createEstimationProduct,
  updateEstimationProduct,
  deleteEstimationProduct,
  fetchProductQualityLevels,
  createProductQualityLevel,
  updateProductQualityLevel,
  deleteProductQualityLevel,
  fetchEstimationMaterials,
  createEstimationMaterial,
  updateEstimationMaterial,
  deleteEstimationMaterial,
  fetchPackSizes,
  createPackSize,
  updatePackSize,
  deletePackSize,
  fetchActivePrice,
  fetchPriceHistory,
  createOrUpdatePrice,
  fetchAllPrices,
  fetchCalcRules,
  fetchCalcRule,
  createCalcRule,
  updateCalcRule,
  deleteCalcRule,
  fetchCalcVersions,
  fetchActiveCalcVersion,
  createCalcVersion,
  updateCalcVersion,
  fetchEstimates,
  fetchEstimate,
  fetchEstimateByRef,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  fetchEstimateItems,
  createEstimateItem,
  updateEstimateItem,
  deleteEstimateItem,
  fetchAdjustments,
  createAdjustment,
  fetchAuditLog,
  createAuditLog,
  fetchColourConditions,
  fetchSurfaceConditions,
} = await import("./queries");

describe("queries (supabase not configured)", () => {
  it("fetchEstimationUnits does not throw", async () => {
    await expect(fetchEstimationUnits()).resolves.not.toThrow();
  });
  it("createEstimationUnit does not throw", async () => {
    await expect(
      createEstimationUnit({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("updateEstimationUnit does not throw", async () => {
    await expect(
      updateEstimationUnit("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deleteEstimationUnit does not throw", async () => {
    await expect(deleteEstimationUnit("id")).resolves.not.toThrow();
  });
  it("fetchEstimationProducts does not throw", async () => {
    await expect(fetchEstimationProducts()).resolves.not.toThrow();
  });
  it("fetchEstimationProduct does not throw", async () => {
    await expect(fetchEstimationProduct("id")).resolves.not.toThrow();
  });
  it("createEstimationProduct does not throw", async () => {
    await expect(
      createEstimationProduct({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("updateEstimationProduct does not throw", async () => {
    await expect(
      updateEstimationProduct("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deleteEstimationProduct does not throw", async () => {
    await expect(deleteEstimationProduct("id")).resolves.not.toThrow();
  });
  it("fetchProductQualityLevels does not throw", async () => {
    await expect(fetchProductQualityLevels("prod_1")).resolves.not.toThrow();
  });
  it("createProductQualityLevel does not throw", async () => {
    await expect(
      createProductQualityLevel({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("updateProductQualityLevel does not throw", async () => {
    await expect(
      updateProductQualityLevel("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deleteProductQualityLevel does not throw", async () => {
    await expect(deleteProductQualityLevel("id")).resolves.not.toThrow();
  });
  it("fetchEstimationMaterials does not throw", async () => {
    await expect(fetchEstimationMaterials()).resolves.not.toThrow();
  });
  it("createEstimationMaterial does not throw", async () => {
    await expect(
      createEstimationMaterial({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("updateEstimationMaterial does not throw", async () => {
    await expect(
      updateEstimationMaterial("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deleteEstimationMaterial does not throw", async () => {
    await expect(deleteEstimationMaterial("id")).resolves.not.toThrow();
  });
  it("fetchPackSizes does not throw", async () => {
    await expect(fetchPackSizes("product", "id")).resolves.not.toThrow();
  });
  it("createPackSize does not throw", async () => {
    await expect(createPackSize({} as unknown as never)).resolves.not.toThrow();
  });
  it("updatePackSize does not throw", async () => {
    await expect(
      updatePackSize("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deletePackSize does not throw", async () => {
    await expect(deletePackSize("id")).resolves.not.toThrow();
  });
  it("fetchActivePrice does not throw", async () => {
    await expect(fetchActivePrice("product", "id")).resolves.not.toThrow();
  });
  it("fetchPriceHistory does not throw", async () => {
    await expect(fetchPriceHistory("product", "id")).resolves.not.toThrow();
  });
  it("createOrUpdatePrice does not throw", async () => {
    await expect(
      createOrUpdatePrice({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("fetchAllPrices does not throw", async () => {
    await expect(fetchAllPrices()).resolves.not.toThrow();
  });
  it("fetchCalcRules does not throw", async () => {
    await expect(fetchCalcRules()).resolves.not.toThrow();
  });
  it("fetchCalcRule does not throw", async () => {
    await expect(fetchCalcRule("rule_key")).resolves.not.toThrow();
  });
  it("createCalcRule does not throw", async () => {
    await expect(createCalcRule({} as unknown as never)).resolves.not.toThrow();
  });
  it("updateCalcRule does not throw", async () => {
    await expect(
      updateCalcRule("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deleteCalcRule does not throw", async () => {
    await expect(deleteCalcRule("id")).resolves.not.toThrow();
  });
  it("fetchCalcVersions does not throw", async () => {
    await expect(fetchCalcVersions()).resolves.not.toThrow();
  });
  it("fetchActiveCalcVersion does not throw", async () => {
    await expect(fetchActiveCalcVersion("painting")).resolves.not.toThrow();
  });
  it("createCalcVersion does not throw", async () => {
    await expect(
      createCalcVersion({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("updateCalcVersion does not throw", async () => {
    await expect(
      updateCalcVersion("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("fetchEstimates does not throw", async () => {
    await expect(fetchEstimates()).resolves.not.toThrow();
  });
  it("fetchEstimate does not throw", async () => {
    await expect(fetchEstimate("id")).resolves.not.toThrow();
  });
  it("fetchEstimateByRef does not throw", async () => {
    await expect(fetchEstimateByRef("ref")).resolves.not.toThrow();
  });
  it("createEstimate does not throw", async () => {
    await expect(createEstimate({} as unknown as never)).resolves.not.toThrow();
  });
  it("updateEstimate does not throw", async () => {
    await expect(
      updateEstimate("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deleteEstimate does not throw", async () => {
    await expect(deleteEstimate("id")).resolves.not.toThrow();
  });
  it("fetchEstimateItems does not throw", async () => {
    await expect(fetchEstimateItems("est_1")).resolves.not.toThrow();
  });
  it("createEstimateItem does not throw", async () => {
    await expect(
      createEstimateItem({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("updateEstimateItem does not throw", async () => {
    await expect(
      updateEstimateItem("id", {} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("deleteEstimateItem does not throw", async () => {
    await expect(deleteEstimateItem("id")).resolves.not.toThrow();
  });
  it("fetchAdjustments does not throw", async () => {
    await expect(fetchAdjustments("est_1")).resolves.not.toThrow();
  });
  it("createAdjustment does not throw", async () => {
    await expect(
      createAdjustment({} as unknown as never),
    ).resolves.not.toThrow();
  });
  it("fetchAuditLog does not throw", async () => {
    await expect(fetchAuditLog()).resolves.not.toThrow();
  });
  it("createAuditLog does not throw", async () => {
    await expect(createAuditLog({} as unknown as never)).resolves.not.toThrow();
  });
  it("fetchColourConditions does not throw", async () => {
    await expect(fetchColourConditions()).resolves.not.toThrow();
  });
  it("fetchSurfaceConditions does not throw", async () => {
    await expect(fetchSurfaceConditions()).resolves.not.toThrow();
  });
});
