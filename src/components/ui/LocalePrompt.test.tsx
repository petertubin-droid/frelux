import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { LocalePrompt } from "@/components/ui/LocalePrompt";

// Detection is unit-tested in locale-suggest.test.ts; here we pin the
// suggestion so the consent flow is deterministic.
const detectMock = vi.hoisted(() => vi.fn((): string | null => null));
vi.mock("@/lib/international/locale-suggest", () => ({
  detectSuggestedLanguage: detectMock,
}));

// GoogleTranslateSync does DOM/script work; isolate it.
vi.mock("@/components/ui/GoogleTranslate", () => ({
  GoogleTranslateSync: () => null,
}));

function Probe() {
  const { language } = useLanguage();
  const location = useLocation();
  return (
    <>
      <p data-testid="lang">{language}</p>
      <p data-testid="path">{location.pathname}</p>
    </>
  );
}

function renderPrompt(path = "/") {
  window.history.replaceState({}, "", path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <Probe />
        <LocalePrompt />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  detectMock.mockReturnValue(null);
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("LocalePrompt consent flow", () => {
  it("asks in French (with consent) when the visitor looks French", async () => {
    detectMock.mockReturnValue("fr");
    renderPrompt("/construction-tools");
    expect(
      await screen.findByText(/Afficher Frelux en français/i),
    ).toBeDefined();
    expect(screen.getByText(/View Frelux in French/i)).toBeDefined();
  });

  it("stays silent when no suggestion or the language matches", async () => {
    detectMock.mockReturnValue(null);
    const { container } = renderPrompt("/");
    await waitFor(() =>
      expect(container.querySelector('[role="dialog"]')).toBeNull(),
    );
  });

  it("never suggests after an explicit switcher choice", async () => {
    detectMock.mockReturnValue("fr");
    localStorage.setItem("frelux_lang_chosen", "1");
    const { container } = renderPrompt("/");
    await waitFor(() =>
      expect(container.querySelector('[role="dialog"]')).toBeNull(),
    );
  });

  it("never asks twice for the same language after declining", async () => {
    detectMock.mockReturnValue("fr");
    const first = renderPrompt("/");
    fireEvent.click(await screen.findByRole("button", { name: /Non, merci/i }));
    await waitFor(() =>
      expect(first.container.querySelector('[role="dialog"]')).toBeNull(),
    );
    expect(
      JSON.parse(localStorage.getItem("frelux.localePrompt") ?? "{}"),
    ).toEqual({ fr: "dismissed" });

    first.unmount();
    renderPrompt("/");
    // No dialog on the second visit — dismissal is remembered.
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("accepting switches the language, lands on the locale URL, and records consent", async () => {
    detectMock.mockReturnValue("fr");
    renderPrompt("/construction-tools");
    fireEvent.click(await screen.findByRole("button", { name: /Français/i }));

    await waitFor(() =>
      expect(screen.getByTestId("lang").textContent).toBe("fr"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("path").textContent).toBe(
        "/fr/construction-tools",
      ),
    );
    expect(
      JSON.parse(localStorage.getItem("frelux.localePrompt") ?? "{}"),
    ).toEqual({ fr: "accepted" });
  });

  it("does not prompt on a locale URL — the visitor already chose a surface", async () => {
    detectMock.mockReturnValue("fr");
    const { container } = renderPrompt("/fr/construction-tools");
    await waitFor(() =>
      expect(container.querySelector('[role="dialog"]')).toBeNull(),
    );
  });
});
