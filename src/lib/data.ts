import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fallbackArticles } from "@/lib/fallback";
import { normalizeLocale } from "@/lib/locales";
import { readingTime, stripHtml, truncate } from "@/lib/text";
import type { AdminStats, NewsArticle } from "@/lib/types";

type ArticleRow = RowDataPacket & {
  id: number;
  locale: string;
  slug: string;
  title: string;
  description: string | null;
  summary: string | null;
  content_html: string | null;
  image_url: string | null;
  media_asset_id: number | null;
  category_slug: string;
  source_name: string | null;
  source_url: string;
  published_at: Date | null;
  heat_score: number;
};

function mapArticle(row: ArticleRow): NewsArticle {
  const content = row.content_html || row.summary || row.description || "";

  return {
    id: Number(row.id),
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    description: row.description || truncate(stripHtml(content), 155),
    summary: row.summary || truncate(stripHtml(content), 220),
    contentHtml: row.content_html || `<p>${row.summary || row.description}</p>`,
    mediaAssetId: row.media_asset_id ? Number(row.media_asset_id) : null,
    imageUrl:
      row.media_asset_id
        ? `/api/media/${row.media_asset_id}`
        : row.image_url ||
          "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
    categorySlug: row.category_slug,
    sourceName: row.source_name || "Unknown source",
    sourceUrl: row.source_url,
    publishedAt: (row.published_at || new Date()).toISOString(),
    heatScore: Number(row.heat_score || 0),
    readingMinutes: readingTime(content)
  };
}

export async function getArticles(localeParam?: string, limit = 12) {
  const locale = normalizeLocale(localeParam);
  const rows = await query<ArticleRow[]>(
    `
      SELECT
        a.id,
        t.locale,
        t.slug,
        t.title,
        t.description,
        t.summary,
        t.content_html,
        COALESCE(t.og_image, a.image_url) AS image_url,
        a.media_asset_id,
        a.category_slug,
        a.source_url,
        a.published_at,
        a.heat_score,
        s.name AS source_name
      FROM article_translations t
      INNER JOIN articles a ON a.id = t.article_id
      LEFT JOIN sources s ON s.id = a.source_id
      WHERE t.locale = ? AND a.status = 'published'
      ORDER BY COALESCE(a.published_at, a.imported_at) DESC, a.id DESC
      LIMIT ?
    `,
    [locale, limit]
  );

  if (!rows.length) {
    return fallbackArticles.map((article) => ({ ...article, locale }));
  }

  return rows.map(mapArticle);
}

export async function getTrendingArticles(localeParam?: string, limit = 8) {
  const locale = normalizeLocale(localeParam);
  const rows = await query<ArticleRow[]>(
    `
      SELECT
        a.id,
        t.locale,
        t.slug,
        t.title,
        t.description,
        t.summary,
        t.content_html,
        COALESCE(t.og_image, a.image_url) AS image_url,
        a.media_asset_id,
        a.category_slug,
        a.source_url,
        a.published_at,
        a.heat_score,
        s.name AS source_name
      FROM article_translations t
      INNER JOIN articles a ON a.id = t.article_id
      LEFT JOIN sources s ON s.id = a.source_id
      WHERE t.locale = ? AND a.status = 'published'
      ORDER BY a.heat_score DESC, COALESCE(a.published_at, a.imported_at) DESC
      LIMIT ?
    `,
    [locale, limit]
  );

  if (!rows.length) {
    return fallbackArticles
      .map((article) => ({ ...article, locale }))
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, limit);
  }

  return rows.map(mapArticle);
}

export async function getArticleBySlug(localeParam: string, slug: string) {
  const locale = normalizeLocale(localeParam);
  const rows = await query<ArticleRow[]>(
    `
      SELECT
        a.id,
        t.locale,
        t.slug,
        t.title,
        t.description,
        t.summary,
        t.content_html,
        COALESCE(t.og_image, a.image_url) AS image_url,
        a.media_asset_id,
        a.category_slug,
        a.source_url,
        a.published_at,
        a.heat_score,
        s.name AS source_name
      FROM article_translations t
      INNER JOIN articles a ON a.id = t.article_id
      LEFT JOIN sources s ON s.id = a.source_id
      WHERE t.locale = ? AND t.slug = ? AND a.status = 'published'
      LIMIT 1
    `,
    [locale, slug]
  );

  if (!rows.length) {
    return fallbackArticles
      .map((article) => ({ ...article, locale }))
      .find((article) => article.slug === slug);
  }

  return mapArticle(rows[0]);
}

export async function getAllArticleUrls() {
  const rows = await query<
    Array<
      RowDataPacket & {
        locale: string;
        slug: string;
        updated_at: Date;
      }
    >
  >(
    `
      SELECT t.locale, t.slug, t.updated_at
      FROM article_translations t
      INNER JOIN articles a ON a.id = t.article_id
      WHERE a.status = 'published'
      ORDER BY t.updated_at DESC
      LIMIT 50000
    `
  );

  if (!rows.length) {
    return fallbackArticles.map((article) => ({
      locale: article.locale,
      slug: article.slug,
      updatedAt: new Date().toISOString()
    }));
  }

  return rows.map((row) => ({
    locale: row.locale,
    slug: row.slug,
    updatedAt: row.updated_at.toISOString()
  }));
}

export async function getAdminStats(): Promise<AdminStats> {
  const totals = await query<
    Array<
      RowDataPacket & {
        article_count: number;
        page_views: number;
        article_views: number;
        clicks: number;
        avg_duration: number | null;
      }
    >
  >(
    `
      SELECT
        (
          SELECT COUNT(*) FROM articles
          WHERE status = 'published'
        ) AS article_count,
        SUM(event_type = 'page_view') AS page_views,
        SUM(event_type = 'article_view') AS article_views,
        (
          SELECT COUNT(*) FROM click_events
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) AS clicks,
        AVG(duration_seconds) AS avg_duration
      FROM traffic_events
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `
  );

  const topArticles = await query<
    Array<
      RowDataPacket & {
        title: string;
        locale: string;
        views: number;
        clicks: number;
      }
    >
  >(
    `
      SELECT
        t.title,
        COALESCE(e.locale, t.locale) AS locale,
        COUNT(e.id) AS views,
        (
          SELECT COUNT(*)
          FROM click_events c
          WHERE c.article_id = a.id
            AND c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) AS clicks
      FROM traffic_events e
      INNER JOIN articles a ON a.id = e.article_id
      INNER JOIN article_translations t ON t.article_id = a.id AND t.locale = e.locale
      WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND e.event_type IN ('article_view', 'page_view')
      GROUP BY a.id, t.title, e.locale, t.locale
      ORDER BY views DESC
      LIMIT 8
    `
  );

  const recentEvents = await query<
    Array<
      RowDataPacket & {
        event_type: string;
        path: string;
        locale: string | null;
        created_at: Date;
      }
    >
  >(
    `
      SELECT event_type, path, locale, created_at
      FROM traffic_events
      ORDER BY created_at DESC
      LIMIT 10
    `
  );

  const total = totals[0];

  return {
    articleCount: Number(total?.article_count || 0),
    pageViews: Number(total?.page_views || 0),
    articleViews: Number(total?.article_views || 0),
    clicks: Number(total?.clicks || 0),
    avgDurationSeconds: Math.round(Number(total?.avg_duration || 0)),
    topArticles: topArticles.map((row) => ({
      title: row.title,
      locale: row.locale,
      views: Number(row.views || 0),
      clicks: Number(row.clicks || 0)
    })),
    recentEvents: recentEvents.map((row) => ({
      eventType: row.event_type,
      path: row.path,
      locale: row.locale,
      createdAt: row.created_at.toISOString()
    }))
  };
}
