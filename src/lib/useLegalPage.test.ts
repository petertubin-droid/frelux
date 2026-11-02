import { describe, it, expect } from "vitest";
import { useLegalPage } from "./useLegalPage";

describe("useLegalPage", () => {
  it("is a function (hook)", () => {
    expect(typeof useLegalPage).toBe("function");
  });
});
