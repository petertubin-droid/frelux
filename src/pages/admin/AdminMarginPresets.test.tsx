import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMarginPresets from "@/pages/admin/AdminMarginPresets";
import {
  fetchMarginPresets,
  createMarginPreset,
  updateMarginPreset,
  deleteMarginPreset,
} from "@/lib/estimation/queries";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchMarginPresets: vi.fn(),
  createMarginPreset: vi.fn(),
  updateMarginPreset: vi.fn(),
  deleteMarginPreset: vi.fn(),
}));

const preset = {
  id: "mp-1",
  name: "Standard finishing",
  basis: "markup_on_cost" as const,
  margin_percent: 25,
  description: "Residential finishing work",
  is_default: true,
  is_active: true,
  sort_order: 0,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMarginPresets />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchMarginPresets).mockResolvedValue({
    data: [preset],
    error: null,
  } as never);
  vi.mocked(createMarginPreset).mockResolvedValue({
    data: preset,
    error: null,
  } as never);
  vi.mocked(updateMarginPreset).mockResolvedValue({
    data: preset,
    error: null,
  } as never);
  vi.mocked(deleteMarginPreset).mockResolvedValue({ error: null } as never);
});

describe("AdminMarginPresets", () => {
  it("shows the database error when the presets cannot be loaded", async () => {
    vi.mocked(fetchMarginPresets).mockResolvedValue({
      data: [],
      error: { message: "permission denied for table margin_presets" },
    } as never);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/permission denied for table margin_presets/),
      ).toBeInTheDocument();
    });
  });

  it("lists the presets it loaded", async () => {
    renderPage();
    expect(await screen.findByText("Standard finishing")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("names each row toggle after its preset instead of a template literal", async () => {
    renderPage();
    await screen.findByText("Standard finishing");
    expect(
      screen.getByRole("switch", { name: "Default: Standard finishing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Active: Standard finishing" }),
    ).toBeInTheDocument();
  });

  it("writes the exact payload a new preset needs", async () => {
    renderPage();
    await screen.findByText("Standard finishing");

    fireEvent.click(screen.getByRole("button", { name: /Add Preset/ }));
    fireEvent.change(screen.getByLabelText(/Preset name/), {
      target: { value: "  Facade works  " },
    });
    fireEvent.change(screen.getByLabelText(/Margin percent/), {
      target: { value: "18.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createMarginPreset).toHaveBeenCalledTimes(1));
    expect(createMarginPreset).toHaveBeenCalledWith({
      name: "Facade works",
      basis: "markup_on_cost",
      margin_percent: 18.5,
      description: null,
      is_default: false,
      is_active: true,
      sort_order: 0,
    });
  });

  it("refuses a zero margin without calling the database", async () => {
    renderPage();
    await screen.findByText("Standard finishing");

    fireEvent.click(screen.getByRole("button", { name: /Add Preset/ }));
    fireEvent.change(screen.getByLabelText(/Preset name/), {
      target: { value: "Free work" },
    });
    fireEvent.change(screen.getByLabelText(/Margin percent/), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/Margin percent must be positive/),
    ).toBeInTheDocument();
    expect(createMarginPreset).not.toHaveBeenCalled();
  });

  it("refuses a margin on price of 100 or more", async () => {
    renderPage();
    await screen.findByText("Standard finishing");

    fireEvent.click(screen.getByRole("button", { name: /Add Preset/ }));
    fireEvent.change(screen.getByLabelText(/Preset name/), {
      target: { value: "Impossible" },
    });
    fireEvent.change(screen.getByLabelText(/Basis/), {
      target: { value: "margin_on_price" },
    });
    fireEvent.change(screen.getByLabelText(/Margin percent/), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/mathematically impossible/),
    ).toBeInTheDocument();
    expect(createMarginPreset).not.toHaveBeenCalled();
  });

  it("updates the row it opened, not a new preset", async () => {
    renderPage();
    await screen.findByText("Standard finishing");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Standard finishing" }),
    );
    fireEvent.change(screen.getByLabelText(/Margin percent/), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateMarginPreset).toHaveBeenCalledTimes(1));
    expect(updateMarginPreset).toHaveBeenCalledWith(
      "mp-1",
      expect.objectContaining({ margin_percent: 30 }),
    );
    expect(createMarginPreset).not.toHaveBeenCalled();
  });

  it("deletes only after the confirmation is accepted", async () => {
    // jsdom in this setup does not define window.confirm, so it is installed
    // rather than spied on.
    const confirmSpy = vi.fn().mockReturnValue(false);
    Object.defineProperty(window, "confirm", {
      value: confirmSpy,
      writable: true,
      configurable: true,
    });
    renderPage();
    await screen.findByText("Standard finishing");

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Standard finishing" }),
    );
    expect(confirmSpy).toHaveBeenCalledWith(
      "Delete the Standard finishing preset?",
    );
    expect(deleteMarginPreset).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Standard finishing" }),
    );
    await waitFor(() =>
      expect(deleteMarginPreset).toHaveBeenCalledWith("mp-1"),
    );
  });

  it("surfaces a rejected save instead of claiming success", async () => {
    vi.mocked(createMarginPreset).mockResolvedValue({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    } as never);
    renderPage();
    await screen.findByText("Standard finishing");

    fireEvent.click(screen.getByRole("button", { name: /Add Preset/ }));
    fireEvent.change(screen.getByLabelText(/Preset name/), {
      target: { value: "Standard finishing" },
    });
    fireEvent.change(screen.getByLabelText(/Margin percent/), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/duplicate key value violates unique constraint/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Preset 'Standard finishing' saved/)).toBeNull();
  });
});
