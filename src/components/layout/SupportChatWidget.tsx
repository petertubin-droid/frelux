import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Minus, Loader2, MessageCircle, ChevronRight, Phone } from 'lucide-react';
// import { siteConfig } from '@/config/site';
import { whatsappUrl } from '@/lib/analytics';
import { supabase, getFunctionErrorMessage } from '@/lib/supabase';
import { getClientId } from '@/lib/ai-access';
import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

interface ChatMessage {
  id: number;
  from: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const SUGGESTED_QUESTIONS = [
  'How much paint do I need for a 12×12 room?',
  'How do I prepare my wall for painting?',
  'What\'s the difference between POP and screeding?',
  'Which paint finish is best for a bathroom?',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 0,
  from: 'assistant',
  text: `Hi! I'm the FRELUX AI assistant. Ask me anything about paint quantities, POP ceiling, tiling, colors, or surface prep — I'll give you a practical answer right away.`,
  timestamp: Date.now(),
};

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, minimized, messages, loading]);

  useEffect(() => {
    if (open && !minimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, minimized]);

  const handleSend = useCallback(async (question?: string) => {
    const q = (question ?? draft).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      from: 'user',
      text: q,
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setDraft('');
    setLoading(true);
    setHasInteracted(true);
    setHasError(false);

    try {
      const clientId = getClientId();
      const { data, error: fnError } = await supabase.functions.invoke<{
        result?: string;
        error?: string;
      }>('ai-livechat', {
        body: { question: q, clientId },
      });

      if (fnError) throw new Error(await getFunctionErrorMessage(fnError));
      if (!data) throw new Error('No response from AI.');

      const responseText = data.result || data.error || 'Sorry, I couldn\'t answer that right now. Try asking in a different way.';
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        from: 'assistant',
        text: responseText,
        timestamp: Date.now(),
      }]);
    } catch {
      setHasError(true);
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        from: 'assistant',
        text: 'I\'m having trouble right now. For immediate help, please reach us on WhatsApp — we typically reply within minutes.',
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [draft, loading]);

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <>
      {/* Floating button — uses a proper icon, not an image */}
      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-brand-purple/30 transition-transform hover:scale-105 active:scale-95 sm:bottom-4 sm:right-4"
          aria-label="Open support chat"
        >
          <MessageCircle className="h-7 w-7" strokeWidth={1.8} />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent-green ring-2 ring-white" />
          </span>
        </Button>
      )}

      {open && (
        <div
          className={
            minimized
              ? 'fixed bottom-20 right-4 z-50 sm:bottom-4 sm:right-4'
              : 'fixed bottom-20 left-1/2 z-50 flex h-[min(72vh,560px)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl dark:border-white/5 dark:bg-card sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0'
          }
        >
          {minimized ? (
            <Button
              type="button"
              onClick={() => setMinimized(false)}
              className="inline-flex items-center gap-2 rounded-full bg-primary pl-3 pr-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
              Chat with FRELUX AI
            </Button>
          ) : (
            <>
              {/* Header — avatar image only shown here, inside the chat */}
              <div className="flex items-center justify-between bg-gradient-to-r from-primary to-primary-dark px-4 py-3 text-primary-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/20">
                    <img
                      src="/assets/chat-assistant-avatar.jpg"
                      alt="FRELUX AI Assistant"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">FRELUX AI Assistant</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                      <p className="text-[11px] text-primary-foreground/70">Online · answers instantly</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" onClick={() => setMinimized(true)} className="rounded p-1.5 hover:bg-white/10" aria-label="Minimize chat">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button type="button" onClick={() => setOpen(false)} className="rounded p-1.5 hover:bg-white/10" aria-label="Close chat">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-muted/50 p-4 dark:bg-background"
                role="log"
                aria-live="polite"
              >
                {messages.map((m) => (
                  <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className="max-w-[85%]">
                      <div
                        className={
                          m.from === 'user'
                            ? 'break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground'
                            : 'break-words rounded-2xl rounded-bl-md bg-card px-3.5 py-2 text-sm text-card-foreground shadow-sm border border-border/50 dark:bg-white/10 dark:text-muted-foreground/60 dark:border-white/5'
                        }
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      </div>
                      <p className={classNames('mt-1 px-1 text-[10px] text-muted-foreground/80 dark:text-muted-foreground', m.from === 'user' ? 'text-right' : 'text-left')}>
                        {formatTime(m.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-card px-4 py-3 shadow-sm border border-border/50 dark:bg-white/10 dark:border-white/5">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted dark:bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted dark:bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted dark:bg-muted-foreground" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested questions (before first interaction) */}
                {!hasInteracted && !loading && (
                  <div className="pt-2">
                    <p className="mb-2 px-1 text-[11px] font-medium text-muted-foreground dark:text-muted-foreground">
                      Try asking:
                    </p>
                    <div className="space-y-1.5">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <Button
                          key={q}
                          type="button"
                          onClick={() => handleSend(q)}
                          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-all hover:border-brand-purple/30 hover:bg-primary/5 hover:text-brand-purple dark:border-white/5 dark:bg-white/5 dark:text-muted-foreground/80 dark:hover:border-brand-purple/30 dark:hover:text-brand-purple-lighter"
                        >
                          {q}
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/80 dark:text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp fallback bar — only shown when the AI chat has errored */}
              {hasError && (
                <div className="border-t border-border/50 bg-card px-4 py-2 dark:border-white/5 dark:bg-card">
                  <a
                    href={whatsappUrl('Hello FRELUX, I need help with my paint project.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-green hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Still need help? Chat on WhatsApp →
                  </a>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2 border-t border-border/50 bg-card p-3 dark:border-white/5 dark:bg-card"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask about paint, tiles, POP, colors…"
                  aria-label="Type a message"
                  disabled={loading}
                  className="flex-1 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-purple disabled:opacity-50 dark:border-white/5 dark:bg-white/5 dark:text-muted-foreground/60"
                />
                <Button size="icon" variant="default"
                  type="submit"
                  disabled={!draft.trim() || loading}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
                  aria-label="Send message"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
