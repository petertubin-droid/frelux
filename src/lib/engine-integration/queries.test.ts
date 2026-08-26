import { describe, it, expect, vi } from "vitest";

function createChainable() {
  const chain: any = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: any) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: any, prop: string) {
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
  fetchMaterialProfiles,
  fetchMaterialProfilesByCategory,
  upsertMaterialProfile,
  deleteMaterialProfile,
  approveMaterialProfile,
  toggleMaterialProfileActive,
  fetchRoofMaterials,
  upsertRoofMaterial,
  deleteRoofMaterial,
  fetchRoofSections,
  upsertRoofSection,
  deleteRoofSection,
  fetchWasteConfigs,
  fetchWasteConfigsByScope,
  upsertWasteConfig,
  updateWasteConfig,
  deleteWasteConfig,
  fetchAiVerifications,
  updateAiVerificationState,
  createAiVerification,
  fetchRuleMetadata,
  fetchRuleMetadataById,
  upsertRuleMetadata,
  deleteRuleMetadata,
  verifyRuleMetadata,
  fetchEngineSettings,
  fetchEngineSetting,
  updateEngineSetting,
  upsertEngineSetting,
  toggleMarketActivation,
  fetchMarketActivationStatus,
} = await import("./queries");

describe("queries (supabase not configured)", () => {
  it("fetchMaterialProfiles does not throw", async () => {
    await expect(fetchMaterialProfiles({} as any)).resolves.not.toThrow();
  });
  it("fetchMaterialProfilesByCategory does not throw", async () => {
    await expect(
      fetchMaterialProfilesByCategory({} as any),
    ).resolves.not.toThrow();
  });
  it("upsertMaterialProfile does not throw", async () => {
    await expect(upsertMaterialProfile({} as any)).resolves.not.toThrow();
  });
  it("deleteMaterialProfile does not throw", async () => {
    await expect(deleteMaterialProfile({} as any)).resolves.not.toThrow();
  });
  it("approveMaterialProfile does not throw", async () => {
    await expect(approveMaterialProfile({} as any)).resolves.not.toThrow();
  });
  it("toggleMaterialProfileActive does not throw", async () => {
    await expect(toggleMaterialProfileActive({} as any)).resolves.not.toThrow();
  });
  it("fetchRoofMaterials does not throw", async () => {
    await expect(fetchRoofMaterials({} as any)).resolves.not.toThrow();
  });
  it("upsertRoofMaterial does not throw", async () => {
    await expect(upsertRoofMaterial({} as any)).resolves.not.toThrow();
  });
  it("deleteRoofMaterial does not throw", async () => {
    await expect(deleteRoofMaterial({} as any)).resolves.not.toThrow();
  });
  it("fetchRoofSections does not throw", async () => {
    await expect(fetchRoofSections({} as any)).resolves.not.toThrow();
  });
  it("upsertRoofSection does not throw", async () => {
    await expect(upsertRoofSection({} as any)).resolves.not.toThrow();
  });
  it("deleteRoofSection does not throw", async () => {
    await expect(deleteRoofSection({} as any)).resolves.not.toThrow();
  });
  it("fetchWasteConfigs does not throw", async () => {
    await expect(fetchWasteConfigs({} as any)).resolves.not.toThrow();
  });
  it("fetchWasteConfigsByScope does not throw", async () => {
    await expect(fetchWasteConfigsByScope({} as any)).resolves.not.toThrow();
  });
  it("upsertWasteConfig does not throw", async () => {
    await expect(upsertWasteConfig({} as any)).resolves.not.toThrow();
  });
  it("updateWasteConfig does not throw", async () => {
    await expect(updateWasteConfig({} as any)).resolves.not.toThrow();
  });
  it("deleteWasteConfig does not throw", async () => {
    await expect(deleteWasteConfig({} as any)).resolves.not.toThrow();
  });
  it("fetchAiVerifications does not throw", async () => {
    await expect(fetchAiVerifications({} as any)).resolves.not.toThrow();
  });
  it("updateAiVerificationState does not throw", async () => {
    await expect(updateAiVerificationState({} as any)).resolves.not.toThrow();
  });
  it("createAiVerification does not throw", async () => {
    await expect(createAiVerification({} as any)).resolves.not.toThrow();
  });
  it("fetchRuleMetadata does not throw", async () => {
    await expect(fetchRuleMetadata({} as any)).resolves.not.toThrow();
  });
  it("fetchRuleMetadataById does not throw", async () => {
    await expect(fetchRuleMetadataById({} as any)).resolves.not.toThrow();
  });
  it("upsertRuleMetadata does not throw", async () => {
    await expect(upsertRuleMetadata({} as any)).resolves.not.toThrow();
  });
  it("deleteRuleMetadata does not throw", async () => {
    await expect(deleteRuleMetadata({} as any)).resolves.not.toThrow();
  });
  it("verifyRuleMetadata does not throw", async () => {
    await expect(verifyRuleMetadata({} as any)).resolves.not.toThrow();
  });
  it("fetchEngineSettings does not throw", async () => {
    await expect(fetchEngineSettings({} as any)).resolves.not.toThrow();
  });
  it("fetchEngineSetting does not throw", async () => {
    await expect(fetchEngineSetting({} as any)).resolves.not.toThrow();
  });
  it("updateEngineSetting does not throw", async () => {
    await expect(updateEngineSetting({} as any)).resolves.not.toThrow();
  });
  it("upsertEngineSetting does not throw", async () => {
    await expect(upsertEngineSetting({} as any)).resolves.not.toThrow();
  });
  it("toggleMarketActivation does not throw", async () => {
    await expect(toggleMarketActivation({} as any)).resolves.not.toThrow();
  });
  it("fetchMarketActivationStatus does not throw", async () => {
    await expect(fetchMarketActivationStatus({} as any)).resolves.not.toThrow();
  });
});
