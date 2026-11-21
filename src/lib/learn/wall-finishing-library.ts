/**
 * Public read of the wall-finishing editorial library.
 *
 * Three admin tables — `learn_wall_finishing_topics`,
 * `learn_wall_finishing_article_slots` and the themes list — were maintained
 * in AdminWallFinishingLibrary but read by nothing public, so verified local
 * systems never appeared on /learn. This module is the read path: verified
 * topics only (the table's own policy already restricts anon to those rows),
 * with the article each slot points at.
 */

import { supabase } from "@/lib/supabase";

export interface WallFinishingArticleLink {
  title: string;
  slug: string;
  theme: string;
}

export interface WallFinishingTopic {
  id: string;
  marketCode: string;
  title: string;
  topicType: "wall_system" | "finish_assembly";
  articles: WallFinishingArticleLink[];
}

const THEME_LABELS: Record<string, string> = {
  overview: "Overview",
  materials: "Materials",
  installation: "Installation",
  quality: "Quality checks",
  maintenance: "Maintenance",
};

export function themeLabel(themeKey: string): string {
  return THEME_LABELS[themeKey] ?? themeKey.replace(/_/g, " ");
}

export async function fetchWallFinishingLibrary(
  limit = 6,
): Promise<WallFinishingTopic[]> {
  try {
    const { data: topics, error } = await supabase
      .from("learn_wall_finishing_topics")
      .select("id,market_code,title,topic_type")
      .eq("verification_status", "verified")
      .order("market_code")
      .limit(limit);
    if (error || !topics || topics.length === 0) return [];

    const topicIds = topics.map((t) => t.id as string);

    const [{ data: slots }, { data: articles }] = await Promise.all([
      supabase
        .from("learn_wall_finishing_article_slots")
        .select("topic_id,theme_key,language_code,article_id")
        .in("topic_id", topicIds),
      supabase
        .from("learn_articles")
        .select("title,slug,wall_topic_id,wall_article_theme")
        .eq("status", "published")
        .in("wall_topic_id", topicIds),
    ]);

    const articleBySlot = new Map<string, { title: string; slug: string }>();
    for (const article of articles ?? []) {
      const key = `${article.wall_topic_id}:${article.wall_article_theme}`;
      articleBySlot.set(key, {
        title: article.title as string,
        slug: article.slug as string,
      });
    }

    return topics.map((topic) => {
      const topicSlots = (slots ?? []).filter(
        (slot) => slot.topic_id === topic.id,
      );
      const seen = new Set<string>();
      const links: WallFinishingArticleLink[] = [];
      for (const slot of topicSlots) {
        const theme = slot.theme_key as string;
        if (seen.has(theme)) continue;
        const article = articleBySlot.get(`${topic.id}:${theme}`);
        if (!article) continue;
        seen.add(theme);
        links.push({ ...article, theme: themeLabel(theme) });
      }
      return {
        id: topic.id as string,
        marketCode: topic.market_code as string,
        title: topic.title as string,
        topicType: topic.topic_type as WallFinishingTopic["topicType"],
        articles: links,
      };
    });
  } catch {
    return [];
  }
}
