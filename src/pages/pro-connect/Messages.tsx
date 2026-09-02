import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';
import { getMyConversations, getMessages, sendMessage, markMessagesRead } from '@/lib/pro-connect';
import type { DbProConversation, DbProMessage } from '@/types/pro-connect';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<DbProConversation[]>([]);
  const [messages, setMessages] = useState<DbProMessage[]>([]);
  const [activeConvo, setActiveConvo] = useState<DbProConversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const convos = await getMyConversations();
      setConversations(convos);
      setLoading(false);

      if (conversationId) {
        const convo = convos.find((c) => c.id === conversationId);
        if (convo) {
          setActiveConvo(convo);
          loadMessages(conversationId);
        }
      }
    })();
  }, [user, conversationId]);

  useEffect(() => {
    // Realtime subscription for new messages
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pro_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as DbProMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Mark as read if not from me
        if (newMsg.sender_id !== user.id && !newMsg.is_read) {
          markMessagesRead(conversationId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  async function loadMessages(convoId: string) {
    setLoadingMessages(true);
    const msgs = await getMessages(convoId);
    setMessages(msgs);
    setLoadingMessages(false);
    await markMessagesRead(convoId);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async function handleSend() {
    if (!messageText.trim() || !activeConvo || !user) return;
    const body = messageText.trim();
    setMessageText('');
    const msg = await sendMessage(activeConvo.id, body) as { id: string; body: string; conversation_id: string } | null | false;
    if (msg) {
      // Trigger AI moderation with OpenAI
      try {
        await supabase.functions.invoke('moderate-pro-message', {
          body: {
            messageId: msg.id,
            content: msg.body,
            conversationId: msg.conversation_id,
            userId: user.id,
          },
        });
      } catch {
        // Moderation failure is silent — don't block the user experience
      }
    }
    // Refresh messages
    await loadMessages(activeConvo.id);
  }

  function getDisplayName(convo: DbProConversation): string {
    if (convo.professional) return convo.professional.display_name;
    return 'Conversation';
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">Sign in to view messages</h1>
        <Link to="/login?redirect=/messages" className="mt-4 inline-block text-brand-purple dark:text-brand-purple-lighter">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground dark:text-primary-foreground">Messages</h1>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversation list */}
        <div className={classNames(
          'rounded-xl border border-border bg-card dark:border-white/5 dark:bg-card',
          conversationId ? 'hidden lg:block' : 'block'
        )}>
          {loading ? (
            <div className="p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="mb-3 h-16 animate-pulse rounded-lg bg-muted dark:bg-white/5" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">No conversations yet.</p>
              <Link to="/pro-connect" className="mt-3 inline-block text-sm text-brand-purple dark:text-brand-purple-lighter">
                Browse professionals
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50 dark:divide-white/5">
              {conversations.map((convo) => (
                <Button variant="ghost"
                  key={convo.id}
                  onClick={() => navigate(`/messages/${convo.id}`)}
                  className={classNames(
                    'flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 dark:hover:bg-white/5',
                    conversationId === convo.id && 'bg-muted/50 dark:bg-white/5'
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter">
                    {getDisplayName(convo).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground dark:text-primary-foreground">
                      {getDisplayName(convo)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground dark:text-muted-foreground">
                      {convo.last_message_at ? new Date(convo.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No messages yet'}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation thread */}
        <div className={classNames(
          'flex flex-col rounded-xl border border-border bg-card dark:border-white/5 dark:bg-card',
          conversationId ? 'lg:col-span-2 block' : 'hidden lg:col-span-2 lg:flex'
        )}>
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border/50 p-4 dark:border-white/5">
                <Button variant="ghost" onClick={() => navigate('/messages')} className="lg:hidden">
                  <ArrowLeft aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
                </Button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter">
                  {getDisplayName(activeConvo).charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link to={`/pro-connect/${activeConvo.professional?.slug}`} className="text-sm font-medium text-foreground hover:text-brand-purple dark:text-primary-foreground">
                    {getDisplayName(activeConvo)}
                  </Link>
                  {activeConvo.project_context && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {(activeConvo.project_context as { service?: string }).service || 'Project inquiry'}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                {loadingMessages ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-muted dark:bg-white/5" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      const isRemoved = (msg as { is_removed?: boolean }).is_removed;
                      const isModeration = (msg as { message_type?: string }).message_type === 'moderation';
                      if (isModeration) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                              {msg.body}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={msg.id} className={classNames('flex', isMe ? 'justify-end' : 'justify-start')}>
                          <div className={classNames(
                            'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                            isRemoved
                              ? 'border border-red-200 bg-red-50 text-red-400 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
                              : isMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-card-foreground dark:bg-white/5 dark:text-muted-foreground/60'
                          )}>
                            <p>{isRemoved ? '⚠️ This message was removed by the moderator.' : msg.body}</p>
                            {!isRemoved && msg.attachment_url && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs underline">
                                <Paperclip className="h-3 w-3" />
                                Attachment
                              </a>
                            )}
                            <p className={classNames('mt-1 text-xs', isMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                              {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-border/50 p-4 dark:border-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
                  />
                  <Button variant="default"
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                    className="rounded-lg p-2.5 disabled:opacity-50"
                  >
                    <Send aria-hidden="true" className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="text-center">
                <p className="text-muted-foreground dark:text-muted-foreground">Select a conversation to view messages</p>
                <Link to="/pro-connect" className="mt-3 inline-block text-sm text-brand-purple dark:text-brand-purple-lighter">
                  Browse professionals
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
