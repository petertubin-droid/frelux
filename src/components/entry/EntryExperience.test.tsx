// FRELUX Entry Experience: premium first-visit welcome overlay.
// It must render the brand message, enter the site via the CTA, remember
// the visit locally, and never trap visitors when storage is unavailable.
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import EntryExperience, {
  hasEnteredBefore,
  markEntered,
} from "./EntryExperience";

const STORAGE_KEY = "frelux_entry_seen_v1";

describe("EntryExperience (first-visit welcome)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("renders the brand, headline, supporting text and CTA", () => {
    render(<EntryExperience onComplete={() => {}} />);
    expect(
      screen.getByRole("dialog", { name: /welcome to frelux/i }),
    ).toBeDefined();
    expect(screen.getByText("FRELUX")).toBeDefined();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain("Smarter Construction.");
    expect(h1.textContent).toContain("More Accurate Decisions.");
    expect(
      screen.getByText(
        "Tools, intelligence and practical technology designed to help you plan, calculate and build with greater confidence.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText("Construction intelligence, built for real projects."),
    ).toBeDefined();
    expect(screen.getByTestId("entry-cta").textContent).toContain(
      "Explore FRELUX",
    );
  });

  it("is a proper dialog: modal, labelled, with an accessible button", () => {
    render(<EntryExperience onComplete={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByTestId("entry-cta").tagName).toBe("BUTTON");
  });

  it("entering via the CTA marks the visit and completes after the transition", () => {
    const onComplete = vi.fn();
    render(<EntryExperience onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("entry-cta"));
    // The flag is set immediately so a mid-transition interruption
    // can never trap the visitor.
    expect(hasEnteredBefore()).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("the Escape key also enters the site", () => {
    const onComplete = vi.fn();
    render(<EntryExperience onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(hasEnteredBefore()).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("entering twice (double activation) completes only once", () => {
    const onComplete = vi.fn();
    render(<EntryExperience onComplete={onComplete} />);
    const cta = screen.getByTestId("entry-cta");
    fireEvent.click(cta);
    fireEvent.click(cta);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("hasEnteredBefore reflects the local flag", () => {
    expect(hasEnteredBefore()).toBe(false);
    markEntered();
    expect(hasEnteredBefore()).toBe(true);
    window.localStorage.removeItem(STORAGE_KEY);
    expect(hasEnteredBefore()).toBe(false);
  });

  it("never traps visitors when localStorage is unavailable", () => {
    const thrower = () => {
      throw new Error("storage blocked");
    };
    const desc = Object.getOwnPropertyDescriptor(
      window.localStorage,
      "getItem",
    );
    Object.defineProperty(window.localStorage, "getItem", {
      configurable: true,
      get: () => thrower,
    });
    try {
      expect(hasEnteredBefore()).toBe(true); // fails open - immediate access
    } finally {
      if (desc) Object.defineProperty(window.localStorage, "getItem", desc);
    }
  });
});
