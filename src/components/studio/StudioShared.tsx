import { useState, type ReactNode } from 'react';
import { Loader2, Save, Copy, Check, AlertCircle, Cpu, FileCode2, Trash2, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { classNames } from '@/lib/utils';

// =========================================================
// Prompt Input — shared natural language input with generate button
// =========================================================
export function PromptInput({
  label,
  placeholder,
  buttonText = 'Generate',
  loading,
  onGenerate,
  defaultValue,
  rows = 4,
}: {
  label?: string;
  placeholder: string;
  buttonText?: string;
  loading: boolean;
  onGenerate: (prompt: string) => void;
  defaultValue?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue ?? '');

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-neutral-700 mb-1.5">{label}</label>}
      <textarea
        className="input-field font-mono text-sm"
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={loading}
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => value.trim() && onGenerate(value.trim())}
          disabled={loading || !value.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-purple-dark active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
          {loading ? 'Generating…' : buttonText}
        </button>
      </div>
    </div>
  );
}

// =========================================================
// Code Output — displays AI-generated code with copy/download
// =========================================================
export function CodeOutput({ content, language = 'typescript', title }: { content: string; language?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  function download() {
    const ext = language === 'sql' ? 'sql' : language === 'json' ? 'json' : language === 'markdown' ? 'md' : 'tsx';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title ?? 'artifact'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-600">{title ?? language}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={download} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600" title="Download">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={copy} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-accent-green" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <pre className="max-h-[60vh] overflow-auto p-4 text-xs leading-relaxed text-neutral-800"><code>{content}</code></pre>
    </div>
  );
}

// =========================================================
// AI Response — renders AI output (may contain markdown)
// =========================================================
export function AiResponseDisplay({ content, loading, error }: { content: string | null; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
        <span className="text-sm text-neutral-500">AI is generating your response…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
        <div>
          <p className="text-sm font-semibold text-red-700">Generation failed</p>
          <p className="mt-1 text-xs text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="prose prose-sm max-w-none">
        <RenderedContent content={content} />
      </div>
    </div>
  );
}

// =========================================================
// RenderedContent — lightweight markdown code block extraction
// =========================================================
export function RenderedContent({ content }: { content: string }) {
  const segments = parseMarkdown(content);
  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          return <CodeOutput key={i} content={seg.content} language={seg.lang} title={seg.lang} />;
        }
        return (
          <div key={i} className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">{seg.content}</div>
        );
      })}
    </div>
  );
}

interface Segment { type: 'text' | 'code'; content: string; lang: string }

function parseMarkdown(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: 'text', content: text.slice(lastIdx, match.index).trim(), lang: '' });
    }
    segments.push({ type: 'code', content: match[2], lang: match[1] ?? 'typescript' });
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    const remaining = text.slice(lastIdx).trim();
    if (remaining) segments.push({ type: 'text', content: remaining, lang: '' });
  }
  return segments;
}

// =========================================================
// Artifact Card — for listing saved artifacts
// =========================================================
export function ArtifactCard({ title, type, status, updated, onClick, onDelete }: {
  title: string;
  type: string;
  status: string;
  updated: string;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-600',
    review: 'bg-accent-orange/15 text-accent-orange',
    approved: 'bg-accent-blue/15 text-accent-blue',
    deployed: 'bg-accent-green/15 text-accent-green',
    rejected: 'bg-red-100 text-red-600',
  };
  return (
    <div className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:border-brand-purple hover:shadow-sm">
      <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-3 text-left">
        <FileCode2 className="h-5 w-5 shrink-0 text-neutral-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-brand-navy">{title}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-neutral-400">{type}</span>
            <span className={classNames('rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize', statusColors[status] ?? statusColors.draft)}>{status}</span>
            <span className="text-xs text-neutral-400">{new Date(updated).toLocaleDateString()}</span>
          </div>
        </div>
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="rounded-md p-2 text-neutral-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// =========================================================
// Collapsible section
// =========================================================
export function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4">
        <span className="text-sm font-semibold text-brand-navy">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
      </button>
      {open && <div className="border-t border-neutral-200 p-4">{children}</div>}
    </div>
  );
}

// =========================================================
// Save bar — for saving artifacts
// =========================================================
export function SaveBar({ onSave, saving, saved, label = 'Save as artifact' }: { onSave: () => void; saving: boolean; saved: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 transition-all hover:bg-neutral-50 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Saving…' : label}
      </button>
      {saved && <span className="flex items-center gap-1 text-sm text-accent-green"><Check className="h-4 w-4" /> Saved</span>}
    </div>
  );
}

// =========================================================
// ToolHeader — consistent header for each tool page
// =========================================================
export function ToolHeader({ icon: Icon, title, description }: { icon: typeof Cpu; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-brand-navy">{title}</h1>
        <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

// =========================================================
// ChatMessage — for chat display
// =========================================================
export function ChatMessage({ role, content }: { role: 'user' | 'assistant' | 'system'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={classNames('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={classNames('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', isUser ? 'bg-brand-purple text-white' : 'bg-neutral-200 text-neutral-600')}>
        {isUser ? 'U' : 'AI'}
      </div>
      <div className={classNames('max-w-[80%] rounded-xl p-4', isUser ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-800')}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm">
            <RenderedContent content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
