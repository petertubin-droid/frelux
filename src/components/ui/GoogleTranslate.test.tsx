/**
 * Google Translate integration - unit tests.
 */
import { describe, it, expect } from "vitest";
import {
  mapToGoogleLanguage,
  isGoogleTranslatedLanguage,
} from "./GoogleTranslate";

describe("mapToGoogleLanguage", () => {
  it("maps FRELUX codes to Google widget codes where they differ", () => {
    expect(mapToGoogleLanguage("zh")).toBe("zh-CN");
  });

  it("passes GT-supported languages through unchanged", () => {
    for (const code of ["en", "fr", "pt", "sw", "ar"] as const) {
      expect(mapToGoogleLanguage(code)).toBe(code);
    }
  });

  it("restores English by targeting en", () => {
    expect(mapToGoogleLanguage("en")).toBe("en");
  });
});

describe("isGoogleTranslatedLanguage", () => {
  it("accepts every registered international language", () => {
    for (const code of ["en", "fr", "pt", "sw", "ar", "zh"] as const) {
      expect(isGoogleTranslatedLanguage(code)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// applyGoogleLanguage — cookie-first, combo-driven behaviour
// ---------------------------------------------------------------------------
import { describe as _d2, it as _i2, expect as _e2 } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import {
  applyGoogleLanguage,
  GoogleTranslateSync,
  setGoogleTranslateCookie,
} from "./GoogleTranslate";

const GT_RELOAD_KEY = "frelux_gt_reload_lang";

beforeEach(() => {
  document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("applyGoogleLanguage cookie-first behaviour", () => {
  it("writes the googtrans cookie even when no widget combo exists", async () => {
    vi.useFakeTimers();
    const result = await act(async () => {
      const p = applyGoogleLanguage("fr");
      await vi.advanceTimersByTimeAsync(3000);
      return p;
    });
    expect(result).toBe(false);
    expect(document.cookie).toContain("googtrans=/en/fr");
  });

  it("drives the hidden combo when the widget provides one", async () => {
    const combo = document.createElement("select");
    combo.className = "goog-te-combo";
    combo.innerHTML = `<option value="en">English</option><option value="fr">French</option>`;
    document.body.appendChild(combo);
    let changed = false;
    combo.addEventListener("change", () => {
      changed = true;
    });

    const result = await applyGoogleLanguage("fr");
    expect(result).toBe(true);
    expect(combo.value).toBe("fr");
    expect(changed).toBe(true);
    combo.remove();
  });

  it("clears the cookie for English so the widget restores the original page", () => {
    setGoogleTranslateCookie("fr");
    expect(document.cookie).toContain("googtrans=/en/fr");
    setGoogleTranslateCookie("en");
    expect(document.cookie).not.toContain("googtrans=/en/fr");
  });
});

describe("GoogleTranslateSync language switch flow", () => {
  it("reloads once (cookie already set) when the combo cannot be driven", async () => {
    vi.useFakeTimers();
    const reloadMock = vi.fn();
    Object.defineProperty(window.location, "reload", {
      value: reloadMock,
      writable: true,
      configurable: true,
    });

    const { rerender } = render(<GoogleTranslateSync language="en" />);
    // Let the mount effect finish its combo poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(reloadMock).not.toHaveBeenCalled();

    rerender(<GoogleTranslateSync language="fr" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Cookie set immediately, one reload requested, flag stored to
    // prevent a loop after the reload lands.
    expect(document.cookie).toContain("googtrans=/en/fr");
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(GT_RELOAD_KEY)).toBe("fr");
  });

  it("shows the manual fallback link after a reload failed to start translation", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem(GT_RELOAD_KEY, "fr");

    render(<GoogleTranslateSync language="fr" />);
    // Before the grace period ends, no notice.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(
      screen.queryByText("Automatic translation unavailable"),
    ).toBeNull();

    // After the grace period with no combo, the fallback appears.
    // (The combo poll itself burns ~2.75s of fake time before the 6s
    // grace timer even starts, so advance well past both.)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(
      screen.getByText("Automatic translation unavailable"),
    ).toBeInTheDocument();
    const link = screen.getByText("Open in Google Translate");
    expect(link.getAttribute("href")).toContain("tl=fr");
  });
});
