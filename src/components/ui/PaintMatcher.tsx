import { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, X, ScanSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { matchPaintColor, type ColorMatchResult } from '@/lib/color-matcher';
import { fetchPaintColors } from '@/lib/queries';
import { track } from '@/lib/analytics';
import { normalizeHex } from '@/lib/colors';
import type { DbPaintColor } from '@/types/database';
import { classNames } from '@/lib/utils';

export function PaintMatcher() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'matching' | 'success' | 'error'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedHex, setExtractedHex] = useState<string | null>(null);
  const [matches, setMatches] = useState<ColorMatchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [colors, setColors] = useState<DbPaintColor[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load paint colors for matching
const mountedRef = useRef(true);
    useEffect(() => {
    async function loadColors() {
      const { data } = await fetchPaintColors({ pageSize: 500 });
      setColors(data);
    }
    loadColors();
  
    return () => { mountedRef.current = false; };
  }, []);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPG, PNG, or WebP)');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg(null);
    setPreview(URL.createObjectURL(file));

    track('paint_matcher_upload', { name: file.name });

    (async () => {
      try {
        setStatus('matching');
        const result = await matchPaintColor(file, colors);
        setExtractedHex(result.extractedHex);
        setMatches(result.matches);
        setStatus('success');
        track('paint_matcher_result', {
          extractedHex: result.extractedHex,
          topMatch: result.matches[0]?.color.name,
          similarity: result.matches[0]?.similarity,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze image');
        setStatus('error');
      }
    })();
  }

  function reset() {
    setStatus('idle');
    setPreview(null);
    setExtractedHex(null);
    setMatches([]);
    setErrorMsg(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-brand-purple to-brand-purple-light p-5 text-white">
        <div className="flex items-center gap-2">
          <ScanSearch className="h-5 w-5" />
          <h3 className="text-sm font-bold">AI Paint Matcher</h3>
        </div>
        <p className="mt-1 text-xs text-white/70">
          Upload a photo of a painted wall and we'll find the closest paint color from our library.
        </p>
      </div>

      <div className="p-5">
        {status === 'idle' && (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 py-10 transition-all hover:border-brand-purple/40 hover:bg-brand-purple/5 dark:border-neutral-700 dark:hover:border-brand-purple/40"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
              <Camera className="h-7 w-7" />
            </div>
            <p className="mt-3 text-sm font-semibold text-brand-navy dark:text-white">Take or upload a photo</p>
            <p className="mt-1 text-xs text-neutral-400">JPG, PNG, or WebP, drag & drop or tap</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {(status === 'loading' || status === 'matching') && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="relative">
              {preview && (
                <img src={preview} alt="Upload preview" className="h-32 w-32 rounded-xl object-cover opacity-50" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-brand-navy dark:text-white">
              {status === 'loading' ? 'Loading image...' : 'Finding closest paint colors...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-10">
            <X className="h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
            <button type="button" onClick={reset} className="mt-3 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              Try again
            </button>
          </div>
        )}

        {status === 'success' && preview && extractedHex && (
          <div>
            {/* Extracted color + preview */}
            <div className="mb-4 flex items-center gap-3">
              <img src={preview} alt="Your photo" className="h-16 w-16 rounded-lg object-cover" />
              <div className="flex items-center gap-2">
                <div
                  className="h-16 w-16 rounded-lg border-2 border-neutral-200"
                  style={{ backgroundColor: extractedHex }}
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Detected color</p>
                  <p className="text-sm font-bold text-brand-navy dark:text-white">{extractedHex}</p>
                </div>
              </div>
              <button type="button" onClick={reset} className="ml-auto rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Match results */}
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Closest paint colors ({matches.length})
            </p>
            <div className="space-y-2">
              {matches.map((match, i) => (
                <Link
                  key={match.color.id}
                  to={`/colors/paint/${match.color.slug}`}
                  className={classNames(
                    'flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-brand-purple/40 hover:bg-brand-purple/5',
                    i === 0 ? 'border-brand-purple/30 bg-brand-purple/5' : 'border-neutral-200 dark:border-neutral-700',
                  )}
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 dark:border-neutral-600"
                    style={{ backgroundColor: normalizeHex(match.color.hex_code) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-navy dark:text-white">{match.color.name}</p>
                    <p className="text-xs text-neutral-400">
                      {match.color.hex_code.toUpperCase()} · {match.similarity}% match
                    </p>
                  </div>
                  {i === 0 && (
                    <span className="rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-bold text-white">
                      BEST MATCH
                    </span>
                  )}
                  {/* Similarity bar */}
                  <div className="hidden w-16 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div
                        className={classNames(
                          'h-full rounded-full',
                          match.similarity > 80 ? 'bg-accent-green' : match.similarity > 60 ? 'bg-accent-yellow' : 'bg-neutral-400',
                        )}
                        style={{ width: `${match.similarity}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <button type="button" onClick={reset} className="mt-4 w-full rounded-lg border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-neutral-700 dark:text-neutral-300">
              Match another photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
