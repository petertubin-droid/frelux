import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTechnicalLabels } from "./use-technical-labels";

const state = vi.hoisted(() => ({ language: "en" }));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ language: state.language, t: (k: string) => k }),
}));

vi.mock("./translation-pool", () => ({
  getTranslationPool: vi.fn(async (lang: string) => ({
    source: "dictionary",
    terms:
      lang === "ja"
        ? [
            {
              canonical_term: "gypsum board",
              language: "ja",
              translation: "石膏ボード",
              verified: true,
              translation_status: "verified",
            },
          ]
        : [],
  })),
}));

describe("useTechnicalLabels", () => {
  beforeEach(() => {
    state.language = "en";
  });

  it("passes labels through untouched in English", () => {
    const { result } = renderHook(() => useTechnicalLabels());
    expect(result.current.t("gypsum board")).toBe("gypsum board");
    expect(result.current.dictionaryReady).toBe(false);
  });

  it("translates known technical terms once the pool loads", async () => {
    state.language = "ja";
    const { result } = renderHook(() => useTechnicalLabels());
    await waitFor(() => expect(result.current.dictionaryReady).toBe(true));
    expect(result.current.t("gypsum board")).toContain("石膏ボード");
  });

  it("keeps unknown terms in English (no invention)", async () => {
    state.language = "ja";
    const { result } = renderHook(() => useTechnicalLabels());
    await waitFor(() => expect(result.current.dictionaryReady).toBe(true));
    expect(result.current.t("unlisted widget")).toBe("unlisted widget");
  });

  it("never machine-translates safety or regulatory text", async () => {
    state.language = "ja";
    const { result } = renderHook(() => useTechnicalLabels());
    await waitFor(() => expect(result.current.dictionaryReady).toBe(true));
    const safety = "Gypsum board must be kept clear of ignition sources";
    expect(result.current.t(safety)).toBe(safety);
  });
});
