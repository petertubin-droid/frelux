import { describe, it, expect } from "vitest";
import {
  isPushSupported,
  getNotificationPermission,
} from "./push-notifications";

describe("push-notifications", () => {
  it("isPushSupported returns boolean", () => {
    expect(typeof isPushSupported()).toBe("boolean");
  });

  it("getNotificationPermission returns a permission string", () => {
    const perm = getNotificationPermission();
    expect(["default", "granted", "denied"]).toContain(perm);
  });
});
