import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-muted px-1.5 py-0.5 text-[.9em]">{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      try {
        const url = new URL(link[2], window.location.origin);
        if (["http:", "https:"].includes(url.protocol)) return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-purple underline underline-offset-2">{link[1]}</a>;
      } catch { /* Unsafe or malformed links render as plain text. */ }
      return <span key={index}>{link[1]}</span>;
    }
    return <span key={index}>{part}</span>;
  });
}

/** Small safe Markdown renderer for reviewed editorial content. Raw HTML is never interpreted. */
export default function SafeMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  const flushParagraph = () => { if (paragraph.length) { nodes.push(<p key={`p-${nodes.length}`} className="my-4 leading-8">{inline(paragraph.join(" "))}</p>); paragraph = []; } };
  const flushList = () => { if (list.length) { nodes.push(<ul key={`ul-${nodes.length}`} className="my-4 list-disc space-y-2 pl-6">{list.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>); list = []; } };
  for (const line of lines) {
    if (line.trim().startsWith("```")) { flushParagraph(); flushList(); code = code === null ? [] : null; continue; }
    if (code !== null) { code.push(line); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (heading) { flushParagraph(); flushList(); const Tag = `h${heading[1].length}` as "h1" | "h2" | "h3"; nodes.push(<Tag key={`h-${nodes.length}`} className="mb-3 mt-8 font-display text-2xl font-bold">{inline(heading[2])}</Tag>); }
    else if (bullet) { flushParagraph(); list.push(bullet[1]); }
    else if (quote) { flushParagraph(); flushList(); nodes.push(<blockquote key={`q-${nodes.length}`} className="my-5 border-l-2 border-primary/50 pl-4 italic text-muted-foreground">{inline(quote[1])}</blockquote>); }
    else if (!line.trim()) { flushParagraph(); flushList(); }
    else { flushList(); paragraph.push(line.trim()); }
  }
  flushParagraph(); flushList();
  if (code !== null) nodes.push(<pre key="code" className="my-5 overflow-x-auto rounded-xl bg-muted p-4 text-sm"><code>{code.join("\n")}</code></pre>);
  return <div className="break-words text-[15px] text-foreground">{nodes}</div>;
}
