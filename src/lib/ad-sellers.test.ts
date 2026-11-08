import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "@/config/site";
import {
  adsTxtRecords,
  normalizePublisherAccountId,
  parsePublisherList,
  toPublisherId,
} from "./ad-sellers";

describe("publisher account normalisation", () => {
  it("accepts the forms an operator actually pastes", () => {
    expect(normalizePublisherAccountId("ca-pub-4906239537212380")).toBe(
      "pub-4906239537212380",
    );
    expect(normalizePublisherAccountId("pub-4906239537212380")).toBe(
      "pub-4906239537212380",
    );
    expect(normalizePublisherAccountId(" 4906239537212380 ")).toBe(
      "pub-4906239537212380",
    );
    expect(toPublisherId("pub-4906239537212380")).toBe(
      "ca-pub-4906239537212380",
    );
  });

  it("returns nothing for input carrying no account number", () => {
    // A typo must produce no seller record rather than a record Google rejects.
    expect(normalizePublisherAccountId("")).toBe("");
    expect(normalizePublisherAccountId("ca-pub-")).toBe("");
    expect(normalizePublisherAccountId("hello")).toBe("");
  });

  it("splits a comma or newline separated field", () => {
    expect(
      parsePublisherList("ca-pub-1111111111111111, pub-2222222222222222"),
    ).toEqual(["ca-pub-1111111111111111", "ca-pub-2222222222222222"]);
    expect(
      parsePublisherList("ca-pub-1111111111111111\nca-pub-2222222222222222"),
    ).toHaveLength(2);
  });
});

describe("ads.txt records", () => {
  it("keeps every account, primary first and deduplicated", () => {
    const records = adsTxtRecords("ca-pub-1111111111111111", [
      "ca-pub-2222222222222222",
      "pub-1111111111111111",
    ]);
    expect(records).toEqual([
      "google.com, pub-1111111111111111, DIRECT, f08c47fec0942fa0",
      "google.com, pub-2222222222222222, DIRECT, f08c47fec0942fa0",
    ]);
  });

  it("never withdraws the primary when the list would exclude it", () => {
    const records = adsTxtRecords("ca-pub-1111111111111111", [
      "ca-pub-2222222222222222",
    ]);
    expect(records[0]).toContain("pub-1111111111111111");
  });
});

describe("the served ads.txt files", () => {
  const files = ["public/ads.txt", "public/app-ads.txt"];

  it("lists every configured account in both files", () => {
    const expected = adsTxtRecords(
      siteConfig.adsense.publisherId,
      siteConfig.adsense.additionalPublisherIds,
    );
    for (const file of files) {
      const body = readFileSync(join(process.cwd(), file), "utf8");
      const lines = body.trimEnd().split("\n");
      for (const record of expected) {
        expect(lines).toContain(record);
      }
    }
  });

  it("still authorises the account that was already approved", () => {
    for (const file of files) {
      const body = readFileSync(join(process.cwd(), file), "utf8");
      expect(body).toContain(
        "google.com, pub-3404100134534192, DIRECT, f08c47fec0942fa0",
      );
      expect(body).toContain(
        "google.com, pub-4906239537212380, DIRECT, f08c47fec0942fa0",
      );
    }
  });

  it("carries no duplicate seller records", () => {
    for (const file of files) {
      const lines = readFileSync(join(process.cwd(), file), "utf8")
        .trimEnd()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      expect(new Set(lines).size).toBe(lines.length);
    }
  });
});
