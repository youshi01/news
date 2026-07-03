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
  media_asset_type: string | null;
  category_slug: string;
  source_name: string | null;
  source_type: string | null;
  source_url: string;
  published_at: Date | null;
  heat_score: number;
};

function safeIsoDate(value: Date | string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function publicArticleFilter(alias = "a") {
  return `NOT EXISTS (
    SELECT 1
    FROM hot_topics hidden_topic
    WHERE hidden_topic.article_id = ${alias}.id
  )`;
}

function placeholderImageUrl(row: ArticleRow) {
  const params = new URLSearchParams({
    title: row.title || row.category_slug || "News",
    category: row.category_slug || "news",
    seed: String(row.id || row.slug || row.title || "news")
  });

  return `/api/placeholder-image?${params.toString()}`;
}

function articleImageUrl(row: ArticleRow) {
  if (row.image_url) {
    return row.image_url;
  }

  if (row.media_asset_id && row.media_asset_type === "image") {
    return `/api/media/${row.media_asset_id}`;
  }

  return placeholderImageUrl(row);
}

function sourceName(row: ArticleRow) {
  const name = row.source_name || "Unknown source";

  if (row.source_type === "hot_trends") {
    return name.replace(/^Google Trends\s*/i, "Trend Desk ").trim() || "Trend Desk";
  }

  return name;
}

function stripGeneratedSourceBlocks(input: string) {
  return input
    .replace(
      /<p>\s*<strong>([\s\S]*?)<\/strong>\s+is currently appearing as a hot search signal[\s\S]*?<\/p>/gi,
      (_match, topic) =>
        `<p><strong>${topic}</strong> is drawing new coverage. This page summarizes the latest context for quick follow-up.</p>`
    )
    .replace(/<p>\s*<strong>\s*Why it matters\s*:\s*<\/strong>\s*Hot search demand[\s\S]*?<\/p>/gi, "")
    .replace(/<h2>\s*Source links\s*<\/h2>\s*<ul>[\s\S]*?<\/ul>/gi, "")
    .replace(/<p>\s*<strong>\s*Sources?\s*:\s*<\/strong>[\s\S]*?<\/p>/gi, "")
    .replace(
      /<p>\s*<strong>\s*Editorial note\s*:\s*<\/strong>[\s\S]*?(?:automated briefing|automated trend briefing|rss signal|original publisher|original source|source links)[\s\S]*?<\/p>/gi,
      ""
    )
    .replace(/<p>\s*This automated briefing[\s\S]*?<\/p>/gi, "")
    .replace(/\s+and source links/gi, "")
    .trim();
}

function cleanGeneratedTitle(input: string) {
  return input
    .replace(/^(.+?):\s*why it is trending in .+$/i, "$1: latest updates")
    .trim();
}

function cleanGeneratedDescription(input: string | null, title: string, content: string) {
  const text = String(input || "").trim();
  const topic = title.replace(/:\s*latest updates$/i, "");

  if (/is trending in .+This briefing tracks the latest signals/i.test(text)) {
    return `Latest coverage on ${topic}.`;
  }

  if (/hot search signal|estimated search interest|automated trend briefing/i.test(text)) {
    return `Latest coverage on ${topic}.`;
  }

  return text || truncate(stripHtml(content), 155);
}

function cleanGeneratedSummary(input: string | null, title: string, content: string) {
  const text = String(input || "").trim();
  const topic = title.replace(/:\s*latest updates$/i, "");

  if (/current search trend|hot search signal|latest news signals/i.test(text)) {
    return `${topic} is part of the latest news cycle.`;
  }

  return text || truncate(stripHtml(content), 220);
}

function mapArticle(row: ArticleRow): NewsArticle {
  const title = cleanGeneratedTitle(row.title);
  const content = stripGeneratedSourceBlocks(
    row.content_html || row.summary || row.description || ""
  );
  const description = cleanGeneratedDescription(row.description, title, content);
  const summary = cleanGeneratedSummary(row.summary, title, content);

  return {
    id: Number(row.id),
    locale: row.locale,
    slug: row.slug,
    title,
    description,
    summary,
    contentHtml: content || `<p>${row.summary || row.description}</p>`,
    mediaAssetId: row.media_asset_id ? Number(row.media_asset_id) : null,
    imageUrl: articleImageUrl(row),
    categorySlug: row.category_slug,
    sourceName: sourceName(row),
    sourceUrl: row.source_url,
    publishedAt: safeIsoDate(row.published_at),
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
        ma.asset_type AS media_asset_type,
        a.category_slug,
        a.source_url,
        a.published_at,
        a.heat_score,
        s.name AS source_name,
        s.source_type AS source_type
      FROM article_translations t
      INNER JOIN articles a ON a.id = t.article_id
      LEFT JOIN sources s ON s.id = a.source_id
      LEFT JOIN media_assets ma ON ma.id = a.media_asset_id
      WHERE t.locale = ? AND a.status = 'published'
        AND ${publicArticleFilter("a")}
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
        ma.asset_type AS media_asset_type,
        a.category_slug,
        a.source_url,
        a.published_at,
        a.heat_score,
        s.name AS source_name,
        s.source_type AS source_type
      FROM article_translations t
      INNER JOIN articles a ON a.id = t.article_id
      LEFT JOIN sources s ON s.id = a.source_id
      LEFT JOIN media_assets ma ON ma.id = a.media_asset_id
      WHERE t.locale = ? AND a.status = 'published'
        AND ${publicArticleFilter("a")}
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
        ma.asset_type AS media_asset_type,
        a.category_slug,
        a.source_url,
        a.published_at,
        a.heat_score,
        s.name AS source_name,
        s.source_type AS source_type
      FROM article_translations t
      INNER JOIN articles a ON a.id = t.article_id
      LEFT JOIN sources s ON s.id = a.source_id
      LEFT JOIN media_assets ma ON ma.id = a.media_asset_id
      WHERE t.locale = ? AND t.slug = ? AND a.status = 'published'
        AND ${publicArticleFilter("a")}
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
        AND ${publicArticleFilter("a")}
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
    updatedAt: safeIsoDate(row.updated_at)
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
      createdAt: safeIsoDate(row.created_at)
    }))
  };
}
