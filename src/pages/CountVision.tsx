/**
 * FRELUX Counter-Vision — Photo Counting (Future Engine 2)
 *
 * Photograph a stack of tiles, cement bags, blocks or paint
 * buckets and the engine counts what is visible — via Gemini,
 * admin-gated and rate-limited on the server.
 *
 * - The counting happens ONLY in the count-vision edge function;
 *   this page renders and never invents a number.
 * - A count below the admin-configured confidence floor, or one
 *   the server could not stand behind, is shown as "cannot count
 *   honestly" with the reason — never as a guess.
 * - The photo is never stored: it goes to the counter and is
 *   gone when the count completes.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import { useAuth } from "@/lib/auth";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { fetchCountVisionRules, countPhoto } from "@/lib/estimation/queries";
import {
  DEFAULT_COUNT_VISION_RULES,
  parseCountVisionRules,
  checkPhoto,
  readFileAsDataUrl,
  validateCountResult,
  verdictLabel,
  type CountVisionResult,
  type CountVisionRules,
} from "@/lib/estimation/count-vision-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const ITEM_HINTS = [
  "Cement bags",
  "Tiles",
  "Blocks (sandcrete)",
  "Paint buckets",
  "Roofing sheets",
  "Reinforcement bars",
] as const;

export default function CountVision() {
  const { user } = useAuth();

  const [rules, setRules] = useState<CountVisionRules>(
    DEFAULT_COUNT_VISION_RULES,
  );
  const [itemHint, setItemHint] = useState<string>("Cement bags");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<CountVisionResult | null>(null);
  const [counting, setCounting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useSeo({
    title:
      "Photo Counter — Count Cement Bags, Tiles & Blocks From a Photo | FRELUX PROJECT CALC",
    description:
      "Photograph a stack of cement bags, tiles, blocks or paint buckets and Counter-Vision counts what is visible. Honest verdicts only: if the photo can't be counted reliably, it says so — it never guesses.",
  });

  useEffect(() => {
    fetchCountVisionRules()
      .then(({ data, error }) => {
        if (error || !data) return; // offline or unconfigured: built-in defaults apply
        setRules(
          parseCountVisionRules(data as unknown as EstimationCalcRule[]),
        );
      })
      .catch(() => {});
  }, []);

  const onPickPhoto = useCallback(
    (file: File | null) => {
      setError(null);
      setResult(null);
      setPhoto(null);
      setPreview(null);
      if (!file) return;
      const check = checkPhoto(file, rules);
      if (!check.ok) {
        setError(check.reason ?? "That photo cannot be used.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    },
    [rules],
  );

  const runCount = useCallback(async () => {
    if (!photo || counting) return;
    setCounting(true);
    setError(null);
    setResult(null);
    try {
      const dataUrl = await readFileAsDataUrl(photo);
      const raw = await countPhoto(dataUrl, itemHint);
      const validated = validateCountResult(raw, rules);
      setResult(validated);
      track("count_vision_run", { verdict: validated.verdict });
      // The photo is not kept: the count is the record.
      setPhoto(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(
        `${getSafeError(err)} — check your connection and try again. The photo was not stored.`,
      );
      track("count_vision_run", { verdict: "error" });
    } finally {
      setCounting(false);
    }
  }, [counting, itemHint, photo, rules, user]);

  return (
    <Container>
      <PageHeader
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Counter-Vision" },
        ]}
        title="Counter-Vision"
        subtitle="Photograph your stacked materials and the engine counts what is visible. It tells you honestly when it cannot count — it never guesses a number."
      />

      {/* The counting form */}
      <div className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">
            What did you photograph?
          </span>
          <select
            value={itemHint}
            onChange={(e) => setItemHint(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 sm:max-w-xs"
          >
            {ITEM_HINTS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Site photo</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Site photo to count"
          />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, WebP or HEIC up to {rules.max_image_mb} MB. The photo is
          sent for counting and never stored.
        </p>

        {preview && (
          <div className="mt-4">
            <img
              src={preview}
              alt="Selected site photo, ready for counting"
              className="max-h-64 rounded-md border"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ready to count — {photo?.name}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={runCount}
            disabled={!photo || counting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {counting ? "Counting…" : "Count what's visible"}
          </button>
          {(preview || result) && (
            <button
              onClick={() => {
                setPhoto(null);
                setPreview(null);
                setResult(null);
                setError(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-sm text-muted-foreground underline"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <AdSlot slotKey="calculator_mid" className="mt-8" />

      {/* The honest result */}
      {result && (
        <div
          className="mb-8 rounded-lg border bg-card p-6 shadow-sm"
          role="status"
          data-testid="count-result"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                result.verdict === "counted"
                  ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-600/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {verdictLabel(result.verdict)}
            </span>
            {result.verdict === "counted" && (
              <span className="text-xs text-muted-foreground">
                confidence {(result.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {result.verdict === "counted" && result.count !== null ? (
            <>
              <p className="mt-4 text-4xl font-bold" data-testid="count-number">
                {result.count.toLocaleString()}
              </p>
              <p className="mt-1 text-lg font-medium text-muted-foreground">
                {result.unitLabel ?? "units"} visible in the photo
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {result.reason}
              </p>
              <p className="mt-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                This is what is visible — units hidden behind or under the stack
                are not included. Count a second photo for the rest of the pile.
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-lg font-semibold">
                {result.verdict === "not_found"
                  ? "No countable materials in this photo"
                  : "This photo cannot be counted honestly"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.reason}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Take the photo in good light, close enough that each unit is
                distinct — then try again. A refused count is better than a
                wrong one.
              </p>
            </>
          )}
        </div>
      )}

      <AdSlot slotKey="calculator_native" className="mt-8" />

      {/* How it works — the honesty contract, in plain words */}
      <section className="mt-10 rounded-lg border bg-muted/30 p-5 text-sm">
        <h2 className="mb-2 font-semibold">How Counter-Vision works</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            The photo goes to the counting service (Google Gemini, configured
            and switched on by the site admin) and is never stored — only the
            answer and its diagnostics are logged.
          </li>
          <li>
            It counts only what is clearly visible. Hidden layers of a stack are
            never extrapolated, so a deep pile may honestly come back "cannot
            count".
          </li>
          <li>
            A count is only shown when the engine is confident in it. Below the
            confidence floor, you get the reason instead of a number.
          </li>
          <li>
            Nothing on this page requires an account. If you are signed in, your
            count requests are linked to your account.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
