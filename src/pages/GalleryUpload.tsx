import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Upload, Loader2, X, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import {
  createGalleryEntry,
  addGalleryImage,
} from "@/lib/project-intelligence";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

const CATEGORIES = [
  { value: "painting", label: "Painting" },
  { value: "screeding", label: "Screeding" },
  { value: "pop_ceiling", label: "POP Ceiling" },
  { value: "tiling", label: "Tiling" },
  { value: "finishing", label: "Finishing" },
  { value: "construction", label: "Construction" },
];

export default function GalleryUpload() {
  const { t } = useLanguage();
  useSeo({
    title: "Share Your Project",
    description: "Upload your before and after project photos.",
    canonicalPath: "/gallery/new",
    noIndex: true,
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRefBefore = useRef<HTMLInputElement>(null);
  const fileRefAfter = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    project_category: "painting",
    paint_type_used: "",
    paint_quality_used: "",
    colour_used: "",
    location: "",
    completion_date: "",
  });
  const [isPublic] = useState(true);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="container mx-auto py-20 text-center text-muted-foreground">
        {t("Please log in to share your project.")}
      </div>
    );
  }

  async function uploadImage(
    file: File,
    type: "before" | "after",
  ): Promise<string | null> {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/gallery/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("project-media")
      .upload(path, file, { contentType: file.type });
    if (error) {
      toast({ title: "Upload failed", variant: "error" });
      return null;
    }
    const { data: url } = supabase.storage
      .from("project-media")
      .getPublicUrl(path);
    return url.publicUrl;
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image too large (max 10MB)", variant: "error" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "error" });
      return;
    }
    const url = await uploadImage(file, type);
    if (url) {
      if (type === "before") {
        setBeforeImage(url);
      } else {
        setAfterImage(url);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "error" });
      return;
    }
    if (!beforeImage && !afterImage) {
      toast({ title: "At least one image is required", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const entry = await createGalleryEntry({
        ...form,
        project_category: form.project_category as
          | "screeding"
          | "pop_ceiling"
          | "finishing"
          | "painting"
          | "tiling"
          | "construction",
        is_public: isPublic,
      });
      if (beforeImage) await addGalleryImage(entry.id, beforeImage, "before");
      if (afterImage) await addGalleryImage(entry.id, afterImage, "after");
      toast({
        title: "Project shared! It will appear after review.",
        variant: "success",
      });
      navigate("/gallery");
    } catch (err) {
      toast({ title: (err as Error).message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none";
  const labelCls = "block text-sm font-medium mb-1.5 text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t("Share Your Project")}
        subtitle={t("Show off your before & after transformation.")}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          to="/gallery/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />{" "}
          Back to Gallery
        </Link>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image upload zone */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(["before", "after"] as const).map((type) => {
              const img = type === "before" ? beforeImage : afterImage;
              const setImg = type === "before" ? setBeforeImage : setAfterImage;
              const ref = type === "before" ? fileRefBefore : fileRefAfter;
              return (
                <div key={type} className="group relative">
                  <label className={labelCls}>
                    {type === "before" ? "Before" : "After"} Image
                  </label>
                  <div
                    onClick={() => ref.current?.click()}
                    className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 hover:border-primary hover:bg-primary/5"
                  >
                    {img ? (
                      <>
                        <img
                          src={img}
                          alt={type}
                          className="h-full w-full object-cover"
                        />
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImg(null);
                          }}
                          className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 backdrop-blur hover:bg-background transition-all hover:scale-110"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Upload className="mx-auto h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-sm font-medium">
                          {t("Click to upload")}
                        </p>
                        <p className="text-xs">{t("Max 10MB")}</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={ref}
                    type="file"
                    accept="image/*"
                    aria-label={`${type === "before" ? "Before" : "After"} image upload`}
                    className="hidden"
                    onChange={(e) => handleFileChange(e, type)}
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label htmlFor="gu-title" className={labelCls}>
              Project Title *
            </label>
            <input
              id="gu-title"
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("My Living Room Transformation")}
              required
            />
          </div>
          <div>
            <label htmlFor="gu-description" className={labelCls}>
              {t("Description")}
            </label>
            <textarea
              id="gu-description"
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder={t("Describe your project...")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gu-category" className={labelCls}>
                {t("Category")}
              </label>
              <select
                id="gu-category"
                className={inputCls}
                value={form.project_category}
                onChange={(e) =>
                  setForm({ ...form, project_category: e.target.value })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gu-paint-type" className={labelCls}>
                {t("Paint Type Used")}
              </label>
              <input
                id="gu-paint-type"
                className={inputCls}
                value={form.paint_type_used}
                onChange={(e) =>
                  setForm({ ...form, paint_type_used: e.target.value })
                }
                placeholder="e.g. Satin"
              />
            </div>
            <div>
              <label htmlFor="gu-paint-quality" className={labelCls}>
                {t("Paint Quality")}
              </label>
              <input
                id="gu-paint-quality"
                className={inputCls}
                value={form.paint_quality_used}
                onChange={(e) =>
                  setForm({ ...form, paint_quality_used: e.target.value })
                }
                placeholder="e.g. Premium"
              />
            </div>
            <div>
              <label htmlFor="gu-colour" className={labelCls}>
                {t("Colour Used")}
              </label>
              <input
                id="gu-colour"
                className={inputCls}
                value={form.colour_used}
                onChange={(e) =>
                  setForm({ ...form, colour_used: e.target.value })
                }
                placeholder="e.g. Off White"
              />
            </div>
            <div>
              <label htmlFor="gu-location" className={labelCls}>
                {t("Location (City/State)")}
              </label>
              <input
                id="gu-location"
                className={inputCls}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Your City"
              />
            </div>
            <div>
              <label htmlFor="gu-completion-date" className={labelCls}>
                {t("Completion Date")}
              </label>
              <input
                id="gu-completion-date"
                type="date"
                className={inputCls}
                value={form.completion_date}
                onChange={(e) =>
                  setForm({ ...form, completion_date: e.target.value })
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isPublic ? "bg-primary" : "bg-muted"}`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-md transition-all duration-300 ${isPublic ? "left-6" : "left-0.5"}`}
              />
            </div>
            <span className="text-sm font-medium">
              {t("Make public (subject to admin review)")}
            </span>
          </label>

          <Button
            variant="ghost"
            type="submit"
            disabled={submitting}
            className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("Uploading...")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 group-hover:rotate-12 transition-transform" />{" "}
                Share Project
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
