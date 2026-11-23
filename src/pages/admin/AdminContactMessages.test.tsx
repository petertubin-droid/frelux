import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminContactMessages from "./AdminContactMessages";
import { supabase } from "@/lib/supabase";

const mockMessages = [
  {
    id: "msg-1",
    name: "Amina Yusuf",
    email: "amina@example.com",
    subject: "Industrial screeding consultation",
    message: "We need an estimate for a 5,000 sqm warehouse floor in Ikeja.",
    status: "new",
    created_at: "2026-11-20T10:00:00Z",
  },
  {
    id: "msg-2",
    name: "Emeka Obi",
    email: "emeka@example.com",
    subject: "Bulk paint supply inquiry",
    message: "Do you supply weather-shield satin in 20L containers?",
    status: "read",
    created_at: "2026-11-19T14:30:00Z",
  },
];

let queryResult = { data: mockMessages, error: null };
let countResult = { count: 2, error: null };
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockImplementation((_cols, opts) => {
        if (opts?.head) {
          return Promise.resolve(countResult);
        }
        return {
          order: vi.fn().mockReturnValue({
            range: vi
              .fn()
              .mockImplementation(() => Promise.resolve(queryResult)),
          }),
        };
      }),
      update: vi.fn().mockImplementation((payload) => ({
        eq: updateEqMock.mockImplementation(() =>
          Promise.resolve({ error: null }),
        ),
      })),
      delete: vi.fn().mockReturnValue({
        eq: deleteEqMock.mockImplementation(() =>
          Promise.resolve({ error: null }),
        ),
      }),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: mockMessages, error: null };
  countResult = { count: 2, error: null };
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminContactMessages />
    </MemoryRouter>,
  );
}

describe("AdminContactMessages", () => {
  it("lists contact messages with sender details, subject, and status badges", async () => {
    renderPage();

    expect(
      await screen.findByText("Industrial screeding consultation"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bulk paint supply inquiry")).toBeInTheDocument();
    expect(screen.getByText(/Amina Yusuf/)).toBeInTheDocument();
    expect(screen.getByText(/amina@example.com/)).toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
    expect(screen.getByText("read")).toBeInTheDocument();
  });

  it("opens view modal and automatically marks a new message as read", async () => {
    renderPage();

    const viewButtons = await screen.findAllByRole("button", { name: /view/i });
    fireEvent.click(viewButtons[0]);

    expect(
      await screen.findByText(/5,000 sqm warehouse floor/i),
    ).toBeInTheDocument();
    expect(updateEqMock).toHaveBeenCalledWith("id", "msg-1");
  });

  it("marks message as replied from within the view modal", async () => {
    renderPage();

    const viewButtons = await screen.findAllByRole("button", { name: /view/i });
    fireEvent.click(viewButtons[0]);

    const repliedBtn = await screen.findByRole("button", {
      name: /mark replied/i,
    });
    fireEvent.click(repliedBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("contact_messages");
    });
    expect(updateEqMock).toHaveBeenCalledWith("id", "msg-1");
  });

  it("marks message as archived from within the view modal", async () => {
    renderPage();

    const viewButtons = await screen.findAllByRole("button", { name: /view/i });
    fireEvent.click(viewButtons[1]); // msg-2 is "read"

    const archiveBtn = await screen.findByRole("button", { name: /archive/i });
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "msg-2");
    });
  });

  it("deletes message when confirmation is accepted", async () => {
    renderPage();

    await screen.findByText("Industrial screeding consultation");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete message: Industrial screeding consultation",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete this message? This cannot be undone.",
    );
    await waitFor(() => {
      expect(deleteEqMock).toHaveBeenCalledWith("id", "msg-1");
    });
  });

  it("does not delete message when confirmation is rejected", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderPage();

    await screen.findByText("Industrial screeding consultation");
    const deleteBtn = screen.getByRole("button", {
      name: "Delete message: Industrial screeding consultation",
    });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteEqMock).not.toHaveBeenCalled();
  });

  it("surfaces database load error honestly", async () => {
    queryResult = {
      data: null as any,
      error: { message: "Failed to connect to inbox" } as any,
    };
    renderPage();

    expect(
      await screen.findByText("Failed to connect to inbox"),
    ).toBeInTheDocument();
  });
});
