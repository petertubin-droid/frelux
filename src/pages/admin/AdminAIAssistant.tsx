import { useState, useEffect, useRef, useCallback } from "react";
import {
  Crown,
  Send,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
  Settings,
  MessageSquare,
  Key,
  History,
  Bug,
  Zap,
  Wrench,
  FileText,
  Code,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { supabase, getFunctionErrorMessage } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";

// =========================================================
// Types
// =========================================================
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AiAction {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  status: string;
  resolution: string | null;
  conversation_id: string | null;
}

type Tab = "chat" | "history" | "settings";

// =========================================================
// Quick issue templates
// =========================================================
const QUICK_TEMPLATES = [
  {
    icon: Bug,
    label: "Report a Bug",
    category: "bug",
    prompt: "I found a bug on my website: ",
  },
  {
    icon: Wrench,
    label: "Request a Fix",
    category: "bug",
    prompt: "I need you to fix this issue: ",
  },
  {
    icon: Code,
    label: "Code Change",
    category: "config",
    prompt: "I need a code change: ",
  },
  {
    icon: FileText,
    label: "Content Update",
    category: "content_update",
    prompt: "I need content updated: ",
  },
  {
    icon: Zap,
    label: "Feature Request",
    category: "feature_request",
    prompt: "I want to add a new feature: ",
  },
  {
    icon: Key,
    label: "API Change",
    category: "api_change",
    prompt: "I need to change an API configuration: ",
  },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  closed:
    "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
  failed: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const AGENT_CHAT_URL =
  "https://app.base44.com/superagent/6a872e1df3b5e9fc45fc13fb";
const BASE44_URL = "https://app.base44.com";

export default function AdminAIAssistant() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [needsConfig, setNeedsConfig] = useState(false);
  const [actions, setActions] = useState<AiAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key on mount
  useEffect(() => {
    loadApiKey();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadApiKey() {
    const { data } = await supabase
      .from("site_settings")
      .select("solas_api_key, solas_chat_url")
      .limit(1)
      .single();
    if (data?.solas_api_key) {
      setApiKey(data.solas_api_key);
      setNeedsConfig(false);
    } else {
      setNeedsConfig(true);
    }
  }

  async function loadActions() {
    setActionsLoading(true);
    const { data } = await supabase
      .from("admin_ai_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setActions(data || []);
    setActionsLoading(false);
  }

  // Load actions when switching to history tab
  useEffect(() => {
    if (tab === "history") loadActions();
  }, [tab]);

  async function saveApiKey() {
    setApiKeySaving(true);
    setApiKeySaved(false);
    const { error } = await supabase
      .from("site_settings")
      .update({ solas_api_key: apiKey.trim() })
      .eq("id", 1);
    setApiKeySaving(false);
    if (!error) {
      setApiKeySaved(true);
      setNeedsConfig(false);
      setTimeout(() => setApiKeySaved(false), 3000);
    }
  }

  async function handleSend(templatePrompt?: string) {
    const messageText = (templatePrompt ?? input).trim();
    if (!messageText || sending) return;

    setError("");
    const userMessage: ChatMessage = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-admin-assistant",
        {
          body: {
            message: messageText,
            conversationId,
            actionTitle: messageText.slice(0, 80),
            actionCategory: "bug",
          },
        },
      );

      if (fnError) {
        const msg = await getFunctionErrorMessage(fnError);
        setError(msg || "Failed to reach Solas");
        setSending(false);
        return;
      }

      if (data?.error) {
        if (data.needsConfig) setNeedsConfig(true);
        setError(data.error);
        setSending(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response || "No response received.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (data.conversationId) setConversationId(data.conversationId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function applyTemplate(template: (typeof QUICK_TEMPLATES)[0]) {
    setInput(template.prompt);
  }

  const loadHistoryAction = useCallback((action: AiAction) => {
    setTab("chat");
    setMessages([
      {
        role: "user",
        content: action.description,
        timestamp: action.created_at,
      },
      ...(action.resolution
        ? [
            {
              role: "assistant" as const,
              content: action.resolution,
              timestamp: action.created_at,
            },
          ]
        : []),
    ]);
    if (action.conversation_id) setConversationId(action.conversation_id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground dark:text-primary-foreground">
            <Crown className="h-7 w-7 text-brand-purple" />
            AI Assistant
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
            Powered by Solas — your FRELUX Superagent. Describe any issue and
            get it fixed without leaving your admin.
          </p>
        </div>
        <a
          href={AGENT_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ExternalLink className="h-4 w-4" /> Open Solas Chat
        </a>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border dark:border-white/10">
        {[
          { id: "chat" as const, label: "Chat", icon: MessageSquare },
          { id: "history" as const, label: "Action History", icon: History },
          { id: "settings" as const, label: "Settings", icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={classNames(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-b-2 border-brand-purple text-brand-purple"
                  : "text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/60",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Chat Tab */}
      {tab === "chat" && (
        <div className="space-y-4">
          {/* Needs config warning */}
          {needsConfig && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Solas API Key Required
                  </p>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                    To connect your admin to Solas, you need to add your
                    Superagent API key. Go to the{" "}
                    <button
                      onClick={() => setTab("settings")}
                      className="underline font-medium"
                    >
                      Settings tab
                    </button>{" "}
                    to configure it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick templates */}
          {messages.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.label}
                    onClick={() => applyTemplate(template)}
                    className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-all hover:border-brand-purple hover:bg-primary/5 dark:border-white/10 dark:hover:border-brand-purple/30"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                      {template.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-card">
              <div className="max-h-[500px] space-y-4 overflow-y-auto">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={classNames(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Crown className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={classNames(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground dark:bg-white/5 dark:text-muted-foreground/60",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground dark:bg-white/10 dark:text-muted-foreground/80">
                        <span className="text-xs font-bold">
                          {user?.email?.[0]?.toUpperCase() || "A"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Crown className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl bg-muted px-4 py-3 dark:bg-white/5">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Input */}
          <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-card">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the issue you found, or what you want to change... e.g. 'The paint calculator dropdown is showing wrong prices for premium quality'"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-background dark:text-primary-foreground dark:placeholder:text-muted-foreground"
              disabled={sending}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Press Enter to send · Shift+Enter for new line
              </p>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Solas is
                    working...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Send to Solas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
              Recent Actions
            </h2>
            <button
              onClick={loadActions}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/60"
            >
              <RefreshCw
                className={classNames(
                  "h-4 w-4",
                  actionsLoading && "animate-spin",
                )}
              />{" "}
              Refresh
            </button>
          </div>

          {actionsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-muted dark:bg-white/5"
                />
              ))}
            </div>
          ) : actions.length === 0 ? (
            <p className="rounded-lg border border-border py-8 text-center text-sm text-muted-foreground dark:border-white/5 dark:text-muted-foreground">
              No actions yet. Start a conversation with Solas to track your
              fixes here.
            </p>
          ) : (
            <div className="space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border border-border p-4 dark:border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground">
                        {action.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground dark:text-muted-foreground">
                        {action.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(action.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={classNames(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                        STATUS_COLORS[action.status] || STATUS_COLORS.open,
                      )}
                    >
                      {action.status.replace("_", " ")}
                    </span>
                  </div>
                  {action.resolution && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3 dark:bg-white/5">
                      <p className="line-clamp-3 text-xs text-muted-foreground dark:text-muted-foreground/80">
                        {action.resolution}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => loadHistoryAction(action)}
                    className="mt-2 text-xs text-brand-purple hover:underline"
                  >
                    View conversation →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="space-y-6">
          {/* API Key Configuration */}
          <div className="rounded-xl border border-border p-6 dark:border-white/10">
            <div className="mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-brand-purple" />
              <h2 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
                Solas API Key
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground dark:text-muted-foreground">
              Connect your admin to Solas (your FRELUX Superagent on Base44).
              You need the API key from your
              <a
                href={`${BASE44_URL}/superagent/6a872e1df3b5e9fc45fc13fb`}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 text-brand-purple underline"
              >
                Solas agent page
              </a>
              → Developer/API Docs.
            </p>

            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              Superagent API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Solas API key"
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
              />
              <button
                onClick={saveApiKey}
                disabled={!apiKey.trim() || apiKeySaving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {apiKeySaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : apiKeySaved ? (
                  <>
                    <Check className="h-4 w-4" /> Saved!
                  </>
                ) : (
                  <>Save Key</>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The key is stored securely in your database and only accessible to
              admins.
            </p>
          </div>

          {/* Base44 Quick Access */}
          <div className="rounded-xl border border-border p-6 dark:border-white/10">
            <div className="mb-4 flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-brand-purple" />
              <h2 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
                Base44 Quick Access
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground dark:text-muted-foreground">
              Need to access Base44 directly? Use these links to jump into your
              dashboard, builder, or agent settings.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={BASE44_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-brand-purple hover:bg-primary/5 dark:border-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                    Base44 Dashboard
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Main dashboard & app list
                  </p>
                </div>
              </a>

              <a
                href={AGENT_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-brand-purple hover:bg-primary/5 dark:border-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                    Solas Chat
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Direct chat with Solas
                  </p>
                </div>
              </a>

              <a
                href={`${BASE44_URL}/superagent/6a872e1df3b5e9fc45fc13fb/settings`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-brand-purple hover:bg-primary/5 dark:border-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                    Agent Settings
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Configure Solas, models, memory
                  </p>
                </div>
              </a>

              <a
                href={`${BASE44_URL}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-brand-purple hover:bg-primary/5 dark:border-white/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                    Documentation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Base44 API docs & guides
                  </p>
                </div>
              </a>
            </div>
          </div>

          {/* API Configuration Panel */}
          <div className="rounded-xl border border-border p-6 dark:border-white/10">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-purple" />
              <h2 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
                API Configuration
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground dark:text-muted-foreground">
              Manage external API keys and endpoints used by FRELUX. Changes are
              saved to your database and take effect immediately. Use Solas chat
              to request API changes — just describe what you want to change and
              Solas will update it for you.
            </p>
            <div className="space-y-3">
              {/* Current integrations */}
              <div className="rounded-lg border border-border p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground dark:text-primary-foreground">
                      Supabase Backend
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Database, Auth, Edge Functions, Storage
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Active
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground dark:text-primary-foreground">
                      Solas Superagent
                    </p>
                    <p className="text-xs text-muted-foreground">
                      AI-powered admin assistant & code fixes
                    </p>
                  </div>
                  <span
                    className={classNames(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      apiKey
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
                    )}
                  >
                    {apiKey ? "Connected" : "Not Configured"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground dark:text-primary-foreground">
                      OpenAI (AI Features)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Live chat, color consult, project assistant
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                    Check Integrations
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
