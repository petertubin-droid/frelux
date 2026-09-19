import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------
// ADMIN ROOF VIEW (imagery provider) TESTS
// Verifies the operator surface that activates the formerly
// dead Roof View feature:
//   * honest status (Not live vs Live badge)
//   * provider cards label implemented vs not-implemented
//   * API key is write-only: never re-displayed after save
//   * Save upserts integration_settings (key server-side),
//     inserts/updates roof_view_config, clears the key input
//   * clearing the key field does NOT delete a stored key
//   * Remove key disables the feature and wipes the credential
//   * test button gated until the feature is live
// ---------------------------------------------------------

const supabaseMock = vi.hoisted(() => {
  // per-table responses for awaited chains + maybeSingle()
  const state: {
    awaited: Record<string, unknown>;
    single: Record<string, unknown>;
    updates: Array<{
      table: string;
      patch: Record<string, unknown>;
      filter?: unknown;
    }>;
    inserts: Array<{ table: string; row: Record<string, unknown> }>;
    upserts: Array<{
      table: string;
      row: Record<string, unknown>;
      opts?: unknown;
    }>;
  } = { awaited: {}, single: {}, updates: [], inserts: [], upserts: [] };

  const chain = (table: string) => {
    const c: Record<string, unknown> = {
      select: vi.fn(() => c),
      order: vi.fn(() => c),
      limit: vi.fn(() => c),
      eq: vi.fn((_col: string, val: unknown) => {
        (c as any).__eqVal = val;
        return c;
      }),
      update: vi.fn((patch: Record<string, unknown>) => {
        state.updates.push({
          table,
          patch,
          filter: (c as any).__eqVal,
        });
        return c;
      }),
      insert: vi.fn((row: Record<string, unknown>) => {
        state.inserts.push({ table, row });
        return c;
      }),
      upsert: vi.fn((row: Record<string, unknown>, opts?: unknown) => {
        state.upserts.push({ table, row, opts });
        return c;
      }),
      // real supabase-js maybeSingle ALWAYS resolves an object
      maybeSingle: vi.fn(() =>
        Promise.resolve(
          state.single[table] !== undefined
            ? { data: state.single[table], error: null }
            : { data: null, error: null },
        ),
      ),
      then: (
        resolve: (v: unknown) => unknown,
        reject: (e: unknown) => unknown,
      ) =>
        Promise.resolve(
          state.awaited[table] !== undefined
            ? state.awaited[table]
            : { data: null, error: null },
        ).then(resolve, reject),
    };
    return c;
  };

  return {
    __state: state,
    from: vi.fn((table: string) => chain(table)),
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));

// provider-registry: keep real SUPPORTED_PROVIDERS + cache clear,
// stub the imagery fetch (end-to-end test button).
vi.mock("@/lib/roof/provider-registry", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/roof/provider-registry")>();
  return {
    ...actual,
    fetchRoofViewImagery: vi.fn(),
  };
});

import AdminRoofView from "./AdminRoofView";
import { fetchRoofViewImagery } from "@/lib/roof/provider-registry";

const CONFIG_ROW = {
  id: "cfg-1",
  provider_type: "google_maps",
  enabled: true,
  api_key_configured: true,
  display_name: "Google Maps Satellite",
  settings: { zoom: 20, maptype: "satellite", size: "1200x1200" },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminRoofView />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.__state.awaited = {};
  supabaseMock.__state.single = {};
  supabaseMock.__state.updates = [];
  supabaseMock.__state.inserts = [];
  supabaseMock.__state.upserts = [];
});

describe("AdminRoofView — loading & status", () => {
  it("shows the Not live state when no config row exists", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [],
      error: null,
    };
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Not live", { exact: false })).toBeTruthy(),
    );
    expect(
      screen.getByText(/Roof View is disabled|no API key is stored/i),
    ).toBeTruthy();
    expect(screen.getByText("Google Maps Satellite")).toBeTruthy();
    expect(screen.getByText("Mapbox Satellite")).toBeTruthy();
    expect(screen.getByText("Nearmap")).toBeTruthy();
    expect(screen.getByText("Custom Provider")).toBeTruthy();
  });

  it("shows Live when a provider is enabled with a key configured", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [CONFIG_ROW],
      error: null,
    };
    renderPage();

    await waitFor(() =>
      expect(
        screen.getAllByText("Live", { exact: false }).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.getByText(/Active — .* imagery is served/i)).toBeTruthy();
  });

  it("labels implemented vs not-implemented providers honestly", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [],
      error: null,
    };
    renderPage();
    await waitFor(() => expect(screen.getByText("Nearmap")).toBeTruthy());

    expect(
      screen.getByText(
        /Registered, but server-side retrieval is not implemented/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByText(/Implemented — ready to serve imagery/i).length,
    ).toBe(3);
  });

  it("renders an error state when the load fails", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: null,
      error: new Error("rls says no"),
    };
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Could not load configuration")).toBeTruthy(),
    );
    expect(screen.getByText("rls says no")).toBeTruthy();
  });
});

describe("AdminRoofView — provider & settings", () => {
  it("switching providers rehydrates that provider's settings schema", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [],
      error: null,
    };
    renderPage();
    await waitFor(() => screen.getByText("Mapbox Satellite"));

    fireEvent.click(screen.getByText("Mapbox Satellite"));
    // mapbox schema fields appear
    expect(screen.getByText("Zoom level", { exact: false })).toBeTruthy();
    expect(screen.getByText(/High resolution/i)).toBeTruthy();
    // google-only maptype select is gone
    expect(screen.queryByText("Map type", { exact: false })).toBeNull();
  });

  it("hydrates stored settings from an existing config row", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [CONFIG_ROW],
      error: null,
    };
    renderPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("1200x1200")).toBeTruthy(),
    );
  });
});

describe("AdminRoofView — save", () => {
  it("inserts config + upserts the key when none existed; key input cleared, never re-displayed", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [],
      error: null,
    };
    supabaseMock.__state.awaited["integration_settings"] = {
      data: null,
      error: null,
    };
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Paste the provider API key/i),
      ).toBeTruthy(),
    );

    // enable the feature
    const toggles = screen.getAllByRole("switch");
    fireEvent.click(toggles[0]);

    const keyInput = screen.getByPlaceholderText(/Paste the provider API key/i);
    fireEvent.change(keyInput, { target: { value: "gmaps-secret-key" } });
    fireEvent.click(screen.getByText("Save configuration"));

    await waitFor(() =>
      expect(
        screen.getByText(
          /Saved\. Roof View is live with Google Maps Satellite\./i,
        ),
      ).toBeTruthy(),
    );

    // key upserted server-side
    const upsert = supabaseMock.__state.upserts.find(
      (u) => u.table === "integration_settings",
    );
    expect(upsert).toBeTruthy();
    expect(upsert!.row).toMatchObject({
      integration_key: "roof_view",
      category: "maps",
      is_enabled: true,
    });
    expect((upsert!.row.config as Record<string, unknown>).api_key).toBe(
      "gmaps-secret-key",
    );

    // config row INSERTED with api_key_configured true
    const insert = supabaseMock.__state.inserts.find(
      (i) => i.table === "roof_view_config",
    );
    expect(insert).toBeTruthy();
    expect(insert!.row).toMatchObject({
      provider_type: "google_maps",
      enabled: true,
      api_key_configured: true,
      display_name: "Google Maps Satellite",
    });

    // the secret is never rendered anywhere
    expect(document.body.innerHTML).not.toContain("gmaps-secret-key");

    // key input is cleared + write-only placeholder after save
    expect(screen.getByPlaceholderText(/\(a key is stored/i)).toBeTruthy();
  });

  it("updates the existing config row instead of inserting", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [CONFIG_ROW],
      error: null,
    };
    // second read (save flow) sees the same existing row
    renderPage();
    await waitFor(() => screen.getByText("Save configuration"));

    fireEvent.change(
      screen.getByPlaceholderText(/enter a new one to replace/i),
      { target: { value: "rotated-key" } },
    );
    fireEvent.click(screen.getByText("Save configuration"));

    await waitFor(() =>
      expect(
        supabaseMock.__state.updates.some(
          (u) => u.table === "roof_view_config",
        ),
      ).toBeTruthy(),
    );
    const update = supabaseMock.__state.updates.find(
      (u) => u.table === "roof_view_config",
    )!;
    expect(update.patch).toMatchObject({
      provider_type: "google_maps",
      api_key_configured: true,
    });
    // no duplicate insert
    expect(
      supabaseMock.__state.inserts.filter((i) => i.table === "roof_view_config")
        .length,
    ).toBe(0);
  });

  it("saving with an empty key field preserves an already-stored key", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [CONFIG_ROW],
      error: null,
    };
    supabaseMock.__state.single["integration_settings"] = {
      config: { api_key: "previously-stored-key" },
    };
    renderPage();
    await waitFor(() => screen.getByText("Save configuration"));

    fireEvent.click(screen.getByText("Save configuration"));

    await waitFor(() =>
      expect(
        supabaseMock.__state.upserts.some(
          (u) => u.table === "integration_settings",
        ),
      ).toBeTruthy(),
    );
    const upsert = supabaseMock.__state.upserts.find(
      (u) => u.table === "integration_settings",
    )!;
    expect((upsert.row.config as Record<string, unknown>).api_key).toBe(
      "previously-stored-key",
    );
  });

  it("shows the save error honestly when the write fails", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [],
      error: null,
    };
    supabaseMock.__state.awaited["integration_settings"] = {
      data: null,
      error: null,
    };
    // after the first successful steps, the upsert fails — simulate by
    // making integration_settings awaited fail AFTER read succeeded
    renderPage();
    await waitFor(() => screen.getByText("Save configuration"));

    supabaseMock.__state.awaited["integration_settings"] = {
      data: null,
      error: { message: "upsert denied" },
    };
    fireEvent.click(screen.getByText("Save configuration"));

    await waitFor(() =>
      expect(screen.getByText(/upsert denied|Failed to save/i)).toBeTruthy(),
    );
  });
});

describe("AdminRoofView — remove key", () => {
  it("removes the stored key and disables the feature", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [CONFIG_ROW],
      error: null,
    };
    supabaseMock.__state.single["integration_settings"] = {
      config: { api_key: "old-key", note: "keep-me" },
    };
    renderPage();
    await waitFor(() => screen.getByText("Remove key"));

    fireEvent.click(screen.getByText("Remove key"));

    await waitFor(() =>
      expect(
        screen.getByText(/API key removed\. Roof View is now disabled/i),
      ).toBeTruthy(),
    );

    // integration_settings update drops ONLY api_key
    const intUpdate = supabaseMock.__state.updates.find(
      (u) => u.table === "integration_settings",
    );
    expect(intUpdate).toBeTruthy();
    expect(
      (intUpdate!.patch.config as Record<string, unknown>).api_key,
    ).toBeUndefined();
    expect((intUpdate!.patch.config as Record<string, unknown>).note).toBe(
      "keep-me",
    );

    // roof_view_config disabled + key flag cleared
    const cfgUpdate = supabaseMock.__state.updates.find(
      (u) => u.table === "roof_view_config",
    );
    expect(cfgUpdate!.patch).toMatchObject({
      api_key_configured: false,
      enabled: false,
    });
    // and the secret never rendered
    expect(document.body.innerHTML).not.toContain("old-key");
  });
});

describe("AdminRoofView — end-to-end test button", () => {
  it("is disabled until the feature is live", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [],
      error: null,
    };
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Test with sample location")).toBeTruthy(),
    );
    expect(
      (screen.getByText("Test with sample location") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("runs the imagery fetch and shows the result", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [CONFIG_ROW],
      error: null,
    };
    vi.mocked(fetchRoofViewImagery).mockResolvedValue({
      available: true,
      imagery_url: "data:image/png;base64,xyz",
      provider: "google_maps",
      provider_display_name: "Google Maps Satellite",
      retrieved_at: "2026-09-19T00:00:00Z",
    } as never);

    renderPage();
    const btn = await screen.findByText("Test with sample location");
    fireEvent.click(btn);

    await waitFor(() =>
      expect(
        screen.getByText(/Success — Google Maps Satellite returned imagery/i),
      ).toBeTruthy(),
    );
    expect(screen.getByAltText("Sample roof view imagery")).toBeTruthy();
    expect(fetchRoofViewImagery).toHaveBeenCalledWith({
      latitude: 6.5244,
      longitude: 3.3792,
    });
  });

  it("shows the honest provider error when imagery is unavailable", async () => {
    supabaseMock.__state.awaited["roof_view_config"] = {
      data: [CONFIG_ROW],
      error: null,
    };
    vi.mocked(fetchRoofViewImagery).mockResolvedValue({
      available: false,
      error: "Google Maps Satellite rejected the imagery request (HTTP 403).",
    } as never);

    renderPage();
    const btn = await screen.findByText("Test with sample location");
    fireEvent.click(btn);

    await waitFor(() =>
      expect(
        screen.getByText(/rejected the imagery request \(HTTP 403\)/i),
      ).toBeTruthy(),
    );
  });
});
