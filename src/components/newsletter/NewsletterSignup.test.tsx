import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The signup posts through supabase.functions.invoke; stub the client
// before importing the component so the module picks up the mock.
const invokeMock = vi.fn();
vi.mock("@/lib/supabase", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");
  return {
    ...actual,
    supabase: { functions: { invoke: (...a: unknown[]) => invokeMock(...a) } },
  };
});

import NewsletterSignup from "@/components/newsletter/NewsletterSignup";

describe("NewsletterSignup", () => {
  beforeEach(() => {
    cleanup();
    invokeMock.mockReset();
  });

  it("submits the trimmed email with its source", async () => {
    invokeMock.mockResolvedValue({ data: { subscribed: true }, error: null });
    render(<NewsletterSignup source="footer" />);
    const input = screen.getByLabelText(
      "Email address for weekly price updates",
    );
    await userEvent.type(input, "  Jane@Example.COM  ");
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/subscribed/i),
    );
    expect(invokeMock).toHaveBeenCalledWith("subscribe-newsletter", {
      body: { email: "jane@example.com", source: "footer" },
    });
  });

  it("surfaces the real error message on failure", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error("Valid email required"),
    });
    render(<NewsletterSignup />);
    await userEvent.type(
      screen.getByLabelText("Email address for weekly price updates"),
      "not-an-email",
    );
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i),
    );
  });

  it("disables the submit button while a request is in flight", async () => {
    let resolveInvoke: (v: unknown) => void = () => {};
    invokeMock.mockReturnValue(
      new Promise((r) => {
        resolveInvoke = r;
      }),
    );
    render(<NewsletterSignup />);
    await userEvent.type(
      screen.getByLabelText("Email address for weekly price updates"),
      "a@b.co",
    );
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(button).toBeDisabled();
    resolveInvoke({ data: { subscribed: true }, error: null });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/subscribed/i),
    );
  });
});
