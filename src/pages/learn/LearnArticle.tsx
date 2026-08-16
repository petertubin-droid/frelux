import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Clock, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import type { DbLearnArticle } from '@/types/database';

type Status = 'loading' | 'ready' | 'error' | 'notfound';

export default function LearnArticle() {
  const { articleSlug } = useParams<{ articleSlug: string }>();

  const [article, setArticle] = useState<DbLearnArticle | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useSeo({
    title: article ? article.meta_title ?? article.title : 'Article',
    description: article?.meta_description ?? article?.excerpt ?? 'FRELUX educational article.',
    canonicalPath: `/learn/${articleSlug}`,
    ogType: 'article',
    ogImage: article?.cover_image_url ?? undefined,
    structuredData: article ? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.meta_description ?? article.excerpt ?? '',
      author: article.author ? { '@type': 'Person', name: article.author } : undefined,
      datePublished: article.published_at ?? article.created_at,
      image: article.cover_image_url ?? undefined,
    } : undefined,
  });

  useEffect(() => {
    if (!articleSlug) return;
    async function load() {
      setStatus('loading');
      const { data, error } = await supabase
        .from('learn_articles')
        .select('*')
        .eq('slug', articleSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) { setStatus('error'); return; }
      if (!data) { setStatus('notfound'); return; }
      setArticle(data as DbLearnArticle);
      setStatus('ready');
    }
    load();
  }, [articleSlug]);

  if (status === 'loading')
    return <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;

  if (status === 'notfound')
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-3 text-sm text-neutral-500">This article doesn't exist or hasn't been published yet.</p>
        <Link to="/learn" className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline">Back to Learn</Link>
      </div>
    );

  if (status === 'error' || !article)
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm text-red-600">Failed to load the article.</p>
      </div>
    );

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-400">
        <Link to="/learn" className="hover:text-brand-purple">Learn</Link>
        <span>/</span>
        <Link to={`/learn/category/${article.category_slug}`} className="capitalize hover:text-brand-purple">{article.category_slug.replace(/-/g, ' ')}</Link>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-brand-navy sm:text-4xl">{article.title}</h1>
        {article.excerpt && <p className="mt-3 text-lg leading-relaxed text-neutral-500">{article.excerpt}</p>}
        <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
          {article.author && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {article.author}</span>}
          {article.read_time_minutes && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {article.read_time_minutes} min read</span>}
          {article.published_at && <span>{new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
        </div>
      </header>

      {/* Cover image */}
      {article.cover_image_url && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img src={article.cover_image_url} alt={article.title} className="w-full object-cover" loading="lazy" />
        </div>
      )}

      {/* Content */}
      <div className="prose prose-sm max-w-none sm:prose-base">
        <RenderedMarkdown content={article.content} />
      </div>

      {/* Footer */}
      <div className="mt-12 border-t border-neutral-200 pt-6">
        <Link to={`/learn/category/${article.category_slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to {article.category_slug.replace(/-/g, ' ')}
        </Link>
      </div>
    </article>
  );
}

// Lightweight markdown renderer — handles headings, paragraphs, lists, code blocks, bold
function RenderedMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={key++} className="overflow-auto rounded-lg bg-neutral-900 p-4 text-sm text-neutral-100">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="mt-6 text-lg font-bold text-brand-navy">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="mt-8 text-xl font-bold text-brand-navy">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} className="mt-8 text-2xl font-bold text-brand-navy">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // List items — collect consecutive
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="mt-3 space-y-1.5 pl-6">
          {items.map((item, idx) => <li key={idx} className="text-sm leading-relaxed text-neutral-700 list-disc">{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    } else if (line.trim() === '') {
      // Skip empty lines
    } else {
      elements.push(<p key={key++} className="mt-3 text-sm leading-relaxed text-neutral-700 sm:text-base">{renderInline(line)}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Handle bold **text** and links [text](url)
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-brand-navy">{part.slice(2, -2)}</strong>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} className="font-semibold text-brand-purple hover:underline" target="_blank" rel="noopener noreferrer">{linkMatch[1]}</a>;
    }
    return <span key={i}>{part}</span>;
  });
}
