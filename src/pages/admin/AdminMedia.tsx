import { useEffect, useState, useCallback } from 'react';
import { Search, Upload, Trash2, Folder as FolderIcon, X, Pencil, Check } from 'lucide-react';
import { AdminHeader, AdminCard, StateMessage } from '@/components/admin/AdminUi';
import { fetchMediaFolders, fetchMediaItems, uploadMediaImage, deleteMediaItem, updateMediaItemAlt } from '@/lib/queries';
import type { DbMediaFolder, DbMediaItem } from '@/types/database';
import { classNames } from '@/lib/utils';

export default function AdminMedia() {
  const [folders, setFolders] = useState<DbMediaFolder[]>([]);
  const [items, setItems] = useState<DbMediaItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [altText, setAltText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchMediaItems(activeFolder ?? undefined, search || undefined);
    if (error) setError(error);
    setItems(data);
    setLoading(false);
  }, [activeFolder, search]);

  useEffect(() => { fetchMediaFolders().then(({ data }) => setFolders(data)); }, []);
  useEffect(() => { load(); }, [load]);

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

  async function saveAlt(item: DbMediaItem) {
    const { error } = await updateMediaItemAlt(item.id, altText);
    if (error) { setError(error); return; }
    setEditingAlt(null);
    load();
  }

  return (
    <>
      <AdminHeader title="Media Library" subtitle="Upload, organize, and manage all images across the site." />

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Folders sidebar */}
        <div className="w-full shrink-0 lg:w-52">
          <div className="rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Folders</p>
            <div className="space-y-1">
              <button type="button" onClick={() => setActiveFolder(null)} className={classNames('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors', !activeFolder ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:bg-neutral-100')}>
                <FolderIcon className="h-4 w-4" /> All Media
              </button>
              {folders.map((f) => (
                <button key={f.id} type="button" onClick={() => setActiveFolder(f.id)} className={classNames('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors', activeFolder === f.id ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:bg-neutral-100')}>
                  <FolderIcon className="h-4 w-4" /> {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main area */}
        <div className="min-w-0 flex-1">
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name…" className="input-field dark:bg-brand-navy-mid dark:border-white/10 pl-9" />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload Image'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} disabled={uploading} />
            </label>
          </div>

          {loading ? (
            <StateMessage type="loading" title="Loading…" message="Fetching media items." />
          ) : items.length === 0 ? (
            <StateMessage type="empty" title="No images found" message="Upload your first image to get started." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((item) => (
                <AdminCard key={item.id} className="group overflow-hidden p-0">
                  <div className="relative aspect-square overflow-hidden bg-neutral-100">
                    <img src={item.public_url} alt={item.alt_text ?? item.file_name} className="h-full w-full object-cover" loading="lazy" />
                    <button type="button" onClick={() => handleDelete(item)} className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-neutral-500 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    {editingAlt === item.id ? (
                      <div className="flex items-center gap-2">
                        <input className="input-field dark:bg-brand-navy-mid dark:border-white/10 flex-1 text-xs" value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Alt text…" autoFocus />
                        <button type="button" onClick={() => saveAlt(item)} className="rounded-md bg-brand-purple p-1.5 text-white"><Check className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setEditingAlt(null)} className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 dark:text-neutral-400"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-medium text-neutral-700" title={item.file_name}>{item.file_name}</p>
                        <button type="button" onClick={() => { setEditingAlt(item.id); setAltText(item.alt_text ?? ''); }} className="shrink-0 rounded p-1 text-neutral-400 hover:text-brand-purple"><Pencil className="h-3 w-3" /></button>
                      </div>
                    )}
                    {item.alt_text && editingAlt !== item.id && <p className="mt-0.5 truncate text-[10px] text-neutral-400 dark:text-neutral-500">{item.alt_text}</p>}
                    <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">{(item.size_bytes / 1024).toFixed(0)} KB</p>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
