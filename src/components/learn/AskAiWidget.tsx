import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, AlertCircle, X } from 'lucide-react';
import { supabase, getFunctionErrorMessage } from '@/lib/supabase';
import { getClientId } from '@/lib/ai-access';
import { classNames } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'How do I prepare a wall for painting?',
  'What\'s the difference between POP cement and gypsum board?',
  'How many tiles do I need for a 3×4m room?',
  'Which paint finish is best for a bathroom?',
];

export default function AskAiWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleAsk(question?: string) {
    const q = question ?? input.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const clientId = getClientId();
      const { data, error: fnError } = await supabase.functions.invoke<{ result?: string; error?: string; code?: string }>('ai-learn-assistant', {
        body: { action: 'ask', question: q, clientId },
      });

      if (fnError) throw new Error(await getFunctionErrorMessage(fnError));
      if (!data) throw new Error('No response from AI.');
      if (data.error) throw new Error(data.error);

      const assistantMsg: ChatMessage = { role: 'assistant', content: data.result ?? 'I couldn\'t generate a response. Please try again.' };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to get a response.';
      setError(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t answer that right now. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-brand-purple px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-purple/90 hover:shadow-xl"
      >
        <MessageSquare className="h-5 w-5" />
        Ask AI
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-30 flex h-[500px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 bg-brand-navy px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <MessageSquare className="h-4 w-4 text-accent-green" />
          <span className="text-sm font-semibold">Ask AI Assistant</span>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageSquare className="h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Ask me anything about painting</p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">POP ceiling, tiles, colors, and more</p>
            <div className="mt-4 w-full space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => handleAsk(q)}
                  className="w-full rounded-lg border border-neutral-200 dark:border-white/5 px-3 py-2 text-left text-xs text-neutral-600 dark:text-neutral-300 transition-colors hover:border-brand-purple/30 hover:text-brand-purple">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={classNames('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={classNames(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user' ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-700 dark:text-neutral-200'
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-neutral-100 px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-400 dark:text-neutral-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 dark:border-white/5 p-3">
        {error && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" /> {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            placeholder="Ask a question…"
            className="input-field flex-1 text-sm"
            disabled={loading}
          />
          <button type="button" onClick={() => handleAsk()} disabled={loading || !input.trim()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-purple text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
