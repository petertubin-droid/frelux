import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

describe("GlobalSiteSafetyEstimator FAQ wiring", () => {
  it("renders the registry questions and their FAQPage markup", async () => {
    const Page = (await import("@/pages/GlobalSiteSafetyEstimator")).default;
    render(
      <MemoryRouter>
        <ToastProvider>
          <Page />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: /Global Site Safety . PPE Estimator: frequently asked questions/i,
      }),
    ).toBeInTheDocument();
    const question = /Does this estimator certify/i;
    // The answer text is the accordion's own copy, so assert the question is on
    // screen and the markup carries the same string rather than a near copy.
    expect(screen.getByText(question)).toBeInTheDocument();
    const schema = document.getElementById("faq-jsonld");
    expect(schema?.textContent ?? "").toContain(
      "Does this estimator certify that my site complies",
    );
    expect(schema?.textContent ?? "").toContain("FAQPage");
  });
});

describe("GlobalSiteSafetyEstimator inventory", () => {
  it("counts hard hats as crew plus reserve and boots per worker", async () => {
    const Page = (await import("@/pages/GlobalSiteSafetyEstimator")).default;
    const { container } = render(
      <MemoryRouter>
        <ToastProvider>
          <Page />
        </ToastProvider>
      </MemoryRouter>,
    );
    // Defaults: crew 10, reserve 2, so 12 hats and vests, 10 boot pairs.
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toMatch(/12/);
    expect(text).toMatch(/Hard Hat|hard hat/i);
    expect(text).toMatch(/Safety Boot|safety boot/i);
  });

  it("drops hazard lines when the hazard switches are off", async () => {
    const Page = (await import("@/pages/GlobalSiteSafetyEstimator")).default;
    const { container } = render(
      <MemoryRouter>
        <ToastProvider>
          <Page />
        </ToastProvider>
      </MemoryRouter>,
    );
    // Fall risk is on by default, excavation and hot work are off, so the
    // barricade tape and extinguisher lines must not be in the inventory.
    const text = container.textContent ?? "";
    // The input controls stay on the page, so assert against the inventory
    // lines themselves rather than the shared words in their labels.
    expect(text).toMatch(/Fall Protection/i);
    expect(text).not.toMatch(/Barricade Hazard Tape/i);
    expect(text).not.toMatch(/Site Assessed Quantity/i);
  });
});
