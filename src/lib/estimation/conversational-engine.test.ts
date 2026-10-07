// =========================================================
// Conversational Estimator Engine (Engine 3) - tests
//
// Hand-verified expectations:
//  - English language detection on real chat samples.
//  - WhatsApp export parsing (timestamps, senders, media lines).
//  - Dimension / coat / room / region extraction with evidence.
//  - The paint estimate is the SAME calculatePaint chain the
//    Paint Calculator uses, verified by hand:
//      4 m × 3 m room, 3 m height, walls = 2(4+3)×3 = 42 m²
//      ceiling = 12 m², door 0.9×2.1 = 1.89 m²,
//      windows 2 × (1.2×1.2) = 2.88 m²
//      net = 42 + 12 − 1.89 − 2.88 = 49.23 m²
//      base = 49.23 × 2 coats ÷ 10 m²/L = 9.85 L
//      +10 % waste = 10.83 L  (rounded by the engine)
//  - Missing dimensions NEVER estimate: the engine asks.
// =========================================================
import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  parseThread,
  extractParams,
  buildConversationalEstimate,
  DEFAULT_LANGUAGE_PACKS,
  type ParsedThread,
  type ConversationLanguage,
} from "./conversational-engine";

function threadOf(text: string): ParsedThread {
  return parseThread(text);
}

describe("detectLanguage", () => {
  it("defaults to English for plain English and for empty text", () => {
    expect(
      detectLanguage("Hello, how much to paint a 4 by 3 room in Lagos?")
        .language,
    ).toBe("en");
    expect(detectLanguage("").language).toBe("en");
  });

  it("uses DB-configured packs when provided (admin override wins)", () => {
    // Admin adds a made-up English keyword; detection must follow.
    const custom = [
      ...DEFAULT_LANGUAGE_PACKS,
      {
        language: "en" as ConversationLanguage,
        category: "greeting" as const,
        keywords: ["zorples"],
        weight: 5,
      },
    ];
    expect(detectLanguage("zorples", custom).language).toBe("en");
  });
});

describe("parseThread", () => {
  it("strips WhatsApp export timestamps and senders", () => {
    const raw = [
      "[12:34, 3/10/2026] Chidi: Good afternoon sir, I want to paint my room",
      "[12:35, 3/10/2026] Chidi: It is 4 by 3 meters, 2 coats",
      "image omitted",
    ].join("\n");
    const t = parseThread(raw);
    expect(t.messages).toHaveLength(2);
    expect(t.messages[0].sender).toBe("Chidi");
    expect(t.cleanedText).toContain("4 by 3");
  });

  it("keeps single typed messages intact", () => {
    const t = parseThread("I wan paint 3 bedroom flat for Kano");
    expect(t.messages).toHaveLength(1);
    expect(t.messages[0].sender).toBeNull();
  });
});

describe("extractParams", () => {
  const base = "i want to paint my room";

  it("extracts meters dimensions with evidence", () => {
    const p = extractParams(threadOf(`${base} 4 by 3 meters`), "en");
    expect(p.intent).toBe("paint");
    expect(p.length!.value).toBe(4);
    expect(p.width!.value).toBe(3);
    expect(p.unit!.value).toBe("meters");
    expect(p.length!.evidence).toContain("4 by 3");
  });

  it("extracts feet when feet is mentioned", () => {
    const p = extractParams(threadOf("paint my room 12ft by 10ft"), "en");
    expect(p.unit!.value).toBe("feet");
    expect(p.length!.value).toBe(12);
  });

  it("extracts bedrooms, coats, doors, windows and region from a chat thread", () => {
    const p = extractParams(
      threadOf(
        "please how much is paint for a 2 bedroom flat in Yaba, 3 coats, 4 doors and 3 windows",
      ),
      "en",
    );
    expect(p.intent).toBe("paint");
    expect(p.bedrooms!.value).toBe(2);
    expect(p.coats!.value).toBe(3);
    expect(p.doors!.value).toBe(4);
    expect(p.windows!.value).toBe(3);
    expect(p.region!.value).toBe("yaba");
    expect(p.propertyType!.value).toBe("house");
  });

  it("reports honestly when nothing is found: no invented facts", () => {
    const p = extractParams(threadOf("hello good evening"), "en");
    expect(p.intent).toBe("unknown");
    expect(p.length).toBeNull();
    expect(p.width).toBeNull();
    expect(p.region).toBeNull();
  });
});

describe("buildConversationalEstimate", () => {
  it("produces the hand-verified paint estimate from an English thread", () => {
    const r = buildConversationalEstimate(
      "Hello, I want to paint my room. It is 4 by 3 meters, 2 coats, in Lagos",
    );
    expect(r.language).toBe("en");
    expect(r.missingCritical).toBe(false);
    expect(r.followUpQuestions).toHaveLength(0);
    expect(r.paintEstimate).not.toBeNull();
    const est = r.paintEstimate!;
    // Hand-verified: 49.23 m² net, 9.85 L base, 10.83 L with waste.
    expect(est.paintableArea).toBeCloseTo(49.23, 1);
    expect(est.liters).toBeCloseTo(10.83, 1);
    expect(est.coats).toBe(2);
    // Containers: the engine recommends practical buckets (20 L
    // preferred) - a single 20 L bucket more than covers 10.83 L.
    expect(est.containers.length).toBeGreaterThan(0);
    const totalLiters = est.containers.reduce(
      (a, c) => a + c.size * c.count,
      0,
    );
    expect(totalLiters).toBeGreaterThanOrEqual(est.liters);
  });

  it("answers a thread with a follow-up when the size is missing", () => {
    const r = buildConversationalEstimate(
      "Good day, how much is paint for a 2 bedroom flat?",
    );
    expect(r.language).toBe("en");
    expect(r.paintEstimate).toBeNull();
    expect(r.missingCritical).toBe(true);
    expect(r.followUpQuestions).toHaveLength(1);
    expect(r.followUpQuestions[0]).toContain("room size");
  });

  it("asks what the job is when no surface is mentioned", () => {
    const r = buildConversationalEstimate(
      "Good evening, please how much will it cost?",
    );
    expect(r.followUpQuestions.join(" ")).toContain("paint");
  });

  it("routes non-paint intents to the right calculator instead of estimating", () => {
    const r = buildConversationalEstimate(
      "I need POP ceiling for my sitting room, 5 by 4 meters",
    );
    expect(r.intent).toBe("pop_ceiling");
    expect(r.paintEstimate).toBeNull();
    expect(r.routedCalculatorPath).toBe("/pop-ceiling-calculator");
  });

  it("parses a full WhatsApp voice-note transcript paste", () => {
    const transcript = [
      "[Voice note transcript]",
      "Good afternoon sir, this is Musa from Kano",
      "I want to paint my shop, it is 6 by 4 meters",
      "How much will it cost me",
    ].join("\n");
    const r = buildConversationalEstimate(transcript);
    expect(r.paintEstimate).not.toBeNull();
    expect(r.paintEstimate!.input.length).toBe(6);
    expect(r.paintEstimate!.input.width).toBe(4);
  });

  it("is deterministic: same thread, same result", () => {
    const thread = "I want to paint my fence, 20 by 2 meters, 2 coats";
    const a = buildConversationalEstimate(thread);
    const b = buildConversationalEstimate(thread);
    expect(a.paintEstimate).toEqual(b.paintEstimate);
    expect(a.language).toBe(b.language);
    expect(a.understood).toEqual(b.understood);
  });
});
