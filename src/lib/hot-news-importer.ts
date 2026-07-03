import crypto from "node:crypto";
import Parser from "rss-parser";
import mysql from "mysql2/promise";
import { getEnv } from "@/lib/env";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/locales";
import { getRuntimeDatabaseUrl } from "@/lib/runtime-config";
import { sha256, slugify, stripHtml, truncate } from "@/lib/text";

type MarketConfig = {
  geo: string;
  locale: string;
  name: string;
};

type TrendItem = Parser.Item & {
  approxTraffic?: string;
};

type GdeltArticle = {
  url: string;
  title: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
};

const marketConfigs: Record<string, MarketConfig> = {
  ID: { geo: "ID", locale: "id", name: "Indonesia" },
  VN: { geo: "VN", locale: "vi", name: "Vietnam" },
  TH: { geo: "TH", locale: "th", name: "Thailand" },
  MY: { geo: "MY", locale: "en", name: "Malaysia" },
  PH: { geo: "PH", locale: "en", name: "Philippines" },
};

const parser = new Parser<unknown, TrendItem>({
  customFields: {
    item: [["ht:approx_traffic", "approxTraffic"]]
  }
});

let lastGdeltRequestAt = 0;

function getDatabaseUrl() {
  const url = getRuntimeDatabaseUrl();

  if (!url) {
    throw new Error("DATABASE_URL is required to import hot news.");
  }

  return url;
}

function enabledMarkets() {
  return getEnv("HOT_NEWS_MARKETS", "ID,VN,TH,MY,PH")
    .split(",")
    .map((market) => market.trim().toUpperCase())
    .filter((market) => marketConfigs[market])
    .map((market) => marketConfigs[market]);
}

function parseTraffic(input = "") {
  const normalized = input.toLowerCase().replace(/,/g, "").trim();
  const value = Number.parseFloat(normalized);

  if (!Number.isFinite(value)) {
    return 0;
  }

  if (normalized.includes("m")) {
    return Math.round(value * 1_000_000);
  }

  if (normalized.includes("k")) {
    return Math.round(value * 1_000);
  }

  return Math.round(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function translationLocales(primaryLocale: string) {
  return Array.from(
    new Set(
      [primaryLocale, DEFAULT_LOCALE, ...SUPPORTED_LOCALES, "en"]
        .map((locale) => locale.trim())
        .filter(Boolean)
    )
  );
}

function categoryForTopic(topic: string) {
  const text = topic.toLowerCase();

  if (/(ai|openai|gemini|llm|chatgpt|nvidia|semiconductor|chip)/.test(text)) {
    return "ai";
  }

  if (/(hack|breach|malware|security|phishing|ransomware|cve)/.test(text)) {
    return "security";
  }

  if (/(startup|funding|ipo|venture|fintech|saas)/.test(text)) {
    return "startups";
  }

  if (/(crypto|bitcoin|ethereum|blockchain|token)/.test(text)) {
    return "crypto";
  }

  if (/(phone|apple|google|microsoft|meta|tesla|app|internet|cloud)/.test(text)) {
    return "technology";
  }

  return "trending";
}

function escapeHtml(input = "") {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uniqueSlug(topic: string, market: MarketConfig) {
  const base = slugify(`${topic} ${market.name}`) || "hot-news";
  const suffix = crypto
    .createHash("sha1")
    .update(`${market.geo}:${topic}`)
    .digest("hex")
    .slice(0, 8);
  return `${base}-${suffix}`;
}

function trendTitle(topic: string, market: MarketConfig) {
  return `${topic}: why it is trending in ${market.name}`;
}

function buildDescription(topic: string, market: MarketConfig, articles: GdeltArticle[]) {
  const domains = articles
    .map((article) => article.domain)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  return truncate(
    `${topic} is trending in ${market.name}. This briefing tracks the latest signals${domains ? ` from ${domains}` : ""} and explains why the story may matter.`,
    180
  );
}

function buildContent(
  topic: string,
  market: MarketConfig,
  articles: GdeltArticle[],
  approxTraffic?: string
) {
  const sourceItems = articles
    .slice(0, 8)
    .map((article) => {
      const title = escapeHtml(article.title || article.domain || article.url);
      const url = escapeHtml(article.url);
      const domain = escapeHtml(article.domain || "source");

      return `<li><a href="${url}" rel="nofollow noopener" target="_blank">${title}</a> <span>${domain}</span></li>`;
    })
    .join("");

  return [
    `<p><strong>${escapeHtml(topic)}</strong> is currently appearing as a hot search signal in ${escapeHtml(market.name)}${approxTraffic ? ` with estimated search interest of ${escapeHtml(approxTraffic)}` : ""}.</p>`,
    `<p><strong>Why it matters:</strong> Hot search demand can reveal breaking news, product launches, public safety alerts, entertainment spikes, or policy changes before they become stable long-tail SEO topics.</p>`,
    `<p><strong>Editorial note:</strong> This page is an automated trend briefing. It summarizes public signals and links readers to original reporting for full context.</p>`,
    sourceItems ? `<h2>Source links</h2><ul>${sourceItems}</ul>` : ""
  ].join("");
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

async function ensureHotSource(connection: mysql.Connection, market: MarketConfig) {
  const name = `Google Trends ${market.geo}`;
  const [existing] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM sources WHERE name = ? AND source_type = 'hot_trends' LIMIT 1",
    [name]
  );

  if (existing[0]?.id) {
    return Number(existing[0].id);
  }

  const [result] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT INTO sources
        (name, site_url, rss_url, source_type, default_locale, category_slug, fetch_interval_minutes)
      VALUES (?, ?, NULL, 'hot_trends', ?, 'trending', ?)
    `,
    [
      name,
      `https://trends.google.com/trending?geo=${market.geo}`,
      market.locale,
      Number(getEnv("FETCH_INTERVAL_MINUTES", "30"))
    ]
  );

  return result.insertId;
}

async function getTrendItems(market: MarketConfig) {
  const feedUrl = `https://trends.google.com/trending/rss?geo=${market.geo}`;
  const feed = await parser.parseURL(feedUrl);
  const limit = Number(getEnv("HOT_NEWS_TOPICS_PER_MARKET", "8"));

  return feed.items
    .filter((item) => item.title)
    .slice(0, limit)
    .map((item) => ({
      topic: stripHtml(item.title || "").trim(),
      trendUrl: item.link || feedUrl,
      approxTraffic: item.approxTraffic
    }));
}

async function getGdeltArticles(topic: string) {
  const maxRecords = Number(getEnv("HOT_NEWS_ARTICLES_PER_TOPIC", "6"));
  if (maxRecords <= 0) {
    return [] as GdeltArticle[];
  }

  const minIntervalMs = Number(getEnv("GDELT_MIN_INTERVAL_MS", "5500"));
  const elapsed = Date.now() - lastGdeltRequestAt;

  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }

  lastGdeltRequestAt = Date.now();
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", topic);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(maxRecords));
  url.searchParams.set("sort", "hybridrel");
  url.searchParams.set("timespan", "2d");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "user-agent": "SoutheastSignalBot/0.1"
    }
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    console.warn(`[hot-news] GDELT skipped for "${topic}": HTTP ${response.status}`);
    return [] as GdeltArticle[];
  }

  const data = (await response.json()) as { articles?: GdeltArticle[] };
  return (data.articles || []).filter((article) => article.url && article.title);
}

async function upsertHotTopic(
  connection: mysql.Connection,
  market: MarketConfig,
  topic: string,
  trendUrl: string,
  approxTraffic: string | undefined,
  heatScore: number
) {
  const topicHash = sha256(`${market.geo}:${topic.toLowerCase()}`);

  await connection.execute(
    `
      INSERT INTO hot_topics
        (provider, market, locale, topic, topic_hash, trend_url, approx_traffic, heat_score)
      VALUES ('google_trends', ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        last_seen_at = NOW(),
        times_seen = times_seen + 1,
        approx_traffic = VALUES(approx_traffic),
        heat_score = GREATEST(heat_score, VALUES(heat_score)),
        trend_url = VALUES(trend_url)
    `,
    [market.geo, market.locale, topic, topicHash, trendUrl, approxTraffic || null, heatScore]
  );

  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `
      SELECT id, article_id
      FROM hot_topics
      WHERE provider = 'google_trends' AND market = ? AND topic_hash = ?
      LIMIT 1
    `,
    [market.geo, topicHash]
  );

  return {
    id: Number(rows[0]?.id || 0),
    articleId: Number(rows[0]?.article_id || 0) || null
  };
}

async function createOrUpdateArticle(
  connection: mysql.Connection,
  sourceId: number,
  hotTopicId: number,
  market: MarketConfig,
  topic: string,
  trendUrl: string,
  approxTraffic: string | undefined,
  articles: GdeltArticle[],
  heatScore: number
) {
  const title = trendTitle(topic, market);
  const description = buildDescription(topic, market, articles);
  const summary = `${topic} is a current search trend in ${market.name}.`;
  const contentHtml = buildContent(topic, market, articles, approxTraffic);
  const sourceUrl = articles[0]?.url || trendUrl;
  const imageUrl = normalizeImageUrl(articles.find((article) => article.socialimage)?.socialimage, sourceUrl);
  const mediaAssetId = imageUrl ? await upsertMediaAsset(connection, imageUrl, sourceUrl) : null;
  const urlHash = sha256(`hot-news:${market.geo}:${topic.toLowerCase()}`);
  const contentHash = sha256(`${topic}:${articles.map((article) => article.url).join("|")}`);
  const slug = uniqueSlug(topic, market);
  const categorySlug = categoryForTopic(topic);

  const [articleResult] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT INTO articles
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'published', ?)
      ON DUPLICATE KEY UPDATE
        media_asset_id = COALESCE(VALUES(media_asset_id), media_asset_id),
        image_url = COALESCE(VALUES(image_url), image_url),
        content_hash = VALUES(content_hash),
        heat_score = GREATEST(heat_score, VALUES(heat_score)),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      sourceId,
      mediaAssetId,
      sourceUrl,
      sourceUrl,
      urlHash,
      contentHash,
      imageUrl,
      categorySlug,
      market.locale,
      heatScore
    ]
  );

  const articleId = articleResult.insertId || (await findArticleId(connection, urlHash));

  for (const locale of translationLocales(market.locale)) {
    await connection.execute(
      `
        INSERT INTO article_translations
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
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          summary = VALUES(summary),
          content_html = VALUES(content_html),
          seo_title = VALUES(seo_title),
          seo_description = VALUES(seo_description),
          og_image = COALESCE(VALUES(og_image), og_image),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        articleId,
        locale,
        slug,
        title,
        description,
        summary,
        contentHtml,
        title,
        description,
        imageUrl,
        locale === market.locale ? "done" : "fallback",
        locale === market.locale ? "auto" : "needs_localization"
      ]
    );
  }

  await connection.execute(
    "UPDATE hot_topics SET article_id = ? WHERE id = ?",
    [articleId, hotTopicId]
  );

  return articleId;
}

async function findArticleId(connection: mysql.Connection, urlHash: string) {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM articles WHERE url_hash = ? LIMIT 1",
    [urlHash]
  );

  return Number(rows[0]?.id || 0);
}

export async function importHotNews() {
  const connection = await mysql.createConnection(getDatabaseUrl());
  const markets = enabledMarkets();
  let relatedLookupsRemaining = Number(getEnv("HOT_NEWS_RELATED_LOOKUPS_PER_RUN", "6"));
  const [task] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT INTO import_tasks (task_type, status, started_at)
      VALUES ('hot_news', 'running', NOW())
    `
  );
  let totalFetched = 0;
  let totalCreated = 0;

  try {
    for (const market of markets) {
      const sourceId = await ensureHotSource(connection, market);
      const trends = await getTrendItems(market);
      let createdOrUpdated = 0;
      totalFetched += trends.length;

      for (const trend of trends) {
        if (!trend.topic) {
          continue;
        }

        let relatedArticles: GdeltArticle[] = [];

        if (relatedLookupsRemaining > 0) {
          relatedLookupsRemaining -= 1;
          try {
            relatedArticles = await getGdeltArticles(trend.topic);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[hot-news] related news skipped for "${trend.topic}": ${message}`);
          }
        }

        const heatScore =
          Math.min(99, Math.round(parseTraffic(trend.approxTraffic) / 2000)) +
          Math.min(20, relatedArticles.length * 3);

        const hotTopic = await upsertHotTopic(
          connection,
          market,
          trend.topic,
          trend.trendUrl,
          trend.approxTraffic,
          heatScore
        );

        await createOrUpdateArticle(
          connection,
          sourceId,
          hotTopic.id,
          market,
          trend.topic,
          trend.trendUrl,
          trend.approxTraffic,
          relatedArticles,
          heatScore
        );

        createdOrUpdated += 1;
        totalCreated += 1;
      }

      await connection.execute(
        "UPDATE sources SET last_fetched_at = NOW(), failure_count = 0 WHERE id = ?",
        [sourceId]
      );

      console.log(`[hot-news] ${market.name}: ${createdOrUpdated} topics processed`);
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
      [totalFetched, totalCreated, Math.max(0, totalFetched - totalCreated), task.insertId]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

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
      [message, totalFetched, totalCreated, Math.max(0, totalFetched - totalCreated), task.insertId]
    );

    throw error;
  } finally {
    await connection.end();
  }
}
