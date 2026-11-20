import { describe, it, expect } from "vitest";
import {
  DISMISS_KEY_PREFIX,
  noticeExpiry,
  visibleNotices,
  type ReleaseNotice,
} from "./release-notice";

const now = new Date("2026-11-20T10:00:00Z");

const notice = (over: Partial<ReleaseNotice> = {}): ReleaseNotice => ({
  id: "n1",
  title: "Openings schedule",
  body: "Doors and windows now take any number of sizes.",
  category: "feature",
  published_at: "2026-11-20T09:00:00Z",
  expires_at: "2026-11-21T09:00:00Z",
  ...over,
});

const none = () => false;

describe("release notices", () => {
  it("shows a notice published within its 24 hour window", () => {
    expect(visibleNotices([notice()], now, none)).toHaveLength(1);
  });

  it("hides an expired notice without needing fresh data", () => {
    const expired = notice({ expires_at: "2026-11-20T09:59:00Z" });
    expect(visibleNotices([expired], now, none)).toHaveLength(0);
  });

  it("hides a notice scheduled for the future", () => {
    const future = notice({
      published_at: "2026-11-20T11:00:00Z",
      expires_at: "2026-11-21T11:00:00Z",
    });
    expect(visibleNotices([future], now, none)).toHaveLength(0);
  });

  it("hides one this reader has dismissed", () => {
    expect(visibleNotices([notice()], now, (id) => id === "n1")).toHaveLength(
      0,
    );
  });

  it("shows the newest when several are live", () => {
    const older = notice({ id: "old", published_at: "2026-11-20T08:00:00Z" });
    const newer = notice({ id: "new", published_at: "2026-11-20T09:30:00Z" });
    expect(visibleNotices([older, newer], now, none)[0].id).toBe("new");
  });

  it("ignores rows with unparseable dates instead of showing them forever", () => {
    const broken = notice({ expires_at: "not a date" });
    expect(visibleNotices([broken], now, none)).toHaveLength(0);
  });

  it("survives an empty or missing result", () => {
    expect(visibleNotices(null, now, none)).toEqual([]);
    expect(visibleNotices([], now, none)).toEqual([]);
  });

  it("expires exactly 24 hours after publication", () => {
    expect(noticeExpiry(now)).toBe("2026-11-21T10:00:00.000Z");
  });

  it("namespaces the dismissal key so one notice cannot hide another", () => {
    expect(DISMISS_KEY_PREFIX + "abc").toBe(
      "frelux_release_notice_dismissed_abc",
    );
  });
});
