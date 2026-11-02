import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

const mockList = vi.fn().mockResolvedValue({ data: [], error: null });
vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(() => ({ select: vi.fn(() => ({ order: mockList })) })) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPicker() {
  const TemplatePicker = (await import("@/components/ui/TemplatePicker")).default;
  return render(
    <MemoryRouter>
      <TemplatePicker calculatorType="paint" currentData={{}} onLoad={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("TemplatePicker", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPicker();
    expect(container.innerHTML).not.toBe("");
  });
});
