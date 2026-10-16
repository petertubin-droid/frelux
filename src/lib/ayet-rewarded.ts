import { getSupabase } from "@/lib/supabase-lazy";

interface AyetSdk {
  init: (
    placementId: number,
    externalIdentifier: string,
    optionalParameter?: string | null,
  ) => Promise<unknown>;
  requestAd: (
    adslotName: string,
    success: () => void,
    error: (message: string) => void,
  ) => void;
  playFullsizeAd: () => void;
  destroy?: () => void;
  callbackRewarded?: (details: unknown) => void;
  callbackComplete?: () => void;
  callbackError?: (error: unknown) => void;
}

declare global {
  interface Window {
    AyetVideoSdk?: AyetSdk;
  }
}

let sdkLoading: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  if (window.AyetVideoSdk) return Promise.resolve();
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-ayet-rewarded-sdk="true"]',
    );
    const script = existing ?? document.createElement("script");
    const timeout = window.setTimeout(
      () => reject(new Error("ayeT video SDK did not load in time.")),
      15_000,
    );
    const done = () => {
      window.clearTimeout(timeout);
      if (window.AyetVideoSdk) resolve();
      else reject(new Error("ayeT video SDK loaded without its player."));
    };
    script.addEventListener("load", done, { once: true });
    script.addEventListener(
      "error",
      () => {
        window.clearTimeout(timeout);
        reject(new Error("Could not load ayeT rewarded video."));
      },
      { once: true },
    );
    if (!existing) {
      script.src = "https://cdn.ayet.io/offerwall/js/ayetvideosdk.min.js";
      script.async = true;
      script.dataset.ayetRewardedSdk = "true";
      document.head.appendChild(script);
    }
  }).catch((error) => {
    sdkLoading = null;
    throw error;
  });
  return sdkLoading;
}

interface SessionResponse {
  sessionId: string;
  externalIdentifier: string;
  placementId: string;
  adslotName: string;
}
interface VerifyResponse {
  success: boolean;
  status: "pending" | "completed" | "expired";
  creditsEarned?: number;
  newBalance?: number;
  error?: string;
}

/** Plays an ayeT ad, but resolves only when the signed ayeT S2S callback has
 * caused the backend to mark this server-issued session completed. Browser SDK
 * events are used only for UX and never authorize credits. */
export async function showAyetRewardedAd(): Promise<{
  creditsEarned: number;
  newBalance: number;
}> {
  const supabase = await getSupabase();
  const { data: sessionData, error: sessionError } =
    await supabase.functions.invoke<SessionResponse>(
      "create-ayet-rewarded-session",
      { body: {} },
    );
  if (sessionError || !sessionData?.sessionId)
    throw new Error(
      "Could not start a secure ayeT reward session. Please try again later.",
    );
  const session = sessionData;
  const placementId = Number(session.placementId);
  if (!Number.isSafeInteger(placementId) || placementId <= 0)
    throw new Error("The ayeT website placement ID is invalid.");

  await loadSdk();
  const sdk = window.AyetVideoSdk;
  if (!sdk) throw new Error("ayeT video SDK is unavailable.");
  await sdk.init(placementId, session.externalIdentifier, "frelux_credits");

  await new Promise<void>((resolve, reject) => {
    const shell = document.createElement("div");
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "true");
    shell.setAttribute("aria-label", "ayeT rewarded video");
    shell.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(10,12,20,.78);padding:24px;font:14px system-ui,sans-serif";
    const card = document.createElement("div");
    card.style.cssText =
      "width:min(100%,420px);border-radius:18px;background:#fff;color:#171717;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.35);text-align:center";
    const title = document.createElement("h2");
    title.textContent = "Your video is ready";
    title.style.cssText = "margin:0 0 8px;font-size:20px;font-weight:700";
    const copy = document.createElement("p");
    copy.textContent =
      "Watch the full rewarded video. Credits are added only after ayeT confirms completion securely.";
    copy.style.cssText = "margin:0 0 20px;color:#525252;line-height:1.5";
    const play = document.createElement("button");
    play.type = "button";
    play.disabled = true;
    play.textContent = "Loading video…";
    play.style.cssText =
      "width:100%;border:0;border-radius:12px;background:#6d28d9;color:#fff;padding:13px 18px;font-weight:700;cursor:pointer";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.style.cssText =
      "margin-top:12px;border:0;background:transparent;color:#525252;padding:8px 14px;cursor:pointer";
    card.append(title, copy, play, cancel);
    shell.append(card);
    document.body.append(shell);
    const priorError = sdk.callbackError;
    let settled = false;
    const requestTimeout = window.setTimeout(() => {
      finish(new Error("ayeT did not prepare a video in time."));
    }, 45_000);
    const cleanup = () => {
      window.clearTimeout(requestTimeout);
      shell.remove();
      sdk.callbackError = priorError;
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    cancel.addEventListener(
      "click",
      () => {
        try {
          sdk.destroy?.();
        } catch {
          /* best-effort player cleanup */
        }
        finish(new Error("Rewarded video cancelled. No credits were awarded."));
      },
      { once: true },
    );
    play.addEventListener(
      "click",
      () => {
        if (settled) return;
        play.disabled = true;
        play.textContent = "Video opening…";
        try {
          // The click is a fresh, direct user gesture after the async SDK setup.
          sdk.playFullsizeAd();
          finish();
        } catch (error) {
          finish(
            error instanceof Error
              ? error
              : new Error("Could not play ayeT video."),
          );
        }
      },
      { once: true },
    );
    sdk.callbackError = (error) => {
      priorError?.(error);
      finish(
        new Error(
          typeof error === "string" ? error : "ayeT could not play the video.",
        ),
      );
    };
    try {
      sdk.requestAd(
        session.adslotName,
        () => {
          if (settled) return;
          // Require the SDK's ad-ready callback before enabling its playback call.
          play.disabled = false;
          play.textContent = "Play rewarded video";
          play.focus();
        },
        (message) => {
          finish(
            new Error(message || "No ayeT video ad is available right now."),
          );
        },
      );
    } catch (error) {
      finish(
        error instanceof Error
          ? error
          : new Error("Could not request an ayeT video ad."),
      );
    }
  });

  // callbackComplete is not reward proof. The SDK's callbackRewarded only
  // starts the server-status check; the session completion comes from S2S.
  const verification = await new Promise<VerifyResponse>((resolve, reject) => {
    let finished = false;
    let polling = false;
    const start = Date.now();
    const cleanup = () => {
      if (sdk.destroy) {
        try {
          sdk.destroy();
        } catch {
          /* best effort player cleanup */
        }
      }
    };
    const poll = async () => {
      if (finished || polling) return;
      polling = true;
      try {
        const { data, error } = await supabase.functions.invoke<VerifyResponse>(
          "verify-ayet-rewarded-session",
          { body: { sessionId: session.sessionId } },
        );
        if (error) throw error;
        if (
          data?.status === "completed" &&
          data.success &&
          (data.creditsEarned ?? 0) > 0
        ) {
          finished = true;
          cleanup();
          resolve(data);
          return;
        }
        if (data?.status === "expired") {
          finished = true;
          cleanup();
          reject(
            new Error(
              data.error ??
                "The ayeT session expired without a verified reward.",
            ),
          );
          return;
        }
      } catch {
        /* transient polling errors are retried until the bounded timeout */
      } finally {
        polling = false;
      }
      if (finished) return;
      if (Date.now() - start >= 90_000) {
        finished = true;
        cleanup();
        reject(
          new Error(
            "ayeT has not confirmed this view on its secure server callback yet. No credits were awarded; refresh your balance shortly.",
          ),
        );
        return;
      }
      window.setTimeout(() => {
        void poll();
      }, 2_000);
    };
    // Poll independently of browser completion events; those events are UX
    // signals only, and the signed S2S callback remains the sole reward proof.
    void poll();
  });
  return {
    creditsEarned: verification.creditsEarned ?? 0,
    newBalance: verification.newBalance ?? 0,
  };
}
