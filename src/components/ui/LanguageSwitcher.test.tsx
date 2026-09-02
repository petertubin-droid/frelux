import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

vi.mock("@/lib/i18n", () => ({
  useLanguage: vi.fn(() => ({
    language: "en",
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
  })),
  LANGUAGES: [
    { value: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
    { value: "yo", label: "Yoruba", nativeLabel: "Yorùbá", flag: "🇳🇬" },
    { value: "ha", label: "Hausa", nativeLabel: "Hausa", flag: "🇳🇬" },
  ],
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LanguageSwitcher", () => {
  it("renders without crashing", () => {
    const { container } = render(<LanguageSwitcher />);
    expect(container.innerHTML).not.toBe("");
  });

  it("renders compact variant", () => {
    const { container } = render(<LanguageSwitcher compact />);
    expect(container.innerHTML).not.toBe("");
  });

  it("renders inline variant", () => {
    const { container } = render(<LanguageSwitcher inline />);
    expect(container.innerHTML).not.toBe("");
  });

  it("shows language options when opened", () => {
    render(<LanguageSwitcher inline />);
    fireEvent.click(screen.getByLabelText("Change language"));
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.getByText("Yorùbá")).toBeTruthy();
  });
});
