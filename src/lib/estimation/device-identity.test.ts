/**
 * Device identity tests (Engine #11)
 *
 * The id is stable within an install, created lazily, discarded
 * (never repaired) when corrupted, and never invented from
 * fingerprinting after storage loss.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DEVICE_ID_STORAGE_KEY,
  getDeviceId,
} from "./device-identity";

beforeEach(() => {
  localStorage.clear();
});

describe("getDeviceId", () => {
  it("creates a stable id on first use and returns it ever after", () => {
    const first = getDeviceId();
    expect(first).toBeTruthy();
    expect(getDeviceId()).toBe(first);
    expect(getDeviceId()).toBe(first);
  });

  it("persists the id in localStorage", () => {
    const id = getDeviceId();
    expect(localStorage.getItem(DEVICE_ID_STORAGE_KEY)).toBe(id);
  });

  it("re-uses an existing valid id", () => {
    localStorage.setItem(
      DEVICE_ID_STORAGE_KEY,
      "11111111-2222-3333-4444-555555555555",
    );
    expect(getDeviceId()).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("discards a corrupted id and mints a fresh one (never repairs, never invents meaning)", () => {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, "not a uuid !!!");
    const id = getDeviceId();
    expect(id).not.toBe("not a uuid !!!");
    expect(localStorage.getItem(DEVICE_ID_STORAGE_KEY)).toBe(id);
  });

  it("a wiped install gets a NEW id (storage loss = new identity, disclosed)", () => {
    const first = getDeviceId();
    localStorage.clear();
    const second = getDeviceId();
    expect(second).not.toBe(first);
  });

  it("still returns an id when localStorage is unavailable (volatile, disclosed)", () => {
    const orig = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("unavailable");
      },
    });
    try {
      const id = getDeviceId();
      expect(id).toBeTruthy();
      // volatile: two calls in this state differ, honestly
      expect(getDeviceId()).not.toBe(id);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: orig,
      });
    }
  });
});
