import { describe, expect, it } from "vitest";
import { classifyCaller, safeEqual } from "./internal-caller.ts";

const SERVICE = "service-role-key-abc";
const CRON = "cron-secret-xyz";

function classify(over: Partial<Parameters<typeof classifyCaller>[0]> = {}) {
  return classifyCaller({
    authorization: null,
    cronHeader: null,
    serviceRoleKey: SERVICE,
    cronSecret: CRON,
    ...over,
  });
}

describe("classifyCaller", () => {
  it("accepts the service role key as a bearer token", () => {
    expect(classify({ authorization: `Bearer ${SERVICE}` })).toBe("internal");
  });

  it("accepts the bearer token with surrounding whitespace and odd case", () => {
    expect(classify({ authorization: `  bearer ${SERVICE}  ` })).toBe(
      "internal",
    );
  });

  it("accepts a matching cron secret header", () => {
    expect(classify({ cronHeader: CRON })).toBe("cron");
  });

  it("refuses an anonymous call", () => {
    expect(classify()).toBe("none");
  });

  it("refuses a user JWT in place of the service key", () => {
    expect(
      classify({ authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.user" }),
    ).toBe("none");
  });

  it("refuses a wrong cron secret", () => {
    expect(classify({ cronHeader: "nope" })).toBe("none");
  });

  it("fails closed when no cron secret is configured", () => {
    expect(classify({ cronSecret: undefined, cronHeader: "" })).toBe("none");
    expect(classify({ cronSecret: "", cronHeader: CRON })).toBe("none");
  });

  it("fails closed when the service key is missing or blank", () => {
    expect(classify({ serviceRoleKey: undefined })).toBe("none");
    expect(classify({ serviceRoleKey: "   " })).toBe("none");
  });

  it("does not accept an empty bearer as internal", () => {
    expect(classify({ authorization: "Bearer " })).toBe("none");
    expect(classify({ authorization: "" })).toBe("none");
  });
});

describe("safeEqual", () => {
  it("matches identical strings and rejects near misses", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "abc")).toBe(false);
  });
});
