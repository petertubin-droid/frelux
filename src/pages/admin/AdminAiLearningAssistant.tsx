import { useState } from 'react';
import { GraduationCap, Loader2, AlertCircle, Check, FileText, Search, HelpCircle, Image, ListOrdered, GitCompare, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminButton, AdminField } from '@/components/admin/AdminUi';
import { classNames } from '@/lib/utils';

type Action = 'generate_article' | 'expand_outline' | 'rewrite' | 'improve' | 'seo_optimize' | 'generate_faq' | 'generate_summary' | 'image_prompts' | 'alt_text' | 'tutorial_steps' | 'comparison';

const actions: { value: Action; label: string; icon: typeof GraduationCap; desc: string }[] = [
  { value: 'generate_article', label: 'Generate Article', icon: FileText, desc: 'Create a complete article from a topic' },
  { value: 'expand_outline', label: 'Expand Outline', icon: ListOrdered, desc: 'Turn an outline into a full guide' },
  { value: 'rewrite', label: 'Rewrite & Improve', icon: GraduationCap, desc: 'Improve clarity, grammar, and flow' },
  { value: 'improve', label: 'Improve Content', icon: Check, desc: 'Enhance readability and structure' },
  { value: 'seo_optimize', label: 'SEO Optimize', icon: Search, desc: 'Meta title, description, keywords, links' },
  { value: 'generate_faq', label: 'Generate FAQs', icon: HelpCircle, desc: 'Create FAQ items from a topic' },
  { value: 'generate_summary', label: 'Article Summary', icon: FileText, desc: 'Generate a concise excerpt' },
  { value: 'image_prompts', label: 'Image Prompts', icon: Image, desc: 'Generate AI image prompts' },
  { value: 'alt_text', label: 'Alt Text', icon: Image, desc: 'Generate image alt text' },
  { value: 'tutorial_steps', label: 'Tutorial Steps', icon: ListOrdered, desc: 'Generate step by step instructions' },
  { value: 'comparison', label: 'Comparison Article', icon: GitCompare, desc: 'Compare products or methods' },
];

export default function AdminAiLearningAssistant() {
  const [action, setAction] = useState<Action>('generate_article');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRun() {
    if (!topic.trim() && !content.trim()) {
      setError('Enter a topic or content to process.');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke<{ result?: string; error?: string; code?: string }>('ai-learn-assistant', {
        body: {
          action,
          topic: topic.trim() || undefined,
          content: content.trim() || undefined,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data) throw new Error('No response from AI service.');
      if (data.error) throw new Error(data.error);
      if (!data.result) throw new Error('Empty AI response.');

      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate content.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyResult() {
    await navigator.clipboard.writeText(result);
  }

  return (
    <>
      <AdminHeader title="AI Learning Assistant" subtitle="Generate, optimize, and manage educational content with AI." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Action selection + input */}
        <div className="lg:col-span-1">
          <AdminCard className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">AI Action</h2>
            <div className="space-y-2">
              {actions.map((a) => {
                const Icon = a.icon;
                const selected = action === a.value;
                return (
                  <button key={a.value} type="button" onClick={() => setAction(a.value)}
                    className={classNames('flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all', selected ? 'border-brand-purple bg-brand-purple/5 ring-1 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')}>
                    <Icon className={classNames('mt-0.5 h-4 w-4 shrink-0', selected ? 'text-brand-purple' : 'text-neutral-400')} />
                    <div>
                      <p className={classNames('text-sm font-semibold', selected ? 'text-brand-purple' : 'text-brand-navy dark:text-white')}>{a.label}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{a.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </AdminCard>
        </div>

        {/* Input + result */}
        <div className="space-y-6 lg:col-span-2">
          <AdminCard className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Input</h2>

            <AdminField label="Topic" hint="Enter a topic or title for the AI to work with">
              <input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How to prepare a wall for painting" />
            </AdminField>

            <AdminField label="Content" hint="Paste existing content to expand, rewrite, or optimize">
              <textarea className="input-field dark:bg-brand-navy-mid dark:border-white/10 font-mono text-sm" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste content here…" />
            </AdminField>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <AdminButton onClick={handleRun} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
              {loading ? 'Generating…' : 'Run AI'}
            </AdminButton>
          </AdminCard>

          {result && (
            <AdminCard className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Result</h2>
                <button type="button" onClick={handleCopyResult} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-brand-purple">
                  <Send className="h-3 w-3" /> Copy
                </button>
              </div>
              <div className="max-h-[500px] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-white/5 dark:border-white/5 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{result}</pre>
              </div>
            </AdminCard>
          )}
        </div>
      </div>
    </>
  );
}
