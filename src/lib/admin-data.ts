import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fallbackArticles } from "@/lib/fallback";

export type AdminArticle = {
  id: number;
  title: string;
  locale: string;
  slug: string;
  categorySlug: string;
  status: string;
  heatScore: number;
  publishedAt: string;
  views: number;
  clicks: number;
};

export type AdminSource = {
  id: number;
  name: string;
  sourceType: string;
  siteUrl: string;
  rssUrl: string | null;
  defaultLocale: string;
  enabled: boolean;
  lastFetchedAt: string | null;
  failureCount: number;
};

export type AdminTask = {
  id: number;
  taskType: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  countFetched: number;
  countCreated: number;
  countSkipped: number;
  errorMessage: string | null;
};

export type AdminAdSlot = {
  id: number;
  placement: string;
  locale: string;
  enabled: boolean;
  provider: string | null;
  updatedAt: string;
};

export async function getAdminArticles(limit = 80): Promise<AdminArticle[]> {
  const rows = await query<
    Array<
      RowDataPacket & {
        id: number;
        title: string;
        locale: string;
        slug: string;
        category_slug: string;
        status: string;
        heat_score: number;
        published_at: Date | null;
        views: number;
        clicks: number;
      }
    >
  >(
    `
      SELECT
        a.id,
        t.title,
        t.locale,
        t.slug,
        a.category_slug,
        a.status,
        a.heat_score,
        a.published_at,
        (
          SELECT COUNT(*) FROM traffic_events e
          WHERE e.article_id = a.id AND e.event_type IN ('page_view', 'article_view')
        ) AS views,
        (
          SELECT COUNT(*) FROM click_events c
          WHERE c.article_id = a.id
        ) AS clicks
      FROM articles a
      INNER JOIN article_translations t ON t.article_id = a.id
      ORDER BY COALESCE(a.published_at, a.imported_at) DESC, a.id DESC
      LIMIT ?
    `,
    [limit]
  );

  if (!rows.length) {
    return fallbackArticles.map((article) => ({
      id: article.id,
      title: article.title,
      locale: article.locale,
      slug: article.slug,
      categorySlug: article.categorySlug,
      status: "sample",
      heatScore: article.heatScore,
      publishedAt: article.publishedAt,
      views: 0,
      clicks: 0
    }));
  }

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    locale: row.locale,
    slug: row.slug,
    categorySlug: row.category_slug,
    status: row.status,
    heatScore: Number(row.heat_score || 0),
    publishedAt: (row.published_at || new Date()).toISOString(),
    views: Number(row.views || 0),
    clicks: Number(row.clicks || 0)
  }));
}

export async function getAdminSources(limit = 80): Promise<AdminSource[]> {
  const rows = await query<
    Array<
      RowDataPacket & {
        id: number;
        name: string;
        source_type: string;
        site_url: string;
        rss_url: string | null;
        default_locale: string;
        enabled: number;
        last_fetched_at: Date | null;
        failure_count: number;
      }
    >
  >(
    `
      SELECT id, name, source_type, site_url, rss_url, default_locale, enabled, last_fetched_at, failure_count
      FROM sources
      ORDER BY updated_at DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    sourceType: row.source_type,
    siteUrl: row.site_url,
    rssUrl: row.rss_url,
    defaultLocale: row.default_locale,
    enabled: Boolean(row.enabled),
    lastFetchedAt: row.last_fetched_at?.toISOString() || null,
    failureCount: Number(row.failure_count || 0)
  }));
}

export async function getAdminTasks(limit = 80): Promise<AdminTask[]> {
  const rows = await query<
    Array<
      RowDataPacket & {
        id: number;
        task_type: string;
        status: string;
        started_at: Date | null;
        finished_at: Date | null;
        count_fetched: number;
        count_created: number;
        count_skipped: number;
        error_message: string | null;
      }
    >
  >(
    `
      SELECT id, task_type, status, started_at, finished_at, count_fetched, count_created, count_skipped, error_message
      FROM import_tasks
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    taskType: row.task_type,
    status: row.status,
    startedAt: row.started_at?.toISOString() || null,
    finishedAt: row.finished_at?.toISOString() || null,
    countFetched: Number(row.count_fetched || 0),
    countCreated: Number(row.count_created || 0),
    countSkipped: Number(row.count_skipped || 0),
    errorMessage: row.error_message
  }));
}

export async function getAdminAdSlots(limit = 80): Promise<AdminAdSlot[]> {
  const rows = await query<
    Array<
      RowDataPacket & {
        id: number;
        placement: string;
        locale: string;
        enabled: number;
        provider: string | null;
        updated_at: Date;
      }
    >
  >(
    `
      SELECT id, placement, locale, enabled, provider, updated_at
      FROM ad_slots
      ORDER BY placement ASC
      LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    placement: row.placement,
    locale: row.locale,
    enabled: Boolean(row.enabled),
    provider: row.provider,
    updatedAt: row.updated_at.toISOString()
  }));
}
