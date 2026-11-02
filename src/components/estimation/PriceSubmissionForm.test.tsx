import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              then: (cb: (r: { data: unknown }) => void) => {
                cb({ data: null });
                return Promise.resolve();
              },
            }),
          }),
        }),
      }),
    }),
  },
  isSupabaseConfigured: true,
}));

import PriceSubmissionForm from "@/components/estimation/PriceSubmissionForm";

describe("PriceSubmissionForm accessibility", () => {
  afterEach(cleanup);

  it("associates every field label with its control", () => {
    render(
      <MemoryRouter>
        <PriceSubmissionForm />
      </MemoryRouter>,
    );
    for (const name of [
      "Market",
      "Region",
      "Item",
      "Unit",
      "Price",
      "Vendor",
    ]) {
      // throws if the label text is not programmatically linked
      const control = screen.getByLabelText(new RegExp(`^${name}`, "i"));
      expect(control).toBeTruthy();
      expect((control as HTMLElement).tagName).toMatch(/^(INPUT|SELECT)$/);
    }
  });

  it("labels the region fallback input when regions are unavailable", () => {
    render(
      <MemoryRouter>
        <PriceSubmissionForm />
      </MemoryRouter>,
    );
    const region = screen.getByLabelText(/^Region$/i);
    // without configured regions the fallback free-text input renders,
    // and it must still carry the same accessible name as the select
    expect((region as HTMLElement).tagName).toBe("INPUT");
  });
});
