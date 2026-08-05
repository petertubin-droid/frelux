import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Minus } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { whatsappUrl } from '@/lib/analytics';

// Phase 1: UI shell only. No real chat provider is connected yet.
// Replace `handleSend` with a real provider (e.g. Crisp, Tawk.to, Intercom)
// in a later phase. The structure here mirrors a typical chat SDK flow.
type ChatMessage = { id: number; from: 'user' | 'support'; text: string };

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: 'support',
      text: `Hi! Welcome to ${siteConfig.shortName}. How can we help with your paint project today?`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, minimized, messages]);

  function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { id: Date.now(), from: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setDraft('');
    setSending(true);
    // No live agent yet — set an honest fallback message.
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          from: 'support',
          text:
            'Thanks for reaching out. Live chat isn’t connected yet — for a quick reply, message us on WhatsApp and we’ll respond shortly.',
        },
      ]);
      setSending(false);
    }, 700);
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-purple text-white shadow-lg shadow-brand-purple/30 transition-transform hover:scale-105 active:scale-95 sm:bottom-4 sm:right-4"
          aria-label="Open support chat"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-accent-green ring-2 ring-white" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className={
            minimized
              ? 'fixed bottom-20 right-4 z-40 sm:bottom-4 sm:right-4'
              : 'fixed bottom-20 left-1/2 z-40 flex h-[min(70vh,520px)] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0'
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
              {/* Header */}
              <div className="flex items-center justify-between rounded-t-2xl bg-brand-purple px-4 py-3 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent-green ring-2 ring-brand-purple" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">FRELUX Support</p>
                    <p className="text-[11px] text-white/70">We'll get back to you</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMinimized(true)}
                    className="rounded p-1.5 hover:bg-white/10"
                    aria-label="Minimize chat"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded p-1.5 hover:bg-white/10"
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-neutral-50 p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={
                        m.from === 'user'
                          ? 'max-w-[80%] break-words rounded-2xl rounded-br-md bg-brand-purple px-3.5 py-2 text-sm text-white'
                          : 'max-w-[80%] break-words rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-neutral-700 shadow-sm border border-neutral-100'
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm text-neutral-400 shadow-sm border border-neutral-100">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp shortcut */}
              <div className="border-t border-neutral-100 bg-white px-4 pt-2.5">
                <a
                  href={whatsappUrl('Hello FRELUX, I need help with my paint project.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-green hover:underline"
                >
                  Prefer WhatsApp? Chat with us →
                </a>
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 rounded-b-2xl bg-white p-3"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-purple"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
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
