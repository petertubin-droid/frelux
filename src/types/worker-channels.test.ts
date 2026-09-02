import { describe, it, expect } from "vitest";

describe("worker-channels types", () => {
  it("module is importable", async () => {
    const mod = await import("@/types/worker-channels");
    expect(mod).toBeDefined();
  });
});
