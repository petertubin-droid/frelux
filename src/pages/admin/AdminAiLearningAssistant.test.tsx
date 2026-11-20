import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminAiLearningAssistant from "@/pages/admin/AdminAiLearningAssistant";

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { result: "# Comprehensive Painting Guide\n\nStep by step guide..." },
        error: null,
      }),
    },
  },
}));

describe("AdminAiLearningAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders topic and content fields and runs AI generation", async () => {
    render(
      <MemoryRouter>
        <AdminAiLearningAssistant />
      </MemoryRouter>,
    );

    expect(screen.getByText(/AI Learning Assistant/i)).toBeDefined();
    const topicInput = screen.getByPlaceholderText(/e.g. How to prepare a wall/i);
    expect(topicInput).toBeDefined();

    fireEvent.change(topicInput, { target: { value: "Painting Prep Guide" } });
    const runButton = screen.getByRole("button", { name: /Run AI/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/Comprehensive Painting Guide/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Save as Draft Article/i })).toBeDefined();
    });
  });

  it("saves generated result as an article draft to supabase", async () => {
    render(
      <MemoryRouter>
        <AdminAiLearningAssistant />
      </MemoryRouter>,
    );

    const topicInput = screen.getByPlaceholderText(/e.g. How to prepare a wall/i);
    fireEvent.change(topicInput, { target: { value: "Painting Prep Guide" } });
    fireEvent.click(screen.getByRole("button", { name: /Run AI/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save as Draft Article/i })).toBeDefined();
    });

    const saveButton = screen.getByRole("button", { name: /Save as Draft Article/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Saved as draft article/i)).toBeDefined();
    });
  });
});
