import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

export type HotTopic = {
  id: number;
  market: string;
  locale: string;
  topic: string;
  heatScore: number;
  approxTraffic: string | null;
  timesSeen: number;
  articleId: number | null;
  lastSeenAt: string;
  articleLocale: string | null;
  articleSlug: string | null;
};

export async function getHotTopics(limit = 80) {
  const rows = await query<
    Array<
      RowDataPacket & {
        id: number;
        market: string;
        locale: string;
        topic: string;
        heat_score: number;
        approx_traffic: string | null;
        times_seen: number;
        article_id: number | null;
        last_seen_at: Date;
        article_locale: string | null;
        article_slug: string | null;
      }
    >
  >(
    `
      SELECT
        h.id,
        h.market,
        h.locale,
        h.topic,
        h.heat_score,
        h.approx_traffic,
        h.times_seen,
        h.article_id,
        h.last_seen_at,
        COALESCE(
          t.locale,
          (
            SELECT t2.locale
            FROM article_translations t2
            WHERE t2.article_id = h.article_id
            ORDER BY t2.locale = 'en' DESC, t2.id ASC
            LIMIT 1
          )
        ) AS article_locale,
        COALESCE(
          t.slug,
          (
            SELECT t2.slug
            FROM article_translations t2
            WHERE t2.article_id = h.article_id
            ORDER BY t2.locale = 'en' DESC, t2.id ASC
            LIMIT 1
          )
        ) AS article_slug
      FROM hot_topics h
      LEFT JOIN article_translations t
        ON t.article_id = h.article_id AND t.locale = h.locale
      ORDER BY h.last_seen_at DESC, h.heat_score DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    market: row.market,
    locale: row.locale,
    topic: row.topic,
    heatScore: Number(row.heat_score || 0),
    approxTraffic: row.approx_traffic,
    timesSeen: Number(row.times_seen || 0),
    articleId: row.article_id ? Number(row.article_id) : null,
    lastSeenAt: row.last_seen_at.toISOString(),
    articleLocale: row.article_locale,
    articleSlug: row.article_slug
  }));
}
