import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ApiPlayground from "./ApiPlayground";

describe("ApiPlayground", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({
        "Content-Type": "application/json",
        "X-Frelux-Billing-State": "ACTIVE",
        "X-Frelux-Quota-Remaining": "995",
      }),
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          engine: "screeding",
          success: true,
          output: {
            materials: [
              { name: "Ordinary Portland Cement", quantity: 14, unit: "bags" },
            ],
          },
        }),
      ),
    });
  });

  it("renders presets including Screeding, Capabilities, and Plans", () => {
    render(<ApiPlayground apiKeys={[]} />);
    expect(screen.getByText("Screeding Takeoff")).toBeInTheDocument();
    expect(screen.getByText("Capabilities Registry")).toBeInTheDocument();
    expect(screen.getByText("API Plans & Pricing")).toBeInTheDocument();
  });

  it("pre-fills authentication token when prefilledKey prop is provided", () => {
    render(
      <ApiPlayground
        apiKeys={[]}
        prefilledKey="FLX-ABCDEF1234567890ABCDEF123456"
      />,
    );

    const input = screen.getByPlaceholderText(
      /Paste raw API key/i,
    ) as HTMLInputElement;
    expect(input.value).toBe("FLX-ABCDEF1234567890ABCDEF123456");
  });

  it("executes request and displays formatted JSON and latency badge", async () => {
    render(
      <ApiPlayground
        apiKeys={[]}
        prefilledKey="FLX-ABCDEF1234567890ABCDEF123456"
      />,
    );

    const executeBtn = screen.getByRole("button", {
      name: /Execute Request/i,
    });
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/calculators/screeding"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer FLX-ABCDEF1234567890ABCDEF123456",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/200 OK/)).toBeInTheDocument();
      expect(screen.getByText(/Ordinary Portland Cement/)).toBeInTheDocument();
    });
  });

  it("switches presets and updates request payload", () => {
    render(<ApiPlayground apiKeys={[]} />);
    const capBtn = screen.getByText("Capabilities Registry");
    fireEvent.click(capBtn);

    expect(screen.getByText(/GET \/v1\/capabilities/)).toBeInTheDocument();
  });
});
