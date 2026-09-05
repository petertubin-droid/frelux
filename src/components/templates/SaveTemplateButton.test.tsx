import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SaveTemplateButton from "@/components/templates/SaveTemplateButton";

type FakeUser = { id: string } | null;
const mockUser: { value: FakeUser } = { value: { id: "user-1" } };

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: mockUser.value }),
}));

vi.mock("@/lib/useTemplates", () => ({
  useUserTemplates: vi.fn(() => ({
    templates: [],
    loading: false,
    create: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = { id: "user-1" };
});

function renderButton(overrides?: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <SaveTemplateButton
        calculatorType="paint"
        inputData={{ area: 100 }}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe("SaveTemplateButton", () => {
  it("renders the Save as Template button", () => {
    renderButton();
    expect(screen.getByText("Save as Template")).toBeTruthy();
  });

  it("returns null when user is not logged in", () => {
    mockUser.value = null;
    const { container } = renderButton();
    expect(container.innerHTML).toBe("");
  });

  it("opens modal when button is clicked", () => {
    renderButton();
    fireEvent.click(screen.getByText("Save as Template"));
    expect(
      screen.getAllByText("Save as Template").length,
    ).toBeGreaterThanOrEqual(2);
  });
});
