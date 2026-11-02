import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/supabase-lazy", () => ({ getSupabase: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Metrics page", () => {
  it("renders public platform metrics and investor section", async () => {
    const Comp = (await import("@/pages/Metrics")).default;
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <Comp />
      </MemoryRouter>,
    );
    expect(getByRole("heading", { name: /platform metrics/i })).toBeTruthy();
    expect(getByText(/tests passing/i)).toBeTruthy();
    expect(getByText(/for investors & buyers/i)).toBeTruthy();
  });

  it("shows the platform status section", async () => {
    const Comp = (await import("@/pages/Metrics")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Comp />
      </MemoryRouter>,
    );
    expect(getByText(/application: operational/i)).toBeTruthy();
    expect(getByText(/ci: every commit typechecked/i)).toBeTruthy();
  });
});
