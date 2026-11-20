import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { supabase } from "@/lib/supabase";
import {
  INQUIRY_MESSAGE_MAX,
  getInquiryMessages,
  markInquiryMessagesRead,
  sendInquiryMessage,
  type InquiryThreadMessage,
} from "@/lib/marketplace-inquiry-thread";
import { classNames } from "@/lib/utils";

/**
 * The buyer/seller thread on one marketplace inquiry.
 *
 * Rendered by both sides: the seller from the dashboard's inquiry list, the
 * buyer under the product they asked about. The database decides who may read
 * and write; this component only shows what came back, and says so when a send
 * is refused rather than leaving the typed text looking delivered.
 */
export default function InquiryThread({
  inquiryId,
  viewerId,
  className,
}: {
  inquiryId: string;
  viewerId: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<InquiryThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const rows = await getInquiryMessages(inquiryId);
    setMessages(rows);
    setLoading(false);
    await markInquiryMessagesRead(inquiryId);
    setTimeout(() => endRef.current?.scrollIntoView({ block: "nearest" }), 60);
  }, [inquiryId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates, so a reply appears without a refresh. A channel that fails to
  // connect never blocks sending: the send path reloads the thread itself.
  useEffect(() => {
    const channel = supabase
      .channel(`inquiry:${inquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_inquiry_messages",
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          const incoming = payload.new as InquiryThreadMessage;
          setMessages((current) =>
            current.some((m) => m.id === incoming.id)
              ? current
              : [...current, incoming],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [inquiryId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const result = await sendInquiryMessage(inquiryId, text);
    setSending(false);
    if (!result.ok) {
      setError(
        result.reason === "too-long"
          ? `Keep the message under ${INQUIRY_MESSAGE_MAX} characters.`
          : result.reason === "not-signed-in"
            ? "Sign in again to reply."
            : "The message was not sent. Check your connection and try again.",
      );
      return; // keep the typed text so it is not lost
    }
    setText("");
    await load();
  }

  return (
    <div
      className={classNames(
        "flex flex-col rounded-xl border border-border bg-card dark:border-white/10 dark:bg-background",
        className,
      )}
      data-testid="inquiry-thread"
      data-inquiry-id={inquiryId}
    >
      <div className="max-h-72 flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading messages
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No replies yet. Ask a question and the seller will answer here.
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === viewerId;
            return (
              <div
                key={msg.id}
                className={classNames(
                  "flex",
                  mine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={classNames(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-card-foreground dark:bg-white/5 dark:text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={classNames(
                      "mt-1 text-[11px]",
                      mine
                        ? "text-primary-foreground/60"
                        : "text-muted-foreground",
                    )}
                  >
                    {new Date(msg.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {error ? (
        <p role="alert" className="px-3 pb-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 border-t border-border/60 p-3 dark:border-white/10">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a reply…"
          aria-label="Reply to this inquiry"
          maxLength={INQUIRY_MESSAGE_MAX}
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          aria-label="Send reply"
          className="rounded-lg p-2.5"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
