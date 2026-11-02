import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoogleDataUse from "@/components/home/GoogleDataUse";

const renderSection = () =>
  render(
    <MemoryRouter>
      <GoogleDataUse />
    </MemoryRouter>,
  );

describe("GoogleDataUse", () => {
  it("states what the sign-in receives, why, and what it never touches", () => {
    renderSection();

    expect(
      screen.getByRole("heading", { name: /Signing in with Google/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "What we receive" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Why we ask for it" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "What we never access" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /name, your email address and your Google profile photo/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/^No Gmail, Drive, Calendar/i)).toBeTruthy();
  });

  it("says the tools work without an account and links the policy", () => {
    renderSection();

    expect(
      screen.getByText(
        /Every calculator and estimate on FRELUX works without an account/i,
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Read the full privacy policy/i })
        .getAttribute("href"),
    ).toBe("/privacy-policy");
  });

  it("makes the section reachable by its heading, for screen readers", () => {
    const { container } = renderSection();
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-labelledby")).toBe(
      "google-data-use-heading",
    );
    expect(container.querySelector("#google-data-use-heading")).toBeTruthy();
  });

  it("keeps the standing copy rules", () => {
    const { container } = renderSection();
    const text = container.textContent ?? "";
    expect(text).not.toContain("—");
    expect(text).not.toContain("⭐");
    expect(text).not.toContain("✦");
    expect(text).not.toMatch(/magic|sparkle/i);
  });
});
