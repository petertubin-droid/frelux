import { describe, expect, it, vi } from "vitest";
import { getTranslationPool } from "./translation-pool";
import { instantiateSeedTranslationRecords } from "./seed-terms";

vi.mock("./dictionary-client", () => ({
  listDictionaryTerms: vi.fn(),
}));

import { listDictionaryTerms } from "./dictionary-client";

const mockedList = vi.mocked(listDictionaryTerms);

describe("translation pool resolution (engine #6 M3 wiring)", () => {
  it("prefers the live database pool when available", async () => {
    mockedList.mockResolvedValueOnce([
      instantiateSeedTranslationRecords("ja")[0],
    ]);
    const pool = await getTranslationPool("ja");
    expect(pool.source).toBe("database");
    expect(pool.terms.length).toBeGreaterThan(0);
    expect(mockedList).toHaveBeenCalledWith({ language: "ja", limit: 500 });
  });

  it("falls back to the disclosed seed pool when the DB is empty", async () => {
    mockedList.mockResolvedValueOnce([]);
    const pool = await getTranslationPool("ja");
    expect(pool.source).toBe("seed-fallback");
    expect(pool.terms.length).toBeGreaterThan(0);
    expect(pool.terms.every((t) => t.language === "ja")).toBe(true);
    expect(pool.terms.every((t) => !t.verified)).toBe(true);
  });

  it("falls back with disclosure when the DB call throws", async () => {
    mockedList.mockRejectedValueOnce(new Error("network down"));
    const pool = await getTranslationPool("fr");
    expect(pool.source).toBe("seed-fallback");
    expect(pool.terms.some((t) => t.canonical_term === "mortar")).toBe(true);
  });

  it("seed fallback for a language with no seed terms is empty but valid", async () => {
    mockedList.mockResolvedValueOnce([]);
    const pool = await getTranslationPool("de");
    expect(pool.source).toBe("seed-fallback");
    // de has no seed translations yet — honest empty pool
    const withDe = pool.terms.filter((t) => t.language === "de");
    expect(withDe).toHaveLength(0);
  });

  it("overlay records mirror the live DB row shape (provisional, unverified)", () => {
    const ja = instantiateSeedTranslationRecords("ja");
    expect(ja.length).toBeGreaterThan(10);
    for (const t of ja) {
      expect(t.translation).toBeTruthy();
      expect(t.translation_status).toBe("provisional");
      expect(t.verified).toBe(false);
    }
  });
});
