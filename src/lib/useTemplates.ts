import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth';
import {
  getUserTemplates,
  createUserTemplate,
  updateUserTemplate,
  deleteUserTemplate,
  duplicateUserTemplate,
} from './templates';
import type { DbCalculatorTemplate, CalculatorType, TemplateCreateInput, TemplateUpdateInput } from '@/types/database';

interface UseTemplatesResult {
  templates: DbCalculatorTemplate[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: TemplateCreateInput) => Promise<DbCalculatorTemplate | null>;
  update: (id: string, updates: TemplateUpdateInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string, newName?: string) => Promise<DbCalculatorTemplate | null>;
  toggleFavorite: (id: string, current: boolean) => Promise<void>;
}

export function useUserTemplates(calculatorType?: CalculatorType): UseTemplatesResult {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUserTemplates(user.id, { calculatorType });
      setTemplates(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [user, calculatorType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: TemplateCreateInput) => {
      if (!user) return null;
      try {
        const t = await createUserTemplate(user.id, input);
        await refresh();
        return t;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create template');
        return null;
      }
    },
    [user, refresh]
  );

  const update = useCallback(
    async (id: string, updates: TemplateUpdateInput) => {
      if (!user) return;
      try {
        await updateUserTemplate(id, user.id, updates);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update template');
      }
    },
    [user, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await deleteUserTemplate(id, user.id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete template');
      }
    },
    [user, refresh]
  );

  const duplicate = useCallback(
    async (id: string, newName?: string) => {
      if (!user) return null;
      try {
        const t = await duplicateUserTemplate(id, user.id, newName);
        await refresh();
        return t;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to duplicate template');
        return null;
      }
    },
    [user, refresh]
  );

  const toggleFavorite = useCallback(
    async (id: string, current: boolean) => {
      if (!user) return;
      try {
        await updateUserTemplate(id, user.id, { is_favorite: !current });
        setTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, is_favorite: !current } : t))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update favorite');
      }
    },
    [user]
  );

  return { templates, loading, error, refresh, create, update, remove, duplicate, toggleFavorite };
}
