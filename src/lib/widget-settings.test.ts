import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getWidgetSettings,
  setWidgetSettings,
  DEFAULT_WIDGET_SETTINGS,
  WIDGET_SETTINGS_STORAGE_KEY,
} from "./widget-settings";

describe("widget-settings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to both bottom nav and live chat toggled off", () => {
    const settings = getWidgetSettings();
    expect(settings.bottomNavEnabled).toBe(false);
    expect(settings.liveChatEnabled).toBe(false);
    expect(DEFAULT_WIDGET_SETTINGS.bottomNavEnabled).toBe(false);
    expect(DEFAULT_WIDGET_SETTINGS.liveChatEnabled).toBe(false);
  });

  it("persists updates to localStorage and returns updated settings", () => {
    const updated = setWidgetSettings({ bottomNavEnabled: true });
    expect(updated.bottomNavEnabled).toBe(true);
    expect(updated.liveChatEnabled).toBe(false);

    const reloaded = getWidgetSettings();
    expect(reloaded.bottomNavEnabled).toBe(true);
    expect(reloaded.liveChatEnabled).toBe(false);
  });

  it("allows toggling live chat independently", () => {
    setWidgetSettings({ liveChatEnabled: true });
    expect(getWidgetSettings().liveChatEnabled).toBe(true);
    expect(getWidgetSettings().bottomNavEnabled).toBe(false);

    setWidgetSettings({ liveChatEnabled: false });
    expect(getWidgetSettings().liveChatEnabled).toBe(false);
  });

  it("handles corrupted storage gracefully with defaults", () => {
    localStorage.setItem(WIDGET_SETTINGS_STORAGE_KEY, "invalid-json{");
    const settings = getWidgetSettings();
    expect(settings.bottomNavEnabled).toBe(false);
    expect(settings.liveChatEnabled).toBe(false);
  });
});
