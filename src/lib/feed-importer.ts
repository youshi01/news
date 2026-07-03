import crypto from "node:crypto";
import Parser from "rss-parser";
import mysql from "mysql2/promise";
import { getEnv } from "./env";
import { SUPPORTED_LOCALES } from "./locales";
import { getRuntimeDatabaseUrl } from "./runtime-config";
import { sha256, slugify, stripHtml, truncate } from "./text";

type SourceRow = {
  id: number;
  name: string;
  site_url: string;
  rss_url: string;
  default_locale: string;
  category_slug: string;
};

type CustomFeedItem = Parser.Item & {
  enclosure?: {
    url?: string;
    type?: string;
  };
  "content:encoded"?: string;
  "media:content"?: {
    $?: {
      url?: string;
      type?: string;
      medium?: string;
    };
  };
  "media:thumbnail"?: {
    $?: {
      url?: string;
    };
  };
};

type ArticleMetadata = {
  canonicalUrl: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  publishedAt: string | null;
};

const parser = new Parser<unknown, CustomFeedItem>({
  customFields: {
    item: [
      ["content:encoded", "content:encoded"],
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"]
    ]
  }
});

const defaultSources: SourceRow[] = [
  {
    id: 0,
    name: "TechCrunch",
    site_url: "https://techcrunch.com",
    rss_url: "https://techcrunch.com/feed/",
    default_locale: "en",
    category_slug: "startups"
  },
  {
    id: 0,
    name: "The Verge",
    site_url: "https://www.theverge.com",
    rss_url: "https://www.theverge.com/rss/index.xml",
    default_locale: "en",
    category_slug: "technology"
  },
  {
    id: 0,
    name: "OpenAI Blog",
    site_url: "https://openai.com",
    rss_url: "https://openai.com/news/rss.xml",
    default_locale: "en",
    category_slug: "ai"
  },
  {
    id: 0,
    name: "BleepingComputer",
    site_url: "https://www.bleepingcomputer.com",
    rss_url: "https://www.bleepingcomputer.com/feed/",
    default_locale: "en",
    category_slug: "security"
  }
];

function getDatabaseUrl() {
  const url = getRuntimeDatabaseUrl();

  if (!url) {
    throw new Error("DATABASE_URL is required to import feeds.");
  }

  return url;
}

function getFeedImage(item: CustomFeedItem) {
  if (isImageAsset(item.enclosure?.url, item.enclosure?.type)) {
    return item.enclosure?.url || null;
  }

  const media = item["media:content"]?.$;
  if (isImageAsset(media?.url, media?.type, media?.medium)) {
    return media?.url || null;
  }

  return item["media:thumbnail"]?.$?.url || null;
}

function getFeedVideo(item: CustomFeedItem) {
  if (isVideoAsset(item.enclosure?.url, item.enclosure?.type)) {
    return item.enclosure?.url || null;
  }

  const media = item["media:content"]?.$;
  if (isVideoAsset(media?.url, media?.type, media?.medium)) {
    return media?.url || null;
  }

  return null;
}

function isImageAsset(url?: string, type?: string, medium?: string) {
  const value = `${type || ""} ${medium || ""} ${url || ""}`.toLowerCase();
  return (
    value.includes("image") ||
    /\.(avif|gif|jpe?g|png|webp)(\?|#|$)/i.test(url || "")
  );
}

function isVideoAsset(url?: string, type?: string, medium?: string) {
  const value = `${type || ""} ${medium || ""} ${url || ""}`.toLowerCase();
  return (
    value.includes("video") ||
    /\.(m3u8|mov|mp4|mpe?g|webm)(\?|#|$)/i.test(url || "")
  );
}

function normalizeUrl(input: string | null | undefined, baseUrl: string) {
  if (!input) {
    return null;
  }

  try {
    const url = new URL(input, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function decodeHtml(input = "") {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function escapeHtml(input = "") {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTagAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(`${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i");
  return decodeHtml(tag.match(pattern)?.[2] || "").trim() || null;
}

function getMetaContent(html: string, keys: string[]) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const key of keys) {
    for (const tag of tags) {
      const property = getTagAttribute(tag, "property");
      const name = getTagAttribute(tag, "name");

      if (property === key || name === key) {
        return getTagAttribute(tag, "content");
      }
    }
  }

  return null;
}

function getCanonicalUrl(html: string, baseUrl: string) {
  const links = html.match(/<link\b[^>]*>/gi) || [];

  for (const link of links) {
    const rel = getTagAttribute(link, "rel");

    if (rel?.toLowerCase().split(/\s+/).includes("canonical")) {
      return normalizeUrl(getTagAttribute(link, "href"), baseUrl);
    }
  }

  return null;
}

function getTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(decodeHtml(match[1])).trim() : null;
}

async function fetchArticleMetadata(articleUrl: string): Promise<ArticleMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(articleUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "SoutheastSignalBot/0.1 (+https://example.com)"
      }
    });

    if (!response.ok) {
      return emptyMetadata();
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.includes("text/html")) {
      return emptyMetadata();
    }

    const html = await response.text();
    const finalUrl = response.url || articleUrl;
    const description = getMetaContent(html, [
      "og:description",
      "twitter:description",
      "description"
    ]);
    const imageUrl = getMetaContent(html, ["og:image", "twitter:image", "image"]);
    const videoUrl = getMetaContent(html, [
      "og:video",
      "og:video:url",
      "og:video:secure_url",
      "twitter:player:stream"
    ]);
    const title = getMetaContent(html, ["og:title", "twitter:title"]) || getTitleTag(html);
    const publishedAt = getMetaContent(html, [
      "article:published_time",
      "article:published",
      "datePublished",
      "pubdate"
    ]);

    return {
      canonicalUrl: getCanonicalUrl(html, finalUrl) || finalUrl,
      title,
      description,
      imageUrl: normalizeUrl(imageUrl, finalUrl),
      videoUrl: normalizeUrl(videoUrl, finalUrl),
      publishedAt
    };
  } catch {
    return emptyMetadata();
  } finally {
    clearTimeout(timeout);
  }
}

function emptyMetadata(): ArticleMetadata {
  return {
    canonicalUrl: null,
    title: null,
    description: null,
    imageUrl: null,
    videoUrl: null,
    publishedAt: null
  };
}

async function upsertMediaAsset(
  connection: mysql.Connection,
  imageUrl: string,
  sourceUrl: string,
  assetType: "image" | "video" = "image"
) {
  const urlHash = sha256(imageUrl);

  await connection.execute(
    `
      INSERT IGNORE INTO media_assets
        (original_url, url_hash, source_url, asset_type, storage_type, status)
      VALUES (?, ?, ?, ?, 'remote_proxy', 'active')
    `,
    [imageUrl, urlHash, sourceUrl, assetType]
  );

  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM media_assets WHERE url_hash = ? LIMIT 1",
    [urlHash]
  );

  return Number(rows[0]?.id || 0) || null;
}

function buildContent(title: string, summary: string, sourceName: string, sourceUrl: string) {
  const cleanSummary = truncate(stripHtml(summary || title), 900);

  return [
    `<p>${escapeHtml(cleanSummary)}</p>`,
    `<p><strong>Editorial note:</strong> This automated briefing summarizes the RSS signal and links to the original publisher for the full report.</p>`,
    `<p><strong>Source:</strong> <a href="${escapeHtml(sourceUrl)}" rel="nofollow noopener" target="_blank">${escapeHtml(sourceName)}</a></p>`
  ].join("");
}

function uniqueSlug(title: string, url: string) {
  const base = slugify(title) || "news";
  const suffix = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  return `${base}-${suffix}`;
}

function toValidDate(input: string | null | undefined) {
  const date = input ? new Date(input) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function getSources(connection: mysql.Connection, sourceIds: number[] = []) {
  const selectedIds = sourceIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  const selectedClause = selectedIds.length
    ? `AND id IN (${selectedIds.map(() => "?").join(",")})`
    : "";
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `
      SELECT id, name, site_url, rss_url, default_locale, category_slug
      FROM sources
      WHERE enabled = 1 AND rss_url IS NOT NULL
      ${selectedClause}
      ORDER BY last_fetched_at IS NULL DESC, last_fetched_at ASC
    `,
    selectedIds
  );

  if (rows.length) {
    return rows as SourceRow[];
  }

  return selectedIds.length ? [] : defaultSources;
}

async function insertArticle(
  connection: mysql.Connection,
  source: SourceRow,
  item: CustomFeedItem
) {
  const feedTitle = stripHtml(item.title || "").trim();
  const link = normalizeUrl(item.link || item.guid || "", source.site_url) || "";

  if (!feedTitle || !link) {
    return { created: false, skipped: true };
  }

  const metadata = await fetchArticleMetadata(link);
  const canonicalUrl = metadata.canonicalUrl || link;
  const title = stripHtml(metadata.title || feedTitle).trim();
  const feedSummary = item.contentSnippet || item.summary || item["content:encoded"] || item.content || "";
  const summary = stripHtml(metadata.description || feedSummary || title);
  const imageUrl = normalizeUrl(getFeedImage(item), link) || metadata.imageUrl;
  const videoUrl = normalizeUrl(getFeedVideo(item), link) || metadata.videoUrl;
  const mediaAssetId = imageUrl
    ? await upsertMediaAsset(connection, imageUrl, canonicalUrl)
    : null;

  if (videoUrl) {
    await upsertMediaAsset(connection, videoUrl, canonicalUrl, "video");
  }

  const publishedAt =
    metadata.publishedAt ||
    item.isoDate ||
    item.pubDate ||
    new Date().toISOString();
  const urlHash = sha256(canonicalUrl);
  const contentHash = sha256(`${title}:${summary}`);
  const slug = uniqueSlug(title, canonicalUrl);
  const description = truncate(summary || title, 180);
  const contentHtml = buildContent(title, summary, source.name, canonicalUrl);
  const heatScore = Math.floor(35 + Math.random() * 60);

  const [articleResult] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT IGNORE INTO articles
        (
          source_id,
          media_asset_id,
          source_url,
          canonical_url,
          url_hash,
          content_hash,
          image_url,
          category_slug,
          original_language,
          published_at,
          status,
          heat_score
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
    `,
    [
      source.id || null,
      mediaAssetId,
      link,
      canonicalUrl,
      urlHash,
      contentHash,
      imageUrl,
      source.category_slug || "technology",
      source.default_locale || "en",
      toValidDate(publishedAt),
      heatScore
    ]
  );

  const created = articleResult.affectedRows > 0;
  const articleId = created
    ? articleResult.insertId
    : await findArticleId(connection, urlHash);

  if (!articleId) {
    return { created: false, skipped: true };
  }

  if (mediaAssetId) {
    await connection.execute(
      `
        UPDATE articles
        SET media_asset_id = COALESCE(media_asset_id, ?),
            image_url = COALESCE(image_url, ?),
            canonical_url = COALESCE(canonical_url, ?)
        WHERE id = ?
      `,
      [mediaAssetId, imageUrl, canonicalUrl, articleId]
    );
  }

  for (const locale of SUPPORTED_LOCALES) {
    await connection.execute(
      `
        INSERT IGNORE INTO article_translations
          (
            article_id,
            locale,
            slug,
            title,
            description,
            summary,
            content_html,
            seo_title,
            seo_description,
            og_image,
            translation_status,
            review_status
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        articleId,
        locale,
        slug,
        title,
        description,
        truncate(summary, 260),
        contentHtml,
        title,
        description,
        imageUrl,
        locale === source.default_locale ? "done" : "fallback",
        locale === source.default_locale ? "auto" : "needs_localization"
      ]
    );
  }

  return { created, skipped: !created };
}

async function findArticleId(connection: mysql.Connection, urlHash: string) {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM articles WHERE url_hash = ? LIMIT 1",
    [urlHash]
  );

  return Number(rows[0]?.id || 0);
}

async function importSource(connection: mysql.Connection, source: SourceRow) {
  const [task] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT INTO import_tasks (source_id, task_type, status, started_at)
      VALUES (?, 'rss', 'running', NOW())
    `,
    [source.id || null]
  );

  let fetched = 0;
  let created = 0;
  let skipped = 0;

  try {
    const feed = await parser.parseURL(source.rss_url);
    const maxItems = Number(getEnv("MAX_ITEMS_PER_SOURCE", "12"));

    for (const item of feed.items.slice(0, maxItems)) {
      fetched += 1;
      const result = await insertArticle(connection, source, item);
      if (result.created) {
        created += 1;
      }
      if (result.skipped) {
        skipped += 1;
      }
    }

    if (source.id) {
      await connection.execute(
        "UPDATE sources SET last_fetched_at = NOW(), failure_count = 0 WHERE id = ?",
        [source.id]
      );
    }

    await connection.execute(
      `
        UPDATE import_tasks
        SET status = 'done',
            finished_at = NOW(),
            count_fetched = ?,
            count_created = ?,
            count_skipped = ?
        WHERE id = ?
      `,
      [fetched, created, skipped, task.insertId]
    );

    console.log(
      `[feeds] ${source.name}: fetched=${fetched} created=${created} skipped=${skipped}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (source.id) {
      await connection.execute(
        "UPDATE sources SET failure_count = failure_count + 1 WHERE id = ?",
        [source.id]
      );
    }

    await connection.execute(
      `
        UPDATE import_tasks
        SET status = 'failed',
            finished_at = NOW(),
            error_message = ?,
            count_fetched = ?,
            count_created = ?,
            count_skipped = ?
        WHERE id = ?
      `,
      [message, fetched, created, skipped, task.insertId]
    );

    console.error(`[feeds] ${source.name} failed: ${message}`);
  }
}

export async function importFeeds(options: { sourceIds?: number[] } = {}) {
  const connection = await mysql.createConnection(getDatabaseUrl());

  try {
    const sources = await getSources(connection, options.sourceIds || []);

    for (const source of sources) {
      await importSource(connection, source);
    }
  } finally {
    await connection.end();
  }
}
