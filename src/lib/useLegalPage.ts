import { useEffect, useState } from 'react';
import { fetchLegalPage } from '@/lib/queries';
import type { DbLegalPage } from '@/types/database';

export function useLegalPage(slug: string) {
  const [page, setPage] = useState<DbLegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await fetchLegalPage(slug);
      if (error) setError(error.message);
      setPage(data);
      setLoading(false);
    }
    load();
  }, [slug]);

  return { page, loading, error };
}
