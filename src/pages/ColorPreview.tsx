import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import ToolShell from "@/components/tools/ToolShell";
import { aiColorPreview, type ColorPreviewResult } from "@/lib/ai-project";
import { Loader2, Upload, X, Eye, Download } from "lucide-react";
import { isValidHexColor, normalizeHex } from "@/lib/colors";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

export default function ColorPreview() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ColorPreviewResult | null>(null);

  const [roomType, setRoomType] = useState("");
  const [lighting, setLighting] = useState("");
  const [mood, setMood] = useState("");
  const [style, setStyle] = useState("");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState<Array<{ name: string; hex: string }>>([
    { name: "Wall Color", hex: "#e8dcc8" },
    { name: "Accent", hex: "#4a5568" },
  ]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!("image/jpeg" === file.type || "image/png" === file.type || "image/webp" === file.type)) {
      setError("Please choose a JPEG, PNG or WebP room photo.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read this image."));
      });
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare this image in the browser.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      // Normalize uploads to a compact JPEG so the image plus JSON stays safely
      // within the Edge Function request size, even for large phone photos.
      let normalized = canvas.toDataURL("image/jpeg", 0.82);
      if (normalized.length > 4 * 1024 * 1024) {
        normalized = canvas.toDataURL("image/jpeg", 0.68);
      }
      setImagePreview(normalized);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Failed to read file");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function updateColor(index: number, field: "name" | "hex", value: string) {
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  function addColor() {
    setColors([
      ...colors,
      { name: `Color ${colors.length + 1}`, hex: "#cccccc" },
    ]);
  }

  function removeColor(index: number) {
    setColors(colors.filter((_, i) => i !== index));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const validColors = colors.filter((c) =>
        isValidHexColor(normalizeHex(c.hex)),
      );
      if (validColors.length === 0) {
        setError("Please add at least one valid color");
        setLoading(false);
        return;
      }
      const res = await aiColorPreview({
        imageDataUrl: imagePreview ?? undefined,
        roomDescription: description || undefined,
        targetColors: validColors.map((c) => ({
          name: c.name,
          hex: normalizeHex(c.hex),
        })),
        roomType: roomType || undefined,
        lightingCondition: lighting || undefined,
        mood: mood || undefined,
        style: style || undefined,
      });
      setResult(res);
    } catch (e) {
      setError(getSafeError(e, "Failed to generate preview"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell
      route="/color-preview"
      // A working surface, not an answer people search for, and it was already
      // kept out of the index before it moved onto the shell.
      noIndex
    >
      <div className="mx-auto max-w-4xl px-4 py-8">
        {!user && (
          <div className="mt-4 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              {t("Sign in to use the AI Color Preview feature.")}
            </p>
          </div>
        )}

        {user && (
          <form onSubmit={handleGenerate} className="mt-6 space-y-6">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium text-foreground">
                {t("Room Photo (optional but recommended)")}
              </label>
              {imagePreview ? (
                <div className="relative mt-2">
                  <img
                    src={imagePreview}
                    alt={t("Room")}
                    className="max-h-64 rounded-lg border"
                    loading="lazy"
                    decoding="async"
                  />
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-primary-foreground"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).click();
                    }
                  }}
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("Click to upload a room photo")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("JPG, PNG or WebP up to 4MB")}
                  </p>
                  <input
                    aria-label={t("Room photo upload")}
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Room Context */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cp-room-type"
                  className="text-sm font-medium text-foreground"
                >
                  {t("Room Type")}
                </label>
                <select
                  id="cp-room-type"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("Select...")}</option>
                  <option>{t("Living Room")}</option>
                  <option>{t("Bedroom")}</option>
                  <option>{t("Kitchen")}</option>
                  <option>{t("Bathroom")}</option>
                  <option>{t("Office")}</option>
                  <option>{t("Dining Room")}</option>
                  <option>{t("Corridor")}</option>
                  <option>{t("Outdoor")}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="cp-lighting"
                  className="text-sm font-medium text-foreground"
                >
                  {t("Lighting")}
                </label>
                <select
                  id="cp-lighting"
                  value={lighting}
                  onChange={(e) => setLighting(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("Select...")}</option>
                  <option>{t("Natural daylight (bright)")}</option>
                  <option>{t("Natural daylight (limited)")}</option>
                  <option>{t("Artificial warm light")}</option>
                  <option>{t("Artificial cool light")}</option>
                  <option>{t("Mixed lighting")}</option>
                  <option>{t("Low light")}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="cp-mood"
                  className="text-sm font-medium text-foreground"
                >
                  {t("Desired Mood")}
                </label>
                <select
                  id="cp-mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("Select...")}</option>
                  <option>{t("Relaxing")}</option>
                  <option>{t("Energetic")}</option>
                  <option>{t("Professional")}</option>
                  <option>{t("Cozy")}</option>
                  <option>{t("Dramatic")}</option>
                  <option>{t("Calm")}</option>
                  <option>{t("Inviting")}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="cp-style"
                  className="text-sm font-medium text-foreground"
                >
                  {t("Interior Style")}
                </label>
                <select
                  id="cp-style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("Select...")}</option>
                  <option>{t("Modern")}</option>
                  <option>{t("Traditional")}</option>
                  <option>{t("Minimalist")}</option>
                  <option>{t("Industrial")}</option>
                  <option>{t("Scandinavian")}</option>
                  <option>{t("Bohemian")}</option>
                  <option>{t("African Contemporary")}</option>
                  <option>{t("Tropical")}</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="cp-description"
                className="text-sm font-medium text-foreground"
              >
                {t("Additional Description")}
              </label>
              <textarea
                id="cp-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "Describe your room, furniture, existing colors, climate...",
                )}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Color Selection */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  {t("Colors to Preview")}
                </label>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={addColor}
                  className="text-xs font-medium text-brand-purple"
                >
                  + Add color
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {colors.map((color, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      aria-label={`Colour ${i + 1} picker`}
                      type="color"
                      value={color.hex}
                      onChange={(e) => updateColor(i, "hex", e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <input
                      aria-label={`Colour ${i + 1} name`}
                      value={color.name}
                      onChange={(e) => updateColor(i, "name", e.target.value)}
                      placeholder={t("Color name")}
                      className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    {colors.length > 1 && (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => removeColor(i)}
                        className="rounded p-2 hover:bg-accent"
                      >
                        <X
                          aria-hidden="true"
                          className="h-4 w-4 text-destructive"
                        />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="default"
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium disabled:opacity-50"
            >
              {loading ? (
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : (
                <Eye aria-hidden="true" className="h-5 w-5" />
              )}
              Generate AI Preview
            </Button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2
                aria-hidden="true"
                className="mx-auto h-10 w-10 animate-spin text-brand-purple"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                {t("Analyzing your room and generating color previews...")}
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Generated room image, using the uploaded photo when provided */}
            {result.previewImageUrl ? (
              <section aria-labelledby="cp-generated-image-heading">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 id="cp-generated-image-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Eye aria-hidden="true" className="h-5 w-5 text-brand-purple" />
                    {imagePreview ? t("Your Room, Reimagined") : t("Generated Room Design")}
                  </h3>
                  <a
                    href={result.previewImageUrl}
                    download="frelux-room-color-preview.png"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t("Open or download image")}
                  </a>
                </div>
                {imagePreview ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Before")}</p>
                      <img src={imagePreview} alt={t("Original room photo")} className="w-full rounded-lg border" loading="lazy" decoding="async" />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("AI-decorated preview")}</p>
                      <img src={result.previewImageUrl} alt={t("AI decorated room preview")} className="w-full rounded-lg border" loading="lazy" decoding="async" />
                    </div>
                  </div>
                ) : (
                  <img src={result.previewImageUrl} alt={t("AI generated room design preview")} className="w-full rounded-lg border" loading="lazy" decoding="async" />
                )}
                <p className="mt-2 text-xs text-muted-foreground">{t("AI-generated visualization. Paint color and room details may vary; test paint samples before purchase.")}</p>
              </section>
            ) : (
              <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                {t("The design analysis is ready, but the image generator did not return an image this time. You can still use the practical color and decorating recommendations below.")}
              </div>
            )}

            {/* Preview Description */}
            {result.previewDescription && (
              <div className="rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {t("AI Visual Analysis")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.previewDescription}
                </p>
              </div>
            )}

            {result.decorAdvice && (
              <section className="rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground">{t("Practical Decorating Plan")}</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{result.decorAdvice}</p>
              </section>
            )}

            {/* Color Suggestions */}
            {result.colorSuggestions.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-foreground">
                  {t("Recommended Colors")}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.colorSuggestions.map((c, i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-16 w-16 rounded-lg border"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div>
                          <p className="font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.hex}
                          </p>
                          <p className="text-xs font-medium text-brand-purple">
                            {c.coverageArea}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {c.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application Tips */}
            {result.applicationTips.length > 0 && (
              <div className="rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {t("Application Tips")}
                </h3>
                <ul className="mt-2 space-y-2">
                  {result.applicationTips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="text-brand-purple">🎨</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
