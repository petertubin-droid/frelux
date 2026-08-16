import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://freluxpaintcalc.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_MODEL = 'gemini-2.0-flash';

interface StudioRequest {
  tool: string;
  prompt: string;
  context?: {
    fileName?: string;
    fileContent?: string;
    artifactType?: string;
    sessionHistory?: { role: string; content: string }[];
  };
  sessionId?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function isUserAdmin(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin';
}

const TOOL_SYSTEM_PROMPTS: Record<string, string> = {
  chat: 'You are an expert AI development assistant for the FRELUX PAINT CALC platform. You help with React, TypeScript, Tailwind CSS, Supabase, and general web development questions. Provide clear, actionable answers with code examples when relevant.',
  page_builder: 'You are an expert React page builder. Generate complete, production-ready React page components using TypeScript, Tailwind CSS, and lucide-react icons. Always include: proper imports, TypeScript types, responsive design, loading/error states, SEO meta tags, and clean component structure. Use the @/ path alias for imports.',
  crud_generator: 'You are an expert full-stack CRUD module generator. Generate complete CRUD modules with: TypeScript types, Supabase query functions, React list/create/edit/delete components, form validation, and error handling. Use the existing AdminUi components (AdminCard, AdminButton, AdminField, StateMessage, Toggle) from @/components/admin/AdminUi.',
  db_designer: 'You are a PostgreSQL database architect. Generate clean, idempotent SQL migrations with: CREATE TABLE IF NOT EXISTS, proper data types, primary keys, foreign keys, indexes, constraints, RLS policies (4 per table: SELECT, INSERT, UPDATE, DELETE), and helpful comments.',
  api_builder: 'You are an expert Deno/Supabase Edge Function developer. Generate Edge Functions with: proper CORS headers (Access-Control-Allow-Origin: (restrict to known domains), etc.), OPTIONS preflight handling, input validation, try/catch error handling, JSON responses, and type safety. Use npm: prefixed imports.',
  dashboard_builder: 'You are an expert dashboard builder. Generate React dashboard components with: charts (using inline SVG or CSS-based visualizations), stat cards, data tables, filters, responsive grid layouts, and real-time updates. Use Tailwind CSS for styling.',
  form_builder: 'You are an expert form builder. Generate React forms with: TypeScript types, validation (required, email, min/max length, pattern), error messages, loading states, success states, accessibility (ARIA labels, focus management), and Tailwind CSS styling.',
  workflow_builder: 'You are an expert workflow/automation builder. Design automation workflows with: triggers, conditions, actions, data transformations, and error handling. Output as a structured JSON workflow definition plus a visual description.',
  feature_generator: 'You are an expert feature architect. Design complete feature specifications with: user stories, API contracts, database schema changes, UI components needed, edge cases, and implementation plan.',
  component_generator: 'You are an expert React component generator. Generate reusable, well-typed React components with: props interface, Tailwind CSS styling, responsive design, accessibility, hover/focus states, and clean composition.',
  code_generator: 'You are an expert code generator. Generate clean, production-ready code in the requested language. Always include proper types, error handling, and follow best practices.',
  bug_detection: 'You are a senior code reviewer and bug detector. Analyze code for: logic errors, security vulnerabilities (XSS, injection, CSRF), race conditions, memory leaks, type errors, missing error handling, and accessibility issues. Rate each issue by severity (critical, high, medium, low) and provide a fix.',
  refactoring: 'You are a refactoring expert. Improve code quality while preserving behavior. Focus on: readability, performance, maintainability, DRY principles, proper abstraction, and naming conventions. Show the refactored code and explain changes.',
  test_generator: 'You are a QA engineer. Generate comprehensive test suites with: unit tests, integration tests, edge cases, error scenarios, and mocks. Use descriptive test names and cover both happy and unhappy paths.',
  docs_generator: 'You are a technical writer. Generate clear, comprehensive documentation with: overview, installation, API reference, usage examples, configuration, troubleshooting, and integration guides. Use Markdown format.',
  deploy_assistant: 'You are a deployment assistant. Help with: build optimization, environment configuration, deployment checklists, rollback procedures, and monitoring setup. Provide step-by-step instructions.',
};

function buildSystemPrompt(tool: string): string {
  return TOOL_SYSTEM_PROMPTS[tool] ?? TOOL_SYSTEM_PROMPTS.chat;
}

async function callGemini(apiKey: string, tool: string, prompt: string, context?: StudioRequest['context']): Promise<string> {
  const systemPrompt = buildSystemPrompt(tool);
  const parts: unknown[] = [{ text: systemPrompt }];

  if (context?.fileContent) {
    parts.push({ text: `Existing file (${context.fileName ?? 'file'}):\n\`\`\`\n${context.fileContent}\n\`\`\`` });
  }
  if (context?.sessionHistory && context.sessionHistory.length > 0) {
    const history = context.sessionHistory.slice(-10).map((m) => `${m.role}: ${m.content}`).join('\n');
    parts.push({ text: `Conversation history:\n${history}` });
  }

  parts.push({ text: `${prompt}\n\nRespond with well-structured, production-ready output. Use markdown code blocks for code.` });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI provider error: ${res.status} ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI returned empty response');
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'AI service not configured. Set GOOGLE_AI_API_KEY in Supabase secrets.', code: 'NO_API_KEY' }, 503);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const userId = await getAuthenticatedUserId(req, supabaseUrl, anonKey);
  if (!userId) {
    return jsonResponse({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
  }

  const isAdmin = await isUserAdmin(supabase, userId);
  if (!isAdmin) {
    return jsonResponse({ error: 'Admin access required', code: 'FORBIDDEN' }, 403);
  }

  let payload: StudioRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400);
  }

  if (!payload.tool || !payload.prompt?.trim()) {
    return jsonResponse({ error: 'Tool and prompt are required', code: 'BAD_REQUEST' }, 400);
  }

  try {
    const response = await callGemini(apiKey, payload.tool, payload.prompt, payload.context);

    if (payload.sessionId) {
      await supabase.from('ai_studio_chat').insert({
        session_id: payload.sessionId,
        role: 'user',
        content: payload.prompt,
      });
      await supabase.from('ai_studio_chat').insert({
        session_id: payload.sessionId,
        role: 'assistant',
        content: response,
      });
      await supabase.from('ai_studio_sessions').update({ updated_at: new Date().toISOString() }).eq('id', payload.sessionId);
    }

    return jsonResponse({ response, tool: payload.tool });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message, code: 'AI_ERROR' }, 502);
  }
});
