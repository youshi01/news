import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import mysql from "mysql2/promise";
import { getEnv } from "../src/lib/env";
import { SUPPORTED_LOCALES } from "../src/lib/locales";
import { getRuntimeDatabaseUrl } from "../src/lib/runtime-config";
import { sha256, slugify, stripHtml, truncate } from "../src/lib/text";

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
  };
  "media:content"?: {
    $?: {
      url?: string;
    };
  };
  "media:thumbnail"?: {
    $?: {
      url?: string;
    };
  };
};

const parser = new Parser<unknown, CustomFeedItem>({
  customFields: {
    item: [
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

function getImage(item: CustomFeedItem) {
  return (
    item.enclosure?.url ||
    item["media:content"]?.$?.url ||
    item["media:thumbnail"]?.$?.url ||
    null
  );
}

function normalizeImageUrl(imageUrl: string | null | undefined, baseUrl: string) {
  if (!imageUrl) {
    return null;
  }

  try {
    const url = new URL(imageUrl, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function upsertMediaAsset(
  connection: mysql.Connection,
  imageUrl: string,
  sourceUrl: string
) {
  const urlHash = sha256(imageUrl);

  await connection.execute(
    `
      INSERT IGNORE INTO media_assets
        (original_url, url_hash, source_url, asset_type, storage_type, status)
      VALUES (?, ?, ?, 'image', 'remote_proxy', 'active')
    `,
    [imageUrl, urlHash, sourceUrl]
  );

  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM media_assets WHERE url_hash = ? LIMIT 1",
    [urlHash]
  );

  return Number(rows[0]?.id || 0) || null;
}

function buildContent(title: string, summary: string, sourceName: string, sourceUrl: string) {
  const cleanSummary = truncate(stripHtml(summary || title), 520);

  return [
    `<p>${escapeHtml(cleanSummary)}</p>`,
    `<p><strong>Why it matters:</strong> This story is being tracked because it may affect technology, business, security, or internet users across Southeast Asia.</p>`,
    `<p><strong>Source:</strong> <a href="${escapeHtml(sourceUrl)}" rel="nofollow noopener" target="_blank">${escapeHtml(sourceName)}</a></p>`
  ].join("");
}

function escapeHtml(input = "") {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uniqueSlug(title: string, url: string) {
  const base = slugify(title) || "news";
  const suffix = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  return `${base}-${suffix}`;
}

async function getSources(connection: mysql.Connection) {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `
      SELECT id, name, site_url, rss_url, default_locale, category_slug
      FROM sources
      WHERE enabled = 1 AND rss_url IS NOT NULL
      ORDER BY last_fetched_at IS NULL DESC, last_fetched_at ASC
    `
  );

  return rows.length ? (rows as SourceRow[]) : defaultSources;
}

async function insertArticle(
  connection: mysql.Connection,
  source: SourceRow,
  item: CustomFeedItem
) {
  const title = stripHtml(item.title || "").trim();
  const link = item.link || item.guid || "";

  if (!title || !link) {
    return { created: false, skipped: true };
  }

  const summary = stripHtml(item.contentSnippet || item.summary || item.content || title);
  const urlHash = sha256(link);
  const contentHash = sha256(`${title}:${summary}`);
  const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
  const imageUrl = normalizeImageUrl(getImage(item), link || source.site_url);
  const mediaAssetId = imageUrl
    ? await upsertMediaAsset(connection, imageUrl, link)
    : null;
  const slug = uniqueSlug(title, link);
  const description = truncate(summary || title, 180);
  const contentHtml = buildContent(title, summary, source.name, link);
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
      link,
      urlHash,
      contentHash,
      imageUrl,
      source.category_slug || "technology",
      source.default_locale || "en",
      new Date(publishedAt),
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
            image_url = COALESCE(image_url, ?)
        WHERE id = ?
      `,
      [mediaAssetId, imageUrl, articleId]
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

export async function importFeeds() {
  const connection = await mysql.createConnection(getDatabaseUrl());

  try {
    const sources = await getSources(connection);

    for (const source of sources) {
      await importSource(connection, source);
    }
  } finally {
    await connection.end();
  }
}

const isMain = path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url);

if (isMain) {
  importFeeds()
    .then(() => {
      console.log("[feeds] import complete");
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
