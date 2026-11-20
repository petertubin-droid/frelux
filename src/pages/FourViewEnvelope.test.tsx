import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FourViewEnvelope from "./FourViewEnvelope";

vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(),
  SITE_URL: "https://freluxtools.com",
}));

describe("FourViewEnvelope page", () => {
  it("renders the four elevation tabs and starts unmeasured", () => {
    render(
      <MemoryRouter>
        <FourViewEnvelope />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: /4-View Envelope & Plan Generator/i,
      }),
    ).toBeTruthy();
    for (const label of ["Front", "Back", "Left", "Right"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label) }),
      ).toBeTruthy();
    }
    expect(screen.getByText(/Ready so far: 0 of 4/)).toBeTruthy();
  });

  it("switches the editor to the chosen elevation", () => {
    render(
      <MemoryRouter>
        <FourViewEnvelope />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Left/ }));
    expect(screen.getByLabelText(/Left photograph/)).toBeTruthy();
    expect(screen.getByLabelText(/Left corner editor/)).toBeTruthy();
  });

  it("explains the deterministic pipeline rather than promising AI numbers", () => {
    render(
      <MemoryRouter>
        <FourViewEnvelope />
      </MemoryRouter>,
    );
    expect(screen.getByText(/homography/i)).toBeTruthy();
    expect(screen.getByText(/cos\(pitch\)/i)).toBeTruthy();
  });
});
