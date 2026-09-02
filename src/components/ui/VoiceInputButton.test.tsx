import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";

// Mock voice-input hook
const mockUseVoiceInput = vi.fn();
vi.mock("@/lib/voice-input", () => ({
  useVoiceInput: (...args: unknown[]) => mockUseVoiceInput(...args),
  parseSpokenNumber: vi.fn((s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? null : n;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseVoiceInput.mockReturnValue({
    isListening: false,
    isSupported: true,
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
  });
});

describe("VoiceInputButton", () => {
  it("renders a button when voice input is supported", () => {
    render(<VoiceInputButton onResult={vi.fn()} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("returns null when voice input is not supported", () => {
    mockUseVoiceInput.mockReturnValue({
      isListening: false,
      isSupported: false,
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
    });
    const { container } = render(<VoiceInputButton onResult={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows listening state with appropriate aria-label", () => {
    mockUseVoiceInput.mockReturnValue({
      isListening: true,
      isSupported: true,
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
    });
    render(<VoiceInputButton onResult={vi.fn()} label="area" />);
    expect(screen.getByLabelText("Stop voice input")).toBeTruthy();
  });

  it("shows speak label when not listening", () => {
    render(<VoiceInputButton onResult={vi.fn()} label="area" />);
    expect(screen.getByLabelText("Speak area")).toBeTruthy();
  });

  it("shows error message when present", () => {
    mockUseVoiceInput.mockReturnValue({
      isListening: false,
      isSupported: true,
      error: "Mic permission denied",
      startListening: vi.fn(),
      stopListening: vi.fn(),
    });
    render(<VoiceInputButton onResult={vi.fn()} />);
    expect(screen.getByText("Mic permission denied")).toBeTruthy();
  });

  it("renders in compact mode by default (small button)", () => {
    render(<VoiceInputButton onResult={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("h-8");
  });

  it("renders in full mode when compact=false", () => {
    render(<VoiceInputButton onResult={vi.fn()} compact={false} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("px-3");
    expect(btn.textContent).toContain("Speak");
  });
});
