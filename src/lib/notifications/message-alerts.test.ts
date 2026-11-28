import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureAlertPermission,
  getMessageAlertsEnabled,
  messageAlertsSupported,
  pageIsHidden,
  setMessageAlertsEnabled,
  shouldAlertForMessage,
  showMessageAlert,
} from "./message-alerts";

class FakeNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
  static instances: FakeNotification[] = [];
  onclick: (() => void) | null = null;
  close = vi.fn();
  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {
    FakeNotification.instances.push(this);
  }
}

beforeEach(() => {
  FakeNotification.instances = [];
  FakeNotification.permission = "default";
  FakeNotification.requestPermission.mockClear();
  localStorage.clear();
  vi.stubGlobal("Notification", FakeNotification);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("message alerts", () => {
  it("is off until the person turns it on", () => {
    expect(getMessageAlertsEnabled()).toBe(false);
    setMessageAlertsEnabled(true);
    expect(getMessageAlertsEnabled()).toBe(true);
    setMessageAlertsEnabled(false);
    expect(getMessageAlertsEnabled()).toBe(false);
  });

  it("asks for permission once and reports a refusal", async () => {
    expect(await ensureAlertPermission()).toBe(true);
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);

    FakeNotification.permission = "denied";
    expect(await ensureAlertPermission()).toBe(false);
    // A refusal is final: do not ask again.
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("never raises an alert for your own message, or while you are watching", () => {
    expect(
      shouldAlertForMessage({ enabled: true, senderIsSelf: true, hidden: true }),
    ).toBe(false);
    expect(
      shouldAlertForMessage({ enabled: true, senderIsSelf: false, hidden: false }),
    ).toBe(false);
    expect(
      shouldAlertForMessage({ enabled: false, senderIsSelf: false, hidden: true }),
    ).toBe(false);
    expect(
      shouldAlertForMessage({ enabled: true, senderIsSelf: false, hidden: true }),
    ).toBe(true);
  });

  it("shows nothing without permission", () => {
    FakeNotification.permission = "default";
    expect(showMessageAlert({ title: "Ada", body: "Hi" })).toBe(false);
    expect(FakeNotification.instances).toHaveLength(0);
  });

  it("shows the sender and the message, tagged by thread", () => {
    FakeNotification.permission = "granted";
    expect(
      showMessageAlert({ title: "Ada Obi", body: "Hello", tag: "convo-1" }),
    ).toBe(true);
    expect(FakeNotification.instances).toHaveLength(1);
    expect(FakeNotification.instances[0].title).toBe("Ada Obi");
    expect(FakeNotification.instances[0].options?.body).toBe("Hello");
    expect(FakeNotification.instances[0].options?.tag).toBe("convo-1");
  });

  it("focuses the page when the alert is clicked", () => {
    FakeNotification.permission = "granted";
    const onClick = vi.fn();
    showMessageAlert({ title: "Ada", body: "Hi", onClick });
    FakeNotification.instances[0].onclick?.();
    expect(onClick).toHaveBeenCalled();
  });

  it("reports support honestly", () => {
    expect(messageAlertsSupported()).toBe(true);
    vi.stubGlobal("Notification", undefined);
    expect(messageAlertsSupported()).toBe(false);
  });

  it("treats a hidden page as out of sight", () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    expect(pageIsHidden()).toBe(true);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
});
