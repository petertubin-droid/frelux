import { useEffect, useState, useCallback } from 'react';
import { X, Upload, Search, Trash2, Folder as FolderIcon, Image as ImageIcon, Check } from 'lucide-react';
import { fetchMediaFolders, fetchMediaItems, uploadMediaImage, deleteMediaItem } from '@/lib/queries';
import type { DbMediaFolder, DbMediaItem } from '@/types/database';
import { classNames } from '@/lib/utils';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  defaultFolder?: string;
}

export function MediaPicker({ open, onClose, onSelect, defaultFolder = 'colors' }: MediaPickerProps) {
  const [folders, setFolders] = useState<DbMediaFolder[]>([]);
  const [items, setItems] = useState<DbMediaItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<DbMediaItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchMediaItems(activeFolder ?? undefined, search || undefined);
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
    const { error } = await uploadMediaImage(file, folder?.slug ?? 'user-uploads');
    setUploading(false);
    if (error) { setError(error); return; }
    load();
  }

  async function handleDelete(item: DbMediaItem) {
    if (!confirm(`Delete "${item.file_name}"?`)) return;
    const { error } = await deleteMediaItem(item);
    if (error) { setError(error); return; }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="text-base font-bold text-brand-navy">Media Library</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex min-h-0 flex-1">
          {/* Sidebar: folders */}
          <div className="w-48 shrink-0 border-r border-neutral-200 bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">Folders</p>
            <div className="space-y-1">
              <button type="button" onClick={() => setActiveFolder(null)} className={classNames('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors', !activeFolder ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:bg-neutral-100')}>
                <FolderIcon className="h-4 w-4" /> All
              </button>
              {folders.map((f) => (
                <button key={f.id} type="button" onClick={() => setActiveFolder(f.id)} className={classNames('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors', activeFolder === f.id ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:bg-neutral-100')}>
                  <FolderIcon className="h-4 w-4" /> {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main: search + grid */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-neutral-200 p-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search media…" className="input-field pl-9" />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} disabled={uploading} />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">Loading…</div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-sm text-neutral-400">
                  <ImageIcon className="h-8 w-8 text-neutral-300" />
                  <p className="mt-2">No images yet. Upload one to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {items.map((item) => (
                    <div key={item.id} className={classNames('group relative overflow-hidden rounded-lg border-2 transition-all', selected?.id === item.id ? 'border-brand-purple ring-2 ring-brand-purple/20' : 'border-transparent hover:border-neutral-200')}>
                      <button type="button" onClick={() => setSelected(item)} className="block w-full">
                        <div className="aspect-square overflow-hidden bg-neutral-100">
                          <img src={item.public_url} alt={item.alt_text ?? item.file_name} className="h-full w-full object-cover" loading="lazy" />
                        </div>
                        <div className="truncate p-1.5 text-[10px] font-medium text-neutral-600">{item.file_name}</div>
                      </button>
                      {selected?.id === item.id && (
                        <div className="absolute right-1 top-1 rounded-full bg-brand-purple p-1 text-white"><Check className="h-3 w-3" /></div>
                      )}
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="absolute left-1 top-1 rounded-full bg-white/80 p-1 text-neutral-500 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
          {selected ? <p className="truncate text-sm text-neutral-600">Selected: {selected.file_name}</p> : <p className="text-sm text-neutral-400">Select an image or upload a new one.</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">Cancel</button>
            <button type="button" onClick={handleConfirm} disabled={!selected} className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-brand-purple-dark">Select</button>
          </div>
        </div>
      </div>
    </div>
  );
}
