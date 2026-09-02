import { useState, type ReactNode } from "react";
import {
  Loader2,
  Save,
  Copy,
  Check,
  AlertCircle,
  Cpu,
  FileCode2,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/shadcn/button";

// =========================================================
// Prompt Input — shared natural language input with generate button
// =========================================================
export function PromptInput({
  label,
  placeholder,
  buttonText = "Generate",
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
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <textarea
        className="input-field font-mono text-sm"
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={loading}
      />
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          onClick={() => value.trim() && onGenerate(value.trim())}
          disabled={loading || !value.trim()}
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Cpu aria-hidden="true" className="h-4 w-4" />
          )}
          {loading ? "Generating…" : buttonText}
        </Button>
      </div>
    </div>
  );
}

// =========================================================
// Code Output — displays AI-generated code with copy/download
// =========================================================
export function CodeOutput({
  content,
  language = "typescript",
  title,
}: {
  content: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  function download() {
    const ext =
      language === "sql"
        ? "sql"
        : language === "json"
          ? "json"
          : language === "markdown"
            ? "md"
            : "tsx";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title ?? "artifact"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
        <div className="flex items-center gap-2">
          <FileCode2
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <span className="text-xs font-semibold text-foreground">
            {title ?? language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost"
            type="button"
            onClick={download}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            title="Download"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={copy}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            {copied ? (
              <Check
                aria-hidden="true"
                className="h-3.5 w-3.5 text-emerald-500"
              />
            ) : (
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      <pre className="max-h-[60vh] overflow-auto p-4 text-xs leading-relaxed text-foreground">
        <code>{content}</code>
      </pre>
    </div>
  );
}

// =========================================================
// AI Response — renders AI output (may contain markdown)
// =========================================================
export function AiResponseDisplay({
  content,
  loading,
  error,
}: {
  content: string | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-6">
        <Loader2
          aria-hidden="true"
          className="h-5 w-5 animate-spin text-primary"
        />
        <span className="text-sm text-muted-foreground">
          AI is generating your response…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <AlertCircle
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-destructive"
        />
        <div>
          <p className="text-sm font-semibold text-destructive">
            Generation failed
          </p>
          <p className="mt-1 text-xs text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
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
        if (seg.type === "code") {
          return (
            <CodeOutput
              key={i}
              content={seg.content}
              language={seg.lang}
              title={seg.lang}
            />
          );
        }
        return (
          <div
            key={i}
            className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
          >
            {seg.content}
          </div>
        );
      })}
    </div>
  );
}

export interface Segment {
  type: "text" | "code";
  content: string;
  lang: string;
}

export function parseMarkdown(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({
        type: "text",
        content: text.slice(lastIdx, match.index).trim(),
        lang: "",
      });
    }
    segments.push({
      type: "code",
      content: match[2],
      lang: match[1] ?? "typescript",
    });
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    const remaining = text.slice(lastIdx).trim();
    if (remaining)
      segments.push({ type: "text", content: remaining, lang: "" });
  }
  return segments;
}

// =========================================================
// Artifact Card — for listing saved artifacts
// =========================================================
export function ArtifactCard({
  title,
  type,
  status,
  updated,
  onClick,
  onDelete,
}: {
  title: string;
  type: string;
  status: string;
  updated: string;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    review: "bg-primary/15 text-primary",
    approved: "bg-secondary text-secondary-foreground",
    deployed:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-sm">
      <Button
        type="button"
        onClick={onClick}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <FileCode2
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {title}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{type}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                statusColors[status] ?? statusColors.draft,
              )}
            >
              {status}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(updated).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Button>
      {onDelete && (
        <Button
          type="button"
          onClick={onDelete}
          className="rounded-md p-2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// =========================================================
// Collapsible section
// =========================================================
export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card">
      <Button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open ? (
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
        ) : (
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
        )}
      </Button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}

// =========================================================
// Save bar — for saving artifacts
// =========================================================
export function SaveBar({
  onSave,
  saving,
  saved,
  label = "Save as artifact",
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="h-4 w-4" />
        )}
        {saving ? "Saving…" : label}
      </Button>
      {saved && (
        <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
          <Check aria-hidden="true" className="h-4 w-4" /> Saved
        </span>
      )}
    </div>
  );
}

// =========================================================
// ToolHeader — consistent header for each tool page
// =========================================================
export function ToolHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Cpu;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// =========================================================
// ChatMessage — for chat display
// =========================================================
export function ChatMessage({
  role,
  content,
}: {
  role: "user" | "assistant" | "system";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? "U" : "AI"}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-xl p-4",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        ) : (
          <div className="text-sm">
            <RenderedContent content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
