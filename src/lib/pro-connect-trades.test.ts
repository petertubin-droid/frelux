import { describe, it, expect } from "vitest";
import {
  buildTradeOptions,
  matchTrades,
  normalizeTradeName,
  stemTradeToken,
  tradeIdsFor,
} from "./pro-connect-trades";

const ROWS = [
  { id: "1", name: "Painters" },
  { id: "2", name: "Tilers" },
  { id: "3", name: "Welders & Metal Fabricators" },
  { id: "4", name: "Welders and Metal Fabricators" },
  { id: "5", name: "Paving & Interlocking Specialists" },
  { id: "6", name: "Paving & Interlocking Installers" },
  { id: "7", name: "Quantity Surveyors" },
  { id: "8", name: "Electricians" },
  { id: "9", name: "Solar & Inverter Installers" },
  { id: "10", name: "Land Surveyors" },
  { id: "11", name: "AC & HVAC Technicians" },
];

describe("normalising trade names", () => {
  it("treats & and and as the same word", () => {
    expect(normalizeTradeName("Welders & Metal Fabricators")).toBe(
      normalizeTradeName("Welders and Metal Fabricators"),
    );
  });

  it("strips the plural endings a searcher drops but keeps the agent word", () => {
    // Keeping "-er" matters: stripping it turns "tilers" into "til", which no
    // longer prefix-matches "tile". Prefix matching covers paint/painter instead.
    expect(stemTradeToken("Painters")).toBe("painter");
    expect(stemTradeToken("Tilers")).toBe("tiler");
    expect(stemTradeToken("Electricians")).toBe("electric");
    expect(stemTradeToken("Screeders")).toBe("screeder");
  });
});

describe("building trade chips", () => {
  it("folds two rows that mean one trade into one chip", () => {
    const trades = buildTradeOptions(ROWS);
    const welders = trades.filter((t) => /weld/i.test(t.name));
    expect(welders).toHaveLength(1);
    // Both rows stay reachable, so the chip filters to both sets of profiles.
    expect(welders[0].ids).toEqual(["3", "4"]);
  });

  it("carries the slugs of every folded row, so the chip can be a link", () => {
    const trades = buildTradeOptions([
      { id: "3", name: "Welders & Metal Fabricators", slug: "welders-metal" },
      {
        id: "4",
        name: "Welders and Metal Fabricators",
        slug: "welders-and-metal",
      },
    ]);
    expect(trades[0].slugs).toEqual(["welders-metal", "welders-and-metal"]);
  });

  it("keeps genuinely different trades apart", () => {
    const trades = buildTradeOptions(ROWS);
    // Paving Specialists and Paving Installers are worded differently on
    // purpose: one is a trade, the other a specialism, and both may hold
    // different professionals.
    expect(trades.filter((t) => /paving/i.test(t.name)).length).toBe(2);
    expect(trades).toHaveLength(10);
  });

  it("never renders an empty chip", () => {
    const trades = buildTradeOptions([{ id: "x", name: "   " }]);
    expect(trades).toEqual([]);
  });
});

describe("searching for a trade", () => {
  const trades = buildTradeOptions(ROWS);

  it("finds the trade a person would type", () => {
    expect(matchTrades(trades, "painters").map((t) => t.name)).toEqual([
      "Painters",
    ]);
    expect(matchTrades(trades, "painter").map((t) => t.name)).toEqual([
      "Painters",
    ]);
    expect(matchTrades(trades, "painting").map((t) => t.name)).toEqual([
      "Painters",
    ]);
  });

  it("finds tiling from tile or tiling", () => {
    expect(matchTrades(trades, "tiling").map((t) => t.name)).toContain("Tilers");
    expect(matchTrades(trades, "tile").map((t) => t.name)).toContain("Tilers");
  });

  it("distinguishes the two surveyors by what was typed", () => {
    expect(matchTrades(trades, "qs").map((t) => t.name)).toEqual([
      "Quantity Surveyors",
    ]);
    // Both surveyors answer to "surveyor"; the one also named by "land" wins.
    const land = matchTrades(trades, "land surveyor").map((t) => t.name);
    expect(land[0]).toBe("Land Surveyors");
  });

  it("matches an alias the trade name does not contain", () => {
    expect(matchTrades(trades, "inverter").map((t) => t.name)).toEqual([
      "Solar & Inverter Installers",
    ]);
    expect(matchTrades(trades, "ac").map((t) => t.name)).toEqual([
      "AC & HVAC Technicians",
    ]);
  });

  it("matches nothing for a person's name, so search stays free text", () => {
    expect(matchTrades(trades, "Chinedu")).toEqual([]);
    expect(matchTrades(trades, "")).toEqual([]);
  });

  it("returns every row behind the matched trades", () => {
    expect(tradeIdsFor(matchTrades(trades, "welders"))).toEqual(["3", "4"]);
  });
});
