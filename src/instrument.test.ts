import { describe, it, expect } from "vitest";
import {
  captureException,
  setUserContext,
  clearUserContext,
  isSentryActive,
} from "./instrument";

describe("instrument", () => {
  it("isSentryActive returns boolean", () => {
    expect(typeof isSentryActive()).toBe("boolean");
  });

  it("captureException does not throw without DSN", () => {
    expect(() => captureException(new Error("test"))).not.toThrow();
  });

  it("captureException accepts context", () => {
    expect(() =>
      captureException(new Error("test"), { userId: "123" }),
    ).not.toThrow();
  });

  it("setUserContext does not throw", () => {
    expect(() => setUserContext({ id: "1", email: "a@b.com" })).not.toThrow();
    expect(() => setUserContext(null)).not.toThrow();
  });

  it("clearUserContext does not throw", () => {
    expect(() => clearUserContext()).not.toThrow();
  });
});
