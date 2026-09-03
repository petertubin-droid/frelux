import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LocationPicker from "@/components/ui/LocationPicker";

vi.mock("@/lib/location", () => ({
  useLocation: vi.fn(() => ({
    location: null,
    loading: false,
    error: null,
    permissionDenied: false,
    detect: vi.fn(),
    setManual: vi.fn(),
    clear: vi.fn(),
  })),
  DISTANCE_FILTERS: [5, 10, 25, 50, 100],
}));

vi.mock("@/lib/pro-connect", () => ({
  fetchLocations: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LocationPicker", () => {
  it("renders without crashing", () => {
    const { container } = render(<LocationPicker />);
    expect(container.innerHTML).not.toBe("");
  });

  it("renders use my location button", () => {
    render(<LocationPicker />);
    expect(screen.getByText(/use my location/i)).toBeTruthy();
  });

  it("renders compact variant", () => {
    const { container } = render(<LocationPicker compact />);
    expect(container.innerHTML).not.toBe("");
  });

  it("renders without radius when showRadius is false", () => {
    const { container } = render(<LocationPicker showRadius={false} />);
    expect(container.innerHTML).not.toBe("");
  });
});
