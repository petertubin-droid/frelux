import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import {
  buildConversationalEstimate,
  type ConversationalEstimate,
  type ConversationLanguage,
  type LanguagePack,
} from "@/lib/estimation/conversational-engine";
import {
  fetchConversationalPacks,
  insertConversationalParseLog,
} from "@/lib/estimation/queries";

const LANGUAGE_LABELS: Record<ConversationLanguage | "auto", string> = {
  auto: "Auto-detect",
  en: "English",
};

const LANGUAGES: Array<ConversationLanguage | "auto"> = ["auto", "en"];

const SAMPLES: Record<ConversationLanguage, string> = {
  en: "Hello, I want to paint my room. It is 4 by 3 meters, 2 coats, in Lagos",
};

export default function ConversationalEstimator() {
  useSeo({
    title: "WhatsApp Estimator — Chat Your Estimate in English | FRELUX",
    description:
      "Paste a WhatsApp chat or voice-note transcript and get the same honest FRELUX paint estimate instantly. Nothing is guessed: the engine shows exactly what it heard and asks when something is missing.",
  });

  const [thread, setThread] = useState("");
  const [language, setLanguage] = useState<ConversationLanguage | "auto">(
    "auto",
  );
  const [packs, setPacks] = useState<LanguagePack[] | null>(null);
  const [result, setResult] = useState<ConversationalEstimate | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchConversationalPacks(true).then(({ data }) => {
      if (!alive) return;
      if (data && data.length > 0) {
        setPacks(
          data.map((p) => ({
            language: p.language_code as ConversationLanguage,
            category: p.category as LanguagePack["category"],
            keywords: p.keywords,
            weight: p.weight,
          })),
        );
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  async function onEstimate() {
    if (thread.trim().length === 0) return;
    setBusy(true);
    try {
      const estimate = buildConversationalEstimate(thread, {
        language,
        packs,
      });
      setResult(estimate);
      track("conversational_estimate_run", {
        language: estimate.language,
        intent: estimate.intent,
        had_estimate: estimate.paintEstimate != null,
      });
      // Best-effort telemetry — never blocks or breaks the reply.
      insertConversationalParseLog({
        raw_thread: thread.slice(0, 4000),
        detected_language: estimate.language,
        intent: estimate.intent,
        extracted_params: Object.fromEntries(
          estimate.understood.map((u) => [u.label, u.value]),
        ),
        had_estimate: estimate.paintEstimate != null,
        language_override:
          language !== "auto" && language !== estimate.detection.language,
      }).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container>
      <PageHeader
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "WhatsApp Estimator" },
        ]}
        title="WhatsApp Estimator"
        subtitle="Paste the chat — or the voice-note transcript — in English. You get the same honest FRELUX estimate, plus every fact the engine picked up and where it found it."
      />

      <section className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <label htmlFor="thread" className="block text-sm font-medium">
            Your WhatsApp chat / voice-note transcript
          </label>
          <textarea
            id="thread"
            value={thread}
            onChange={(e) => setThread(e.target.value)}
            rows={6}
            placeholder={SAMPLES.en}
            className="mt-2 w-full rounded-md border p-3 font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as ConversationLanguage | "auto")
              }
              className="rounded-md border bg-background px-3 py-2 text-sm"
              aria-label="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onEstimate}
              disabled={busy || thread.trim().length === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Reading your message…" : "Get my estimate"}
            </button>
            {(["en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setThread(SAMPLES[l as ConversationLanguage])}
                className="rounded-md border px-3 py-2 text-xs text-muted-foreground hover:bg-accent"
              >
                Try {LANGUAGE_LABELS[l as ConversationLanguage]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Everything runs in your browser — deterministic parsing, no AI
            upload, nothing sent anywhere. Voice notes: paste WhatsApp&apos;s
            transcript of the note.
          </p>
        </div>

        {result && (
          <div className="space-y-4">
            {/* The reply bubble — same language the customer wrote in */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{result.replyTitle}</h2>
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {LANGUAGE_LABELS[result.language]}
                  {language === "auto" ? " (detected)" : ""}
                </span>
              </div>

              {result.understood.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {result.understood.map((u) => (
                    <li key={u.label}>
                      <span className="font-medium">{u.label}:</span> {u.value}
                      {u.evidence && (
                        <span className="text-muted-foreground">
                          {" "}
                          — “{u.evidence}”
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {result.notFoundNote && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {result.notFoundNote}
                </p>
              )}

              {result.followUpQuestions.length > 0 && (
                <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                  {result.followUpQuestions.map((q) => (
                    <p key={q}>{q}</p>
                  ))}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reply with the size in the same chat and paste again — the
                    estimate appears immediately.
                  </p>
                </div>
              )}
            </div>

            {result.paintEstimate && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold">Your paint estimate</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Paintable area</dt>
                    <dd className="font-medium">
                      {result.paintEstimate.paintableArea.toFixed(2)} m²
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Paint needed</dt>
                    <dd className="font-medium">
                      {result.paintEstimate.liters.toFixed(2)} litres (incl.
                      waste)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Coats</dt>
                    <dd className="font-medium">
                      {result.paintEstimate.coats}
                    </dd>
                  </div>
                </dl>
                {result.paintEstimate.containers.length > 0 && (
                  <p className="mt-3 text-sm">
                    <span className="font-medium">Buy:</span>{" "}
                    {result.paintEstimate.containers
                      .map((c) => `${c.count} × ${c.size} L`)
                      .join(", ")}
                  </p>
                )}
                {result.paintEstimate.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {result.paintEstimate.warnings.map((w) => (
                      <li key={w}>• {w}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-sm">
                  <Link
                    to="/paint-calculator"
                    className="font-medium text-primary underline"
                    onClick={() =>
                      track("conversational_route_click", {
                        to: "/paint-calculator",
                      })
                    }
                  >
                    Continue in the full Paint Calculator for exact products and
                    costs →
                  </Link>
                </p>
              </div>
            )}

            {result.routedCalculatorPath && !result.paintEstimate && (
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm">
                  <Link
                    to={result.routedCalculatorPath}
                    className="font-medium text-primary underline"
                    onClick={() =>
                      track("conversational_route_click", {
                        to: result.routedCalculatorPath!,
                      })
                    }
                  >
                    Open the right calculator with your numbers →
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
