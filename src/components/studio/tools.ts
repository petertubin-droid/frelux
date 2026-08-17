import {
  MessageSquare, Layout, Database, Code2, LayoutDashboard, FormInput, Workflow,
  Code, Component, FileCode2, Bug, RefreshCw, TestTube2, FileText, Rocket,
  Puzzle, FolderTree, FolderOpen, History, BookOpen, Plug, ShieldCheck, ToggleLeft,
  Activity,
} from 'lucide-react';
import type { StudioToolType } from '@/types/database';

export interface ToolDef {
  slug: string;
  label: string;
  shortLabel: string;
  icon: typeof Code;
  description: string;
  category: 'AI Generation' | 'Code Quality' | 'Platform Management' | 'Infrastructure';
}

export const TOOLS: ToolDef[] = [
  // AI Generation
  { slug: 'chat', label: 'AI Chat Assistant', shortLabel: 'Chat', icon: MessageSquare, description: 'Natural language chat with AI for development help', category: 'AI Generation' },
  { slug: 'page_builder', label: 'AI Page Builder', shortLabel: 'Pages', icon: Layout, description: 'Generate complete React pages from descriptions', category: 'AI Generation' },
  { slug: 'crud_generator', label: 'AI CRUD Generator', shortLabel: 'CRUD', icon: Database, description: 'Generate full CRUD modules with UI and queries', category: 'AI Generation' },
  { slug: 'db_designer', label: 'AI Database Designer', shortLabel: 'DB Schema', icon: Database, description: 'Design and generate SQL migrations', category: 'AI Generation' },
  { slug: 'api_builder', label: 'AI API Builder', shortLabel: 'APIs', icon: Code2, description: 'Generate Supabase Edge Function endpoints', category: 'AI Generation' },
  { slug: 'dashboard_builder', label: 'AI Dashboard Builder', shortLabel: 'Dashboards', icon: LayoutDashboard, description: 'Generate data dashboards with charts', category: 'AI Generation' },
  { slug: 'form_builder', label: 'AI Form Builder', shortLabel: 'Forms', icon: FormInput, description: 'Generate validated forms with TypeScript types', category: 'AI Generation' },
  { slug: 'workflow_builder', label: 'AI Workflow Builder', shortLabel: 'Workflows', icon: Workflow, description: 'Design automation workflows and processes', category: 'AI Generation' },
  { slug: 'feature_generator', label: 'AI Feature Generator', shortLabel: 'Features', icon: Code, description: 'Architect complete feature specifications', category: 'AI Generation' },
  { slug: 'component_generator', label: 'AI Component Generator', shortLabel: 'Components', icon: Component, description: 'Generate reusable React components', category: 'AI Generation' },
  { slug: 'code_generator', label: 'AI Code Generator', shortLabel: 'Code', icon: FileCode2, description: 'Generate code in any language from prompts', category: 'AI Generation' },
  { slug: 'deploy_assistant', label: 'AI Deployment Assistant', shortLabel: 'Deploy', icon: Rocket, description: 'Deployment guides, checklists, and optimization', category: 'AI Generation' },

  // Code Quality
  { slug: 'bug_detection', label: 'AI Bug Detection AI Bug Detection & Auto-Fix Auto Fix', shortLabel: 'Bug Fix', icon: Bug, description: 'Detect bugs, security issues, and auto-generate fixes', category: 'Code Quality' },
  { slug: 'refactoring', label: 'AI Refactoring', shortLabel: 'Refactor', icon: RefreshCw, description: 'Improve code quality while preserving behavior', category: 'Code Quality' },
  { slug: 'test_generator', label: 'AI Test Generator', shortLabel: 'Tests', icon: TestTube2, description: 'Generate comprehensive test suites', category: 'Code Quality' },
  { slug: 'docs_generator', label: 'AI Documentation Generator', shortLabel: 'Docs', icon: FileText, description: 'Generate API docs, component docs, and guides', category: 'Code Quality' },

  // Platform Management
  { slug: 'plugin_manager', label: 'Plugin & Module Manager', shortLabel: 'Plugins', icon: Puzzle, description: 'Install, enable, and manage platform plugins', category: 'Platform Management' },
  { slug: 'project_explorer', label: 'Project Explorer', shortLabel: 'Explorer', icon: FolderTree, description: 'Browse project structure and file tree', category: 'Platform Management' },
  { slug: 'file_manager', label: 'File Manager', shortLabel: 'Files', icon: FolderOpen, description: 'Manage project files and assets', category: 'Platform Management' },
  { slug: 'version_history', label: 'Version History', shortLabel: 'Versions', icon: History, description: 'View and restore artifact versions', category: 'Platform Management' },
  { slug: 'prompt_library', label: 'Prompt Library', shortLabel: 'Prompts', icon: BookOpen, description: 'Reusable prompt templates for all tools', category: 'Platform Management' },
  { slug: 'integration_center', label: 'Integration Center', shortLabel: 'Integrations', icon: Plug, description: 'Manage external service connections', category: 'Platform Management' },
  { slug: 'role_management', label: 'Role & Permission Management', shortLabel: 'Roles', icon: ShieldCheck, description: 'Define roles and manage permissions', category: 'Platform Management' },
  { slug: 'feature_management', label: 'Feature Management', shortLabel: 'Flags', icon: ToggleLeft, description: 'Control feature flags and rollout percentages', category: 'Platform Management' },

  // Infrastructure
  { slug: 'system_monitoring', label: 'System Monitoring', shortLabel: 'Monitor', icon: Activity, description: 'Monitor system health and performance metrics', category: 'Infrastructure' },
];

export const TOOL_CATEGORIES = ['AI Generation', 'Code Quality', 'Platform Management', 'Infrastructure'] as const;

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolType(slug: string): StudioToolType {
  return slug as StudioToolType;
}
