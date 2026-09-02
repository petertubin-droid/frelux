import { useEffect, useState, useCallback } from "react";
import {
  X,
  Upload,
  Search,
  Trash2,
  Folder as FolderIcon,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import {
  fetchMediaFolders,
  fetchMediaItems,
  uploadMediaImage,
  deleteMediaItem,
} from "@/lib/queries";
import type { DbMediaFolder, DbMediaItem } from "@/types/database";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  defaultFolder?: string;
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  defaultFolder = "colors",
}: MediaPickerProps) {
  const [folders, setFolders] = useState<DbMediaFolder[]>([]);
  const [items, setItems] = useState<DbMediaItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<DbMediaItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchMediaItems(
      activeFolder ?? undefined,
      search || undefined,
    );
    if (error) setError(error);
    setItems(data);
    setLoading(false);
  }, [activeFolder, search]);

  useEffect(() => {
    if (!open) return;
    fetchMediaFolders().then(({ data }) => {
      setFolders(data);
      const defaultF = data.find((f) => f.slug === defaultFolder);
      setActiveFolder(defaultF?.id ?? null);
    });
  }, [open, defaultFolder]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleUpload(file: File) {
    const folder = folders.find((f) => f.id === activeFolder);
    setUploading(true);
    setError(null);
    const { error } = await uploadMediaImage(
      file,
      folder?.slug ?? "user-uploads",
    );
    setUploading(false);
    if (error) {
      setError(error);
      return;
    }
    load();
  }

  async function handleDelete(item: DbMediaItem) {
    if (!confirm(`Delete "${item.file_name}"?`)) return;
    const { error } = await deleteMediaItem(item);
    if (error) {
      setError(error);
      return;
    }
    load();
  }

  function handleConfirm() {
    if (selected) {
      onSelect(selected.public_url);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-card dark:bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border dark:border-white/5 px-5 py-3">
          <h2 className="text-base font-bold text-foreground dark:text-primary-foreground">
            Media Library
          </h2>
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground dark:text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {/* Sidebar: folders */}
          <div className="w-48 shrink-0 border-r border-border dark:border-white/5 bg-muted/50 dark:bg-white/5 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
              Folders
            </p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setActiveFolder(null)}
                className={classNames(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  !activeFolder
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted",
                )}
              >
                <FolderIcon aria-hidden="true" className="h-4 w-4" /> All
              </Button>
              {folders.map((f) => (
                <Button
                  variant="ghost"
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolder(f.id)}
                  className={classNames(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    activeFolder === f.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted",
                  )}
                >
                  <FolderIcon aria-hidden="true" className="h-4 w-4" /> {f.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Main: search + grid */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-border dark:border-white/5 p-3">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search media…"
                  className="input-field pl-9"
                />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Upload aria-hidden="true" className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground dark:text-muted-foreground">
                  Loading…
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground dark:text-muted-foreground">
                  <ImageIcon
                    aria-hidden="true"
                    className="h-8 w-8 text-muted-foreground/80"
                  />
                  <p className="mt-2">
                    No images yet. Upload one to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={classNames(
                        "group relative overflow-hidden rounded-lg border-2 transition-all",
                        selected?.id === item.id
                          ? "border-brand-purple ring-2 ring-brand-purple/20"
                          : "border-transparent hover:border-border dark:border-white/5",
                      )}
                    >
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setSelected(item)}
                        className="block w-full"
                      >
                        <div className="aspect-square overflow-hidden bg-muted">
                          <img
                            src={item.public_url}
                            alt={item.alt_text ?? item.file_name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="truncate p-1.5 text-[10px] font-medium text-muted-foreground dark:text-muted-foreground/80">
                          {item.file_name}
                        </div>
                      </Button>
                      {selected?.id === item.id && (
                        <div className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                          <Check aria-hidden="true" className="h-3 w-3" />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        className="absolute left-1 top-1 rounded-full bg-card dark:bg-background-mid/80 p-1 text-muted-foreground dark:text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 aria-hidden="true" className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border dark:border-white/5 px-5 py-3">
          {selected ? (
            <p className="truncate text-sm text-muted-foreground dark:text-muted-foreground/80">
              Selected: {selected.file_name}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Select an image or upload a new one.
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border dark:border-white/5 px-4 py-2 text-sm font-semibold text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted/50 dark:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="button"
              onClick={handleConfirm}
              disabled={!selected}
              className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:/90"
            >
              Select
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
