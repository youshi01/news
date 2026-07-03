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

type RelatedArticle = {
  url: string;
  title: string;
  description?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
  sourceName?: string;
};

type ArticleMetadata = {
  canonicalUrl: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
};

type NewsFeedItem = Parser.Item & {
  source?: string;
  content?: string;
  contentSnippet?: string;
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

const newsParser = new Parser<unknown, NewsFeedItem>({
  customFields: {
    item: [
      ["source", "source"],
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"]
    ]
  }
});

let lastGdeltRequestAt = 0;
const ARTICLE_URL_MAX = 900;
const MEDIA_ORIGINAL_URL_MAX = 1000;

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

function marketFromGeo(geo: string, fallbackLocale = DEFAULT_LOCALE): MarketConfig {
  const normalized = geo.trim().toUpperCase();

  return (
    marketConfigs[normalized] || {
      geo: normalized || "GLOBAL",
      locale: fallbackLocale || DEFAULT_LOCALE,
      name: normalized || "Global"
    }
  );
}

function googleNewsParams(market: MarketConfig) {
  const params: Record<string, { hl: string; gl: string; ceid: string }> = {
    ID: { hl: "id-ID", gl: "ID", ceid: "ID:id" },
    VN: { hl: "vi-VN", gl: "VN", ceid: "VN:vi" },
    TH: { hl: "th-TH", gl: "TH", ceid: "TH:th" },
    MY: { hl: "en-MY", gl: "MY", ceid: "MY:en" },
    PH: { hl: "en-PH", gl: "PH", ceid: "PH:en" }
  };

  return params[market.geo] || { hl: "en-US", gl: "US", ceid: "US:en" };
}

function googleNewsSearchUrl(topic: string, market: MarketConfig) {
  const params = googleNewsParams(market);
  const url = new URL("https://news.google.com/search");
  url.searchParams.set("q", topic);
  url.searchParams.set("hl", params.hl);
  url.searchParams.set("gl", params.gl);
  url.searchParams.set("ceid", params.ceid);
  return url.toString();
}

function hostname(input: string) {
  try {
    return new URL(input).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function originUrl(input: string) {
  try {
    const url = new URL(input);
    return `${url.protocol}//${url.hostname}/`;
  } catch {
    return "";
  }
}

function columnUrl(input: string | null | undefined, fallback = "", max = ARTICLE_URL_MAX) {
  const value = String(input || "").trim();
  if (value.length > 0 && value.length <= max) {
    return value;
  }

  const fallbackValue = String(fallback || "").trim();
  if (fallbackValue.length > 0 && fallbackValue.length <= max) {
    return fallbackValue;
  }

  const origin = originUrl(value) || originUrl(fallbackValue);
  if (origin && origin.length <= max) {
    return origin;
  }

  return value.slice(0, max);
}

function cleanNewsTitle(title: string, sourceName?: string) {
  const cleanTitle = stripHtml(title).trim();

  if (!sourceName) {
    return cleanTitle;
  }

  return cleanTitle.replace(new RegExp(`\\s+-\\s+${escapeRegExp(sourceName)}$`, "i"), "").trim();
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function articleSlug(title: string, url: string) {
  const base = slugify(title) || "news";
  const suffix = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  return `${base}-${suffix}`;
}

function toValidDate(input: string | null | undefined) {
  const date = input ? new Date(input) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
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

function getTagAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(`${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i");
  return decodeHtml(tag.match(pattern)?.[2] || "").trim() || null;
}

function getMetaContent(html: string, keys: string[]) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const normalizedKeys = keys.map((key) => key.toLowerCase());

  for (const key of normalizedKeys) {
    for (const tag of tags) {
      const property = getTagAttribute(tag, "property")?.toLowerCase();
      const name = getTagAttribute(tag, "name")?.toLowerCase();

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
      return normalizeImageUrl(getTagAttribute(link, "href"), baseUrl);
    }
  }

  return null;
}

function getTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(decodeHtml(match[1])).trim() : null;
}

function emptyArticleMetadata(): ArticleMetadata {
  return {
    canonicalUrl: null,
    title: null,
    description: null,
    imageUrl: null,
    publishedAt: null
  };
}

function isGoogleNewsUrl(input: string) {
  try {
    return new URL(input).hostname.replace(/^www\./, "") === "news.google.com";
  } catch {
    return false;
  }
}

async function fetchArticleMetadata(articleUrl: string): Promise<ArticleMetadata> {
  const normalizedUrl = normalizeImageUrl(articleUrl, articleUrl);

  if (!normalizedUrl) {
    return emptyArticleMetadata();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "SoutheastSignalBot/0.1 (+https://example.com)"
      }
    });

    if (!response.ok) {
      return emptyArticleMetadata();
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.includes("text/html")) {
      return emptyArticleMetadata();
    }

    const html = await response.text();
    const finalUrl = response.url || normalizedUrl;
    const title = getMetaContent(html, ["og:title", "twitter:title"]) || getTitleTag(html);
    const description = getMetaContent(html, [
      "og:description",
      "twitter:description",
      "description"
    ]);
    const imageUrl = getMetaContent(html, ["og:image", "twitter:image", "image"]);
    const publishedAt = getMetaContent(html, [
      "article:published_time",
      "article:published",
      "datePublished",
      "pubdate"
    ]);
    const canonicalUrl = getCanonicalUrl(html, finalUrl) || finalUrl;

    return {
      canonicalUrl: normalizeImageUrl(canonicalUrl, finalUrl),
      title,
      description: cleanArticleDescription(description, title || ""),
      imageUrl: normalizeImageUrl(imageUrl, finalUrl),
      publishedAt
    };
  } catch {
    return emptyArticleMetadata();
  } finally {
    clearTimeout(timeout);
  }
}

function cleanArticleDescription(input: string | null | undefined, title = "", sourceName = "") {
  const text = stripHtml(decodeHtml(input || ""))
    .replace(/\s+/g, " ")
    .trim();
  const cleanTitle = stripHtml(title).replace(/\s+/g, " ").trim();
  const cleanSource = stripHtml(sourceName).replace(/\s+/g, " ").trim();

  if (!text || text.length < 45) {
    return null;
  }

  if (cleanTitle && text.toLowerCase() === cleanTitle.toLowerCase()) {
    return null;
  }

  if (cleanSource && text.toLowerCase() === cleanSource.toLowerCase()) {
    return null;
  }

  if (/google news|comprehensive up-to-date news coverage/i.test(text)) {
    return null;
  }

  return truncate(text, 900);
}

async function upsertMediaAsset(
  connection: mysql.Connection,
  imageUrl: string,
  sourceUrl: string
) {
  const urlHash = sha256(imageUrl);
  const storedOriginalUrl = columnUrl(imageUrl, originUrl(imageUrl), MEDIA_ORIGINAL_URL_MAX);
  const storedSourceUrl = columnUrl(sourceUrl);

  await connection.execute(
    `
      INSERT IGNORE INTO media_assets
        (original_url, url_hash, source_url, asset_type, storage_type, status)
      VALUES (?, ?, ?, 'image', 'remote_proxy', 'active')
    `,
    [storedOriginalUrl, urlHash, storedSourceUrl]
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

function newsFeedImage(item: NewsFeedItem) {
  return (
    item["media:content"]?.$?.url ||
    item["media:thumbnail"]?.$?.url ||
    null
  );
}

async function getGoogleNewsArticles(topic: string, market: MarketConfig) {
  if (getEnv("HOT_NEWS_GOOGLE_NEWS_ENABLED", "true") === "false") {
    return [] as RelatedArticle[];
  }

  const maxRecords = Number(getEnv("HOT_NEWS_ARTICLES_PER_TOPIC", "6"));
  if (maxRecords <= 0) {
    return [] as RelatedArticle[];
  }

  const params = googleNewsParams(market);
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", topic);
  url.searchParams.set("hl", params.hl);
  url.searchParams.set("gl", params.gl);
  url.searchParams.set("ceid", params.ceid);

  try {
    const feed = await newsParser.parseURL(url.toString());

    const fetchMetadata = getEnv("HOT_NEWS_FETCH_METADATA", "true") !== "false";
    const metadataLimit = Number(getEnv("HOT_NEWS_METADATA_PER_TOPIC", "4"));
    const items = feed.items
      .filter((item) => item.link && item.title)
      .slice(0, maxRecords);

    return Promise.all(
      items.map(async (item, index) => {
        const sourceName = stripHtml(item.source || "").trim();
        const link = item.link || "";
        const metadata =
          fetchMetadata && index < metadataLimit
            ? await fetchArticleMetadata(link)
            : emptyArticleMetadata();
        const articleUrl =
          metadata.canonicalUrl && !isGoogleNewsUrl(metadata.canonicalUrl)
            ? metadata.canonicalUrl
            : link;
        const title = cleanNewsTitle(metadata.title || item.title || "", sourceName);
        const feedDescription = cleanArticleDescription(
          item.contentSnippet || item.content,
          title,
          sourceName
        );
        const imageUrl =
          normalizeImageUrl(newsFeedImage(item), articleUrl) ||
          normalizeImageUrl(metadata.imageUrl, articleUrl) ||
          undefined;

        return {
          url: articleUrl,
          title,
          description: metadata.description || feedDescription || undefined,
          seendate: metadata.publishedAt || item.isoDate || item.pubDate,
          socialimage: imageUrl,
          domain: sourceName || hostname(articleUrl),
          language: market.locale,
          sourcecountry: market.geo,
          sourceName
        };
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[hot-news] Google News skipped for "${topic}": ${message}`);
    return [] as RelatedArticle[];
  }
}

function mergeRelatedArticles(articles: RelatedArticle[], limit: number) {
  const seen = new Set<string>();
  const merged: RelatedArticle[] = [];

  for (const article of articles) {
    const key = article.url || article.title.toLowerCase();
    if (!article.title || !article.url || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(article);

    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
}

async function getGdeltArticles(topic: string) {
  const maxRecords = Number(getEnv("HOT_NEWS_ARTICLES_PER_TOPIC", "6"));
  if (maxRecords <= 0) {
    return [] as RelatedArticle[];
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
    return [] as RelatedArticle[];
  }

  const data = (await response.json()) as { articles?: RelatedArticle[] };
  return (data.articles || []).filter((article) => article.url && article.title);
}

async function upsertHotTopic(
  connection: mysql.Connection,
  market: MarketConfig,
  topic: string,
  trendUrl: string,
  approxTraffic: string | undefined,
  heatScore: number,
  provider = "google_trends"
) {
  const topicHash = sha256(`${market.geo}:${topic.toLowerCase()}`);
  const storedTrendUrl = columnUrl(trendUrl, googleNewsSearchUrl(topic, market));

  await connection.execute(
    `
      INSERT INTO hot_topics
        (provider, market, locale, topic, topic_hash, trend_url, approx_traffic, heat_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        last_seen_at = NOW(),
        times_seen = times_seen + 1,
        approx_traffic = VALUES(approx_traffic),
        heat_score = GREATEST(heat_score, VALUES(heat_score)),
        trend_url = VALUES(trend_url)
    `,
    [provider, market.geo, market.locale, topic, topicHash, storedTrendUrl, approxTraffic || null, heatScore]
  );

  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `
      SELECT id, article_id
      FROM hot_topics
      WHERE provider = ? AND market = ? AND topic_hash = ?
      LIMIT 1
    `,
    [provider, market.geo, topicHash]
  );

  return {
    id: Number(rows[0]?.id || 0),
    articleId: Number(rows[0]?.article_id || 0) || null
  };
}

async function createOrUpdateRelatedArticle(
  connection: mysql.Connection,
  sourceId: number,
  market: MarketConfig,
  topic: string,
  article: RelatedArticle,
  heatScore: number
) {
  const sourceUrl = article.url;
  const title = stripHtml(article.title).trim();

  if (!sourceUrl || !title) {
    return { processed: false, created: false };
  }

  const articleDescription = cleanArticleDescription(article.description, title);
  const requireDescription = getEnv("HOT_NEWS_REQUIRE_DESCRIPTION", "true") !== "false";

  if (requireDescription && !articleDescription) {
    return { processed: false, created: false };
  }

  const description = truncate(articleDescription || title, 180);
  const summary = truncate(articleDescription || title, 260);
  const contentHtml = articleDescription
    ? `<p>${escapeHtml(articleDescription)}</p>`
    : `<p>${escapeHtml(title)}</p>`;
  const imageUrl = normalizeImageUrl(article.socialimage, sourceUrl);
  const storedSourceUrl = columnUrl(
    sourceUrl,
    googleNewsSearchUrl(`${topic} ${title}`, market)
  );
  const storedImageUrl = imageUrl && imageUrl.length <= ARTICLE_URL_MAX ? imageUrl : null;
  const mediaAssetId =
    imageUrl && imageUrl.length <= MEDIA_ORIGINAL_URL_MAX
      ? await upsertMediaAsset(connection, imageUrl, sourceUrl)
      : null;
  const urlHash = sha256(sourceUrl);
  const contentHash = sha256(`${title}:${topic}:${sourceUrl}`);
  const slug = articleSlug(title, sourceUrl);
  const categorySlug = categoryForTopic(topic);
  const publishedAt = toValidDate(article.seendate);

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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
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
      storedSourceUrl,
      storedSourceUrl,
      urlHash,
      contentHash,
      storedImageUrl,
      categorySlug,
      market.locale,
      publishedAt,
      Math.max(1, heatScore - 8)
    ]
  );

  const articleId = articleResult.insertId || (await findArticleId(connection, urlHash));

  if (!articleId) {
    return { processed: false, created: false };
  }

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
        storedImageUrl,
        locale === market.locale ? "done" : "fallback",
        locale === market.locale ? "auto" : "needs_localization"
      ]
    );
  }

  return {
    processed: true,
    created: articleResult.affectedRows === 1
  };
}

async function findArticleId(connection: mysql.Connection, urlHash: string) {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM articles WHERE url_hash = ? LIMIT 1",
    [urlHash]
  );

  return Number(rows[0]?.id || 0);
}

async function processHotTopic(
  connection: mysql.Connection,
  sourceId: number,
  market: MarketConfig,
  trend: { topic: string; trendUrl: string; approxTraffic?: string },
  options: {
    provider?: string;
    includeGdelt?: boolean;
    heatScore?: number;
  } = {}
) {
  const maxRelated = Number(getEnv("HOT_NEWS_ARTICLES_PER_TOPIC", "6"));
  const googleNewsArticles = await getGoogleNewsArticles(trend.topic, market);
  let gdeltArticles: RelatedArticle[] = [];

  if (options.includeGdelt) {
    try {
      gdeltArticles = await getGdeltArticles(trend.topic);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[hot-news] related news skipped for "${trend.topic}": ${message}`);
    }
  }

  const relatedArticles = mergeRelatedArticles(
    [...googleNewsArticles, ...gdeltArticles],
    maxRelated
  );
  const heatScore =
    options.heatScore ??
    Math.min(99, Math.round(parseTraffic(trend.approxTraffic) / 2000)) +
      Math.min(20, relatedArticles.length * 3);

  const hotTopic = await upsertHotTopic(
    connection,
    market,
    trend.topic,
    trend.trendUrl,
    trend.approxTraffic,
    heatScore,
    options.provider || "google_trends"
  );

  await connection.execute(
    "UPDATE hot_topics SET article_id = NULL WHERE id = ?",
    [hotTopic.id]
  );

  let relatedProcessed = 0;

  for (const article of relatedArticles) {
    const result = await createOrUpdateRelatedArticle(
      connection,
      sourceId,
      market,
      trend.topic,
      article,
      heatScore
    );

    if (result.processed) {
      relatedProcessed += 1;
    }
  }

  return {
    fetched: relatedArticles.length,
    created: relatedProcessed,
    skipped: Math.max(0, relatedArticles.length - relatedProcessed)
  };
}

export async function importHotNews() {
  const connection = await mysql.createConnection(getDatabaseUrl());
  const markets = enabledMarkets();
  let relatedLookupsRemaining = Number(getEnv("HOT_NEWS_RELATED_LOOKUPS_PER_RUN", "0"));
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

      for (const trend of trends) {
        if (!trend.topic) {
          continue;
        }

        const result = await processHotTopic(
          connection,
          sourceId,
          market,
          trend,
          {
            includeGdelt: relatedLookupsRemaining > 0
          }
        );

        if (relatedLookupsRemaining > 0) {
          relatedLookupsRemaining -= 1;
        }

        createdOrUpdated += result.created;
        totalFetched += result.fetched;
        totalCreated += result.created;
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

export async function importManualHotTopic(input: {
  topic: string;
  market: string;
  approxTraffic?: string;
  heatScore?: number;
}) {
  const connection = await mysql.createConnection(getDatabaseUrl());
  const market = marketFromGeo(input.market);
  const [task] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT INTO import_tasks (task_type, status, started_at)
      VALUES ('hot_news', 'running', NOW())
    `
  );

  try {
    const sourceId = await ensureHotSource(connection, market);
    const result = await processHotTopic(
      connection,
      sourceId,
      market,
      {
        topic: input.topic,
        trendUrl: googleNewsSearchUrl(input.topic, market),
        approxTraffic: input.approxTraffic
      },
      {
        provider: "manual",
        includeGdelt: false,
        heatScore: input.heatScore
      }
    );

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
      [result.fetched, result.created, result.skipped, task.insertId]
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await connection.execute(
      `
        UPDATE import_tasks
        SET status = 'failed',
            finished_at = NOW(),
            error_message = ?
        WHERE id = ?
      `,
      [message, task.insertId]
    );

    throw error;
  } finally {
    await connection.end();
  }
}

export async function importHotTopicById(id: number) {
  const connection = await mysql.createConnection(getDatabaseUrl());
  const [task] = await connection.execute<mysql.ResultSetHeader>(
    `
      INSERT INTO import_tasks (task_type, status, started_at)
      VALUES ('hot_news', 'running', NOW())
    `
  );

  try {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      `
        SELECT id, provider, market, locale, topic, trend_url, approx_traffic, heat_score
        FROM hot_topics
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );
    const row = rows[0];

    if (!row) {
      throw new Error("热点词不存在。");
    }

    const market = marketFromGeo(String(row.market), String(row.locale || DEFAULT_LOCALE));
    const sourceId = await ensureHotSource(connection, market);
    const result = await processHotTopic(
      connection,
      sourceId,
      market,
      {
        topic: String(row.topic),
        trendUrl: String(row.trend_url || googleNewsSearchUrl(String(row.topic), market)),
        approxTraffic: row.approx_traffic ? String(row.approx_traffic) : undefined
      },
      {
        provider: String(row.provider || "manual"),
        includeGdelt: false,
        heatScore: Number(row.heat_score || 0) || undefined
      }
    );

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
      [result.fetched, result.created, result.skipped, task.insertId]
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await connection.execute(
      `
        UPDATE import_tasks
        SET status = 'failed',
            finished_at = NOW(),
            error_message = ?
        WHERE id = ?
      `,
      [message, task.insertId]
    );

    throw error;
  } finally {
    await connection.end();
  }
}
