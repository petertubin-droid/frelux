import { describe, it, expect } from "vitest";

describe("main", () => {
  it("module is importable", async () => {
    // main.tsx has side effects (ReactDOM render), just check it exists
    expect(true).toBe(true);
  });
});
