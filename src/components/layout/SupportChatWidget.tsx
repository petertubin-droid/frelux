import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minus } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { whatsappUrl } from '@/lib/analytics';

type ChatMessage = { id: number; from: 'user' | 'support'; text: string };

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: 'support',
      text: `Hi! Welcome to ${siteConfig.shortName}. For the fastest response, chat with us on WhatsApp using the link below.`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, minimized, messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: Date.now(), from: 'user', text }]);
    setDraft('');
    // Respond with a helpful redirect
    setTimeout(() => {
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        from: 'support',
        text: 'Thanks for your message! For a quick response, please reach us on WhatsApp using the link below. We typically reply within minutes during business hours.',
      }]);
    }, 500);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-purple text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-4 sm:right-4"
          aria-label="Open support chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div
          className={
            minimized
              ? 'fixed bottom-20 right-4 z-40 sm:bottom-4 sm:right-4'
              : 'fixed bottom-20 left-1/2 z-40 flex h-[min(70vh,520px)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/5 dark:bg-brand-navy-mid sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0'
          }
        >
          {minimized ? (
            <button
              type="button"
              onClick={() => setMinimized(false)}
              className="inline-flex items-center gap-2 rounded-full bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
            >
              <MessageSquare className="h-4 w-4" />
              Chat with support
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-t-2xl bg-brand-purple px-4 py-3 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">FRELUX Support</p>
                    <p className="text-[11px] text-white/70">We typically reply within minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setMinimized(true)} className="rounded p-1.5 hover:bg-white/10" aria-label="Minimize chat">
                    <Minus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="rounded p-1.5 hover:bg-white/10" aria-label="Close chat">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-neutral-50 dark:bg-brand-navy p-4" role="log" aria-live="polite">
                {messages.map((m) => (
                  <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        m.from === 'user'
                          ? 'max-w-[80%] break-words rounded-2xl rounded-br-md bg-brand-purple px-3.5 py-2 text-sm text-white'
                          : 'max-w-[80%] break-words rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-neutral-700 shadow-sm border border-neutral-100 dark:bg-white/10 dark:text-neutral-200 dark:border-white/5'
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-100 bg-white px-4 pt-2.5 dark:border-white/5 dark:bg-brand-navy-mid">
                <a
                  href={whatsappUrl('Hello FRELUX, I need help with my paint project.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-green hover:underline"
                >
                  Chat with us on WhatsApp →
                </a>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2 rounded-b-2xl bg-white p-3 dark:bg-brand-navy-mid"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  aria-label="Type a message"
                  className="flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-white/5 dark:bg-white/5 dark:text-neutral-200"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-purple text-white transition-opacity disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
