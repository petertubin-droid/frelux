import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeedbackBanner from "@/components/FeedbackBanner";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeedbackBanner />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("FeedbackBanner", () => {
  it("shows on the homepage", async () => {
    renderAt("/");
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /share your idea/i }),
      ).toBeTruthy(),
    );
  });

  it("shows on calculator pages", async () => {
    renderAt("/tile-calculator");
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /share your idea/i }),
      ).toBeTruthy(),
    );
  });

  it("does not show on other pages", async () => {
    renderAt("/marketplace");
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("link", { name: /share your idea/i })).toBeNull();
  });

  it("hides after dismissal (3-day cooldown) and remembers it in localStorage", async () => {
    renderAt("/");
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /share your idea/i }),
      ).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /dismiss feedback banner/i }),
    );
    expect(
      window.localStorage.getItem("frelux_feedback_banner_dismissed"),
    ).toBeTruthy();
    renderAt("/");
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("link", { name: /share your idea/i })).toBeNull();
  });
});
