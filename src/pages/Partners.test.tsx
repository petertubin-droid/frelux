import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Partners from "./Partners";
import * as analytics from "@/lib/analytics";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
}));

vi.mock("@/components/ui/PageHeader", () => ({
  default: () => <div data-testid="page-header" />,
}));

const trackSpy = vi.spyOn(analytics, "track");

function setup() {
  return render(
    <MemoryRouter>
      <Partners />
    </MemoryRouter>,
  );
}

function fillField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
}

describe("Partners page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the three partnership lanes", () => {
    setup();
    expect(screen.getAllByText("Investor relations").length).toBeGreaterThan(0);
    expect(screen.getByText("Strategic partnerships")).toBeTruthy();
    expect(screen.getAllByText("Collaboration").length).toBeGreaterThan(0);
  });

  it("does not promise investment terms publicly", () => {
    setup();
    // Positioning copy stays professional: no public fundraising language
    expect(screen.queryByText(/invest now/i)).toBeNull();
    expect(screen.queryByText(/raising|seeking funding/i)).toBeNull();
  });

  it("validates required fields", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText("Please enter your name")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    expect(screen.getByText("Select what this is about")).toBeTruthy();
  });

  it("submits a valid inquiry and shows the success state", async () => {
    setup();
    fillField("Name *", "Ada Obi");
    fillField("Email *", "ada@example.com");
    fillField("Company / organisation", "Obi Capital");
    fillField("Message *", "We would like to discuss a partnership.");
    fireEvent.change(screen.getByLabelText("This is about *"), {
      target: { value: "investor" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/Thank you/i)).toBeTruthy();
    });
    expect(trackSpy).toHaveBeenCalledWith("partnership_inquiry_submitted", {
      interest: "investor",
    });
  });

  it("shows an error message when the insert fails", async () => {
    const { supabase } = await import("@/lib/supabase");
    (
      supabase.from as unknown as {
        mockReturnValueOnce: (value: unknown) => void;
      }
    ).mockReturnValueOnce({
      insert: vi.fn(() => Promise.resolve({ error: new Error("network") })),
    });

    setup();
    fillField("Name *", "Ada Obi");
    fillField("Email *", "ada@example.com");
    fillField("Message *", "We would like to discuss a partnership.");
    fireEvent.change(screen.getByLabelText("This is about *"), {
      target: { value: "partner" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/Something went wrong/i)).toBeTruthy();
  });
});
