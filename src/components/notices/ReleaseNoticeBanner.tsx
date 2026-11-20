// =========================================================
// RELEASE NOTICE BANNER
//
// Reads release_notices at runtime, so publishing a notice needs no deploy and
// no build. It shows itself for 24 hours from publication, can be dismissed by
// the reader, and disappears on its own when it expires even if the page was
// left open.
//
// Why a banner and not a changelog page: the changes worth announcing are the
// ones that alter something a user already saved, and those need to reach
// people who are not looking for them.
// =========================================================
import { useCallback, useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  DISMISS_KEY_PREFIX,
  visibleNotices,
  type ReleaseNotice,
} from "@/lib/notices/release-notice";

function isDismissed(id: string): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY_PREFIX + id) !== null;
  } catch {
    return false;
  }
}

export function ReleaseNoticeBanner() {
  const [notice, setNotice] = useState<ReleaseNotice | null>(null);

  const load = useCallback(async () => {
    const now = new Date();
    const { data } = await supabase
      .from("release_notices")
      .select("id,title,body,category,published_at,expires_at")
      .eq("is_active", true)
      .lte("published_at", now.toISOString())
      .gt("expires_at", now.toISOString())
      .order("published_at", { ascending: false })
      .limit(5);

    const [first] = visibleNotices(
      (data ?? []) as ReleaseNotice[],
      now,
      isDismissed,
    );
    setNotice(first ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    // A notice can expire while a tab sits open, so re-check when the reader
    // comes back to it rather than leaving a finished notice on screen.
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const dismiss = () => {
    if (!notice) return;
    try {
      window.localStorage.setItem(DISMISS_KEY_PREFIX + notice.id, "1");
    } catch {
      // Storage can be unavailable; the notice still hides for this session.
    }
    setNotice(null);
  };

  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-40 border-b border-border/60 bg-gradient-to-r from-brand-purple/10 via-brand-purple/5 to-transparent backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:items-center">
        <Megaphone
          className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple sm:mt-0"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">
          <span className="font-semibold">{notice.title}</span>
          <span className="text-muted-foreground"> {notice.body}</span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this notice"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default ReleaseNoticeBanner;
