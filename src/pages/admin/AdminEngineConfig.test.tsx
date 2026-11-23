import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEngineConfig from "@/pages/admin/AdminEngineConfig";

const updateEngineSettingSpy = vi.fn();
const fetchEngineSettingsSpy = vi.fn();
const notifyErrorSpy = vi.fn();

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, loading: false }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ error: notifyErrorSpy, success: vi.fn() }),
}));

// The page imports a wide surface from this module; only the settings calls
// matter here, and the rest return empty so other tabs stay quiet.
vi.mock("@/lib/engine-integration", () => ({
  fetchMaterialProfiles: vi.fn().mockResolvedValue([]),
  upsertMaterialProfile: vi.fn(),
  deleteMaterialProfile: vi.fn(),
  approveMaterialProfile: vi.fn(),
  toggleMaterialProfileActive: vi.fn(),
  fetchRoofMaterials: vi.fn().mockResolvedValue([]),
  fetchRoofSections: vi.fn().mockResolvedValue([]),
  fetchWasteConfigs: vi.fn().mockResolvedValue([]),
  fetchAiVerifications: vi.fn().mockResolvedValue([]),
  updateAiVerificationState: vi.fn(),
  fetchRuleMetadata: vi.fn().mockResolvedValue([]),
  deleteRuleMetadata: vi.fn(),
  verifyRuleMetadata: vi.fn(),
  fetchEngineSettings: () => fetchEngineSettingsSpy(),
  updateEngineSetting: (key: string, value: unknown) =>
    updateEngineSettingSpy(key, value),
  fetchMarketActivationStatus: vi.fn().mockResolvedValue([]),
  toggleMarketActivation: vi.fn(),
}));

vi.mock("@/components/admin/AdminEngineMatrix", () => ({
  AdminEngineMatrix: () => <div>matrix</div>,
}));
vi.mock("@/components/admin/AdminCapabilityAvailability", () => ({
  AdminCapabilityAvailability: () => <div>availability</div>,
}));
vi.mock("@/components/admin/AdminEngineReconciliation", () => ({
  AdminEngineReconciliation: () => <div>reconciliation</div>,
}));

const settings = [
  {
    id: "s1",
    setting_key: "waste_factor_pct",
    setting_value: 5,
    setting_type: "number",
    category: "waste",
    is_editable: true,
    description: "Default waste allowance",
  },
  {
    id: "s2",
    setting_key: "labour_region",
    setting_value: "lagos",
    setting_type: "string",
    category: "labour",
    is_editable: true,
    description: "Default labour region",
  },
];

function renderSettingsTab() {
  render(
    <MemoryRouter>
      <AdminEngineConfig />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Engine Settings/ }));
}

async function editAndSave(key: string, value: string) {
  fireEvent.click(screen.getByLabelText(`Edit ${key}`));
  fireEvent.change(screen.getByLabelText(`Value for ${key}`), {
    target: { value },
  });
  fireEvent.click(screen.getByLabelText(`Save ${key}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchEngineSettingsSpy.mockResolvedValue(settings);
  updateEngineSettingSpy.mockResolvedValue(undefined);
});

describe("AdminEngineConfig settings", () => {
  it("saves a numeric setting as a number, not the typed string", async () => {
    renderSettingsTab();
    await screen.findByText("waste_factor_pct");

    await editAndSave("waste_factor_pct", "7.5");

    await waitFor(() => expect(updateEngineSettingSpy).toHaveBeenCalled());
    // A string here would reach the engine as "7.5" and compare wrongly.
    expect(updateEngineSettingSpy).toHaveBeenCalledWith(
      "waste_factor_pct",
      7.5,
    );
    expect(typeof updateEngineSettingSpy.mock.calls[0][1]).toBe("number");
  });

  it("keeps a plain text setting as text", async () => {
    renderSettingsTab();
    await screen.findByText("labour_region");

    await editAndSave("labour_region", "abuja");

    await waitFor(() => expect(updateEngineSettingSpy).toHaveBeenCalled());
    expect(updateEngineSettingSpy).toHaveBeenCalledWith(
      "labour_region",
      "abuja",
    );
  });

  it("saves a boolean setting as a boolean", async () => {
    renderSettingsTab();
    await screen.findByText("waste_factor_pct");

    await editAndSave("waste_factor_pct", "true");

    await waitFor(() => expect(updateEngineSettingSpy).toHaveBeenCalled());
    expect(updateEngineSettingSpy).toHaveBeenCalledWith(
      "waste_factor_pct",
      true,
    );
  });

  it("tells the admin when a setting could not be saved", async () => {
    updateEngineSettingSpy.mockRejectedValue(new Error("permission denied"));
    renderSettingsTab();
    await screen.findByText("waste_factor_pct");

    await editAndSave("waste_factor_pct", "9");

    await waitFor(() =>
      expect(notifyErrorSpy).toHaveBeenCalledWith("Failed to save"),
    );
  });

  it("only offers an edit control for settings marked editable", async () => {
    fetchEngineSettingsSpy.mockResolvedValue([
      ...settings,
      {
        id: "s3",
        setting_key: "engine_version",
        setting_value: "1.0.0",
        setting_type: "string",
        category: "meta",
        is_editable: false,
        description: "Set by release",
      },
    ]);
    renderSettingsTab();
    await screen.findByText("engine_version");

    expect(screen.queryByLabelText("Edit engine_version")).toBeNull();
    expect(screen.getByLabelText("Edit waste_factor_pct")).toBeInTheDocument();
  });
});
