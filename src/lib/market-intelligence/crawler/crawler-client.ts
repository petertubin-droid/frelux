/**
 * FRELUX DIRECT CRAWLER — Admin Client
 *
 * Client-side functions for admin crawl actions.
 * Calls the Supabase Edge Function for server-side execution.
 */

import { supabase } from '@/lib/supabase';
import type { CrawlTriggerResult, CrawlJob } from '@/types/crawler';

// ============================================================
// TRIGGER CRAWL (Manual admin action)
// ============================================================

/**
 * Trigger a crawl for a specific source.
 * Calls the edge function which runs server-side.
 *
 * @param sourceId  The source ID from mi_sources
 * @param mode      'test' = fetch+extract only, no price publication
 *                  'production' = full pipeline including price publication
 * @param targetUrl Optional specific URL to crawl (instead of source_url)
 */
export async function triggerCrawl(
  sourceId: string,
  mode: 'test' | 'production',
  targetUrl?: string,
): Promise<{ result: CrawlTriggerResult; job: CrawlJob | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('market-intelligence-crawl', {
      body: {
        sourceId,
        mode,
        targetUrl: targetUrl ?? null,
      },
    });

    if (error) {
      return {
        result: {
          jobId: '',
          started: false,
          status: 'failed',
          message: error.message ?? 'Edge function error',
        },
        job: null,
      };
    }

    // The edge function returns the job result
    const job = data as unknown as CrawlJob;

    return {
      result: {
        jobId: job.id ?? '',
        started: true,
        status: (job.status ?? 'completed') as CrawlJob['status'],
        message: job.message ?? 'Crawl completed',
      },
      job,
    };
  } catch (e) {
    return {
      result: {
        jobId: '',
        started: false,
        status: 'failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      job: null,
    };
  }
}

// ============================================================
// ENABLE/DISABLE FRELUX CRAWLER PROVIDER
// ============================================================

/**
 * Enable the FRELUX Crawler provider in the database.
 * This is called when the admin is ready to activate the crawler.
 */
export async function enableFreluxCrawler(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mi_providers')
      .update({ is_enabled: true })
      .eq('provider_name', 'FRELUX Crawler');

    return !error;
  } catch {
    return false;
  }
}

/**
 * Disable the FRELUX Crawler provider.
 */
export async function disableFreluxCrawler(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mi_providers')
      .update({ is_enabled: false })
      .eq('provider_name', 'FRELUX Crawler');

    return !error;
  } catch {
    return false;
  }
}
