import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import StudioManagement from './StudioManagement';
import { X } from 'lucide-react';
import { invokeStudioAi, createArtifact, fetchChatHistory, createSession, fetchSessions, deleteSession } from '@/lib/ai-studio';
import { getTool, getToolType } from '@/components/studio/tools';
import { ToolHeader, PromptInput, AiResponseDisplay, SaveBar, ChatMessage } from '@/components/studio/StudioShared';
import type { DbStudioChat, DbStudioSession, StudioToolType } from '@/types/database';
import { Button } from "@/components/ui/shadcn/button";

const GENERATION_TOOLS = new Set([
  'page_builder', 'crud_generator', 'db_designer', 'api_builder', 'dashboard_builder',
  'form_builder', 'workflow_builder', 'feature_generator', 'component_generator',
  'code_generator', 'deploy_assistant', 'bug_detection', 'refactoring', 'test_generator', 'docs_generator',
]);

const PLACEHOLDERS: Record<string, string> = {
  page_builder: 'Describe the page you want to build. e.g., "Create a customer feedback page with a rating form, recent reviews, and analytics summary"',
  crud_generator: 'Describe the CRUD module. e.g., "Create a CRUD for paint suppliers with name, email, phone, and active status"',
  db_designer: 'Describe the schema. e.g., "Design tables for a project management system with projects, tasks, and assignees"',
  api_builder: 'Describe the API. e.g., "Create an endpoint that accepts a webhook from Stripe and logs the event"',
  dashboard_builder: 'Describe the dashboard. e.g., "Create a sales analytics dashboard with revenue chart, top products, and recent orders"',
  form_builder: 'Describe the form. e.g., "Create a multi-step contact form with name, email, project type, and message"',
  workflow_builder: 'Describe the workflow. e.g., "Create an automation that sends an email when a new color is approved"',
  feature_generator: 'Describe the feature. e.g., "Design a color matching feature that suggests complementary colors"',
  component_generator: 'Describe the component. e.g., "Create a reusable color picker with hex input and preview swatch"',
  code_generator: 'Describe what to generate. e.g., "Create a utility function to convert RGB to HSL"',
  deploy_assistant: 'Describe your deployment needs. e.g., "Help me optimize my Vite build and set up environment variables"',
  bug_detection: 'Paste the code you want analyzed for bugs and security issues',
  refactoring: 'Paste the code you want refactored for better readability',
  test_generator: 'Describe what to test. e.g., "Generate tests for the paint calculator utility functions"',
  docs_generator: 'Describe what to document. e.g., "Generate API documentation for the color consultation endpoint"',
};

const MANAGEMENT_TOOLS = new Set([
  'plugin_manager', 'prompt_library', 'integration_center',
  'feature_management', 'role_management', 'system_monitoring',
  'version_history', 'project_explorer', 'file_manager',
]);

export default function StudioDispatcher() {
  const { toolSlug } = useParams<{ toolSlug: string }>();

  // Route management/infrastructure tools to StudioManagement
  if (MANAGEMENT_TOOLS.has(toolSlug ?? '')) {
    return <StudioManagement />;
  }

  const tool = getTool(toolSlug ?? '');
  const isChat = toolSlug === 'chat';
  const isGeneration = toolSlug ? GENERATION_TOOLS.has(toolSlug) : false;

  if (!tool) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Tool not found.</div>;
  }

  if (isChat) {
    return <ChatTool toolSlug="chat" tool={tool} />;
  }

  if (isGeneration) {
    return <GenerationTool toolSlug={getToolType(toolSlug!)} tool={tool} />;
  }

  return <div className="py-20 text-center text-sm text-muted-foreground">This tool is available in the sidebar.</div>;
}

// =========================================================
// Generation Tool — shared by all 15 generation/code-quality tools
// =========================================================
function GenerationTool({ toolSlug, tool }: { toolSlug: string; tool: ReturnType<typeof getTool> }) {
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  async function handleGenerate(p: string) {
    setPrompt(p);
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const result = await invokeStudioAi({ tool: toolSlug as StudioToolType, prompt: p });
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!output) return;
    setSaving(true);
    try {
      await createArtifact({
        artifact_type: toolSlug,
        title: prompt.slice(0, 60),
        content: output,
        language: toolSlug === 'db_designer' ? 'sql' : 'typescript',
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!tool) return null;
  const Icon = tool.icon;

  return (
    <div>
      <ToolHeader icon={Icon} title={tool.label} description={tool.description} />

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card dark:border-white/5 dark:bg-card p-5">
          <PromptInput
            placeholder={PLACEHOLDERS[toolSlug] ?? 'Describe what you want to generate…'}
            loading={loading}
            onGenerate={handleGenerate}
            buttonText="Generate with AI"
            rows={5}
          />
        </div>

        <div ref={outputRef}>
          <AiResponseDisplay content={output} loading={loading} error={error} />
        </div>

        {output && !loading && (
          <SaveBar onSave={handleSave} saving={saving} saved={saved} />
        )}
      </div>
    </div>
  );
}

// =========================================================
// Chat Tool — conversational AI assistant
// =========================================================
function ChatTool({ tool }: { toolSlug: string; tool: ReturnType<typeof getTool> }) {
  const [messages, setMessages] = useState<DbStudioChat[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<DbStudioSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions('chat').then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeSession) {
      fetchChatHistory(activeSession).then(setMessages).catch(() => {});
    } else {
      setMessages([]);
    }
  }, [activeSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setError(null);

    let sessionId = activeSession;
    if (!sessionId) {
      try {
        const session = await createSession('chat', userMsg.slice(0, 50));
        sessionId = session.id;
        setActiveSession(sessionId);
        setSessions((prev) => [session, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session');
        return;
      }
    }

    const tempUserMsg: DbStudioChat = {
      id: 'temp-u',
      session_id: sessionId!,
      role: 'user',
      content: userMsg,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await invokeStudioAi({
        tool: 'chat',
        prompt: userMsg,
        sessionId: sessionId!,
        context: {
          sessionHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      const tempAiMsg: DbStudioChat = {
        id: 'temp-a',
        session_id: sessionId!,
        role: 'assistant',
        content: response,
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
      setMessages((prev) => prev.filter((m) => m.id !== 'temp-u'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSession(id: string) {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSession === id) {
      setActiveSession(null);
      setMessages([]);
    }
  }

  if (!tool) return null;
  const Icon = tool.icon;

  return (
    <div>
      <ToolHeader icon={Icon} title={tool.label} description={tool.description} />

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Session list */}
        <div className="space-y-2">
          <Button variant="ghost"
            type="button"
            onClick={() => { setActiveSession(null); setMessages([]); }}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            New Chat
          </Button>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} className="group flex items-center justify-between rounded-lg border border-border bg-card dark:border-white/5 dark:bg-card px-3 py-2 hover:border-brand-purple">
                <Button variant="ghost"
                  type="button"
                  onClick={() => setActiveSession(s.id)}
                  className={`flex-1 truncate text-left text-xs font-medium ${activeSession === s.id ? 'text-brand-purple' : 'text-muted-foreground'}`}
                >
                  {s.title}
                </Button>
                <Button variant="ghost" type="button" onClick={() => handleDeleteSession(s.id)} className="ml-2 text-muted-foreground/80 opacity-0 hover:text-red-500 group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col rounded-xl border border-border bg-card dark:border-white/5 dark:bg-card">
          <div ref={scrollRef} className="max-h-[55vh] flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && !loading && (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <Icon className="mx-auto h-8 w-8 text-muted-foreground/80" />
                  <p className="mt-2 text-sm text-muted-foreground">Ask the AI assistant anything about your project.</p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={m.id ?? i} role={m.role} content={m.content} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand-purple" />
                AI is thinking…
              </div>
            )}
          </div>

          {error && <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</div>}

          <div className="flex gap-2 border-t border-border p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message…"
              disabled={loading}
              className="input-field flex-1"
            />
            <Button variant="default"
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold hover:/90 disabled:opacity-50"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
