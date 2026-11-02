import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

const insertChain = {
  insert: vi.fn((): Promise<{ error: unknown }> =>
    Promise.resolve({ error: null }),
  ),
};

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(async () => ({ from: () => insertChain })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  insertChain.insert.mockImplementation(() => Promise.resolve({ error: null }));
});

async function renderPage() {
  const Comp = (await import("@/pages/legal/DataRequest")).default;
  return render(<Comp />);
}

describe("Data subject request page", () => {
  it("renders the request form", async () => {
    const { getByLabelText, getByRole } = await renderPage();
    expect(
      getByRole("heading", { name: /data subject request/i }),
    ).toBeTruthy();
    expect(getByLabelText(/email/i)).toBeTruthy();
    expect(getByRole("button", { name: /submit request/i })).toBeTruthy();
  });

  it("submits a request and confirms", async () => {
    const { getByLabelText, getByRole, getByText } = await renderPage();
    fireEvent.change(getByLabelText(/email/i), {
      target: { value: "someone@example.com" },
    });
    fireEvent.click(getByRole("button", { name: /submit request/i }));
    await waitFor(() => {
      expect(getByText(/request received/i)).toBeTruthy();
    });
    expect(insertChain.insert).toHaveBeenCalledOnce();
  });

  it("falls back to contact guidance when the table is unavailable", async () => {
    insertChain.insert.mockImplementation((): Promise<{ error: unknown }> =>
      Promise.resolve({ error: new Error("relation does not exist") }),
    );
    const { getByLabelText, getByRole, findByRole } = await renderPage();
    fireEvent.change(getByLabelText(/email/i), {
      target: { value: "someone@example.com" },
    });
    fireEvent.click(getByRole("button", { name: /submit request/i }));
    expect(await findByRole("alert")).toBeTruthy();
  });
});
