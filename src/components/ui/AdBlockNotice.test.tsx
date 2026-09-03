import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdBlockNotice } from "@/components/ui/AdBlockNotice";

vi.mock("@/lib/ad-block-detection", () => ({
  detectAdBlocker: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/ad-config", () => ({
  logAdEvent: vi.fn(() => Promise.resolve()),
}));

import { detectAdBlocker } from "@/lib/ad-block-detection";

describe("AdBlockNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (detectAdBlocker as unknown).mockResolvedValue(false);
  });

  it("returns null when no ad blocker detected", async () => {
    const { container } = render(<AdBlockNotice />);
    await waitFor(() => expect(detectAdBlocker).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("shows notice when ad blocker is detected", async () => {
    (detectAdBlocker as unknown).mockResolvedValue(true);
    render(<AdBlockNotice />);
    await waitFor(() =>
      expect(screen.getByText("Ad blocker detected")).toBeTruthy(),
    );
  });

  it("can be dismissed", async () => {
    (detectAdBlocker as unknown).mockResolvedValue(true);
    const { container } = render(<AdBlockNotice />);
    await waitFor(() =>
      expect(screen.getByText("Ad blocker detected")).toBeTruthy(),
    );
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(container.firstChild).toBeNull();
  });

  it("shows helpful message", async () => {
    (detectAdBlocker as unknown).mockResolvedValue(true);
    render(<AdBlockNotice />);
    await waitFor(() =>
      expect(screen.getByText(/Frelux is free because of ads/i)).toBeTruthy(),
    );
  });
});
