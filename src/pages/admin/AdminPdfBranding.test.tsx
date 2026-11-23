import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPdfBranding from "./AdminPdfBranding";

const {
  mockTemplates,
  mockConfig,
  updateLimitMock,
  createTemplateMock,
  deleteTemplateMock,
  updateTemplateMock,
} = vi.hoisted(() => {
  const mockConfig = {
    pdf_default_brand_name: "FRELUX PRO",
    pdf_default_tagline: "Precision BOQ & Estimation",
    pdf_default_contact_email: "support@frelux.com",
    pdf_default_contact_phone: "+234 800 000 0000",
    pdf_default_primary_color: "#7C3AED",
    pdf_default_secondary_color: "#0B1120",
    pdf_watermark_enabled: true,
    pdf_watermark_opacity: 0.08,
    pdf_watermark_scale: 0.6,
    pdf_watermark_position: "center",
    pdf_watermark_diagonal: false,
    brand_studio_enabled: true,
    ai_logo_daily_limit: 5,
  };

  const mockTemplates = [
    {
      id: "tpl-1",
      name: "Modern Executive",
      description: "Clean minimalist layout for client presentation",
      is_active: true,
      is_default: true,
      is_premium: false,
      rewarded_unlock_enabled: false,
    },
  ];

  return {
    mockConfig,
    mockTemplates,
    updateLimitMock: vi.fn().mockResolvedValue({ success: true }),
    createTemplateMock: vi.fn().mockResolvedValue({ error: null }),
    deleteTemplateMock: vi.fn().mockResolvedValue({ error: null }),
    updateTemplateMock: vi.fn().mockResolvedValue({ error: null }),
  };
});

vi.mock("@/lib/document-studio", () => ({
  fetchStudioPlanLimits: vi.fn().mockResolvedValue([
    {
      plan: "free",
      monthly_exports: 3,
      visual_builder: false,
      custom_branding: false,
      watermark_removal: false,
    },
    {
      plan: "pro",
      monthly_exports: 25,
      visual_builder: true,
      custom_branding: true,
      watermark_removal: true,
    },
  ]),
  updateStudioPlanLimit: updateLimitMock,
  fetchStudioAuditLogs: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/brand-studio", () => ({
  fetchPdfTemplates: vi.fn().mockResolvedValue(mockTemplates),
  createPdfTemplate: createTemplateMock,
  updatePdfTemplate: updateTemplateMock,
  deletePdfTemplate: deleteTemplateMock,
  fetchPdfBrandingConfig: vi.fn().mockResolvedValue(mockConfig),
  invalidateBrandingConfigCache: vi.fn(),
}));

const updateSiteSettingsMock = vi.fn().mockReturnValue({
  neq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "site_settings") {
        return {
          update: updateSiteSettingsMock,
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPdfBranding />
    </MemoryRouter>,
  );
}

describe("AdminPdfBranding", () => {
  it("renders page header and sections", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /PDF Branding & Templates/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Brand Studio Feature")).toBeInTheDocument();
    expect(screen.getByText("FRELUX Default PDF Branding")).toBeInTheDocument();
  });

  it("loads and displays branding form values", async () => {
    renderPage();

    expect(await screen.findByDisplayValue("FRELUX PRO")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Precision BOQ & Estimation"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("support@frelux.com")).toBeInTheDocument();
  });

  it("saves branding configuration updates", async () => {
    renderPage();

    const brandInput = await screen.findByDisplayValue("FRELUX PRO");
    fireEvent.change(brandInput, { target: { value: "FRELUX ENTERPRISE" } });

    const saveBtn = screen.getByRole("button", { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSiteSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pdf_default_brand_name: "FRELUX ENTERPRISE",
        }),
      );
    });
  });

  it("displays existing PDF templates", async () => {
    renderPage();

    expect(await screen.findByText("Modern Executive")).toBeInTheDocument();
    expect(
      screen.getByText("Clean minimalist layout for client presentation"),
    ).toBeInTheDocument();
  });

  it("deletes template after confirmation", async () => {
    renderPage();

    await screen.findByText("Modern Executive");
    const deleteBtn = screen.getByRole("button", { name: /Delete/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("Delete this template?");
      expect(deleteTemplateMock).toHaveBeenCalledWith("tpl-1");
    });
  });
});
