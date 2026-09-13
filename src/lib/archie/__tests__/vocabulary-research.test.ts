import { describe, expect, it } from "vitest";
import {
  extractMeaningResearchRequest,
  researchTermMeaning,
  researchTerm,
  type FetchLike,
  type MeaningResearchReport,
} from "@studio-shared/archie-ai/knowledge/vocabulary-research.ts";
import { ArchieNativeEngine } from "@studio-shared/archie-ai/native-engine/engine.ts";
import { SupabasePersistence } from "@studio-shared/archie-ai/native-engine/persistence.ts";

/** Fake multi-site fetch: dictionaryapi + wiktionary know the
 *  term, DDG does, Wikipedia 404s, everything else fails. */
function fakeFoundFetch(term: string): FetchLike {
  return (url: string) => {
    if (url.includes("dictionaryapi.dev")) {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              meanings: [
                {
                  definitions: [
                    { definition: `${term} is a sacred weed of the deep desert. It grows tall.` },
                  ],
                },
              ],
            },
          ]),
          { status: 200 },
        ),
      );
    }
    if (url.includes("wiktionary.org")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            en: [{ definitions: [{ definition: "<b>a sacred weed</b> of the deep desert." }] }],
          }),
          { status: 200 },
        ),
      );
    }
    if (url.includes("duckduckgo.com")) {
      return Promise.resolve(
        new Response(JSON.stringify({ Definition: "A sacred desert weed of legend." }), { status: 200 }),
      );
    }
    if (url.includes("wikipedia.org")) {
      return Promise.resolve(new Response("{}", { status: 404 }));
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  };
}

describe("meaning research across multiple sites", () => {
  it("extracts the term from explicit and anaphoric requests", () => {
    expect(extractMeaningResearchRequest("research what kwisatz means")).toBe("kwisatz");
    expect(extractMeaningResearchRequest("look up the word janded")).toBe("janded");
    expect(extractMeaningResearchRequest("research the phrase no wahala")).toBe("no wahala");
    // bare "research it" resolves the last definition question
    const history = [
      { role: "owner", parts: [{ text: "what does kwisatz mean" }] },
      { role: "agent", parts: [{ text: "I have not learned it yet." }] },
    ];
    expect(extractMeaningResearchRequest("research it", history)).toBe("kwisatz");
    // session-memory shape (role + text) also resolves
    expect(
      extractMeaningResearchRequest("research it", [
        { role: "owner", text: "define blorptastic" },
      ]),
    ).toBe("blorptastic");
    expect(extractMeaningResearchRequest("research it")).toBeNull();
    expect(extractMeaningResearchRequest("research cement prices in lagos")).toBeNull();
  });

  it("researches a term across all sites and cross-checks", async () => {
    const report = await researchTermMeaning("kwisatz", fakeFoundFetch("kwisatz"));
    expect(report.meaning).toContain("sacred weed");
    // dictionary-quality source wins
    expect(report.domains).toContain("dictionaryapi.dev");
    expect(report.domains).toContain("wiktionary.org");
    expect(report.confidence).toBe(0.6);
    expect(report.results).toHaveLength(4);
    // wikipedia 404 = failure, named honestly
    const wiki = report.results.find((r) => r.domain === "wikipedia.org");
    expect(wiki?.failure).toBe(true);
  });

  it("single source means lower confidence; all-miss means no meaning invented", async () => {
    const single = (url: string) =>
      url.includes("duckduckgo.com")
        ? Promise.resolve(
            new Response(JSON.stringify({ Definition: "A thing of legend." }), { status: 200 }),
          )
        : Promise.resolve(new Response("{}", { status: 404 }));
    const one = await researchTermMeaning("xyzzy", single as FetchLike);
    expect(one.confidence).toBe(0.4);
    const none = await researchTermMeaning("qqqqzz", (async () => new Response("{}", { status: 404 })) as FetchLike);
    expect(none.meaning).toBeNull();
    expect(none.note).toContain("nothing stored");
  });

  it("stores researched meanings with research provenance and lower confidence", async () => {
    const upserts: Array<Record<string, unknown>> = [];
    const stub = {
      from: () => ({
        select: () => ({
          then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
          range: () => ({
            then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
          }),
        }),
        insert: () => ({ error: null }),
        update: () => ({ eq: () => ({ error: null }) }),
        upsert: (rows: Array<Record<string, unknown>>) => {
          upserts.push(...rows);
          return { error: null };
        },
      }),
    };
    const db = stub as never;
    const ok = await researchTerm(
      db,
      "u1",
      "shakara",
      "showing off to impress",
      ["dictionaryapi.dev", "wiktionary.org"],
      0.6,
    );
    expect(ok).toBe(true);
    const row = upserts[0] as Record<string, unknown>;
    expect(row.source).toBe("research");
    expect(row.confidence).toBe(0.6);
    expect(String(row.provenance)).toContain("researched from dictionaryapi.dev");
    expect(String(row.provenance)).toContain("wiktionary.org");
  });

  it("engine research flow stores the registry row and reports sites honestly", async () => {
    const upserts: Array<Record<string, unknown>> = [];
    const stub = {
      from: () => ({
        select: () => ({
          then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
          range: () => ({
            then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
          }),
        }),
        insert: () => ({ error: null }),
        update: () => ({ eq: () => ({ error: null }) }),
        upsert: (rows: Array<Record<string, unknown>>) => {
          upserts.push(...rows);
          return { error: null };
        },
      }),
    };
    const report: MeaningResearchReport = {
      term: "kwisatz",
      results: [
        { site: "Free Dictionary API", domain: "dictionaryapi.dev", meaning: "a sacred weed", note: "found", failure: false },
        { site: "Wiktionary", domain: "wiktionary.org", meaning: "a sacred weed", note: "found", failure: false },
        { site: "DuckDuckGo Instant Answers", domain: "duckduckgo.com", meaning: null, note: "no instant answer for this term", failure: false },
        { site: "Wikipedia", domain: "wikipedia.org", meaning: null, note: "http 404", failure: true },
      ],
      meaning: "a sacred weed",
      confidence: 0.6,
      domains: ["dictionaryapi.dev", "wiktionary.org"],
      note: "recognized by 2 independent site(s) (cross-checked)",
    };
    const engine = new ArchieNativeEngine({
      persistence: stub as never,
      meaningResearch: async () => report,
    });
    const res = await engine.generate({
      turns: [{ role: "owner", parts: [{ text: "research what kwisatz means" }] }],
      tools: [],
      systemInstruction: "",
    });
    const reply = ((res as { parts?: Array<{ text?: string }> }).parts ?? [{}])[0].text ?? "";
    expect(reply).toContain("Researched");
    expect(reply).toContain("Free Dictionary API");
    expect(reply).toContain("could not reach");
    expect(reply).toContain("researched knowledge, not owner-taught");
    const vocabRow = upserts.find((r) => r.term_key === "kwisatz");
    expect(vocabRow).toBeDefined();
    expect((vocabRow as { source?: string }).source).toBe("research");
    expect((vocabRow as { confidence?: number }).confidence).toBe(0.6);
  });

  describe("auto-research on definition miss", () => {
    const stubDb = (upsertError: unknown = null) => {
      const upserts: Array<Record<string, unknown>> = [];
      const db = {
        from: () => ({
          select: () => ({
            then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
            range: () => ({
              then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
            }),
          }),
          insert: () => ({ error: null }),
          update: () => ({ eq: () => ({ error: null }) }),
          upsert: (rows: Array<Record<string, unknown>>) => {
            upserts.push(...rows);
            return { error: upsertError };
          },
        }),
      };
      return { db: db as never, upserts };
    };
    const foundReport = (term: string): MeaningResearchReport => ({
      term,
      results: [
        { site: "Wiktionary", domain: "wiktionary.org", meaning: "a flomming widget", note: "found", failure: false },
        { site: "DuckDuckGo Instant Answers", domain: "duckduckgo.com", meaning: "a widget", note: "found", failure: false },
      ],
      meaning: "a flomming widget",
      confidence: 0.6,
      domains: ["wiktionary.org", "duckduckgo.com"],
      note: "recognized by 2 independent site(s) (cross-checked)",
    });

    it("researches and answers immediately with research provenance", async () => {
      const { db, upserts } = stubDb();
      const engine = new ArchieNativeEngine({
        persistence: db,
        meaningResearch: async (t) => foundReport(t),
      });
      const res = await engine.generate({
        turns: [{ role: "owner", parts: [{ text: "what does qwertyz mean" }] }],
        tools: [],
        systemInstruction: "",
      });
      const reply = ((res as { parts?: Array<{ text?: string }> }).parts ?? [{}])[0].text ?? "";
      expect(reply).toContain("qwertyz means: a flomming widget");
      expect(reply).toContain("researched from wiktionary.org, duckduckgo.com");
      expect(reply).toContain("not owner-taught");
      const row = upserts.find((r) => r.term_key === "qwertyz") as Record<string, unknown>;
      expect(row.source).toBe("research");
      expect(row.confidence).toBe(0.6);
    });

    it("keeps the honest miss when every site misses — no meaning invented", async () => {
      const { db, upserts } = stubDb();
      const engine = new ArchieNativeEngine({
        persistence: db,
        meaningResearch: async (t) => ({
          term: t,
          results: [
            { site: "Free Dictionary API", domain: "dictionaryapi.dev", meaning: null, note: "not found in this dictionary", failure: false },
            { site: "Wikipedia", domain: "wikipedia.org", meaning: null, note: "http 404", failure: true },
          ],
          meaning: null,
          confidence: 0,
          domains: [],
          note: "no site returned a meaning — nothing stored",
        }),
      });
      const res = await engine.generate({
        turns: [{ role: "owner", parts: [{ text: "define zzzqqq" }] }],
        tools: [],
        systemInstruction: "",
      });
      const reply = ((res as { parts?: Array<{ text?: string }> }).parts ?? [{}])[0].text ?? "";
      expect(reply).toContain("no meaning for it");
      expect(reply).toContain("Genuinely missing: Free Dictionary API");
      expect(reply).toContain("Could not reach (honest, not hidden): Wikipedia (http 404)");
      expect(reply).toContain("I will not invent a definition");
      expect(upserts.filter((r) => r.term_key === "zzzqqq")).toHaveLength(0);
    });

    it("reports the store failure honestly instead of claiming a saved definition", async () => {
      const { db } = stubDb({ message: "registry down" });
      const engine = new ArchieNativeEngine({
        persistence: db,
        meaningResearch: async (t) => foundReport(t),
      });
      const res = await engine.generate({
        turns: [{ role: "owner", parts: [{ text: "what does flombulate mean" }] }],
        tools: [],
        systemInstruction: "",
      });
      const reply = ((res as { parts?: Array<{ text?: string }> }).parts ?? [{}])[0].text ?? "";
      expect(reply).toContain("Sites say flombulate means");
      expect(reply).toContain("could NOT store it in the registry");
    });

    it("without persistence the lookup never runs — visitors keep the plain miss", async () => {
      let called = 0;
      const engine = new ArchieNativeEngine({
        persistence: null,
        meaningResearch: async (t) => {
          called += 1;
          return foundReport(t);
        },
      });
      const res = await engine.generate({
        turns: [{ role: "owner", parts: [{ text: "what does nothingburger mean" }] }],
        tools: [],
        systemInstruction: "",
      });
      const reply = ((res as { parts?: Array<{ text?: string }> }).parts ?? [{}])[0].text ?? "";
      expect(called).toBe(0);
      expect(reply).toContain("I have not learned \"nothingburger\" yet");
      expect(reply).toContain("ask me to research it");
    });
  });

  it("bare 'research it' resolves the term from the previous definition question end-to-end", async () => {
    // live UX: "what does blorptastic mean" -> honest miss ->
    // "research it" must research BLORPTASTIC, not the word
    // "it". The engine reads the conversation history.
    const upserts: Array<Record<string, unknown>> = [];
    const stub = {
      from: () => ({
        select: () => ({
          then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
          range: () => ({
            then: (r: (v: unknown) => unknown) => Promise.resolve(r({ data: [], error: null })),
          }),
        }),
        insert: () => ({ error: null }),
        update: () => ({ eq: () => ({ error: null }) }),
        upsert: (rows: Array<Record<string, unknown>>) => {
          upserts.push(...rows);
          return { error: null };
        },
      }),
    };
    let askedTerm = "";
    const engine = new ArchieNativeEngine({
      persistence: stub as never,
      meaningResearch: async (term) => {
        askedTerm = term;
        return {
          term,
          results: [
            { site: "DuckDuckGo Instant Answers", domain: "duckduckgo.com", meaning: "a test word", note: "found", failure: false },
          ],
          meaning: "a test word",
          confidence: 0.4,
          domains: ["duckduckgo.com"],
          note: "single source — lower confidence, easily overwritten by teaching",
        };
      },
    });
    const res = await engine.generate({
      turns: [
        { role: "owner", parts: [{ text: "what does blorptastic mean" }] },
        {
          role: "agent",
          parts: [{ text: "I have not learned it yet — teach me or ask me to research it." }],
        },
        { role: "owner", parts: [{ text: "research it" }] },
      ],
      tools: [],
      systemInstruction: "",
    });
    const reply = ((res as { parts?: Array<{ text?: string }> }).parts ?? [{}])[0].text ?? "";
    expect(askedTerm).toBe("blorptastic");
    expect(reply).toContain("Researched");
    expect(reply).toContain("Meaning kept");
    expect(upserts.some((r) => r.term_key === "blorptastic")).toBe(true);
  });
});
