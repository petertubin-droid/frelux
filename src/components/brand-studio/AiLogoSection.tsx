/**
 * AI Logo Studio Section — generate custom business logos via AI
 *
 * Uses the existing Supabase Edge Function architecture.
 * The edge function calls the AI image generation API securely.
 */
import { useState, useCallback } from "react";
import { Sparkles, Loader2, Check, Trash2 } from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { VoiceInput } from "./VoiceInput";
import { supabase } from "@/lib/supabase";
import {
  saveAiLogoRecord,
  fetchAiLogos,
  deleteAiLogo,
  selectAiLogo,
} from "@/lib/brand-studio";
import type {
  BrandStudioAccess as BSAccess,
  DbAiLogoGeneration,
} from "@/types/database";

interface Props {
  userId: string;
  access: BSAccess | null;
  onLogoSelected: () => Promise<void>;
}

const LOGO_STYLES = [
  "Modern",
  "Minimalist",
  "Luxury",
  "Vintage",
  "Geometric",
  "Typography-based",
  "Emblem",
];

export function AiLogoSection({ userId, access, onLogoSelected }: Props) {
  const [prompt, setPrompt] = useState("");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("Modern");
  const [colorPrefs, setColorPrefs] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logos, setLogos] = useState<DbAiLogoGeneration[]>([]);
  const [loadingLogos, setLoadingLogos] = useState(false);

  const canUse = access?.canUseAiLogo ?? false;

  const loadLogos = useCallback(async () => {
    if (!userId) return;
    setLoadingLogos(true);
    const l = await fetchAiLogos(userId);
    setLogos(l);
    setLoadingLogos(false);
  }, [userId]);

  const handleGenerate = async () => {
    if (!userId || !prompt.trim()) {
      setError("Please describe the logo you want.");
      return;
    }
    setGenerating(true);
    setError(null);

    try {
      // Call the AI logo generation edge function
      const { data, error: invokeError } = await supabase.functions.invoke(
        "ai-logo-generation",
        {
          body: {
            prompt: prompt.trim(),
            industry: industry.trim(),
            style,
            colorPrefs: colorPrefs.trim(),
            userId,
          },
        },
      );

      if (invokeError) {
        setError(invokeError.message || "Failed to generate logo.");
      } else if (data?.imageUrl) {
        // Save the generation record
        await saveAiLogoRecord({
          user_id: userId,
          prompt: prompt.trim(),
          industry: industry.trim(),
          style,
          color_prefs: colorPrefs.trim(),
          image_url: data.imageUrl,
        });
        await loadLogos();
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (e) {
      setError(
        (e as Error).message || "Something went wrong. Please try again.",
      );
    }
    setGenerating(false);
  };

  const handleSelect = async (id: string) => {
    if (!userId) return;
    await selectAiLogo(id, userId);
    await loadLogos();
    await onLogoSelected();
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    await deleteAiLogo(id, userId);
    await loadLogos();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {!canUse ? (
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-8 text-center">
          <PremiumBadge size="lg" glow className="mx-auto" />
          <p className="mx-auto mt-4 max-w-md text-sm text-neutral-500">
            AI Logo Studio requires premium access or a rewarded-ad unlock.
            Upgrade to generate custom AI logos for your brand.
          </p>
        </div>
      ) : (
        <>
          {/* Generation form */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-purple" />
              <h2 className="text-base font-bold text-brand-navy dark:text-white">
                AI Logo Generator
              </h2>
            </div>

            <div className="space-y-4">
              <VoiceInput
                label="Describe your logo"
                value={prompt}
                onChange={setPrompt}
                placeholder="e.g. Create a modern premium logo for Andrew Luxury Paints using painting elements with elegant typography."
                multiline
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Industry / Category
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Painting & Decoration"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {LOGO_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Colour Preferences (optional)
                </label>
                <input
                  type="text"
                  value={colorPrefs}
                  onChange={(e) => setColorPrefs(e.target.value)}
                  placeholder="e.g. Gold and dark blue"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-purple/90 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? "Generating…" : "Generate Logo"}
              </button>
              <p className="text-xs text-neutral-400">
                Uses AI image generation. Daily limit:{" "}
                {access?.aiLogoDailyLimit ?? 3} generations.
              </p>
            </div>
          </div>

          {/* Generated logos */}
          {loadingLogos && (
            <p className="text-sm text-neutral-400">Loading your logos…</p>
          )}
          {logos.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Your Generated Logos
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {logos.map((logo) => (
                  <div
                    key={logo.id}
                    className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <img
                      src={logo.image_url}
                      alt="generated logo"
                      className="mb-2 h-24 w-full rounded-lg object-contain"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSelect(logo.id)}
                        className={`rounded-lg p-1.5 text-xs font-medium ${
                          logo.is_selected
                            ? "bg-accent-green/20 text-accent-green"
                            : "bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/20"
                        }`}
                      >
                        <Check className="inline h-3 w-3" />{" "}
                        {logo.is_selected ? "Selected" : "Select"}
                      </button>
                      <button
                        onClick={() => handleDelete(logo.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
