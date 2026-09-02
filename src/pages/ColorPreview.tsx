import { useState, useRef } from "react";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import { aiColorPreview, type ColorPreviewResult } from "@/lib/ai-project";
import { Loader2, Upload, X, Eye } from "lucide-react";
import { isValidHexColor, normalizeHex } from "@/lib/colors";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

export default function ColorPreview() {
  useSeo({
    title: "Color Preview Tool",
    description: "Preview paint colors on your room photos with AI.",
    canonicalPath: "/color-preview",
    noIndex: true,
  });
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.onerror = () => setError("Failed to read file");
    reader.readAsDataURL(file);
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="AI Before & After Preview"
        subtitle="Upload a photo of your room and see how different paint colors would transform it."
      />

      {!user && (
        <div className="mt-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Sign in to use the AI Color Preview feature.
          </p>
        </div>
      )}

      {user && (
        <form onSubmit={handleGenerate} className="mt-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Room Photo (optional but recommended)
            </label>
            {imagePreview ? (
              <div className="relative mt-2">
                <img
                  src={imagePreview}
                  alt="Room"
                  className="max-h-64 rounded-lg border"
                />
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-primary-foreground"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click to upload a room photo
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG up to 4MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Room Context */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">
                Room Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option>Living Room</option>
                <option>Bedroom</option>
                <option>Kitchen</option>
                <option>Bathroom</option>
                <option>Office</option>
                <option>Dining Room</option>
                <option>Corridor</option>
                <option>Outdoor</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Lighting
              </label>
              <select
                value={lighting}
                onChange={(e) => setLighting(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option>Natural daylight (bright)</option>
                <option>Natural daylight (limited)</option>
                <option>Artificial warm light</option>
                <option>Artificial cool light</option>
                <option>Mixed lighting</option>
                <option>Low light</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Desired Mood
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option>Relaxing</option>
                <option>Energetic</option>
                <option>Professional</option>
                <option>Cozy</option>
                <option>Dramatic</option>
                <option>Calm</option>
                <option>Inviting</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Interior Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option>Modern</option>
                <option>Traditional</option>
                <option>Minimalist</option>
                <option>Industrial</option>
                <option>Scandinavian</option>
                <option>Bohemian</option>
                <option>African Contemporary</option>
                <option>Tropical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Additional Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your room, furniture, existing colors, climate..."
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Color Selection */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Colors to Preview
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
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateColor(i, "hex", e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border"
                  />
                  <input
                    value={color.name}
                    onChange={(e) => updateColor(i, "name", e.target.value)}
                    placeholder="Color name"
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
              Analyzing your room and generating color previews...
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Before / After visual comparison */}
          {imagePreview && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Eye aria-hidden="true" className="h-5 w-5 text-brand-purple" />{" "}
                Before & After
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Before
                  </p>
                  <img
                    src={imagePreview}
                    alt="Before"
                    className="w-full rounded-lg border"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    AI Color Suggestions
                  </p>
                  <div className="flex h-full min-h-[200px] flex-col rounded-lg border">
                    {result.colorSuggestions.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 border-b p-3 last:border-0"
                      >
                        <div
                          className="h-12 w-12 rounded border"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.coverageArea}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Description */}
          {result.previewDescription && (
            <div className="rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-foreground">
                AI Visual Analysis
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.previewDescription}
              </p>
            </div>
          )}

          {/* Color Suggestions */}
          {result.colorSuggestions.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold text-foreground">
                Recommended Colors
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
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.hex}</p>
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
                Application Tips
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
  );
}
