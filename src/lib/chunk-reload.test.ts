import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isChunkLoadError,
  handleChunkLoadError,
  installChunkReloadHandler,
  CHUNK_RELOAD_KEY,
  RELOAD_COOLDOWN_MS,
} from "./chunk-reload";

describe("chunk-reload", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("isChunkLoadError", () => {
    it("identifies dynamic import fetch errors", () => {
      expect(
        isChunkLoadError(
          new TypeError(
            "Failed to fetch dynamically imported module: https://freluxtools.com/assets/SupportChatWidget-B4cSLKGB.js",
          ),
        ),
      ).toBe(true);

      expect(
        isChunkLoadError(
          "error loading dynamically imported module: /assets/Calculator-123.js",
        ),
      ).toBe(true);

      expect(
        isChunkLoadError(new Error("Importing a module script failed.")),
      ).toBe(true);

      expect(isChunkLoadError(new Error("Unable to preload CSS"))).toBe(true);

      expect(
        isChunkLoadError(
          new Error("Loading chunk 404 failed (/assets/Vendor-abc.js)"),
        ),
      ).toBe(true);

      expect(
        isChunkLoadError({
          message: "ChunkLoadError: Loading chunk 123 failed",
        }),
      ).toBe(true);
    });

    it("returns false for standard runtime errors", () => {
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
      expect(isChunkLoadError(new Error("Cannot read properties of null"))).toBe(
        false,
      );
      expect(isChunkLoadError(new TypeError("Network request failed"))).toBe(
        false,
      );
      expect(isChunkLoadError("Failed to save profile changes")).toBe(false);
    });
  });

  describe("handleChunkLoadError", () => {
    it("reloads when a chunk error occurs and sets the cooldown timestamp", () => {
      const reloadMock = vi.fn();
      vi.stubGlobal("location", { reload: reloadMock });

      const err = new TypeError(
        "Failed to fetch dynamically imported module: /assets/SupportChatWidget.js",
      );
      const reloaded = handleChunkLoadError(err);

      expect(reloaded).toBe(true);
      expect(reloadMock).toHaveBeenCalledTimes(1);

      const savedTs = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      expect(savedTs).toBeTruthy();
      expect(parseInt(savedTs!, 10)).toBeGreaterThan(0);

      vi.unstubAllGlobals();
    });

    it("does not reload if cooldown window is active", () => {
      const reloadMock = vi.fn();
      vi.stubGlobal("location", { reload: reloadMock });

      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));

      const err = new TypeError(
        "Failed to fetch dynamically imported module: /assets/SupportChatWidget.js",
      );
      const reloaded = handleChunkLoadError(err);

      expect(reloaded).toBe(false);
      expect(reloadMock).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("reloads again after the cooldown window expires", () => {
      const reloadMock = vi.fn();
      vi.stubGlobal("location", { reload: reloadMock });

      // Expired cooldown: 25 seconds ago
      sessionStorage.setItem(
        CHUNK_RELOAD_KEY,
        String(Date.now() - (RELOAD_COOLDOWN_MS + 5_000)),
      );

      const err = new TypeError(
        "Failed to fetch dynamically imported module: /assets/SupportChatWidget.js",
      );
      const reloaded = handleChunkLoadError(err);

      expect(reloaded).toBe(true);
      expect(reloadMock).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it("returns false and does not reload for non-chunk errors", () => {
      const reloadMock = vi.fn();
      vi.stubGlobal("location", { reload: reloadMock });

      const reloaded = handleChunkLoadError(new Error("Generic calculation error"));
      expect(reloaded).toBe(false);
      expect(reloadMock).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("installChunkReloadHandler", () => {
    it("attaches and detaches window event listeners cleanly", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");

      const uninstall = installChunkReloadHandler();

      expect(addSpy).toHaveBeenCalledWith(
        "vite:preloadError",
        expect.any(Function),
      );
      expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith(
        "unhandledrejection",
        expect.any(Function),
      );

      uninstall();

      expect(removeSpy).toHaveBeenCalledWith(
        "vite:preloadError",
        expect.any(Function),
      );
      expect(removeSpy).toHaveBeenCalledWith("error", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith(
        "unhandledrejection",
        expect.any(Function),
      );
    });
  });
});
