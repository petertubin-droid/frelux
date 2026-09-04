import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TemplateCard from "@/components/templates/TemplateCard";

vi.mock("@/lib/templates", () => ({
  calculatorLabel: vi.fn(
    (type: string) => type.charAt(0).toUpperCase() + type.slice(1),
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const template = {
  id: "tpl-1",
  user_id: "user-1",
  name: "10x12 Living Room",
  description: "Living room with 2 coats",
  calculator_type: "paint" as const,
  input_data: { area: 120 },
  schema_version: 1,
  visibility: "private" as const,
  is_favorite: false,
  is_featured: false,
  is_published: false,
  display_order: 0,
  slug: null,
  seo_title: null,
  seo_description: null,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

function renderCard(overrides?: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <TemplateCard template={template} {...overrides} />
    </MemoryRouter>,
  );
}

describe("TemplateCard", () => {
  it("renders template name", () => {
    renderCard();
    expect(screen.getByText("10x12 Living Room")).toBeTruthy();
  });

  it("renders calculator type label", () => {
    renderCard();
    expect(screen.getByText("Paint")).toBeTruthy();
  });

  it("renders Use Template button when onUse is provided", () => {
    renderCard({ onUse: vi.fn() });
    expect(screen.getByText("Use Template")).toBeTruthy();
  });

  it("calls onUse when Use Template is clicked", () => {
    const onUse = vi.fn();
    renderCard({ onUse });
    fireEvent.click(screen.getByText("Use Template"));
    expect(onUse).toHaveBeenCalled();
  });

  it("renders Edit button when onEdit is provided", () => {
    renderCard({ onEdit: vi.fn() });
    expect(screen.getByLabelText("Edit template")).toBeTruthy();
  });

  it("shows delete confirmation when Delete is clicked", () => {
    renderCard({ onDelete: vi.fn() });
    fireEvent.click(screen.getByLabelText("Delete template"));
    expect(screen.getByText("Confirm?")).toBeTruthy();
  });

  it("renders Duplicate button when onDuplicate is provided", () => {
    renderCard({ onDuplicate: vi.fn() });
    expect(screen.getByLabelText("Duplicate template")).toBeTruthy();
  });

  it("renders public variant with View Template link", () => {
    renderCard({
      variant: "public",
      template: { ...template, slug: "living-room-template" },
    });
    const link = screen.getByText("View Template").closest("a");
    expect(link?.getAttribute("href")).toContain(
      "/templates/living-room-template",
    );
  });
});
