import React from "react";
import { ArticleInsertBlock } from "@/components/learn/ArticleInserts";
import { slugifyHeading } from "@/lib/learn/heading-slug";
import type { DbLearnArticleInsert } from "@/types/database";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-semibold text-foreground dark:text-primary-foreground"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const isExternal = linkMatch[2].startsWith("http");
      return (
        <a
          key={i}
          href={linkMatch[2]}
          className="font-medium text-brand-purple hover:underline"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderTable(lines: string[], key: number): React.ReactNode {
  if (lines.length < 2) return null;
  const parseRow = (line: string) =>
    line
      .split("|")
      .filter((c) => c.trim() !== "")
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div
      key={key}
      className="mt-6 overflow-hidden overflow-x-auto rounded-xl border border-border dark:border-white/10"
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/50 dark:bg-white/5">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-5 py-3 text-left font-semibold text-foreground dark:text-primary-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-t border-border transition-colors hover:bg-muted/50 dark:border-white/10 dark:hover:bg-white/5"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-5 py-3 text-card-foreground dark:text-muted-foreground/80"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Enhanced markdown renderer with heading IDs for TOC navigation.
 * Shared by the Learn article page and the market wall-finishing article
 * page so both render with identical premium prose markup.
 */
export function ArticleMarkdown({
  content,
  insertsByHeading,
}: {
  content: string;
  insertsByHeading?: Record<string, DbLearnArticleInsert[]>;
}) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  // In-article inserts placed right after their target heading
  const pushHeadingInserts = (headingId: string) => {
    const inserts = insertsByHeading?.[headingId];
    if (inserts && inserts.length > 0) {
      inserts.forEach((ins) => {
        elements.push(
          <ArticleInsertBlock key={`ins-${ins.id}`} insert={ins} />,
        );
      });
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={key++}
          className="overflow-auto rounded-xl bg-background p-5 text-sm text-muted-foreground/40"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Headings, with IDs for TOC navigation
    if (line.startsWith("### ")) {
      const text = line.slice(4);
      const id = slugifyHeading(text);
      elements.push(
        <h3
          key={key++}
          id={id}
          className="mt-8 text-lg font-semibold text-foreground dark:text-primary-foreground"
        >
          {renderInline(text)}
        </h3>,
      );
      pushHeadingInserts(id);
    } else if (line.startsWith("## ")) {
      const text = line.slice(3);
      const id = slugifyHeading(text);
      elements.push(
        <h2
          key={key++}
          id={id}
          className="mt-12 scroll-mt-20 font-display text-2xl font-bold text-foreground dark:text-primary-foreground"
        >
          {renderInline(text)}
        </h2>,
      );
      pushHeadingInserts(id);
    } else if (line.startsWith("# ")) {
      const text = line.slice(2);
      const id = slugifyHeading(text);
      elements.push(
        <h1
          key={key++}
          id={id}
          className="mt-12 scroll-mt-20 font-display text-3xl font-bold text-foreground dark:text-primary-foreground"
        >
          {renderInline(text)}
        </h1>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("* "))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="mt-5 space-y-2 pl-6">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="text-base leading-relaxed text-card-foreground list-disc marker:text-brand-purple/50 dark:text-muted-foreground/80"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.startsWith("| ")) {
      // Simple table support
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, key++));
      continue;
    } else if (line.trim() === "") {
      // Skip empty lines
    } else {
      elements.push(
        <p
          key={key++}
          className="mt-5 text-base leading-[1.75] text-card-foreground dark:text-muted-foreground/80"
        >
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }

  return <>{elements}</>;
}
