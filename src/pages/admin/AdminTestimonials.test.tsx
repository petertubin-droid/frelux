import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTestimonials from "./AdminTestimonials";

const mockTestimonials = [
  {
    id: "t1",
    quote: "The paint calculator was spot on.",
    author_name: "Madam Clara",
    author_role: "Homeowner",
    author_location: "Lagos",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
  },
  {
    id: "t2",
    quote: "An inactive quote that must still be listed here.",
    author_name: "Emeka",
    author_role: null,
    author_location: null,
    is_active: false,
    sort_order: 2,
    created_at: "2026-01-02",
  },
];

const mockInsert = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockDeleteEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }));

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "site_testimonials") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockTestimonials, error: null }),
            }),
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      }),
    },
  };
});

describe("AdminTestimonials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);
    mockInsert.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
  });

  it("lists active and inactive testimonials and shows guidance", async () => {
    render(
      <MemoryRouter>
        <AdminTestimonials />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/The paint calculator was spot on/i)).toBeInTheDocument();
      expect(screen.getByText("Madam Clara, Homeowner — Lagos · order 1")).toBeInTheDocument();
      expect(screen.getByText("Emeka · order 2")).toBeInTheDocument();
    });
    expect(screen.getByText(/real user quotes only/i)).toBeInTheDocument();
  });

  it("refuses creation when quote is under 10 chars or author name is blank", async () => {
    render(
      <MemoryRouter>
        <AdminTestimonials />
      </MemoryRouter>,
    );

    await screen.findByText(/The paint calculator was spot on/i);

    const quoteInput = screen.getByPlaceholderText(/The exact quote, as the user wrote it/i);
    fireEvent.change(quoteInput, { target: { value: "Too short" } });

    fireEvent.click(screen.getByRole("button", { name: /Publish testimonial/i }));

    await waitFor(() => {
      expect(
        screen.getByText("A quote (10+ characters) and an author name are required."),
      ).toBeInTheDocument();
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates a testimonial with trimmed strings and nullable role/location", async () => {
    render(
      <MemoryRouter>
        <AdminTestimonials />
      </MemoryRouter>,
    );

    await screen.findByText(/The paint calculator was spot on/i);

    const quoteInput = screen.getByPlaceholderText(/The exact quote, as the user wrote it/i);
    fireEvent.change(quoteInput, {
      target: { value: "  Accurate reinforcement estimation saved us two tonnes of steel.  " },
    });

    const authorInput = screen.getByLabelText("Author name");
    fireEvent.change(authorInput, { target: { value: "  Engr. Balogun  " } });

    const roleInput = screen.getByLabelText("Role (e.g. Homeowner)");
    fireEvent.change(roleInput, { target: { value: "Structural Consultant" } });

    fireEvent.click(screen.getByRole("button", { name: /Publish testimonial/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        quote: "Accurate reinforcement estimation saved us two tonnes of steel.",
        author_name: "Engr. Balogun",
        author_role: "Structural Consultant",
        author_location: null,
        sort_order: 0,
        is_active: true,
      });
    });
  });

  it("toggles active/inactive state of a testimonial", async () => {
    render(
      <MemoryRouter>
        <AdminTestimonials />
      </MemoryRouter>,
    );

    await screen.findByText(/The paint calculator was spot on/i);

    const activeBtn = screen.getByRole("button", { name: /^Active$/i });
    fireEvent.click(activeBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "t1");
    });
  });

  it("deletes testimonial after confirmation dialog is accepted", async () => {
    render(
      <MemoryRouter>
        <AdminTestimonials />
      </MemoryRouter>,
    );

    await screen.findByText(/The paint calculator was spot on/i);

    const deleteBtn = screen.getByLabelText("Delete testimonial from Madam Clara");
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete the testimonial from Madam Clara? This cannot be undone.",
    );
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteEq).toHaveBeenCalledWith("id", "t1");
    });
  });
});
