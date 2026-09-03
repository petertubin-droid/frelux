import { useState, useEffect, useCallback } from "react";
import { Check, X, Crown, Loader2, Trash2 } from "lucide-react";
import {
  fetchGalleryEntries,
  fetchGalleryImages,
  moderateGalleryEntry,
  toggleGalleryFeature,
  deleteGalleryEntry,
} from "@/lib/project-intelligence";
import type { DbGalleryEntry } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  featured: "bg-primary/10 text-primary border-primary/20",
  hidden: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
};

export default function AdminGallery() {
  const [entries, setEntries] = useState<DbGalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [images, setImages] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGalleryEntries({
        status: filter === "all" ? undefined : filter,
      });
      setEntries(data);
      const imgMap: Record<string, string[]> = {};
      for (const entry of data) {
        const imgs = await fetchGalleryImages(entry.id);
        imgMap[entry.id] = imgs.map((i) => i.image_url);
      }
      setImages(imgMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id: string) {
    await moderateGalleryEntry(id, "approved");
    load();
  }
  async function handleReject(id: string) {
    await moderateGalleryEntry(id, "rejected");
    load();
  }
  async function handleFeature(id: string) {
    await toggleGalleryFeature(id, true);
    load();
  }
  async function handleUnfeature(id: string) {
    await toggleGalleryFeature(id, false);
    load();
  }
  async function handleDelete(id: string) {
    if (confirm("Delete this gallery entry permanently?")) {
      await deleteGalleryEntry(id);
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gallery Moderation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, approve, and feature community project submissions.
          </p>
        </div>
      </div>
      {/* Filter */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "featured", "all"].map((s) => (
          <Button variant="ghost"
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${filter === s ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {s}
          </Button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No entries found.
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{entry.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {entry.project_category} •{" "}
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[entry.status]}`}
                >
                  {entry.status}
                </span>
              </div>
              {entry.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {entry.description}
                </p>
              )}
              {images[entry.id]?.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto">
                  {images[entry.id].map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-20 w-20 rounded-lg object-cover border"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {entry.status !== "approved" && entry.status !== "featured" && (
                  <Button variant="ghost"
                    onClick={() => handleApprove(entry.id)}
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-all hover:scale-105"
                  >
                    <Check className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />{" "}
                    Approve
                  </Button>
                )}
                {entry.status !== "rejected" && (
                  <Button variant="ghost"
                    onClick={() => handleReject(entry.id)}
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-500/20 transition-all hover:scale-105"
                  >
                    <X className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />{" "}
                    Reject
                  </Button>
                )}
                {entry.status !== "featured" && (
                  <Button variant="ghost"
                    onClick={() => handleFeature(entry.id)}
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-all hover:scale-105"
                  >
                    <Crown className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />{" "}
                    Feature
                  </Button>
                )}
                {entry.status === "featured" && (
                  <Button variant="ghost"
                    onClick={() => handleUnfeature(entry.id)}
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-zinc-500/10 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-500/20 transition-all hover:scale-105"
                  >
                    <Crown className="h-3.5 w-3.5" /> Unfeature
                  </Button>
                )}
                <Button variant="ghost"
                  onClick={() => handleDelete(entry.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20 transition-all hover:scale-105"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
